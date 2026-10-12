# Generic recorder: plays <path>/clip.py on _tools/stage.html and writes <path>/media/clip.{mp4,gif} and cover.webp.
# Needs the server on :4173 (python3 ~/Development/redlined/_tools/serve.py). Run from anywhere:
#   uv run --with playwright python ~/Development/redlined/_tools/record.py deliverect/01-ux-swipe-to-confirm [more paths...]
import asyncio, base64, importlib.util, json, pathlib, shutil, subprocess, sys, time
from playwright.async_api import async_playwright

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from sync import sync

ROOT = pathlib.Path(__file__).resolve().parent.parent  # redlined/
STAGE = 'http://127.0.0.1:4173/_tools/stage.html'


class Director:
    def __init__(self, page):
        self.page, self.x, self.y = page, 960, 1180
        self.started = None  # wall time the curtain lifted; everything before it (loading under the curtain) is cut

    async def wait(self, s):
        await asyncio.sleep(s)

    async def frame(self, side):
        return await (await self.page.query_selector(f'#{side} iframe')).content_frame()

    async def box(self, side, selector, has_text=None):
        # Bounding box of the first element matching the selector (and, if given, containing the text), in page coordinates.
        frame = await self.frame(side)
        return await frame.locator(selector, has_text=has_text).first.bounding_box()

    async def to_stage(self, side, x, y):
        # A point in the mock's own viewport (e.g. from a map's project()) to page coordinates: the iframe is offset and scaled.
        iframe = await self.page.query_selector(f'#{side} iframe')
        b = await iframe.bounding_box()
        k = b['width'] / await (await iframe.content_frame()).evaluate('innerWidth')
        return b['x'] + x * k, b['y'] + y * k

    async def ring(self, side, selector, tone):
        # Highlight ring around an element of the mock, drawn by the stage. tone: 'hl' | 'bad' | 'good'; None removes it.
        await self.js('([s, sel, t]) => stage.ring(s, sel, t)', [side, selector, tone])

    async def drag(self, x0, y0, x1, y1, dur=0.6):
        # Press at (x0, y0), pull to (x1, y1) with the finger hint following, release.
        await self.glide(x0, y0, 0.5)
        await self.page.evaluate('stage.press(true)')
        await self.page.mouse.down()
        await self.glide(x1, y1, dur)
        await self.page.mouse.up()
        await self.page.evaluate('stage.press(false)')

    async def glide(self, x, y, dur=0.7, on=True):
        # Time-based, so recording overhead can't stretch the motion.
        x0, y0 = self.x, self.y
        loop = asyncio.get_running_loop()
        start = loop.time()
        while True:
            t = min(1, (loop.time() - start) / dur)
            e = 4 * t ** 3 if t < .5 else 1 - (-2 * t + 2) ** 3 / 2  # ease-in-out cubic
            cx, cy = x0 + (x - x0) * e, y0 + (y - y0) * e
            await self.page.evaluate('([x, y, on]) => stage.finger(x, y, on)', [cx, cy, on])
            await self.page.mouse.move(cx, cy)
            if t >= 1:
                break
            await asyncio.sleep(1 / 120)
        self.x, self.y = x, y

    async def tap(self, hold=0.09):
        await self.page.evaluate('stage.press(true)')
        await self.page.mouse.down()
        await asyncio.sleep(hold)
        await self.page.mouse.up()
        await self.page.evaluate('stage.press(false)')

    async def lift(self):
        # Finger leaves the glass so the confirmation underneath stays visible.
        await self.page.evaluate('([x, y]) => stage.finger(x, y, false)', [self.x, self.y])

    async def js(self, expr, arg=None):
        return await self.page.evaluate(expr, arg)

    async def focus(self, side):
        await self.js('s => stage.focus(s)', side)

    def center(self, b, dx=0):
        return b['x'] + b['width'] / 2 + dx, b['y'] + b['height'] / 2

    async def intro(self, side='before'):
        self.started = time.time()
        await self.js('stage.curtain(false)')
        await self.wait(0.9)
        await self.focus(side)
        await self.wait(0.5)

    async def outro(self):
        await self.glide(self.x, 1180, 0.6, on=False)
        await self.wait(1.6)
        await self.js('stage.curtain(true)')
        await self.wait(0.6)


