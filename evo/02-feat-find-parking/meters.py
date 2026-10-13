# Regenerates meters.js (EvoMeters): City of Vancouver pay meters around the trip car where a member may end a trip (rule in README.md).
#   uv run --with playwright python evo/02-feat-find-parking/meters.py     (dev server on :4173)
# Source: City of Vancouver Open Data, dataset "parking-meters" (Open Government Licence - Vancouver).
import asyncio, collections, json, math, pathlib, urllib.parse, urllib.request
from playwright.async_api import async_playwright

HERE = pathlib.Path(__file__).resolve().parent
API = 'https://opendata.vancouver.ca/api/explore/v2.1/catalog/datasets/parking-meters/records'
RADIUS_M = 800


def excluded(m):
    """The reason a meter is not a place to end a trip, or None. A car left at the end of a trip stays there, so any rush-hour
    or prohibition window (tow-away, loading, passenger zone) makes the meter unsafe, whatever the time is now."""
    if m['service_status'] != 'In Service': return 'out of service'
    if m['vehicle_type'] != 'Any Vehicle': return 'not for cars'
    if m['am_rush_hours'] or m['pm_rush_hours']: return 'rush-hour limits'
    if any(m[f'prohibition_{i}_{k}'] for i in (1, 2) for k in ('days', 'time', 'zone')): return 'prohibition window'
    return None


def fetch(lng, lat):
    rows = []
    while True:
        query = urllib.parse.urlencode({'where': f"within_distance(geo_point_2d, geom'POINT({lng} {lat})', {RADIUS_M}m)", 'limit': 100, 'offset': len(rows)})
        with urllib.request.urlopen(f'{API}?{query}', timeout=60) as r:
            page = json.load(r)
        rows += page['results']
        if not page['results'] or len(rows) >= page['total_count']: return rows


async def car():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto('http://127.0.0.1:4173/evo/mock/index.html')
        lng, lat = await page.evaluate('EvoData.vehicles.features[EvoData.nearest].geometry.coordinates')
        await browser.close()
    return lng, lat


def main():
    lng, lat = asyncio.run(car())
    rows = fetch(lng, lat)
    why = collections.Counter()
    keep, seen, eligible = [], set(), 0
    for m in rows:
        reason = excluded(m)
        if reason:
            why[reason] += 1
            continue
        eligible += 1
        c = m['geom']['geometry']['coordinates']
        at = (round(c[0], 6), round(c[1], 6))
        if at in seen: continue  # twin heads on one post: one dot
        seen.add(at)
        keep.append([at[0], at[1], m['meter_id'], m['local_area']])
    # Nearest the car first, so the file reads from the car outwards.
    k = math.cos(math.radians(lat))
    keep.sort(key=lambda m: math.hypot((m[0] - lng) * k, m[1] - lat))
    counts = {'total': len(rows), 'excluded': dict(why.most_common()), 'eligible': eligible, 'dots': len(keep)}  # dots: one per post (twin heads share one)
    head = ('// Generated, do not edit. City of Vancouver Open Data, "parking-meters" (Open Government Licence - Vancouver), https://opendata.vancouver.ca/explore/dataset/parking-meters/\n'
            f'// Meters within {RADIUS_M} m of the trip car where a member may end a trip (rule in README.md). Rows: [lng, lat, meter id, local area].\n'
            f'// Counts: {json.dumps(counts)}\n'
            '// Regenerate: uv run --with playwright python evo/02-feat-find-parking/meters.py\n')
    body = ',\n'.join('    ' + json.dumps(m, separators=(',', ':'), ensure_ascii=False) for m in keep)
    (HERE / 'meters.js').write_text(f'{head}globalThis.EvoMeters = {{\n  center: [{lng}, {lat}], radius: {RADIUS_M}, counts: {json.dumps(counts)},\n  meters: [\n{body}\n  ],\n}};\n')
    print(counts)


main()
