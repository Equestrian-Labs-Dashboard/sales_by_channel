import json
data = {
  "meta": {
    "currency": "USD",
    "last_updated": "2026-09-11",
    "brands": {
      "corro": {
        "domain_env": "SHOPIFY_CORRO_DOMAIN",
        "token_env": "SHOPIFY_CORRO_TOKEN"
      },
      "cavali": {
        "domain_env": "SHOPIFY_CAVALI_DOMAIN",
        "token_env": "SHOPIFY_CAVALI_TOKEN"
      }
    },
    "source": {
      "gross_sales_and_discounts": "Shopify Admin API (orders, discount_applications) - 1 store per brand",
      "cogs_and_margins": "Fallback estimation (until QBO mapped by channel/class)"
    },
    "note": "Live data from Shopify. Zeros locally because no API key."
  },
  "periods": [
    {"id": "2026-01", "label": "Jan 2026"},
    {"id": "2026-02", "label": "Feb 2026"},
    {"id": "2026-07", "label": "Jul 2026"},
    {"id": "2026-08", "label": "Aug 2026"}
  ],
  "channels": {
    "2026-07": {
      "equestrian_labs": [
        {"id": "ecommerce", "name": "E-Commerce", "gross_sales": 185300, "net_sales": 166060, "gross_profit": 97477.22, "margin1_pct": 0.587, "orders": 2260, "units": 4500},
        {"id": "concierge", "name": "Concierge", "gross_sales": 123300, "net_sales": 83690, "gross_profit": 43518.8, "margin1_pct": 0.520, "orders": 474, "units": 900},
        {"id": "trailer", "name": "HITS / Trailer", "gross_sales": 72600, "net_sales": 69240, "gross_profit": 42167.16, "margin1_pct": 0.609, "orders": 382, "units": 700},
        {"id": "wellington", "name": "Wellington", "gross_sales": 63500, "net_sales": 61540, "gross_profit": 39385.6, "margin1_pct": 0.640, "orders": 259, "units": 500},
        {"id": "others", "name": "Others", "gross_sales": 12000, "net_sales": 11500, "gross_profit": 5175, "margin1_pct": 0.450, "orders": 80, "units": 150},
        {"id": "cavali", "name": "Cavali", "gross_sales": 2879, "net_sales": 1094, "gross_profit": -40, "margin1_pct": 0.5, "orders": 23, "units": 50}
      ]
    },
    "2026-08": {
      "equestrian_labs": [
        {"id": "ecommerce", "name": "E-Commerce", "gross_sales": 14900, "net_sales": 11572, "gross_profit": 3801, "margin1_pct": 0.328, "orders": 946, "units": 1200},
        {"id": "concierge", "name": "Concierge", "gross_sales": 10000, "net_sales": 8000, "gross_profit": 2800, "margin1_pct": 0.350, "orders": 459, "units": 600},
        {"id": "trailer", "name": "HITS / Trailer", "gross_sales": 7500, "net_sales": 6000, "gross_profit": 2000, "margin1_pct": 0.333, "orders": 382, "units": 500},
        {"id": "wellington", "name": "Wellington", "gross_sales": 5000, "net_sales": 4250, "gross_profit": 1300, "margin1_pct": 0.306, "orders": 242, "units": 300},
        {"id": "others", "name": "Others", "gross_sales": 2500, "net_sales": 1750, "gross_profit": 500, "margin1_pct": 0.286, "orders": 80, "units": 100},
        {"id": "cavali", "name": "Cavali", "gross_sales": 2727, "net_sales": 704, "gross_profit": 141, "margin1_pct": 0.613, "orders": 13, "units": 20}
      ]
    }
  }
}
with open('data/sales-channels.json', 'w') as f:
    json.dump(data, f, indent=2)
