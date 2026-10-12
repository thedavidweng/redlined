# Filter from chips

**Problem** The nearest SUV is taken. The car's card says "SUV", but the chip is a label. To see the next one you open Filters, pick Vehicle Class, tick SUV, tap APPLY and then hunt the map for the closest pin.

**Change** The attribute chips on the car card and in Vehicle Information become buttons. Tap one and the map keeps only cars that share it: the type chip sets Vehicle Class (SUV), the seats chip sets "N +", and an Electric, Hybrid or Plug-in Hybrid chip ticks that feature. The Filters sheet shows the same option ticked, with the live count and Filter badge from redline 05, and Clear All still resets it. The sheet then jumps to the nearest other match, by straight-line distance from you, and a short toast says what is shown ("4 SUVs", "Electric · 3 cars"). From Vehicle Information the page closes first. Resting chips look as before; they only darken while pressed, since they already read as the Filters sheet's chips. Gas has no matching option, so its chip stays a label. If the car is the only match, the map filters and the sheet stays.

**Caption**

> The nearest SUV is taken. The "SUV" chip on its card does nothing, so you open Filters, pick the class, apply, then scan the map. Now the chips are buttons: tap SUV and the map keeps only SUVs, with a toast, and the sheet jumps to the next-nearest one.
![Filter from chips](media/clip.gif)

Upload `media/clip.mp4` to X. `clip.gif` is a fallback.

Builds on [05](../05-ux-filter-live-count/README.md): it loads 05's patch and drives it through the Filters sheet.

Preview: [../index.html#07-feat-filter-from-chips](../index.html#07-feat-filter-from-chips)
Live: [../mock/index.html?redline=07-feat-filter-from-chips](../mock/index.html?redline=07-feat-filter-from-chips)
