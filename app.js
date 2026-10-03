const fmtUSD = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const fmtPct = (n) => (n * 100).toFixed(1) + "%";

const CHANNEL_GROUPS = [
  { id: "paid_ads", name: "Paid Ads", aliases: ["paid_ads", "paid ads", "paid", "paid search", "paid social", "ads"] },
  { id: "direct", name: "Direct", aliases: ["direct"] },
  { id: "organic", name: "Organic", aliases: ["organic", "organic search", "organic social", "ecommerce", "e-commerce"] },
  { id: "smartrr", name: "Smartrr", aliases: ["smartrr", "smart rr", "subscription", "subscriptions"] },
  { id: "others", name: "Others", aliases: ["others", "other"] },
];

const CAVALI_GROUP = { id: "cavali", name: "Cavali Club" };

const GROUP_BY_ALIAS = CHANNEL_GROUPS.reduce((acc, group) => {
  group.aliases.forEach((alias) => {
    acc[normalizeKey(alias)] = group.id;
  });
  return acc;
}, {});

const SUN_ICON  = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"></path></svg>`;
const MOON_ICON = `<svg viewBox="0 0 24 24"><path d="M20 14.5a8.5 8.5 0 1 1-9.5-9.4 7 7 0 0 0 9.5 9.4z"></path></svg>`;

let DATA          = null;
let activePeriod  = null;
let activeYear    = null;
let activeBrand   = "all";

document.querySelectorAll(".view-tab").forEach((tab) => {
  tab.addEventListener("click", () => setActiveView(tab.id === "summaryTab" ? "summary" : "detail"));
});

function setActiveView(view) {
  const isSummary = view === "summary";
  document.getElementById("detailTab")?.classList.toggle("active", !isSummary);
  document.getElementById("summaryTab")?.classList.toggle("active", isSummary);
  document.getElementById("detailTab")?.setAttribute("aria-selected", String(!isSummary));
  document.getElementById("summaryTab")?.setAttribute("aria-selected", String(isSummary));
  document.getElementById("detailView")?.classList.toggle("active", !isSummary);
  document.getElementById("summaryView")?.classList.toggle("active", isSummary);
  if (document.getElementById("detailView")) document.getElementById("detailView").hidden = isSummary;
  if (document.getElementById("summaryView")) document.getElementById("summaryView").hidden = !isSummary;
}

function rowBrand(row) {
  return normalizeKey(row.id) === "cavali" || normalizeKey(row.name) === "cavali" || normalizeKey(row.name) === "cavali club"
    ? "cavali"
    : "corro";
}

function filterRowsByBrand(rows) {
  if (activeBrand === "all") return rows;
  return rows.filter((row) => rowBrand(row) === activeBrand);
}

function selectBrand(brand) {
  activeBrand = ["all", "corro", "cavali"].includes(brand) ? brand : "all";
  document.querySelectorAll(".brand-btn").forEach((btn) => {
    const active = btn.dataset.brand === activeBrand;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", String(active));
  });

  const subtitle = document.getElementById("brandSubtitle");
  if (subtitle) {
    const label = activeBrand === "corro" ? "Corro" : activeBrand === "cavali" ? "Cavali Club" : "Corro + Cavali Club";
    subtitle.textContent = `${label} — channel-by-channel performance`;
  }

  if (activePeriod) render(activePeriod);
}

// ---------- Theme ----------
const themeToggle = document.getElementById("themeToggle");
const themeKnob   = document.getElementById("themeKnob");

function setTheme(mode) {
  document.body.setAttribute("data-theme", mode);
  if (themeKnob)   themeKnob.innerHTML = mode === "dark" ? MOON_ICON : SUN_ICON;
  if (themeToggle) themeToggle.setAttribute("aria-pressed", mode === "dark");
  localStorage.setItem("spc-theme", mode);
}
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    setTheme(document.body.getAttribute("data-theme") === "dark" ? "light" : "dark");
  });
}
setTheme(localStorage.getItem("spc-theme") || "dark");

