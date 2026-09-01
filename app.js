const fmtUSD = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const fmtPct = (n) => (n * 100).toFixed(1) + "%";

const SUN_ICON = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"></path></svg>`;
const MOON_ICON = `<svg viewBox="0 0 24 24"><path d="M20 14.5a8.5 8.5 0 1 1-9.5-9.4 7 7 0 0 0 9.5 9.4z"></path></svg>`;

let DATA = null;
let activePeriod = null;
let activeBrand = "all";

// ---------- Theme ----------
const themeToggle = document.getElementById("themeToggle");
const themeKnob = document.getElementById("themeKnob");

function setTheme(mode) {
  document.body.setAttribute("data-theme", mode);
  themeKnob.innerHTML = mode === "dark" ? MOON_ICON : SUN_ICON;
  themeToggle.setAttribute("aria-pressed", mode === "dark");
  localStorage.setItem("spc-theme", mode);
}

themeToggle.addEventListener("click", () => {
  const current = document.body.getAttribute("data-theme");
  setTheme(current === "dark" ? "light" : "dark");
});

setTheme(localStorage.getItem("spc-theme") || "light");

// ---------- Data load ----------
fetch("data/sales-channels.json")
  .then((r) => r.json())
  .then((json) => {
    DATA = json;
    document.getElementById("updatedLabel").textContent = "updated " + json.meta.last_updated;
    buildBrandButtons();
    buildMonthSelect();
    const initial = json.periods[json.periods.length - 1];
    selectPeriod(initial.id);
  })
  .catch((err) => {
    document.getElementById("tableBody").innerHTML =
      `<tr><td colspan="7">Could not load data (${err.message}). Check data/sales-channels.json.</td></tr>`;
  });

// ---------- Brand controls ----------
function buildBrandButtons() {
  const container = document.getElementById("brandButtons");
  const brands = [{ id: "all", label: "All brands" }].concat(
    Object.entries(DATA.meta.brands).map(([id, b]) => ({ id, label: b.label }))
  );
  container.innerHTML = brands
    .map(
      (b) => `<button class="brand-btn" data-brand="${b.id}">
        ${b.id !== "all" ? `<span class="brand-dot" style="background:${DATA.meta.brands[b.id].color}"></span>` : ""}${b.label}
      </button>`
    )
    .join("");
  container.querySelectorAll(".brand-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeBrand = btn.dataset.brand;
      container.querySelectorAll(".brand-btn").forEach((b) => b.classList.toggle("active", b === btn));
      render(activePeriod);
    });
  });
  container.querySelector('[data-brand="all"]').classList.add("active");
}

// ---------- Month select ----------
function buildMonthSelect() {
  const select = document.getElementById("monthSelect");
  select.innerHTML = DATA.periods
    .map((p) => `<option value="${p.id}">${p.label}</option>`)
    .join("");
  select.addEventListener("change", () => selectPeriod(select.value));
}

function selectPeriod(periodId) {
  activePeriod = periodId;
  document.getElementById("monthSelect").value = periodId;
  render(periodId);
}

// ---------- Data helpers ----------
function getRowsForPeriod(periodId) {
  const periodData = DATA.channels[periodId] || DATA.channels[Object.keys(DATA.channels)[0]];

  if (activeBrand !== "all") {
    return (periodData[activeBrand] || []).map((c) => ({ ...c, brand: activeBrand }));
  }

  // Combine both brands, channel by channel
  const combined = {};
  Object.entries(periodData).forEach(([brandId, rows]) => {
    rows.forEach((c) => {
      if (!combined[c.id]) {
        combined[c.id] = { ...c, brand: "all", gross_sales: 0, discounts: 0, orders: 0, _m1sum: 0, _m2sum: 0, _m3sum: 0, _m3net: 0 };
      }
      const t = combined[c.id];
      const net = c.gross_sales - c.discounts;
      t.gross_sales += c.gross_sales;
      t.discounts += c.discounts;
      t.orders += c.orders || 0;
      t._m1sum += net * c.margin1_pct;
      t._m2sum += net * c.margin2_pct;
      if (!c.margin3_pending) {
        t._m3sum += net * c.margin3_pct;
        t._m3net += net;
      }
      if (c.margin3_pending) t.margin3_pending = true;
    });
  });

  return Object.values(combined).map((t) => {
    const net = t.gross_sales - t.discounts;
    return {
      ...t,
      margin1_pct: t._m1sum / net,
      margin2_pct: t._m2sum / net,
      margin3_pct: t._m3net > 0 ? t._m3sum / t._m3net : null,
      note: null,
    };
  });
}

