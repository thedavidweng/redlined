# Storyboard for 01-fix-range-in-km. `d` is the Director from _tools/record.py.
# Vehicle markers are map layers, not DOM nodes, so the tap point comes from the map: project() gives mock pixels, to_stage() the page.
PROJECT = '''() => { const [lng, lat] = LimeData.vehicles.features[LimeData.nearest].geometry.coordinates;
  const p = LimeMap.project([lng, lat]), r = LimeMap.getContainer().getBoundingClientRect(); return [r.left + p.x, r.top + p.y]; }'''
SETTLED = "typeof LimeMap !== 'undefined' && LimeMap.loaded() && !LimeMap.isMoving() && !!LimeMap.getLayer('vehicles')"


async def car(d, side):
    frame = await d.frame(side)
    return await d.to_stage(side, *await frame.evaluate(PROJECT))


async def run(d):
    # Tiles and markers first: an unloaded map would show blank squares behind the finger.
    for side in ('before', 'after'):
        frame = await d.frame(side)
        while not await frame.evaluate(SETTLED):
            await d.wait(0.2)
    await d.wait(0.8)

    await d.intro()
    await d.glide(*await car(d, 'before'), 1.0)
    await d.wait(0.25)
    await d.tap()
    await d.lift()
    await d.wait(2.6)

    await d.focus('after')
    await d.glide(*await car(d, 'after'), 1.1)
    await d.wait(0.25)
    await d.tap()
    await d.lift()
    await d.wait(2.8)
    await d.focus(None)
    await d.outro()
