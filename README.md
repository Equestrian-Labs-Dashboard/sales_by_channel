# Sales by Channel — Corro & Cavali

Static dashboard (GitHub Pages) for the sales-by-channel report: full table with share, Gross Sales, Net Sales and Gross Margin 1/2/3, filterable by brand and period.

## Structure

```
sales-per-channel/
├── index.html
├── styles.css
├── app.js
├── data/
│   └── sales-channels.json     ← sample data, replace with the real ETL output
└── .github/workflows/
    └── update-data.yml         ← stub to automate the refresh (4 Shopify stores + QBO)
```

No build step: plain HTML/CSS/JS, same pattern as the AP dashboard and the subscription dashboard. To publish on GitHub Pages, push this folder to a repo and point Pages at `main` / `root`.

## What's in the draft

- Brand filter: **All brands / Corro / Cavali**, with each brand color-coded (Corro `#9C5F3C`, Cavali `#3C6E71` in light mode — both shift lighter in dark mode). "All brands" combines both, channel by channel, with margins weighted by net sales.
- Period filter: Q1/Q2/Q3 2026 and "Last 3 months" as quick pills, plus an open date range (`dateFrom`/`dateTo`) already wired in the HTML, ready to connect to a real by-date query.
- Share, Gross Sales, Net Sales, Margin 1 and Margin 2 per channel, sorted by actual Gross Sales (not a fixed order) within whichever brand view is selected.
- Margin 3 marked **pending** for physical channels (HITS/Trailer, Wellington, New York/Silo) in both brands, since there's no shipping cost to pull from QBO for those yet. Fill in `margin3_pct` and flip `margin3_pending` to `false` in the JSON once that data is ready — no HTML/JS changes needed.
- Light/dark theme toggle styled as an actual sun/moon icon (inline SVG, not emoji), gold accent (`#B8863E` light / `#E3B764` dark), preference saved in the visitor's `localStorage`.

## Feeding `data/sales-channels.json` with real data

The JSON is built so the ETL only has to overwrite `channels[period].corro` and `channels[period].cavali`. Each channel entry needs:

| Field | Source | Detail |
|---|---|---|
| `gross_sales` | Shopify Admin API — `orders` | Sum of order totals per channel/sales location, per store, in the date range. |
| `discounts` | Shopify Admin API — `discount_applications` on each order | Net Sales = `gross_sales - discounts`. This is the key figure for Concierge, which historically discounts far more than Wellington. |
| `orders` | Shopify Admin API — `orders` count | Order volume per channel. |
| `margin1_pct`, `margin2_pct`, `margin3_pct` | QuickBooks Online API | COGS by class/channel for Margin 1; add direct channel operating costs for Margin 2; add shipping/fulfillment for Margin 3. |
| `margin3_pending` | — | `true` while the channel doesn't yet have a shipping cost loaded in QBO (typically physical channels). |

### Shopify connections — 1 store per brand

Set these as **GitHub repo secrets** (Settings → Secrets and variables → Actions):

| Secret | Value |
|---|---|
| `SHOPIFY_CORRO_DOMAIN` | `equestrian-labs.myshopify.com` |
| `SHOPIFY_CORRO_TOKEN` | Corro's Shopify Admin API token |
| `SHOPIFY_CAVALI_DOMAIN` | `cavali-club.myshopify.com` |
| `SHOPIFY_CAVALI_TOKEN` | Cavali's Shopify Admin API token |

The ETL script calls each brand's store with its own domain/token pair and writes that brand's channel rows directly — no combining needed at the Shopify layer.

QBO stays a single OAuth2 connection (reuse the refresh-token rotation already set up for the AP dashboard) — `QBO_CLIENT_ID`, `QBO_CLIENT_SECRET`, `QBO_REFRESH_TOKEN`, same as before.

`update-data.yml` is a stub with the shape of the job (daily cron, checkout, run the Python ETL, commit the updated JSON). Still missing:
1. The real extraction script (`scripts/fetch_sales_by_channel.py`) that pulls from all 4 Shopify stores + QBO and writes `data/sales-channels.json`.
2. The 8 Shopify secrets above, plus the 3 QBO secrets, added to the repo.

## Theme

Warm ivory/near-black base with a single gold accent (used for the toggle, active period pill, and share bars), plus a brand color per row (Corro terracotta, Cavali teal) so a mixed "All brands" view stays easy to scan. The sun/moon toggle is a real icon, not text — swaps between a sun (rays) and a crescent moon.
