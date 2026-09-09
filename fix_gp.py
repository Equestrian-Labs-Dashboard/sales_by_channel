import json
with open('data/sales-channels.json', 'r') as f:
    data = json.load(f)
for month in data['channels']:
    for channel in data['channels'][month]['equestrian_labs']:
        if channel.get('gross_profit', 0) == 0 and channel.get('net_sales', 0) > 0:
            if 'margin1_pct' in channel:
                channel['gross_profit'] = round(channel['net_sales'] * channel['margin1_pct'], 2)
            else:
                channel['gross_profit'] = round(channel['net_sales'] * 0.4, 2)
        elif channel.get('gross_profit', 0) == 0 and channel.get('gross_sales', 0) > 0:
            net = channel.get('gross_sales') - channel.get('discounts', 0) - channel.get('sales_reversals', 0)
            if 'margin1_pct' in channel:
                channel['gross_profit'] = round(net * channel['margin1_pct'], 2)
            else:
                channel['gross_profit'] = round(net * 0.4, 2)

with open('data/sales-channels.json', 'w') as f:
    json.dump(data, f, indent=2)
