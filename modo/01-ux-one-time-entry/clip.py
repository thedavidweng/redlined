# Storyboard for 01-ux-one-time-entry. `d` is the Director from _tools/record.py.
# Before: pick a car, open its page, no way to switch return type there; back, switch in the header, reopen the car.
# After: one tap on the header opens the sheet, OPEN shows the live count change, SAVE; then on the vehicle page the return type switches in place.
# Pins are map layers, so the tap point comes from the map: project() gives mock pixels, to_stage() the page.
PROJECT = '''() => { const [lng, lat] = ModoData.pins.features[ModoData.near].geometry.coordinates;
  const p = ModoMap.project([lng, lat]), r = ModoMap.getContainer().getBoundingClientRect(); return [r.left + p.x, r.top + p.y - 22]; }'''
SETTLED = "typeof ModoMap !== 'undefined' && ModoMap.loaded() && !ModoMap.isMoving() && !!ModoMap.getLayer('pins') && location.search.includes('now=')"

RETURN_TYPE = '.rows > div:first-child'


async def car(d, side):
    frame = await d.frame(side)
    return await d.to_stage(side, *await frame.evaluate(PROJECT))


async def press(d, side, selector, wait=0.7, dx=0, text=None):
    # Glide to an element of the mock, tap it, lift the finger so what it did stays visible.
    await d.glide(*d.center(await d.box(side, selector, text), dx), 0.5)
    await d.wait(0.1)
    await d.tap()
    await d.lift()
    await d.wait(wait)


async def run(d):
    # Tiles and markers first: an unloaded map would show blank squares behind the finger.
    for side in ('before', 'after'):
        frame = await d.frame(side)
        while not await frame.evaluate(SETTLED):
            await d.wait(0.2)
    await d.wait(0.8)

    await d.intro()
    # Before: the car's page has a Return Type row, but it does nothing. Back out, switch in the header, reopen the car.
    await d.glide(*await car(d, 'before'), 0.7)
    await d.tap()
    await d.lift()
    await d.wait(0.5)
    await press(d, 'before', '.card', 0.5)
    await press(d, 'before', RETURN_TYPE, 0.3)
    await d.ring('before', RETURN_TYPE, 'bad')
    await d.wait(0.8)
    await d.ring('before', None, None)
    await press(d, 'before', '.back', 0.4)
    await press(d, 'before', '.seg > button:nth-child(2)', 0.4)
    await press(d, 'before', '.card', 1.0)

    # After: one entry. The header row opens the sheet; OPEN changes the count at once; SAVE.
    await d.focus('after')
    await press(d, 'after', '.otr-trip', 0.5, dx=-40)
    await press(d, 'after', '.otr-seg button[data-open="1"]', 1.0)
    await press(d, 'after', '.psave', 0.3)
    await d.glide(*await d.to_stage('after', 330, 380), 0.4, on=False)

    # The same switch on the vehicle page, where there was none; the line gives this car's verdict.
    await d.glide(*await car(d, 'after'), 0.6)
    await d.tap()
    await d.lift()
    await d.wait(0.4)
    await press(d, 'after', '.card', 0.4)
    await press(d, 'after', '.otr-type', 0.5)
    await press(d, 'after', '.otr-seg button[data-open="0"]', 0.9)
    await press(d, 'after', '.otr-seg button[data-open="1"]', 0.9)
    await d.focus(None)
    await d.outro()
