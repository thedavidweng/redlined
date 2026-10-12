# Storyboard for 06-feat-walk-and-directions. `d` is the Director from _tools/record.py.
# Pins are map layers, not DOM nodes: project() gives mock pixels, to_stage() the page.
PIN = 2  # north of the user's dot; the camera frames the whole route in the strip above the sheet
PROJECT = '''n => { const p = ModoMap.project(ModoData.pins.features[n].geometry.coordinates), r = ModoMap.getContainer().getBoundingClientRect();
  return [r.left + p.x, r.top + p.y - 22]; }'''  # pins hang above their tip: tap the head
SETTLED = "typeof ModoMap !== 'undefined' && ModoMap.loaded() && !ModoMap.isMoving() && !!ModoMap.getLayer('pins')"
BOTTOM = "() => document.querySelector('.page .body').scrollTo({ top: 1e5, behavior: 'smooth' })"


async def pin(d, side):
    frame = await d.frame(side)
    return await d.to_stage(side, *await frame.evaluate(PROJECT, PIN))


async def card(d, side):
    b = await d.box(side, '.card .photo')
    return d.center(b)


async def open_page(d, side):
    await d.glide(*await card(d, side), 0.7)
    await d.tap()
    await d.lift()
    await d.wait(0.7)
    await (await d.frame(side)).evaluate(BOTTOM)
    await d.wait(0.9)


async def run(d):
    for side in ('before', 'after'):
        frame = await d.frame(side)
        while not await frame.evaluate(SETTLED):
            await d.wait(0.2)
    await d.wait(0.5)

    await d.intro()
    # Before: the station and nothing else; the address is plain text.
    await d.glide(*await pin(d, 'before'), 0.8)
    await d.wait(0.15)
    await d.tap()
    await d.lift()
    await d.wait(0.6)
    await open_page(d, 'before')
    await d.glide(*d.center(await d.box('before', '[data-address]')), 0.6)
    await d.tap()
    await d.lift()
    await d.wait(0.4)

    # After: walk line and route, then Copy and Directions.
    await d.focus('after')
    await d.glide(*await pin(d, 'after'), 0.8)
    await d.wait(0.15)
    await d.tap()
    await d.lift()
    await d.ring('after', '.card [data-walk]', 'good')
    await d.wait(1.5)  # camera frames the route, walk line
    await d.ring('after', None, None)
    await open_page(d, 'after')
    await d.glide(*d.center(await d.box('after', '[data-copy]')), 0.6)
    await d.tap()
    await d.lift()
    await d.wait(1.3)  # "Address copied"
    await d.glide(*d.center(await d.box('after', '[data-directions]')), 0.5)
    await d.tap()
    await d.lift()
    await d.wait(1.6)  # action sheet
    await d.focus(None)
    await d.outro()
