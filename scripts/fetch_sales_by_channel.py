#!/usr/bin/env python3
"""
Fetch real sales-by-channel data from Shopify (1 store per brand) and
QuickBooks Online, and write data/sales-channels.json in the shape the
dashboard (app.js) expects.

Run locally for testing:
    export SHOPIFY_CORRO_DOMAIN=equestrian-labs.myshopify.com
    export SHOPIFY_CORRO_TOKEN=shpat_xxx
    export SHOPIFY_CAVALI_DOMAIN=cavali-club.myshopify.com
    export SHOPIFY_CAVALI_TOKEN=shpat_xxx
    python scripts/fetch_sales_by_channel.py

In GitHub Actions these come from repo secrets (see update-data.yml).

STATUS: Shopify extraction (gross_sales, discounts, orders) is implemented
below. QBO margin extraction (margin1_pct/margin2_pct/margin3_pct) is left
as a stub — see fetch_qbo_margins() — because it needs the same OAuth2
refresh-token flow already wired for the AP dashboard, which isn't in this
repo. Wire that in fetch_qbo_margins() following the same pattern.

CHANNEL MAPPING — fill this in before running for real.
Each channel is identified by exactly ONE of: shopify "location",
a "customer_tag", an "order_tag", or a "product_tag". Order of matching
matters: location is checked first (it's the most reliable signal for
physical/in-person sales), then order tag, then customer tag, then
product tag. Anything that matches nothing falls into "others".
"""

import json
import os
import sys
import time
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import requests

REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = REPO_ROOT / "data" / "sales-channels.json"
SHOPIFY_API_VERSION = "2024-10"

# ---------------------------------------------------------------------------
# CHANNEL MAPPING
# Confirmed from three real sources you've shared:
#   1. Wellington Commissions Apps Script -> Location "New Wellington
#      Warehouse" (id 63267766330) defines the Wellington channel.
#   2. HITS Hudson report-config.json + generate-report-data.js -> Location
#      "Corro Trailer 1" (id 67063775290) OR order tag "HitsHudson", MINUS
#      orders tagged "employee"/"concierge" that don't also carry
#      "HitsHudson".
#   3. The "Tag Product" formula from your Sheet (regex on Order tag /
#      Product tag columns) -> this is the real rule your team already uses
#      to bucket everything else:
#         product tag contains "Drop ship"          -> Drop ship
#         product tag contains "Shopify Collective"  -> Shopify Collective
#         order tag contains "Concierge"              -> Concierge
#         product tag contains "Legacy"                -> Legacy
#         else                                          -> e-commerce
#      Drop ship / Shopify Collective / Legacy aren't in the dashboard's 8
#      channels, so they're folded into "Others" (with the specific reason
#      kept on the row's `note` field) until you tell us otherwise.
# Still TODO / unconfirmed: Silo, Cavalli, Brothery.
# ---------------------------------------------------------------------------

CHANNEL_ORDER = {
    "equestrian_labs": ["cavali", "ecommerce", "concierge", "trailer", "wellington", "others"]
}

CHANNEL_NAMES = {
    "cavali": "cavali",
    "ecommerce": "E-Commerce",
    "concierge": "Concierge",
    "trailer": "HITS / Trailer",
    "wellington": "Wellington",
    "others": "Others"
}

# Physical channels identified by Shopify Location (name match, case-insensitive).
LOCATION_TO_CHANNEL = {
    "corro": {
        "new wellington warehouse": "wellington",
        # HITS/Trailer ("corro trailer 1") is handled by the dedicated HITS
        # rule below, not through this plain lookup — it's location OR tag,
        # with exclusions.
        # "silo new york": "silo",   # TODO: confirm Silo's location name/id
    },
    "cavali": {
        # TODO: confirm equivalent location names for the Cavali store.
    },
}

# HITS/Trailer confirmed rule (generate-report-data.js):
#   include if (order tag == "HitsHudson") OR (location == "Corro Trailer 1"),
#   EXCEPT exclude orders tagged "employee" or containing "concierge" that
#   don't also have "HitsHudson".
HITS_LOCATION_NAME = "corro trailer 1"
HITS_ORDER_TAG = "hitshudson"
HITS_EXCLUSION_TAGS = ("employee", "concierge")  # substring match, lowercase

