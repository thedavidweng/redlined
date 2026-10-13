# Regenerates routes.js (EvoRoutes): reads the user dot and cars from the mock, then runs _tools/walk_routes.py.
#   uv run --with playwright python evo/01-feat-walk-route/routes.py     (dev server on :4173)
import asyncio, json, pathlib, subprocess, sys, tempfile
from playwright.async_api import async_playwright

HERE = pathlib.Path(__file__).resolve().parent


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto('http://127.0.0.1:4173/evo/mock/index.html')
        data = await page.evaluate('({ from: EvoData.user.coordinates, to: EvoData.vehicles.features.map(f => f.geometry.coordinates) })')
        await browser.close()
    with tempfile.TemporaryDirectory() as tmp:
        src = pathlib.Path(tmp) / 'evo-cars.json'
        src.write_text(json.dumps(data))
        subprocess.run([sys.executable, str(HERE.parents[1] / '_tools' / 'walk_routes.py'), str(src), str(HERE / 'routes.js'), 'EvoRoutes'], check=True)
    # The tool writes the temp input path into the header: replace it with the reproducible command.
    out = HERE / 'routes.js'
    lines = out.read_text().split('\n')
    lines[1] = '// Regenerate: uv run --with playwright python evo/01-feat-walk-route/routes.py'
    out.write_text('\n'.join(lines))

asyncio.run(main())
