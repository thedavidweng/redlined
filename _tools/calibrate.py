# Calibration: screenshots one state of a product's mock at the reference device size and compares it with the real
# app's reference screenshot. Writes to .scratch/<product>/calibration/<state>/ (local, not in git):
#   side-by-side.png (reference | mock), overlay.png (50% blend), diff.png (heat map), mock.png, report.md.
# Reads .scratch/<product>/reference/<state>/{screen.png,notes.md}; notes.md must say "logical W×H @Nx".
# No server needed (the mock opens from file://, the tiles need network). The mock runs inside an iframe, like the
# stage, so the device frame draws the status bar exactly as it does in a clip (but not the notch, which iOS screenshots never show: ?cutout=none). Pixel difference only shows where to
# look; it is not an acceptance test. Judge by eye on overlay.png.
#   uv run --with playwright --with pillow python _tools/calibrate.py lime home
import asyncio, io, os, pathlib, re, sys
from PIL import Image, ImageChops, ImageDraw, ImageOps, ImageStat
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
THRESHOLD = 32  # a pixel counts as different when any channel differs by more than this (of 255)


def reference(product, state):
    folder = ROOT / '.scratch' / product / 'reference' / state
    notes = (folder / 'notes.md').read_text()
    # The device line may sit in any state's notes (they share one device).
    pattern = r'logical\s*(\d+)\s*[×x]\s*(\d+)\s*@\s*(\d+)x'
    m = re.search(pattern, notes) or next(filter(None, (re.search(pattern, n.read_text()) for n in sorted(folder.parent.glob('*/notes.md')))), None)
    if not m:
        sys.exit(f'{folder}/notes.md: no "logical W×H @Nx" line')
    boxes = []  # element frames from the accessibility table: | name | id | x | y | w | h |
    for line in notes.splitlines():
        cells = [c.strip() for c in line.strip().strip('|').split('|')]
        if line.startswith('|') and len(cells) >= 4 and all(c.isdigit() for c in cells[-4:]):
            boxes.append(tuple(int(c) for c in cells[-4:]))
    return Image.open(folder / 'screen.png').convert('RGB'), tuple(int(g) for g in m.groups()), boxes


async def shoot(product, state, w, h, scale, out):
    harness = out / 'harness.html'
    src = os.path.relpath(ROOT / product / 'mock' / 'index.html', out)
    harness.write_text(f'<!doctype html><body style="margin:0;background:#fff"><iframe src="{src}?state={state}&amp;side=before&amp;cutout=none" style="border:0;width:{w}px;height:{h}px;display:block"></iframe>')
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': w, 'height': h}, device_scale_factor=scale, reduced_motion='reduce')
        await page.goto(harness.as_uri())
        frame = page.frames[1]
        handle = f'globalThis.{product.capitalize()}Map'  # the product's map handle: LimeMap, ModoMap, ... (see lime/mock/app.js)
        await frame.wait_for_function(handle)
        await frame.evaluate('document.fonts.ready')
        # Style loaded, camera still, nothing fading: MapLibre's own "idle".
        await frame.evaluate(f'(M => new Promise(r => {{ const go = () => M.loaded() && !M.isMoving() ? r() : M.once("idle", go); go(); }}))({handle})')
        # Screenshot until two in a row are identical (late glyphs or tiles), so a re-run gives the same pixels.
        last = None
        for _ in range(10):
            await page.wait_for_timeout(500)
            shot = await page.screenshot()
            if shot == last:
                break
            last = shot
        else:
            print('warning: screenshot did not settle; output may vary between runs')
        regions = await frame.evaluate('''() => {
            const r = e => { const b = e.getBoundingClientRect(); return [b.x, b.y, b.width, b.height]; };
            const app = document.querySelector('.ios-app');
            return { status: [...document.querySelectorAll('.ios-status')].map(r),
                     ui: [...app.children].filter(e => e.id !== 'map' && !e.querySelector('canvas')).map(r).concat([...document.querySelectorAll('.ios-home')].map(r)) };
        }''')
        await browser.close()
    harness.unlink()
    return Image.open(io.BytesIO(shot)).convert('RGB'), regions