// ---------- Render ----------
function render(periodId) {
  const rows = getRowsForPeriod(periodId);
  const enriched = rows.map((c) => ({ ...c, net_sales: c.gross_sales - c.discounts }));

  const totalGross = enriched.reduce((s, c) => s + c.gross_sales, 0);
  const totalNet = enriched.reduce((s, c) => s + c.net_sales, 0);
  const weightedM1 = enriched.reduce((s, c) => s + c.net_sales * c.margin1_pct, 0) / totalNet;
  const totalOrders = enriched.reduce((s, c) => s + (c.orders || 0), 0);

  renderKPIs(totalGross, totalNet, weightedM1, totalOrders);
  renderTable(enriched, totalGross);
}

function renderKPIs(totalGross, totalNet, weightedM1, totalOrders) {
  const el = document.getElementById("kpiRow");
  const cards = [
    { label: "Gross Sales", value: fmtUSD(totalGross) },
    { label: "Net Sales", value: fmtUSD(totalNet), sub: fmtPct(totalNet / totalGross) + " of gross" },
    { label: "Gross Margin 1 (weighted)", value: fmtPct(weightedM1) },
    { label: "Orders", value: totalOrders.toLocaleString("en-US") },
  ];
  el.innerHTML = cards
    .map(
      (c) => `
    <div class="kpi">
      <div class="kpi-label">${c.label}</div>
      <div class="kpi-value">${c.value}</div>
      ${c.sub ? `<div class="kpi-sub">${c.sub}</div>` : ""}
    </div>`
    )
    .join("");
}

function renderTable(rows, totalGross) {
  const body = document.getElementById("tableBody");
  const sorted = [...rows].sort((a, b) => b.gross_sales - a.gross_sales);

  body.innerHTML = sorted
    .map((c) => {
      const share = c.gross_sales / totalGross;
      const m3 = c.margin3_pending || c.margin3_pct === null
        ? `<span class="pending">pending</span>`
        : fmtPct(c.margin3_pct);
      const rowClass = c.brand === "corro" ? "brand-corro" : c.brand === "cavali" ? "brand-cavali" : "";
      const tag =
        c.brand === "corro"
          ? `<span class="brand-tag corro">CORRO</span>`
          : c.brand === "cavali"
          ? `<span class="brand-tag cavali">CAVALI</span>`
          : "";
      return `
      <tr class="${rowClass}">
        <td>${tag}${c.name}${c.note ? `<span class="channel-note">${c.note}</span>` : ""}</td>
        <td class="share-cell">
          <span class="share-pct">${fmtPct(share)}</span>
          <div class="share-bar-track"><div class="share-bar-fill" style="width:${(share * 100).toFixed(1)}%"></div></div>
        </td>
        <td>${fmtUSD(c.gross_sales)}</td>
        <td>${fmtUSD(c.net_sales)}</td>
        <td>${fmtPct(c.margin1_pct)}</td>
        <td>${fmtPct(c.margin2_pct)}</td>
        <td>${m3}</td>
      </tr>`;
    })
    .join("");

  const totalNet = rows.reduce((s, c) => s + c.net_sales, 0);
  document.getElementById("tableFoot").innerHTML = `
    <tr>
      <td>Total</td>
      <td class="share-cell">100.0%</td>
      <td>${fmtUSD(totalGross)}</td>
      <td>${fmtUSD(totalNet)}</td>
      <td colspan="3"></td>
    </tr>`;
}
