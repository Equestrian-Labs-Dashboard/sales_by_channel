const fmtUSD = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const fmtPct = (n) => (n * 100).toFixed(1) + "%";

let DATA = null;
let activePeriod = null;

// ---------- Theme ----------
const themeToggle = document.getElementById("themeToggle");
const themeKnob = document.getElementById("themeKnob");

function setTheme(mode) {
  document.body.setAttribute("data-theme", mode);
  themeKnob.textContent = mode === "dark" ? "☾" : "☀";
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
    document.getElementById("updatedLabel").textContent = "actualizado " + json.meta.last_updated;
    buildPeriodButtons();
    const initial = json.periods.find((p) => p.id === "2026-q3") || json.periods[0];
    selectPeriod(initial.id);
  })
  .catch((err) => {
    document.getElementById("tableBody").innerHTML =
      `<tr><td colspan="7">No se pudieron cargar los datos (${err.message}). Verifica data/sales-channels.json.</td></tr>`;
  });

// ---------- Period controls ----------
function buildPeriodButtons() {
  const container = document.getElementById("periodButtons");
  container.innerHTML = "";
  DATA.periods.forEach((p) => {
    const btn = document.createElement("button");
    btn.className = "period-btn";
    btn.textContent = p.label;
    btn.dataset.period = p.id;
    btn.addEventListener("click", () => selectPeriod(p.id));
    container.appendChild(btn);
  });
}

function selectPeriod(periodId) {
  activePeriod = periodId;
  document.querySelectorAll(".period-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.period === periodId);
  });
  const period = DATA.periods.find((p) => p.id === periodId);
  if (period) {
    document.getElementById("dateFrom").value = period.start;
    document.getElementById("dateTo").value = period.end;
  }
  render(periodId);
}

document.getElementById("dateFrom").addEventListener("change", clearActivePeriodButtons);
document.getElementById("dateTo").addEventListener("change", clearActivePeriodButtons);

function clearActivePeriodButtons() {
  // Rango personalizado: por ahora se sigue mostrando el período de datos activo
  // (el filtro de fecha abierto queda listo para conectarse a la fuente real por fecha).
  document.querySelectorAll(".period-btn").forEach((b) => b.classList.remove("active"));
}

// ---------- Render ----------
function render(periodId) {
  const rows = DATA.channels[periodId] || DATA.channels[Object.keys(DATA.channels)[0]];
  const enriched = rows.map((c) => {
    const net = c.gross_sales - c.discounts;
    return { ...c, net_sales: net };
  });

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
    { label: "Net Sales", value: fmtUSD(totalNet), sub: fmtPct(totalNet / totalGross) + " del gross" },
    { label: "Gross Margin 1 (ponderado)", value: fmtPct(weightedM1) },
    { label: "Órdenes", value: totalOrders.toLocaleString("en-US") },
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
      const m3 = c.margin3_pending
        ? `<span class="pending">pendiente</span>`
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
