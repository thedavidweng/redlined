# Storyboard for ux-picked-up-feedback. `d` is the Director from _tools/record.py.
# After side: three orders, three candidate effects (shine, ring, strike-through), one per tap.
async def run(d):
    await d.intro()
    b = await d.box('before', '.action-button', 'Ronan')
    await d.glide(*d.center(b), 0.9)
    await d.wait(0.25)
    await d.tap()
    await d.lift()
    await d.wait(1.8)

    await d.focus('after')
    for name in ['Ronan', 'Carter', 'Kevin']:  # shine, ring, strike-through
        a = await d.box('after', '.action-button', name)
        await d.glide(*d.center(a), 0.8)
        await d.wait(0.2)
        await d.tap()
        await d.lift()
        await d.wait(2.0)
    await d.wait(0.4)
    await d.focus(None)
    await d.outro()