// ---------- Data load ----------
fetch("data/sales-channels.json?v=" + new Date().getTime())
  .then((r) => r.json())
  .then((json) => {
    DATA = json;
    const updateLabel = document.getElementById("updatedLabel");
    if (updateLabel) updateLabel.textContent = "updated " + json.meta.last_updated;

    buildYearButtons();

    // Default: most recent CLOSED month
    const now = new Date();
    const currentId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const closedPeriods = json.periods.filter((p) => p.id !== currentId);
    const defaultPeriod = closedPeriods.length
      ? closedPeriods[closedPeriods.length - 1]
      : json.periods[json.periods.length - 1];

    const defaultYear = defaultPeriod.id.slice(0, 4);
    selectYear(defaultYear, defaultPeriod.id);
  })
  .catch((err) => {
    const errBody = document.getElementById("tableBody");
    if (errBody)
      errBody.innerHTML = `<tr><td colspan="9">Could not load data (${err.message}). Check data/sales-channels.json.</td></tr>`;
  });

// ---------- Year buttons ----------
function buildYearButtons() {
  const container = document.getElementById("yearButtons");
  if (!container) return;

  // Show all years in data, plus 2025 placeholder if not present, starting from 2025
  const yearsInData = [...new Set(DATA.periods.map((p) => p.id.slice(0, 4)))].sort();
  const allYears    = yearsInData.filter((y) => parseInt(y) >= 2025);

  container.innerHTML = allYears
    .map((yr) => `<button class="year-btn" data-year="${yr}" onclick="selectYear('${yr}')">${yr}</button>`)
    .join("");
}

function selectYear(year, keepPeriod) {
  activeYear = year;

  // Highlight active year button
  document.querySelectorAll(".year-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.year === year);
  });

  // Rebuild period dropdown for this year
  buildPeriodSelect(year);

  // If a specific period was requested, use it; otherwise default to first option
  if (keepPeriod && keepPeriod.startsWith(year)) {
    selectPeriod(keepPeriod);
  } else {
    const select = document.getElementById("monthSelect");
    if (select && select.options.length > 0) {
      selectPeriod(select.options[0].value);
    }
  }
}

// ---------- Period dropdown (scoped to selected year) ----------
function buildPeriodSelect(year) {
  const select = document.getElementById("monthSelect");
  if (!select) return;

  const now       = new Date();
  const currentId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const yrPeriods    = DATA.periods.filter((p) => p.id.startsWith(year));
  const closedInYear = yrPeriods.filter((p) => p.id !== currentId);
  const currentInYear = yrPeriods.find((p) => p.id === currentId);

  let options = "";

  // Full Year (YTD) at the top — only if there are closed months
  if (closedInYear.length > 0) {
    const lastMonthName = closedInYear[closedInYear.length - 1].label.split(" ")[0];
    options += `<option value="ytd-${year}">Full Year ${year}  (Jan - ${lastMonthName})</option>`;
  }

  // Individual months — most recent first
  [...closedInYear].reverse().forEach((p) => {
    options += `<option value="${p.id}">${p.label}</option>`;
  });

  // Current in-progress month at the bottom
  if (currentInYear) {
    options += `<option value="${currentInYear.id}">${currentInYear.label} (in progress)</option>`;
  }

  // If no data for this year yet
  if (!options) {
    options = `<option value="">No data for ${year}</option>`;
  }

  select.innerHTML = options;

  // Only attach listener once — remove old and re-add
  select.onchange = () => selectPeriod(select.value);
}

function selectPeriod(periodId) {
  activePeriod = periodId;
  const select = document.getElementById("monthSelect");
  if (select && periodId) select.value = periodId;
  if (periodId) render(periodId);
}

// ---------- Data helpers ----------
function getRowsForPeriod(periodId) {
  // Full Year (YTD) — aggregate all closed months of the year
  if (periodId && periodId.startsWith("ytd-")) {
    const yr = periodId.slice(4);
    const now = new Date();
    const currentId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthIds = DATA.periods
      .filter((p) => p.id.startsWith(yr) && p.id !== currentId)
      .map((p) => p.id);
    return aggregateRows(monthIds);
  }

  // Single month
  const periodData = DATA.channels[periodId] || DATA.channels[Object.keys(DATA.channels)[0]];
  const all = [];
  Object.entries(periodData).forEach(([brand, rows]) => {
    (rows || []).forEach((c) => all.push({ ...c, brand }));
  });
  return all;
}