def cover(mp4):
    # Still for the series home: the resting frame the previewer also stops on (2 s before the end, after the finger leaves).
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4],
                               capture_output=True, text=True, check=True).stdout)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', f'{max(0, dur - 2):.2f}', '-i', mp4, '-frames:v', '1',
                    '-vf', 'scale=1280:-1:flags=lanczos', '-c:v', 'libwebp', '-quality', '80', mp4.with_name('cover.webp')], check=True)


async def record(rel):
    folder = (ROOT / rel).resolve()
    product = folder.relative_to(ROOT).parts[0]
    spec = importlib.util.spec_from_file_location('clip', folder / 'clip.py')
    clip = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(clip)
    cfg = dict(redline=folder.name)
    out = folder / 'media'
    out.mkdir(exist_ok=True)
    frames_dir = out / '.frames-clip'
    shutil.rmtree(frames_dir, ignore_errors=True)
    frames_dir.mkdir(parents=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 1920, 'height': 1080})
        await page.goto(f'{STAGE}?product={product}')
        await page.evaluate('stage.curtain(true)')
        await page.evaluate('cfg => stage.setup(cfg)', cfg)
        await asyncio.sleep(0.8)
        cdp = await page.context.new_cdp_session(page)
        frames = []

        async def on_frame(params):
            frames.append((params['metadata']['timestamp'], params['data']))
            await cdp.send('Page.screencastFrameAck', {'sessionId': params['sessionId']})

        cdp.on('Page.screencastFrame', lambda params: asyncio.ensure_future(on_frame(params)))
        await cdp.send('Page.startScreencast', {'format': 'jpeg', 'quality': 95, 'everyNthFrame': 1})
        await asyncio.sleep(0.3)
        director = Director(page)
        await clip.run(director)
        await cdp.send('Page.stopScreencast')
        await browser.close()

    # Waiting for maps or a state reload happens under the curtain; keep only LEAD seconds of it, so every clip starts at once.
    LEAD = 0.3
    if director.started:
        kept = [f for f in frames if f[0] >= director.started - LEAD]
        frames = kept or frames

    lines = []
    for i, (ts, data) in enumerate(frames):
        path = frames_dir / f'{i:05d}.jpg'
        path.write_bytes(base64.b64decode(data))
        dur = (frames[i + 1][0] - ts) if i + 1 < len(frames) else 0.5
        lines += [f"file '{path.name}'", f'duration {dur:.4f}']
    lines.append(f"file '{frames_dir / f'{len(frames) - 1:05d}.jpg'}'".replace(str(frames_dir) + '/', ''))
    (frames_dir / 'list.txt').write_text('ffconcat version 1.0\n' + '\n'.join(lines) + '\n')
    mp4, gif = out / 'clip.mp4', out / 'clip.gif'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', frames_dir / 'list.txt',
                    '-vf', 'fps=30,scale=in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', '-c:v', 'libx264', '-crf', '15', '-preset', 'slow', '-tune', 'animation',
                    '-movflags', '+faststart', mp4], check=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', mp4, '-vf',
                    'fps=25,scale=1280:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=256:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle',
                    '-loop', '0', gif], check=True)
    cover(mp4)
    shutil.rmtree(frames_dir)
    print(f'{rel}: {len(frames)} frames, {frames[-1][0] - frames[0][0]:.1f}s, mp4 {mp4.stat().st_size / 1e6:.1f} MB, gif {gif.stat().st_size / 1e6:.1f} MB')


async def main():
    if sys.argv[1:] == ['--covers']:  # regenerate stills from existing clips, no recording
        for mp4 in sorted(ROOT.glob('*/*/media/clip.mp4')):
            cover(mp4)
        return sync()
    if not sys.argv[1:]:
        sys.exit('usage: record.py <product>/<redline> [...]  (paths relative to redlined/)')
    sync()
    for rel in sys.argv[1:]:
        await record(rel.strip('/'))
    sync()  # the clip now exists: the previewer can play it

asyncio.run(main())
