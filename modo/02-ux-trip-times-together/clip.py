# Storyboard for 02-ux-trip-times-together. `d` is the Director from _tools/record.py.
# Both phones open on ?state=booked (the stage loads the plain mock, so the iframes are pointed at the state here).
READY = "typeof ModoMap !== 'undefined' && ModoMap.loaded() && !ModoMap.isMoving() && document.querySelector('.page.in') !== null"
BODY = '.page .body'
SCROLL = '''([top, ms]) => new Promise(done => { const b = document.querySelector('.page .body'), from = b.scrollTop, t0 = performance.now();
  const ease = t => 1 - (1 - t) ** 3, step = now => { const t = Math.min(1, (now - t0) / ms); b.scrollTop = from + (top - from) * ease(t); t < 1 ? requestAnimationFrame(step) : done(); };
  requestAnimationFrame(step); })'''
WHEEL = '''([k, rows]) => { const c = document.querySelectorAll('.pcol')[k]; c.scrollTo({ top: c.scrollTop + rows * 32, behavior: 'smooth' }); }'''


async def open_state(d, side):
    await d.js('s => { const f = document.querySelector(`#${s} iframe`); f.src = f.src + "&state=booked"; }', side)
    await d.wait(0.6)
    frame = await d.frame(side)
    while not await frame.evaluate(READY):
        await d.wait(0.2)
    await d.wait(0.7)


async def tap_on(d, side, selector, text=None, dy=0):
    b = await d.box(side, selector, text)
    await d.glide(*d.center(b), 0.8)
    await d.wait(0.2)
    await d.tap()
    return b


async def run(d):
    for side in ('before', 'after'):
        await open_state(d, side)
    await d.intro()

    # Before: the times are scattered; scan the strip, scroll down to Change Time and edit there.
    frame = await d.frame('before')
    strip = await d.box('before', '.page [data-strip]')
    await d.glide(strip['x'] + 150, strip['y'] + 30, 0.7)
    await d.ring('before', '.page [data-strip]', 'bad')
    await d.wait(0.5)
    await d.ring('before', None, None)
    rows = await d.box('before', '.page .rows')
    await d.glide(rows['x'] + 180, rows['y'] + 150, 0.5)
    await frame.evaluate(SCROLL, [330, 800])
    await d.wait(0.2)
    await tap_on(d, 'before', '.page [data-change]')
    await d.lift()
    await d.wait(0.9)
    await frame.evaluate(WHEEL, [1, 1])
    await d.wait(0.8)
    b = await d.box('before', '.psave')
    await d.glide(*d.center(b), 0.5)
    await d.tap()
    await d.lift()
    await d.wait(0.9)

    # After: the same times in one block, edited right from it.
    await d.focus('after')
    frame = await d.frame('after')
    await tap_on(d, 'after', '.trip-row:nth-child(1)')
    await d.lift()
    await d.wait(0.9)
    await frame.evaluate(WHEEL, [1, 1])
    await d.wait(0.8)
    b = await d.box('after', '.psave')
    await d.glide(*d.center(b), 0.5)
    await d.tap()
    await d.lift()
    await d.wait(0.5)
    await d.ring('after', '.page .trip', 'good')
    await d.wait(2.0)
    await d.focus(None)
    await d.ring('after', None, None)
    await d.outro()
