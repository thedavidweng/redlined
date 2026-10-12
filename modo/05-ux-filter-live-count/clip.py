# Storyboard for 05-ux-filter-live-count. `d` is the Director from _tools/record.py.
# Both sides do the same thing: open Filters, pick SUV and all-wheel drive, apply. Before: no feedback until the sheet is closed, then it has to be reopened to change anything.
# After: the button counts as you go (4 -> 3 cars), and applying filters the map.
SETTLED = "typeof ModoMap !== 'undefined' && ModoMap.loaded() && !ModoMap.isMoving() && !!ModoMap.getLayer('pins')"
SCROLL = "top => document.querySelector('.fscroll').scrollTo({ top, behavior: 'smooth' })"
SUV, AWD, APPLY, PILL = ('.fchip', 'SUV'), ('.row', 'all-wheel drive'), ('.apply', None), ('.filter', None)


async def tap(d, side, target, dx=0):
    # The box is in page coordinates already; the finger leaves the glass afterwards so the result stays visible.
    x, y = d.center(await d.box(side, *target), dx)
    await d.glide(x, y, 0.5)
    await d.wait(0.1)
    await d.tap()
    await d.lift()


async def scroll(d, side, top):
    await (await d.frame(side)).evaluate(SCROLL, top)
    await d.wait(0.55)


async def run(d):
    for side in ('before', 'after'):
        frame = await d.frame(side)
        while not await frame.evaluate(SETTLED):
            await d.wait(0.2)
    await d.wait(0.8)
    await d.intro()

    # Before: toggle, apply, look, reopen.
    await tap(d, 'before', PILL)
    await d.wait(0.5)
    await tap(d, 'before', SUV, -40)
    await scroll(d, 'before', 190)
    await tap(d, 'before', AWD, -60)
    await d.wait(0.1)
    await tap(d, 'before', APPLY)
    await d.wait(0.9)  # the map did not change: nothing to see
    await tap(d, 'before', PILL)
    await d.wait(0.6)
    await d.lift()

    # After: the count answers each tap.
    await d.focus('after')
    await tap(d, 'after', PILL)
    await d.wait(0.5)
    await tap(d, 'after', SUV, -40)
    await d.wait(0.9)  # SHOW 4 CARS
    await scroll(d, 'after', 190)
    await tap(d, 'after', AWD, -60)
    await d.wait(1.0)  # SHOW 3 CARS
    await tap(d, 'after', APPLY)
    await d.wait(1.6)  # the map shows only the match
    await d.focus(None)
    await d.outro()