function aggregateRows(periodIds) {
  const byChannel = {};

  periodIds.forEach((pid) => {
    const periodData = DATA.channels[pid];
    if (!periodData) return;
    Object.entries(periodData).forEach(([brand, rows]) => {
      (rows || []).forEach((c) => {
        const key = c.id;
        if (!byChannel[key]) {
          byChannel[key] = {
            ...c, brand,
            gross_sales: 0, net_sales: 0, discounts: 0,
            sales_reversals: 0, gross_profit: 0,
            orders: 0, units: 0, _gpMonths: 0,
          };
        }
        const agg = byChannel[key];
        agg.gross_sales     += c.gross_sales     || 0;
        agg.net_sales       += c.net_sales       || 0;
        agg.discounts       += c.discounts       || 0;
        agg.sales_reversals += c.sales_reversals || 0;
        agg.orders          += c.orders          || 0;
        agg.units           += c.units           || 0;
        if (c.gross_profit != null) {
          agg.gross_profit += c.gross_profit;
          agg._gpMonths++;
        }
      });
    });
  });

  return Object.values(byChannel).map((r) => ({
    ...r,
    gross_profit: r._gpMonths > 0 ? r.gross_profit : null,
    margin1_pct:  r._gpMonths > 0 && r.net_sales > 0 ? r.gross_profit / r.net_sales : null,
  }));
}

function normalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getChannelGroup(row) {
  const idKey = normalizeKey(row.id);
  const nameKey = normalizeKey(row.name);

  // Cavali Club is a separate store/channel. It must never inflate the
  // Unmapped/Unclassified count used to assess Corro channel mapping quality.
  if (rowBrand(row) === "cavali") return "cavali";

  if (["unclassified", "unmapped"].includes(idKey) || ["unclassified", "unmapped"].includes(nameKey)) {
    return "unmapped";
  }

  // Known aliases map into the adjusted summary. Unknown Corro rows remain
  // genuinely unmapped instead of being silently folded into Others.
  return GROUP_BY_ALIAS[idKey] || GROUP_BY_ALIAS[nameKey] || "unmapped";
}

function emptyGroupedRows() {
  return CHANNEL_GROUPS.map((group) => ({
    id: group.id,
    name: group.name,
    gross_sales: 0,
    net_sales: 0,
    discounts: 0,
    sales_reversals: 0,
    gross_profit: 0,
    orders: 0,
    units: 0,
    _gpKnown: 0,
  }));
}

function addIntoGroup(group, row, ratio = 1) {
  group.gross_sales += (row.gross_sales || 0) * ratio;
  group.net_sales += (row.net_sales || 0) * ratio;
  group.discounts += (row.discounts || 0) * ratio;
  group.sales_reversals += (row.sales_reversals || 0) * ratio;
  group.orders += (row.orders || 0) * ratio;
  group.units += (row.units || 0) * ratio;
  if (row.gross_profit != null) {
    group.gross_profit += row.gross_profit * ratio;
    group._gpKnown += 1;
  }
}

function buildChannelSummary(rows) {
  const grouped = emptyGroupedRows();
  const byId = grouped.reduce((acc, group) => {
    acc[group.id] = group;
    return acc;
  }, {});
  const unmapped = [];
  const cavaliRows = [];

  rows.forEach((row) => {
    const groupId = getChannelGroup(row);
    if (groupId === "cavali") {
      cavaliRows.push(row);
      return;
    }
    if (groupId === "unmapped") {
      unmapped.push(row);
      return;
    }
    addIntoGroup(byId[groupId], row);
  });

  const mappedGross = grouped.reduce((sum, row) => sum + row.gross_sales, 0);
  const unmappedGross = unmapped.reduce((sum, row) => sum + (row.gross_sales || 0), 0);
  const cavaliGross = cavaliRows.reduce((sum, row) => sum + (row.gross_sales || 0), 0);

  // Allocate only Corro's unmapped sales. Cavali Club is intentionally excluded
  // from both the unmapped numerator and the mapping-coverage denominator.
  if (mappedGross > 0 && unmapped.length > 0) {
    grouped.forEach((group) => {
      const ratio = group.gross_sales / mappedGross;
      unmapped.forEach((row) => addIntoGroup(group, row, ratio));
    });
  } else if (unmapped.length > 0) {
    unmapped.forEach((row) => addIntoGroup(byId.others, row));
  }

  const cavaliSummary = {
    id: CAVALI_GROUP.id,
    name: CAVALI_GROUP.name,
    gross_sales: cavaliRows.reduce((sum, row) => sum + (row.gross_sales || 0), 0),
    net_sales: cavaliRows.reduce((sum, row) => sum + (row.net_sales || 0), 0),
    discounts: cavaliRows.reduce((sum, row) => sum + (row.discounts || 0), 0),
    sales_reversals: cavaliRows.reduce((sum, row) => sum + (row.sales_reversals || 0), 0),
    gross_profit: cavaliRows.some((row) => row.gross_profit != null)
      ? cavaliRows.reduce((sum, row) => sum + (row.gross_profit || 0), 0)
      : null,
    orders: cavaliRows.reduce((sum, row) => sum + (row.orders || 0), 0),
    units: cavaliRows.reduce((sum, row) => sum + (row.units || 0), 0),
  };
  cavaliSummary.margin1_pct = cavaliSummary.gross_profit != null && cavaliSummary.net_sales > 0
    ? cavaliSummary.gross_profit / cavaliSummary.net_sales
    : null;

  const mappedRows = grouped.map((row) => ({
    ...row,
    gross_sales: Math.round(row.gross_sales * 100) / 100,
    net_sales: Math.round(row.net_sales * 100) / 100,
    gross_profit: row._gpKnown > 0 ? Math.round(row.gross_profit * 100) / 100 : null,
    margin1_pct: row._gpKnown > 0 && row.net_sales > 0 ? row.gross_profit / row.net_sales : null,
    orders: Math.round(row.orders),
    units: Math.round(row.units),
  }));

  const mappingDenominator = mappedGross + unmappedGross;
  return {
    rows: cavaliGross > 0 ? [...mappedRows, cavaliSummary] : mappedRows,
    unmappedGross,
    unmappedShare: mappingDenominator > 0 ? unmappedGross / mappingDenominator : 0,
    unmappedWasAllocated: unmappedGross > 0,
    mappingCoverage: mappingDenominator > 0 ? mappedGross / mappingDenominator : null,
    cavaliExcludedGross: cavaliGross,
    cavaliExcludedFromMapping: cavaliGross > 0,
  };
}