# Confirmed regex-style rules from the "Tag Product" Sheet formula.
# Matching is substring/case-insensitive, same as REGEXMATCH(..., "(?i)...").
CONCIERGE_ORDER_TAG_SUBSTRING = "concierge"
PRODUCT_TAG_OTHERS_RULES = [
    # (substring to match in a product tag, note shown on the Others row)
    ("drop ship", "Drop ship"),
    ("shopify collective", "Shopify Collective"),
    ("legacy", "Legacy"),
]

# Still-unconfirmed channels — TODO once you tell us the actual rule.
CUSTOMER_TAG_TO_CHANNEL = {
    "corro": {
        # "brothery": "brothery",   # TODO: confirm what "Brothery" even is
    },
    "cavali": {},
}
PRODUCT_TAG_TO_CHANNEL = {
    "corro": {
        # "cavali": "cavali",   # TODO: confirm Cavalli product-line tag
    },
    "cavali": {},
}

BRANDS = {
    "corro": {
        "domain_env": "SHOPIFY_CORRO_DOMAIN",
        "token_env": "SHOPIFY_CORRO_TOKEN",
    },
    "cavali": {
        "domain_env": "SHOPIFY_CAVALI_DOMAIN",
        "token_env": "SHOPIFY_CAVALI_TOKEN",
    },
}


# ---------------------------------------------------------------------------
# Shopify extraction
# ---------------------------------------------------------------------------

def shopify_get(domain, token, path, params=None):
    url = f"https://{domain}/admin/api/{SHOPIFY_API_VERSION}/{path}"
    headers = {"X-Shopify-Access-Token": token}
    resp = requests.get(url, headers=headers, params=params, timeout=30)
    resp.raise_for_status()
    return resp


def fetch_locations(domain, token):
    """Returns {location_id: location_name_lowercase}."""
    resp = shopify_get(domain, token, "locations.json")
    return {str(loc["id"]): loc["name"].strip().lower() for loc in resp.json().get("locations", [])}


def fetch_orders_for_month(domain, token, year, month):
    """Yields every order (paginated via Link headers) for the given month,
    including tags, customer, and line_items with product info."""
    start = datetime(year, month, 1, tzinfo=timezone.utc)
    end = datetime(year + (month == 12), (month % 12) + 1, 1, tzinfo=timezone.utc)

    params = {
        "status": "any",
        "created_at_min": start.isoformat(),
        "created_at_max": end.isoformat(),
        "limit": 250,
        "fields": "id,tags,total_price,total_discounts,customer,line_items,location_id,financial_status",
    }
    path = "orders.json"
    while True:
        resp = shopify_get(domain, token, path, params=params)
        payload = resp.json().get("orders", [])
        for order in payload:
            yield order

        link = resp.headers.get("Link", "")
        next_url = None
        for part in link.split(","):
            if 'rel="next"' in part:
                next_url = part.split(";")[0].strip().strip("<>")
        if not next_url:
            break
        # subsequent requests use the full "next" URL, no extra params needed
        path = next_url.replace(f"https://{domain}/admin/api/{SHOPIFY_API_VERSION}/", "")
        params = None
        time.sleep(0.5)  # be polite to the rate limit


def fetch_product_tags(domain, token, product_ids):
    """Batch-fetch product tags for a set of product ids -> {id: [tags]}."""
    tags_by_id = {}
    ids = [pid for pid in product_ids if pid]
    for i in range(0, len(ids), 250):
        batch = ids[i:i + 250]
        resp = shopify_get(
            domain, token, "products.json",
            params={"ids": ",".join(str(x) for x in batch), "fields": "id,tags", "limit": 250},
        )
        for p in resp.json().get("products", []):
            tags_by_id[str(p["id"])] = [t.strip().lower() for t in p.get("tags", "").split(",") if t.strip()]
        time.sleep(0.3)
    return tags_by_id


