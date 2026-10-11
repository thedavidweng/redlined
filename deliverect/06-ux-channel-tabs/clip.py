# Storyboard for 06-ux-channel-tabs. `d` is the Director from _tools/record.py.
async def run(d):
    await d.intro()
    for name in ['Malik', 'Ronan', 'Carter', 'Kevin']:
        r = await d.box('before', '.manage-row', name)
        await d.glide(r['x'] + r['width'] * .1, r['y'] + r['height'] / 2, 0.45, on=False)
        await d.wait(0.2)
    await d.wait(1.0)

    await d.focus('after')
    t = await d.box('after', '.p-channel:has-text("DoorDash")')
    await d.glide(*d.center(t), 1.0)
    await d.wait(0.25)
    await d.tap()
    await d.lift()
    await d.wait(2.4)
    await d.focus(None)
    await d.outro()
