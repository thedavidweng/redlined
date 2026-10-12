# Storyboard for 07-feat-filter-from-chips. `d` is the Director from _tools/record.py.
# Both sides: tap the RAV4's pin, then its "SUV" chip. Before: the chip is a label (the tap falls through to the card and opens the page), so the map is unchanged.
# After: the map keeps only SUVs, a toast says how many, and the sheet jumps to the nearest other one (the Kona).
# Pins are map layers: project() gives mock pixels, to_stage() the page.
PIN = 1  # the RAV4, an SUV south-west of the user
PROJECT = '''n => { const p = ModoMap.project(ModoData.pins.features[n].geometry.coordinates), r = ModoMap.getContainer().getBoundingClientRect();
  return [r.left + p.x, r.top + p.y - 22]; }'''  # pins hang above their tip: tap the head
SETTLED = "typeof ModoMap !== 'undefined' && ModoMap.loaded() && !ModoMap.isMoving() && !!ModoMap.getLayer('pins')"
CHIP, BACK = '.card .chips .chip', '.back'


async def tap_box(d, side, selector, dx=0, glide=0.9):
    x, y = d.center(await d.box(side, selector), dx)
    await d.glide(x, y, glide)
    await d.wait(0.2)
    await d.tap()
    await d.lift()


async def select(d, side):
    frame = await d.frame(side)
    await d.glide(*await d.to_stage(side, *await frame.evaluate(PROJECT, PIN)), 0.8)
    await d.wait(0.25)
    await d.tap()
    await d.lift()
    await d.wait(1.0)  # camera and sheet settle


async def run(d):
    for side in ('before', 'after'):
        frame = await d.frame(side)
        while not await frame.evaluate(SETTLED):
            await d.wait(0.2)
    await d.wait(0.8)
    await d.intro()

    # Before: the SUV chip is not a button. The tap opens the vehicle page; back, and the map still shows every car.
    await select(d, 'before')
    await d.wait(0.3)
    await tap_box(d, 'before', CHIP, -6)
    await d.wait(0.9)
    await tap_box(d, 'before', BACK, 0, 0.6)
    await d.wait(1.0)

    # After: the same tap filters to SUVs and selects the nearest other one.
    await d.focus('after')
    await select(d, 'after')
    await d.wait(0.3)
    await tap_box(d, 'after', CHIP, -6)
    await d.wait(2.6)  # toast "SUV · 4 cars", camera and sheet on the Kona, other cars gone
    await d.focus(None)
    await d.outro()
