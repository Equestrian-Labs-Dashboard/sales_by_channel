import json
with open('data/sales-channels.json', 'r') as f:
    data = json.load(f)

for period_id, pdata in data['channels'].items():
    if 'equestrian_labs' in pdata:
        for row in pdata['equestrian_labs']:
            if row.get('net_sales') is None:
                row['net_sales'] = round(row.get('gross_sales', 0.0) - row.get('discounts', 0.0) - row.get('sales_reversals', 0.0), 2)
            if row.get('gross_profit') in (None, 0.0) and row.get('margin1_pct') is not None:
                row['gross_profit'] = round(row['net_sales'] * row['margin1_pct'], 2)

with open('data/sales-channels.json', 'w') as f:
    json.dump(data, f, indent=2)