def mask(size, boxes, scale):
    m = Image.new('L', size, 0)
    d = ImageDraw.Draw(m)
    for x, y, w, h in boxes:
        if w < 1 or h < 1:
            continue  # empty probes
        d.rectangle([round(x * scale), round(y * scale), round((x + w) * scale) - 1, round((y + h) * scale) - 1], fill=255)
    return m


def main(product, state):
    ref, (w, h, scale), notes_boxes = reference(product, state)
    out = ROOT / '.scratch' / product / 'calibration' / state
    out.mkdir(parents=True, exist_ok=True)
    mock, regions = asyncio.run(shoot(product, state, w, h, scale, out))
    if mock.size != ref.size:
        print(f'warning: mock {mock.size} vs reference {ref.size}; resizing the mock')
        mock = mock.resize(ref.size)
    mock.save(out / 'mock.png')

    side = Image.new('RGB', (ref.width * 2 + 24, ref.height), '#222')
    side.paste(ref, (0, 0)); side.paste(mock, (ref.width + 24, 0))
    side.save(out / 'side-by-side.png')
    Image.blend(ref, mock, .5).save(out / 'overlay.png')

    r, g, b = ImageChops.difference(ref, mock).split()
    diff = ImageChops.lighter(ImageChops.lighter(r, g), b)  # largest channel difference per pixel
    ImageOps.colorize(diff.point(lambda v: min(255, v * 2)), black='#000', mid='#d00', white='#ff0', midpoint=128).save(out / 'diff.png')
    over = diff.point(lambda v: 255 if v > THRESHOLD else 0)

    notes_ui = [bx for bx in notes_boxes if bx[2] * bx[3] <= w * h / 2 and bx[1] < h]  # not the full-screen map, not off-screen
    status = mask(ref.size, regions['status'], scale)
    ui = ImageChops.subtract(mask(ref.size, regions['ui'] + notes_ui, scale), status)
    mapm = ImageChops.subtract(Image.new('L', ref.size, 255), ImageChops.lighter(status, ui))
    rows = []
    for name, m in [('status bar', status), ('UI (non-map elements of the mock and of the reference notes)', ui), ('map (everything else)', mapm)]:
        share = ImageStat.Stat(m).mean[0] / 255
        mean = sum(ImageStat.Stat(diff, m).mean) / 255 * 100 if share else 0
        wrong = ImageStat.Stat(over, m).mean[0] / 255 * 100 if share else 0
        rows.append(f'| {name} | {share * 100:.1f}% | {mean:.2f} | {wrong:.1f}% |')
    (out / 'report.md').write_text(f'''# Calibration: {product} / {state}

Reference {ref.width}x{ref.height} px ({w}x{h} pt @{scale}x), mock `{product}/mock/index.html?state={state}` screenshot at the same size, inside an iframe so the device frame draws the status bar as in the stage.

| region | share of screen | mean difference (% of 255) | pixels differing by more than {THRESHOLD} |
| --- | --- | --- | --- |
{chr(10).join(rows)}

Pixel difference only shows where to look. It is not an acceptance test: judge by eye on `overlay.png`. The map region is expected to differ wherever the mock camera is not at the reference location (privacy), so read it as a style check (colours, label density), not a position check. The reference status bar may carry launch artifacts that the mock must not copy.

Files: `side-by-side.png` (reference left, mock right), `overlay.png` (50% blend), `diff.png` (black = equal, red = moderate, yellow = large), `mock.png`.
UI boxes used: {len(regions['ui'])} from the mock, {len(notes_ui)} from the reference notes.
''')
    print((out / 'report.md').read_text())
    print(f'Wrote {out}')


if len(sys.argv) != 3:
    sys.exit('usage: calibrate.py <product> <state>   e.g. calibrate.py lime home')
main(*sys.argv[1:])