def classify_order(order, brand, locations, product_tags_by_id):
    """Returns (channel_id, note) for a single Shopify order.

    Confirmed precedence (highest first):
      1. Product tag "Drop ship"            -> Others (note: Drop ship)
      2. Product tag "Shopify Collective"   -> Others (note: Shopify Collective)
      3. Order tag contains "Concierge"     -> Concierge
      4. Product tag "Legacy"               -> Others (note: Legacy)
      5. HITS rule (location OR tag, minus employee/concierge exclusion) -> Trailer
      6. Location "New Wellington Warehouse"-> Wellington
      7. Default                            -> E-Commerce
    Steps 1-4 come directly from the "Tag Product" formula in your Sheet:
        =IF(REGEXMATCH(product_tag,"(?i)Drop ship"),"Drop ship",
          IF(REGEXMATCH(product_tag,"(?i)Shopify Collective"),"Shopify Collective",
            IF(REGEXMATCH(order_tag,"(?i)Concierge"),"Concierge",
              IF(REGEXMATCH(product_tag,"(?i)Legacy"),"Legacy","e-commerce"))))
    """
    loc_id = str(order.get("location_id") or "")
    loc_name = locations.get(loc_id, "")
    order_tags = [t.strip().lower() for t in (order.get("tags") or "").split(",") if t.strip()]
    order_tags_joined = " ".join(order_tags)

    all_product_tags = []
    for item in order.get("line_items", []):
        pid = str(item.get("product_id") or "")
        all_product_tags.extend(product_tags_by_id.get(pid, []))
    product_tags_joined = " ".join(all_product_tags)

    # 1-2: product-tag rules that route to "Others" (audit-only per the
    # Wellington script; not their own dashboard channel).
    for substring, note in PRODUCT_TAG_OTHERS_RULES[:2]:
        if substring in product_tags_joined:
            return "others", note

    # 3: Concierge, matched the same way the Sheet formula does (substring,
    # case-insensitive, on the order tag).
    if CONCIERGE_ORDER_TAG_SUBSTRING in order_tags_joined:
        return "concierge", None

    # 4: Legacy product tag -> Others.
    legacy_substring, legacy_note = PRODUCT_TAG_OTHERS_RULES[2]
    if legacy_substring in product_tags_joined:
        return "others", legacy_note

    # 5: HITS/Trailer — location OR tag, minus Concierge/Employee exclusion.
    has_hits_tag = HITS_ORDER_TAG in order_tags
    at_hits_location = HITS_LOCATION_NAME in (loc_name or "")
    clearly_non_hits = (not has_hits_tag) and any(
        excl in order_tags_joined for excl in HITS_EXCLUSION_TAGS
    )
    if (has_hits_tag or at_hits_location) and not clearly_non_hits:
        return "trailer", None

    # 6: Wellington and any other confirmed plain-location channel.
    if loc_name and loc_name in LOCATION_TO_CHANNEL.get(brand, {}):
        return LOCATION_TO_CHANNEL[brand][loc_name], None

    # Still-TODO channels (Cavalli, Brothery) via customer/product tag,
    # checked before falling back to the e-commerce default.
    customer = order.get("customer") or {}
    customer_tags = [t.strip().lower() for t in (customer.get("tags") or "").split(",") if t.strip()]
    for tag in customer_tags:
        if tag in CUSTOMER_TAG_TO_CHANNEL.get(brand, {}):
            return CUSTOMER_TAG_TO_CHANNEL[brand][tag], None
    for tag in all_product_tags:
        if tag in PRODUCT_TAG_TO_CHANNEL.get(brand, {}):
            return PRODUCT_TAG_TO_CHANNEL[brand][tag], None

    # Cavali store orders go to Cavalli channel
    if brand == "cavali":
        return "cavali", None

    # 7: default, matches the Sheet formula's fallback.
    return "ecommerce", None


