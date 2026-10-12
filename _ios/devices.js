// The one place a device's size is written. Classic script, so pages, _tools/stage.html and mocks all read the same global.
//   IosDevices['iphone-16e']  →  { width, height, radius, cutout, safe }  (points; the shape IosDevice.mount takes)
// A product names its device in <product>/_shared/stage.json ("device": "iphone-16e") and passes the entry to IosDevice.mount.
// Add a model here when a product needs one; sizes come from the reference notes ("logical W×H @Nx").
globalThis.IosDevices = {
  // 390 x 844: notch, no Dynamic Island.
  'iphone-16e': { width: 390, height: 844, radius: 47.33, cutout: 'notch', safe: { top: 47, bottom: 34 } },
};
