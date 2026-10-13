# Regenerates routes.js (EvoParkingRoutes): driving routes from the trip car to every Evo lot within reach and to the nearest eligible meters (meters.js),
# through _tools/walk_routes.py --profile car. Run meters.py first.
#   uv run --with playwright python evo/02-feat-find-parking/routes.py     (dev server on :4173)
import asyncio, json, math, pathlib, subprocess, sys, tempfile
from playwright.async_api import async_playwright

HERE = pathlib.Path(__file__).resolve().parent
LOT_REACH_M = 2500  # lots farther than this in a straight line are not offered
METERS = 20         # the nearest eligible meters, by straight line; the app picks the nearest of them by driving time


def metres(a, b):
    k = math.cos(math.radians(a[1]))
    return math.hypot((a[0] - b[0]) * k, a[1] - b[1]) * 111320


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto('http://127.0.0.1:4173/evo/mock/index.html')
        data = await page.evaluate('({ from: EvoData.vehicles.features[EvoData.nearest].geometry.coordinates, lots: EvoData.parking.features.map(f => [f.properties.n, f.geometry.coordinates]) })')
        await browser.close()
    text = (HERE / 'meters.js').read_text()
    meters = json.loads(text[text.index('meters:') + 7:text.rindex('],') + 1])  # already sorted nearest first
    lots = [[n, c] for n, c in data['lots'] if metres(data['from'], c) <= LOT_REACH_M]
    near = meters[:METERS]
    targets = [c for _, c in lots] + [[m[0], m[1]] for m in near]
    with tempfile.TemporaryDirectory() as tmp:
        src, out = pathlib.Path(tmp) / 'evo-parking.json', pathlib.Path(tmp) / 'routes.js'
        src.write_text(json.dumps({'from': data['from'], 'to': targets}))
        subprocess.run([sys.executable, str(HERE.parents[1] / '_tools' / 'walk_routes.py'), str(src), str(out), 'Tmp', '--profile', 'car', '--names'], check=True)
        body = out.read_text()
    routes = json.loads(body[body.index('[\n'):body.rindex(']') + 1])
    line = lambda key, r: f'    {json.dumps(str(key))}:{json.dumps(r, separators=(",", ":"), ensure_ascii=False)}'
    lot_lines = ',\n'.join(line(n, routes[i]) for i, (n, _) in enumerate(lots))
    meter_lines = ',\n'.join(line(m[2], routes[len(lots) + i]) for i, m in enumerate(near))
    head = ('// Generated, do not edit. Driving routes from the trip car from routing.openstreetmap.de (OSRM car profile, OpenStreetMap data).\n'
            '// lots: by the mock parking spot number; meters: by meter id (the nearest eligible ones in meters.js). "name" is the street at the end.\n'
            '// Regenerate: uv run --with playwright python evo/02-feat-find-parking/routes.py\n')
    (HERE / 'routes.js').write_text(f'{head}globalThis.EvoParkingRoutes = {{\n  lots: {{\n{lot_lines}\n  }},\n  meters: {{\n{meter_lines}\n  }},\n}};\n')

asyncio.run(main())