def build_brand_month_rows(domain, token, brand, year, month):
    locations = fetch_locations(domain, token)
    orders = list(fetch_orders_for_month(domain, token, year, month))

    product_ids = {
        str(item.get("product_id"))
        for order in orders
        for item in order.get("line_items", [])
        if item.get("product_id")
    }
    product_tags_by_id = fetch_product_tags(domain, token, product_ids)

    totals = defaultdict(lambda: {"gross_sales": 0.0, "discounts": 0.0, "orders": 0, "notes": defaultdict(int)})
    for order in orders:
        if order.get("financial_status") in ("voided",):
            continue
        channel, note = classify_order(order, brand, locations, product_tags_by_id)
        t = totals[channel]
        t["gross_sales"] += float(order.get("total_price") or 0)
        t["discounts"] += float(order.get("total_discounts") or 0)
        t["orders"] += 1
        if note:
            t["notes"][note] += 1

    return totals


# ---------------------------------------------------------------------------
# QuickBooks Online extraction (STUB)
# ---------------------------------------------------------------------------

def fetch_qbo_margins(brand, year, month):
    """TODO: reuse the OAuth2 refresh-token flow from the AP dashboard.
    Should return {channel_id: {"margin1_pct": .., "margin2_pct": .., "margin3_pct": .. or None}}.
    Until this is wired, margins are left as None / pending in the output
    and the dashboard will show them as blank/pending rather than fabricate
    a number."""
    return {}


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    now = datetime.now(timezone.utc)
    year, month = now.year, now.month  # current month; re-run for backfill

    data = json.loads(DATA_PATH.read_text()) if DATA_PATH.exists() else {
        "meta": {}, "periods": [], "channels": {},
    }
    period_id = f"{year:04d}-{month:02d}"
    period_label = now.strftime("%b %Y")

    if period_id not in [p["id"] for p in data.get("periods", [])]:
        data.setdefault("periods", []).append({"id": period_id, "label": period_label})

    data.setdefault("channels", {})
    data["channels"].setdefault(period_id, {})

    combined_totals = defaultdict(lambda: {"gross_sales": 0.0, "discounts": 0.0, "orders": 0, "notes": defaultdict(int)})

    for brand, cfg in BRANDS.items():
        domain = os.environ.get(cfg["domain_env"])
        token = os.environ.get(cfg["token_env"])
        if not domain or not token:
            print(f"[skip] missing {cfg['domain_env']}/{cfg['token_env']} for {brand}", file=sys.stderr)
            continue

        print(f"[fetch] {brand} — {domain} — {period_id}")
        brand_totals = build_brand_month_rows(domain, token, brand, year, month)
        
        for cid, t in brand_totals.items():
            combined_totals[cid]["gross_sales"] += t["gross_sales"]
            combined_totals[cid]["discounts"] += t["discounts"]
            combined_totals[cid]["orders"] += t["orders"]
            for note, count in t["notes"].items():
                combined_totals[cid]["notes"][note] += count

    rows = []
    for cid in CHANNEL_ORDER.get("equestrian_labs", []):
        t = combined_totals.get(cid, {"gross_sales": 0.0, "discounts": 0.0, "orders": 0, "notes": {}})
        row = {
            "id": cid,
            "name": CHANNEL_NAMES.get(cid, cid.title()),
            "gross_sales": round(t["gross_sales"], 2),
            "discounts": round(t["discounts"], 2),
            "orders": t["orders"],
            "margin1_pct": None,
        }
        if t.get("notes"):
            breakdown = ", ".join(f"{k}: {v}" for k, v in sorted(t["notes"].items()))
            row["note"] = f"Includes: {breakdown}"
        rows.append(row)

    margins = fetch_qbo_margins("equestrian_labs", year, month)
    for row in rows:
        m = margins.get(row["id"])
        if m:
            row.update(m)

    data["channels"][period_id]["equestrian_labs"] = rows

    data["meta"]["last_updated"] = now.strftime("%Y-%m-%d")
    data["meta"]["note"] = "Live data from Shopify (gross_sales, discounts, orders) + QuickBooks Online (margins)."

    DATA_PATH.write_text(json.dumps(data, indent=2))
    print(f"[done] wrote {DATA_PATH}")


if __name__ == "__main__":
    main()