// ---------- Render ----------
function render(periodId) {
  const rows = filterRowsByBrand(getRowsForPeriod(periodId));
  const enriched = rows.map((c) => ({
    ...c,
    net_sales: Number.isFinite(c.net_sales)
      ? c.net_sales
      : (c.gross_sales - (c.discounts || 0) - (c.sales_reversals || 0)),
  }));

  const summary          = buildChannelSummary(enriched);
  const totalGross       = enriched.reduce((s, c) => s + c.gross_sales, 0);
  const totalNet         = enriched.reduce((s, c) => s + c.net_sales, 0);
  const gpKnownRows      = enriched.filter((c) => c.gross_profit != null);
  const totalGrossProfit = gpKnownRows.reduce((s, c) => s + c.gross_profit, 0);
  const isPartialGP      = gpKnownRows.length < enriched.length;
  const weightedM1       = totalNet > 0 ? totalGrossProfit / totalNet : 0;
  const totalOrders      = enriched.reduce((s, c) => s + (c.orders || 0), 0);
  const totalUnits       = enriched.reduce((s, c) => s + (c.units  || 0), 0);

  renderKPIs(totalGross, totalNet, totalGrossProfit, weightedM1, totalOrders, isPartialGP);
  renderDetailTable(enriched, totalGross, totalNet, totalGrossProfit, totalOrders, totalUnits);
  renderSummaryTable(summary.rows, totalGross, summary);
}

function renderKPIs(totalGross, totalNet, totalGrossProfit, weightedM1, totalOrders, isPartialGP) {
  const el = document.getElementById("kpiRow");
  if (!el) return;
  const cards = [
    { label: "Gross Sales",    value: fmtUSD(totalGross) },
    { label: "Net Sales",      value: fmtUSD(totalNet), sub: totalGross > 0 ? fmtPct(totalNet / totalGross) + " of gross" : "—" },
    { label: "Gross Profit",   value: fmtUSD(totalGrossProfit), sub: isPartialGP ? "partial - some channels pending QBO" : undefined },
    { label: "Gross Margin 1", value: fmtPct(weightedM1), sub: isPartialGP ? "partial" : undefined },
    { label: "Orders",         value: totalOrders.toLocaleString("en-US") },
  ];
  el.innerHTML = cards
    .map((c) => `
    <div class="kpi">
      <div class="kpi-label">${c.label}</div>
      <div class="kpi-value">${c.value}</div>
      ${c.sub ? `<div class="kpi-sub">${c.sub}</div>` : ""}
    </div>`)
    .join("");
}

