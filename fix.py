import json
with open('data/sales-channels.json', 'r') as f:
    data = json.load(f)
for month in data['channels']:
    for channel in data['channels'][month]['equestrian_labs']:
        if channel['id'] == 'cavali' and month == '2026-07':
            channel['gross_sales'] = 2879.00
            channel['discounts'] = 1785.00
            channel['gross_profit'] = -40.00
            channel['orders'] = 23
            channel['net_sales'] = 1094.00
with open('data/sales-channels.json', 'w') as f:
    json.dump(data, f, indent=2)
