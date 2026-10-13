# /// script
# requires-python = ">=3.12"
# dependencies = ["playwright"]
# ///
# Generic recorder: plays <path> live on _tools/stage.html (once=1) and writes <path>/media/clip.mp4 (local only, for X).
# The stage reports its start and the waits to cut (stage.marks); the cuts are removed from the capture, no frozen frames.
# Needs the server on :4173 (python3 ~/Development/redlined/_tools/serve.py). Run from anywhere:
#   uv run ~/Development/redlined/_tools/record.py deliverect/01-ux-swipe-to-confirm [more paths...]
import asyncio, base64, pathlib, shutil, subprocess, sys
from playwright.async_api import async_playwright

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from sync import sync

ROOT = pathlib.Path(__file__).resolve().parent.parent  # redlined/
STAGE = 'http://127.0.0.1:4173/_tools/stage.html'
LEAD = 0.3  # seconds kept before the stage's start mark
KEEP_CUT = 0.6  # seconds of a cut wait kept at its head, so the pause still reads


def trim(stamps, marks):
    # stamps: frame timestamps (epoch s). marks: stage.marks. Returns [(index, new_timestamp)] of the frames kept.
    start = next((m['t'] for m in marks if m['kind'] == 'start'), None)
    cuts = [(m['t0'] + KEEP_CUT, m['t1']) for m in marks if m['kind'] == 'cut']
    out = []
    for i, ts in enumerate(stamps):
        if start is not None and ts < start - LEAD:
            continue
        if any(a < ts < b for a, b in cuts):
            continue
        out.append((i, ts - sum(b - a for a, b in cuts if b <= ts)))
    return out


async def record(rel):
    folder = (ROOT / rel).resolve()
    product = folder.relative_to(ROOT).parts[0]
    out = folder / 'media'
    out.mkdir(exist_ok=True)
    frames_dir = out / '.frames-clip'
    shutil.rmtree(frames_dir, ignore_errors=True)
    frames_dir.mkdir(parents=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 1920, 'height': 1080}, device_scale_factor=1)
        cdp = await page.context.new_cdp_session(page)
        frames = []

        async def on_frame(params):
            frames.append((params['metadata']['timestamp'], params['data']))
            await cdp.send('Page.screencastFrameAck', {'sessionId': params['sessionId']})

        cdp.on('Page.screencastFrame', lambda params: asyncio.ensure_future(on_frame(params)))
        await page.goto(f'{STAGE}?product={product}&redline={folder.name}&once=1')
        await cdp.send('Page.startScreencast', {
            'format': 'jpeg', 'quality': 95, 'everyNthFrame': 1, 'maxWidth': 1920, 'maxHeight': 1080,
        })
        await page.wait_for_function('window.stage && stage.finished', timeout=120_000)
        await cdp.send('Page.stopScreencast')
        marks = await page.evaluate('stage.marks')
        await browser.close()

    kept = trim([f[0] for f in frames], marks)
    if not kept:
        sys.exit(f'{rel}: no frames kept (marks: {marks})')
    stamps = [ts for _, ts in kept]
    span = stamps[-1] - stamps[0]
    rate = len(kept) / span if span > 0 else 0
    fps = 60 if rate >= 50 else 30
    print(f'{rel}: {len(kept)} frames over {span:.1f}s = {rate:.1f} frames/s, encoding at {fps} fps')
    lines = []
    for n, (i, ts) in enumerate(kept):
        path = frames_dir / f'{n:05d}.jpg'
        path.write_bytes(base64.b64decode(frames[i][1]))
        dur = (stamps[n + 1] - ts) if n + 1 < len(kept) else 0.5
        lines += [f"file '{path.name}'", f'duration {dur:.4f}']
    lines.append(f"file '{len(kept) - 1:05d}.jpg'")  # concat drops the last duration unless the file repeats
    (frames_dir / 'list.txt').write_text('ffconcat version 1.0\n' + '\n'.join(lines) + '\n')
    mp4 = out / 'clip.mp4'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', frames_dir / 'list.txt',
                    '-vf', f'fps={fps},scale=in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', '-c:v', 'libx264', '-crf', '15', '-preset', 'slow', '-tune', 'animation',
                    '-movflags', '+faststart', mp4], check=True)
    shutil.rmtree(frames_dir)
    dur = span + 0.5
    print(f'{rel}: {dur:.1f}s, mp4 {mp4.stat().st_size / 1e6:.1f} MB')
    if dur > 60:
        print(f'WARNING: {rel} is {dur:.0f}s, over the 60 s limit for X')


async def main():
    if not sys.argv[1:]:
        sys.exit('usage: record.py <product>/<redline> [...]  (paths relative to redlined/)')
    sync()  # the stage reads a fresh redlines.js
    for rel in sys.argv[1:]:
        await record(rel.strip('/'))

asyncio.run(main())
