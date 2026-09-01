const fmtUSD = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const fmtPct = (n) => (n * 100).toFixed(1) + "%";

const SUN_ICON = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"></path></svg>`;
const MOON_ICON = `<svg viewBox="0 0 24 24"><path d="M20 14.5a8.5 8.5 0 1 1-9.5-9.4 7 7 0 0 0 9.5 9.4z"></path></svg>`;

let DATA = null;
let activePeriod = null;

// ---------- Theme ----------
const themeToggle = document.getElementById("themeToggle");
const themeKnob = document.getElementById("themeKnob");

function setTheme(mode) {
  document.body.setAttribute("data-theme", mode);
  if (themeKnob) themeKnob.innerHTML = mode === "dark" ? MOON_ICON : SUN_ICON;
  if (themeToggle) themeToggle.setAttribute("aria-pressed", mode === "dark");
  localStorage.setItem("spc-theme", mode);
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const current = document.body.getAttribute("data-theme");
    setTheme(current === "dark" ? "light" : "dark");
  });
}

setTheme(localStorage.getItem("spc-theme") || "light");

// ---------- Data load ----------
fetch("data/sales-channels.json")
  .then((r) => r.json())
  .then((json) => {
    DATA = json;
    const updateLabel = document.getElementById("updatedLabel");
    if (updateLabel) updateLabel.textContent = "updated " + json.meta.last_updated;
    buildMonthSelect();
    const initial = json.periods[json.periods.length - 1];
    selectPeriod(initial.id);
  })
  .catch((err) => {
    const errBody = document.getElementById("tableBody");
    if (errBody) {
      errBody.innerHTML =
        `<tr><td colspan="7">Could not load data (${err.message}). Check data/sales-channels.json.</td></tr>`;
    }
  });

// ---------- Month select ----------
function buildMonthSelect() {
  const select = document.getElementById("monthSelect");
  if (!select) return;
  select.innerHTML = DATA.periods
    .map((p) => `<option value="${p.id}">${p.label}</option>`)
    .join("");
  select.addEventListener("change", () => selectPeriod(select.value));
}

function selectPeriod(periodId) {
  activePeriod = periodId;
  const select = document.getElementById("monthSelect");
  if (select) select.value = periodId;
  render(periodId);
}

// ---------- Data helpers ----------
function getRowsForPeriod(periodId) {
  const periodData = DATA.channels[periodId] || DATA.channels[Object.keys(DATA.channels)[0]];
  return (periodData.corro || []).map((c) => ({ ...c }));
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
  if (!el) return;
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

  if (body) {
    body.innerHTML = sorted
      .map((c) => {
        const share = c.gross_sales / totalGross;
        const m3 = c.margin3_pending || c.margin3_pct === null
          ? `<span class="pending">pending</span>`
          : fmtPct(c.margin3_pct);
        return `
        <tr>
          <td>${c.name}${c.note ? `<span class="channel-note">${c.note}</span>` : ""}</td>
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
  }

  const totalNet = rows.reduce((s, c) => s + c.net_sales, 0);
  const foot = document.getElementById("tableFoot");
  if (foot) {
    foot.innerHTML = `
      <tr>
        <td>Total</td>
        <td class="share-cell">100.0%</td>
        <td>${fmtUSD(totalGross)}</td>
        <td>${fmtUSD(totalNet)}</td>
        <td colspan="3"></td>
      </tr>`;
  }
}
