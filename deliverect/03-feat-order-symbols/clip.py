# Storyboard for 03-feat-order-symbols. `d` is the Director from _tools/record.py.
SHAPE = {'square': '<rect x="3.5" y="3.5" width="17" height="17" rx="1.5"/>'}
RECEIPT_BEFORE = '<div class="cap">PICKUP · BAG LABEL</div><div class="big">RONAN</div><div>Mang Lau Shan</div><hr><div>#5D07B9E4</div><div>2× Mango Sago</div><div>1× Scallion Pancake</div>'
RECEIPT_AFTER = f'<div class="cap">PICKUP · BAG LABEL</div><svg viewBox="0 0 24 24" fill="#111">{SHAPE["square"]}</svg><div class="big">RONAN</div><div>Mang Lau Shan</div><hr><div>#5D07B9E4</div><div>2× Mango Sago</div><div>1× Scallion Pancake</div>'

async def run(d):
    await d.intro()
    await d.js('([s, h]) => stage.receipt(s, h)', ['before', RECEIPT_BEFORE])
    await d.wait(1.1)
    for name in ['Rohan', 'Ronan', 'Rohan']:
        await d.js('([s, n, c]) => stage.highlight(s, n, c)', ['before', name, 'cap-hl'])
        await d.wait(0.55)
    await d.js('([s, n, c]) => stage.highlight(s, n, c)', ['before', 'Rohan', 'cap-bad'])
    await d.wait(1.8)

    await d.focus('after')
    await d.js('stage.reload("after")')  # replay the symbols settling in
    await d.wait(1.4)
    await d.js('([s, h]) => stage.receipt(s, h)', ['after', RECEIPT_AFTER])
    await d.wait(1.0)
    await d.js('([s, n, c]) => stage.highlight(s, n, c)', ['after', 'Ronan', 'cap-good'])
    await d.wait(2.2)
    await d.focus(None)
    await d.outro()