function renderDetailTable(rows, totalGross, totalNet, totalGrossProfit, totalOrders, totalUnits) {
  const body   = document.getElementById("tableBody");
  const sorted = [...rows].sort((a, b) => b.gross_sales - a.gross_sales);

  if (body) {
    body.innerHTML = sorted.map((c) => {
      const share = totalGross > 0 ? c.gross_sales / totalGross : 0;
      const hasGP            = c.gross_profit != null;
      const hasMargin        = c.margin1_pct  != null;
      const grossProfitLabel = hasGP     ? fmtUSD(c.gross_profit) : "-";
      const marginLabel      = hasMargin ? fmtPct(c.margin1_pct)  : "-";
      const orders = c.orders || 0;
      const units  = c.units  || 0;
      const aov    = orders > 0 ? fmtUSD(c.gross_sales / orders) : "-";
      const upo    = orders > 0 ? (units / orders).toFixed(2)    : "-";

      return `
        <tr>
          <td>${rowBrand(c) === "cavali" ? "Cavali Club" : c.name}${c.note ? `<span class="channel-note">${c.note}</span>` : ""}</td>
          <td class="share-cell">
            <span class="share-pct">${fmtPct(share)}</span>
            <div class="share-bar-track"><div class="share-bar-fill" style="width:${(share * 100).toFixed(1)}%"></div></div>
          </td>
          <td>${fmtUSD(c.gross_sales)}</td>
          <td>${fmtUSD(c.net_sales)}</td>
          <td>${grossProfitLabel}</td>
          <td>${marginLabel}</td>
          <td>${orders.toLocaleString("en-US")}</td>
          <td>${aov}</td>
          <td>${upo}</td>
        </tr>`;
    }).join("");
  }

  const foot = document.getElementById("tableFoot");
  if (foot) {
    foot.innerHTML = `
      <tr>
        <td>Total</td>
        <td class="share-cell">100.0%</td>
        <td>${fmtUSD(totalGross)}</td>
        <td>${fmtUSD(totalNet)}</td>
        <td>${fmtUSD(totalGrossProfit)}</td>
        <td></td>
        <td>${totalOrders.toLocaleString("en-US")}</td>
        <td>${totalOrders > 0 ? fmtUSD(totalGross / totalOrders) : "-"}</td>
        <td>${totalOrders > 0 ? (totalUnits / totalOrders).toFixed(2) : "-"}</td>
      </tr>`;
  }
}

function renderSummaryTable(rows, totalGross, summary) {
  const body = document.getElementById("summaryTableBody");
  const preferredOrder = [...CHANNEL_GROUPS.map((group) => group.id), CAVALI_GROUP.id];
  const sorted = preferredOrder.map((id) => rows.find((row) => row.id === id)).filter(Boolean);

  if (body) {
    body.innerHTML = sorted.map((c) => {
      const share = totalGross > 0 ? c.gross_sales / totalGross : 0;
      return `
        <tr class="${c.id === "cavali" ? "cavali-summary-row" : ""}">
          <td>${c.name}</td>
          <td>${fmtUSD(c.gross_sales)}</td>
          <td class="share-cell">
            <span class="share-pct">${fmtPct(share)}</span>
            <div class="share-bar-track"><div class="share-bar-fill" style="width:${(share * 100).toFixed(1)}%"></div></div>
          </td>
        </tr>`;
    }).join("");
  }

  const foot = document.getElementById("summaryTableFoot");
  if (foot) {
    foot.innerHTML = `
      <tr>
        <td>Total</td>
        <td>${fmtUSD(totalGross)}</td>
        <td class="share-cell">100.0%</td>
      </tr>`;
  }

  const note = document.getElementById("methodologyNote");
  if (note) {
    const pieces = [];
    if (summary.unmappedWasAllocated) {
      pieces.push(`Unmapped Corro sales were proportionally allocated across identified Corro groups. Before allocation, Unmapped was ${fmtUSD(summary.unmappedGross)} (${fmtPct(summary.unmappedShare)} of Corro mapping-eligible sales).`);
    } else {
      pieces.push("No Unmapped Corro sales were detected for this selection.");
    }
    if (summary.cavaliExcludedFromMapping) {
      pieces.push(`Cavali Club (${fmtUSD(summary.cavaliExcludedGross)}) is shown separately and is excluded from both the Unmapped count and mapping-coverage denominator.`);
    }
    if (summary.mappingCoverage != null) {
      pieces.push(`Corro mapping coverage before allocation: ${fmtPct(summary.mappingCoverage)}.`);
    } else if (activeBrand === "cavali") {
      pieces.push("Corro mapping coverage is not applicable in the Cavali Club-only view.");
    }
    note.textContent = `Note: ${pieces.join(" ")}`;
  }
}
