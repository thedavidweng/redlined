# Storyboard for 03-feat-drag-booking. `d` is the Director from _tools/record.py.
# Both phones open on ?state=booked (the stage loads the plain mock, so the iframes are pointed at the state here).
READY = "typeof ModoMap !== 'undefined' && ModoMap.loaded() && !ModoMap.isMoving() && document.querySelector('.page.in') !== null"
SCROLL = '''([top, ms]) => new Promise(done => { const b = document.querySelector('.page .body'), from = b.scrollTop, t0 = performance.now();
  const ease = t => 1 - (1 - t) ** 3, step = now => { const t = Math.min(1, (now - t0) / ms); b.scrollTop = from + (top - from) * ease(t); t < 1 ? requestAnimationFrame(step) : done(); };
  requestAnimationFrame(step); })'''
WHEEL = '''([k, rows]) => { const c = document.querySelectorAll('.pcol')[k]; c.scrollTo({ top: c.scrollTop + rows * 32, behavior: 'smooth' }); }'''
# Centre of the nth quarter-hour dot of the vehicle page's strip, in the mock's own viewport.
DOT = '''n => { const r = [...document.querySelectorAll('.page .dots svg')][n].getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }'''
READY_AFTER = "document.querySelector('.drag-hit') !== null && !document.querySelector('.drag-hit').hidden"


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


async def dot(d, frame, side, n):
    x, y = await frame.evaluate(DOT, n)
    return await d.to_stage(side, x, y)


async def run(d):
    await open_states(d)
    frame_after = await d.frame('after')
    while not await frame_after.evaluate(READY_AFTER):  # the patch loads its base (02) first
        await d.wait(0.2)
    await d.intro()

    # Before: to change the booked time, scroll to Change Time and go through the sheet with its wheels.
    frame = await d.frame('before')
    rows = await d.box('before', '.page .rows')
    await d.glide(rows['x'] + 180, rows['y'] + 150, 0.5)
    await frame.evaluate(SCROLL, [330, 600])
    await tap_on(d, 'before', '.page [data-change]')
    await d.lift()
    await d.wait(0.6)
    await frame.evaluate(WHEEL, [1, 2])
    await d.wait(0.5)
    b = await d.box('before', '.psave')
    await d.glide(*d.center(b), 0.5)
    await d.tap()
    await d.lift()
    await d.wait(0.5)

    # After: pull the right end out to two hours on, then slide the whole block later. The rows follow the finger; letting go commits.
    await d.focus('after')
    frame = await d.frame('after')
    right = await d.box('after', '.drag-h.r')
    gx, gy = right['x'] + right['width'] * 0.2, right['y'] + right['height'] / 2  # the grip's pill
    end_now, end_to = await dot(d, frame, 'after', 2), await dot(d, frame, 'after', 7)
    await d.glide(gx, gy, 0.6)
    await d.wait(0.1)
    await d.drag(gx, gy, gx + end_to[0] - end_now[0], gy, 1.0)
    await d.wait(0.3)
    cap = await d.box('after', '.drag-hit')
    s_now, s_to = await dot(d, frame, 'after', 1), await dot(d, frame, 'after', 7)
    mx, my = cap['x'] + cap['width'] / 2, cap['y'] + cap['height'] / 2
    await d.drag(mx, my, mx + s_to[0] - s_now[0], my, 1.1)
    await d.lift()
    await d.wait(0.4)
    await d.ring('after', '.page .trip', 'good')
    await d.wait(1.3)
    await d.focus(None)
    await d.ring('after', None, None)
    await d.outro()
