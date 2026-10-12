# Storyboard for 06-feat-walk-and-directions. `d` is the Director from _tools/record.py.
# Pins are map layers, not DOM nodes: project() gives mock pixels, to_stage() the page.
PIN = 2  # north of the user's dot; selected, the strip above the sheet is too small for the whole route, so the walk line opens the route preview
PROJECT = '''n => { const p = ModoMap.project(ModoData.pins.features[n].geometry.coordinates), r = ModoMap.getContainer().getBoundingClientRect();
  return [r.left + p.x, r.top + p.y - 22]; }'''  # pins hang above their tip: tap the head
SETTLED = "typeof ModoMap !== 'undefined' && ModoMap.loaded() && !ModoMap.isMoving() && !!ModoMap.getLayer('pins') && location.search.includes('now=')"


async def pin(d, side):
    frame = await d.frame(side)
    return await d.to_stage(side, *await frame.evaluate(PROJECT, PIN))


async def run(d):
    for side in ('before', 'after'):
        frame = await d.frame(side)
        while not await frame.evaluate(SETTLED):
            await d.wait(0.2)
    await d.wait(0.5)

    await d.intro()
    # Before: the station and nothing else: no distance, no route, and the map strip is too small to show one anyway.
    await d.glide(*await pin(d, 'before'), 0.8)
    await d.wait(0.15)
    await d.tap()
    await d.lift()
    await d.wait(1.6)

    # After: select the car, tap the walk line, the sheet drops away and the whole route fits; Directions from the bar.
    await d.focus('after')
    await d.glide(*await pin(d, 'after'), 0.8)
    await d.wait(0.15)
    await d.tap()
    await d.lift()
    await d.ring('after', '.card [data-walk]', 'good')
    await d.wait(1.5)  # camera frames the route, walk line
    await d.ring('after', None, None)
    await d.glide(*d.center(await d.box('after', '.card button[data-walk]')), 0.7)
    await d.wait(0.15)
    await d.tap()
    await d.lift()
    await d.wait(2.4)  # route preview: the whole route, nothing under the finger
    await d.glide(*d.center(await d.box('after', '.rp-go')), 0.8)
    await d.wait(0.15)
    await d.tap()
    await d.lift()
    await d.wait(1.8)  # action sheet
    await d.focus(None)
    await d.outro()
