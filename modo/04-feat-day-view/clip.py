# Storyboard for 04-feat-day-view. `d` is the Director from _tools/record.py.
# Both phones open on ?state=booked (the stage loads the plain mock, so the iframes are pointed at the state here).
# The vehicle page covers the header, so each side goes back, taps OPEN RETURN (12 h) and opens the car again.
import asyncio

READY = "typeof ModoMap !== 'undefined' && ModoMap.loaded() && !ModoMap.isMoving() && document.querySelector('.page.in') !== null"
READY_AFTER = "document.querySelector('.dv-cap') !== null && !document.querySelector('.dv-cap').hidden"
# Smooth sideways scroll of the page's hourly strip (the finger drags in parallel; a mouse drag does not scroll a div).
SCROLL_X = '''([left, ms]) => new Promise(done => { const s = document.querySelector('.page [data-strip]'), from = s.scrollLeft, t0 = performance.now();
  const ease = t => 1 - (1 - t) ** 3, step = now => { const t = Math.min(1, (now - t0) / ms); s.scrollLeft = from + (left - from) * ease(t); t < 1 ? requestAnimationFrame(step) : done(); };
  requestAnimationFrame(step); })'''
# Left edge, top and size of the nth day bar, in the mock's own viewport.
BAR = '''n => { const r = document.querySelectorAll('.dv-bar')[n].getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }'''


async def open_states(d):
    # Both phones load at once (the curtain is closed meanwhile).
    for side in ('before', 'after'):
        await d.js('s => { const f = document.querySelector(`#${s} iframe`); f.src = f.src + "&state=booked"; }', side)
    await d.wait(0.6)
    for side in ('before', 'after'):
        frame = await d.frame(side)
        while not await frame.evaluate(READY):
            await d.wait(0.2)
    await d.wait(0.7)


async def tap_on(d, side, selector, text=None):
    b = await d.box(side, selector, text)
    await d.glide(*d.center(b), 0.5)
    await d.wait(0.1)
    await d.tap()
    return b


async def open_return(d, side):
    await tap_on(d, side, '.back')
    await d.wait(0.5)
    await tap_on(d, side, '.seg > button', 'OPEN RETURN')
    await d.wait(0.2)
    await tap_on(d, side, '.card')
    await d.lift()
    await d.wait(0.6)


async def run(d):
    await open_states(d)
    frame_after = await d.frame('after')
    while not await frame_after.evaluate(READY_AFTER):  # the patch loads its bases (03, then 02) first
        await d.wait(0.2)
    await d.intro()

    # Before: a 12 h open return runs off the strip; scroll sideways to find where it ends.
    frame = await d.frame('before')
    await open_return(d, 'before')
    strip = await d.box('before', '.page [data-strip]')
    sx, sy = strip['x'] + strip['width'] * 0.8, strip['y'] + 40
    await asyncio.gather(d.drag(sx, sy, strip['x'] + strip['width'] * 0.15, sy, 1.2), frame.evaluate(SCROLL_X, [700, 1200]))
    await d.lift()
    await d.wait(0.6)

    # After: the same booking and the whole free window in four rows. Then drag the booking later, across midnight.
    await d.focus('after')
    frame = await d.frame('after')
    await open_return(d, 'after')
    await d.wait(0.8)
    row0, row1 = await frame.evaluate(BAR, 0), await frame.evaluate(BAR, 1)
    # grab the capsule's part in today's row at 3/4 of the bar, pull it 5.75 h on (12:15 PM to 6:00 PM) so it ends at 6 AM
    hand = await frame.evaluate('''() => { const r = [...document.querySelectorAll('.dv-hit')].find(h => !h.hidden).getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2, r.width]; }''')
    x0, y0 = await d.to_stage('after', hand[0], hand[1])
    x1, _ = await d.to_stage('after', hand[0] + row0[2] * 5.75 / 24, hand[1])
    await d.drag(x0, y0, x1, y0, 1.2)
    await d.lift()
    await d.wait(0.4)
    await d.ring('after', '.page .trip', 'good')
    await d.wait(1.6)
    await d.focus(None)
    await d.ring('after', None, None)
    await d.outro()
