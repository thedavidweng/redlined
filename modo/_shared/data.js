// Mock Modo data, shared by the mock and every redline. Everything here is fictional: stations, plates, member. Positions are written as screen
// points (pt, 390 x 844) at the home camera and converted to coordinates, so the layout can be tuned against the reference by eye.
// The device is IosDevices['iphone-16e'] (_ios/devices.js, also named in stage.json): load that script first.
// The camera is Fairview, Vancouver (Granville St and W 8th Ave), about 3 km from where the references were taken.
globalThis.ModoData = (() => {
  const device = IosDevices['iphone-16e'];
  const camera = { center: [-123.1385, 49.2645], zoom: 15.8, bearing: 0 };

  // Screen point -> [lng, lat] at the home camera (Web Mercator, 512 px tiles; flat is accurate enough for a few hundred metres).
  const metersPerPt = 40075016.686 * Math.cos(camera.center[1] * Math.PI / 180) / (512 * 2 ** camera.zoom);
  const at = ([x, y]) => {
    const east = (x - device.width / 2) * metersPerPt, north = (device.height / 2 - y) * metersPerPt;
    return [+(camera.center[0] + east / (111320 * Math.cos(camera.center[1] * Math.PI / 180))).toFixed(6), +(camera.center[1] + north / 110574).toFixed(6)];
  };
  // Inverse for a north-up camera: the centre that puts `coordinates` at screen point [x, y] (used to open straight into a selected state).
  const frame = ([lng, lat], [x, y], zoom = camera.zoom) => {
    const m = metersPerPt * 2 ** (camera.zoom - zoom);
    return [+(lng - (x - device.width / 2) * m / (111320 * Math.cos(lat * Math.PI / 180))).toFixed(6), +(lat + (y - device.height / 2) * m / 110574).toFixed(6)];
  };

  // Pin tips at the home camera. The first two and the cluster are laid out like the reference; the rest are outside the screen, for panning.
  const solo = [[89, 348], [111, 601], [300, 250], [330, 520], [-80, 300], [450, 420], [250, -100], [40, -60], [470, 150], [-60, 700], [380, 800], [200, 900], [120, 1000], [280, 1050], [-30, 880]];
  // Clusters: a count and the pins inside; they split into pins from zoom 16.9.
  const clusters = [{ at: [59, 521], members: [[50, 513], [68, 529]] }, { at: [330, 60], members: [[320, 52], [338, 58], [330, 72]] }];
  const STREETS = ['W Broadway', 'W 7th Avenue', 'W 8th Avenue', 'W 10th Avenue', 'W 12th Avenue', 'Granville Street', 'Hemlock Street', 'Fir Street', 'Birch Street', 'Oak Street', 'Spruce Street', 'Pine Street'];
  const LETTERS = 'ABCDEFGHJKLMNPRSTUVWXYZ';
  const make = (p, i, group) => ({
    type: 'Feature', id: i + 1, geometry: { type: 'Point', coordinates: at(p) },
    properties: {
      n: i, group,
      station: `Vancouver - ${STREETS[(i * 5) % STREETS.length]} & ${STREETS[(i * 5 + 3 + i % 3) % STREETS.length]}`.replace(/(.+) & \1/, '$1 & Cambie Street'),
      plate: [3, 1, 12].map((a, k) => LETTERS[(i * [5, 7, 3][k] + a) % LETTERS.length]).join('').replace(/(..)(.)/, `$1${(i * 3 + 4) % 10} ${(i * 7 + 2) % 10}${(i * 11 + 7) % 10}$2`),
    },
  });
  const pins = solo.map((p, i) => make(p, i, 0));
  const clusterFeatures = [];
  clusters.forEach((c, k) => {
    c.members.forEach(p => pins.push(make(p, pins.length, k + 1)));
    clusterFeatures.push({ type: 'Feature', id: k + 1, geometry: { type: 'Point', coordinates: at(c.at) }, properties: { k: k + 1, count: c.members.length } });
  });
  const near = 0;

  return {
    device, camera, frame, near, at,
    pins: { type: 'FeatureCollection', features: pins },
    clusters: { type: 'FeatureCollection', features: clusterFeatures },
    user: { coordinates: at([195, 404]) },
    // The member on the vehicle page (made up).
    member: 'PM-2817 Alex Rivera',
    car: { name: 'Toyota Corolla Hatchback', type: '4-door Hatchback', seats: 5, fuel: 'Gas', plan: 'Daily Drives' },
    parking: 'Level P2, stalls 14 and 15 in the Hemlock Street entrance. Take the ramp on the lane side of the building and keep right. Return the car to the same stall.',
    address: '1500 W 8th Avenue, Vancouver, BC',
  };
})();
