import re

with open('scripts/fetch_sales_by_channel.py', 'r', encoding='utf-8') as f:
    text = f.read()

prefix, _, _ = text.partition('cavali_totals = sales_totals_by_brand.get("cavali")')

new_end = '''cavali_totals = sales_totals_by_brand.get("cavali")

    for row in rows:
        if row["id"] == "cavali":
            if cavali_totals:
                row["gross_sales"] = cavali_totals["gross_sales"]
                row["discounts"] = cavali_totals["discounts"]
                row["net_sales"] = cavali_totals["net_sales"]
                row["gross_profit"] = cavali_totals["gross_profit"]
                row["margin1_pct"] = cavali_totals["margin1_pct"]
                row["margin1_source"] = "Shopify ShopifyQL (exact \u2014 single-channel store)"
        elif row["id"] in corro_location_totals:
            loc = corro_location_totals[row["id"]]
            row["gross_sales"] = loc["gross_sales"]
            row["discounts"] = loc["discounts"]
            row["net_sales"] = loc["net_sales"]
            row["gross_profit"] = loc["gross_profit"]
            row["margin1_pct"] = loc["margin1_pct"]
            row["margin1_source"] = "Shopify ShopifyQL (exact \u2014 Gross Profit by Location)"
        else:
            # Concierge / E-Commerce / Others: no native per-tag Shopify
            row["margin1_pct"] = None
            row["gross_profit"] = None
            row["margin1_source"] = "Pending QuickBooks Online by-class"

    margins = fetch_qbo_margins("equestrian_labs", year, month)
    for row in rows:
        m = margins.get(row["id"])
        if m:
            row.update(m)
        
        # fallback calculations
        if row.get("net_sales") is None:
            row["net_sales"] = round(row.get("gross_sales", 0.0) - row.get("discounts", 0.0) - row.get("sales_reversals", 0.0), 2)
            
        if row.get("gross_profit") is None and row.get("margin1_pct") is not None:
            row["gross_profit"] = round(row["net_sales"] * row["margin1_pct"], 2)

    data["channels"][period_id]["equestrian_labs"] = rows

    data["meta"] = {
        "currency": "USD",
        "last_updated": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "brands": BRANDS,
        "source": {
            "gross_sales_and_discounts": "Shopify Admin API (orders, discount_applications) \u2014 1 store per brand",
            "cogs_and_margins": "Fallback estimation (until QBO mapped by channel/class)",
        },
        "note": "Live data from Shopify.",
    }

def main():
    now = datetime.now(timezone.utc)
    data = json.loads(DATA_PATH.read_text()) if DATA_PATH.exists() else {
        "meta": {}, "periods": [], "channels": {},
    }
    
    # Process from Jan 2026 to current month
    start_month = 1
    end_month = now.month
    
    for month in range(start_month, end_month + 1):
        process_month(2026, month, data)
        
    DATA_PATH.write_text(json.dumps(data, indent=2) + "\\n")

if __name__ == "__main__":
    main()
'''

with open('scripts/fetch_sales_by_channel.py', 'w', encoding='utf-8') as f:
    f.write(prefix + new_end)
