// Mock Evo data, shared by the mock and every redline. Everything here is fictional. Positions are written as screen points
// (pt, 390 x 844) at the home camera and converted to coordinates, so the layout can be tuned against the reference by eye.
// The device is IosDevices['iphone-16e'] (_ios/devices.js, also named in stage.json): load that script first. The camera is Kitsilano (Burrard Bridge, Kits Point, West 4th Avenue),
// about 1.3 km from Lime's camera and nowhere near where the reference screenshots were taken: never move it there.
// Keep every car and parking spot out of the top 120 pt in the selected camera (the pill and the buttons cover it) except the one the reference shows clipped under the pill.
globalThis.EvoData = (() => {
  const device = IosDevices['iphone-16e'];
  const camera = { center: [-123.147, 49.2685], zoom: 13, bearing: 0 };
  const SELECTED_ZOOM = 16, PIN = [195, 362];  // where the selected car's tip sits on screen: above the compact sheet

  const metersPerPt = (lat, zoom) => 40075016.686 * Math.cos(lat * Math.PI / 180) / (512 * 2 ** zoom);
  const lngPerM = lat => 1 / (111320 * Math.cos(lat * Math.PI / 180)), latPerM = 1 / 110574;
  // Screen point -> [lng, lat] at the home camera (north up, flat is accurate enough for a few km).
  const at = ([x, y]) => {
    const m = metersPerPt(camera.center[1], camera.zoom);
    return [+(camera.center[0] + (x - device.width / 2) * m * lngPerM(camera.center[1])).toFixed(6), +(camera.center[1] - (y - device.height / 2) * m * latPerM).toFixed(6)];
  };
  // The camera centre that puts `coordinates` at screen point [x, y] at `zoom` (north up).
  const frame = ([lng, lat], [x, y] = PIN, zoom = SELECTED_ZOOM) => {
    const m = metersPerPt(lat, zoom);
    return [+(lng - (x - device.width / 2) * m * lngPerM(lat)).toFixed(6), +(lat + (y - device.height / 2) * m * latPerM).toFixed(6)];
  };

  const user = [150, 440];
  // The nearest car first (the one the select flow opens on), then the one the reference shows clipped under the pill when it is selected,
  // then the cars on the home screen, then more outside it for panning.
  const A = [210, 565];
  const cars = [A, [A[0] - 2, A[1] - 32],
    [34, 560], [66, 575], [60, 598], [110, 520], [118, 640], [160, 676], [300, 520], [330, 560], [354, 596], [276, 612], [248, 668], [318, 650], [362, 690], [338, 726],
    [284, 780], [212, 742], [186, 800], [120, 752], [60, 700], [20, 768], [96, 820], [236, 820], [374, 470], [262, 460], [40, 470], [80, 420], [210, 410], [326, 420],
    [150, 360], [20, 380], [330, 130], [360, 80], [300, 200]];
  // Seeded scatter beyond the screen, on land.
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 70; i++) {
    const p = [Math.round(-320 + rand() * 1000), Math.round(400 + rand() * 780)];
    if (p[0] > 400 && p[1] < 780) continue;  // False Creek
    cars.push(p);
  }
  const nearest = 0;
  const parkingSpots = [[301, 590], [79, 530], [250, 700], [140, 600], [30, 640], [350, 520], [200, 500], [300, 740], [62, 800], [372, 400], [120, 790], [12, 520], [230, 610], [320, 230]];
  const chargers = [[180, 610], [100, 680], [330, 620], [60, 450]];
  const points = list => list.map(p => ({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: at(p) } }));

  // Plates look like the real ones (two letters, a digit, a space, two digits, a letter), all made up.
  const LETTERS = 'ABCDEFGHJKLMNPRSTUVWXYZ';
  const plate = i => `${LETTERS[(i * 7 + 3) % 23]}${LETTERS[(i * 5 + 11) % 23]}${(i * 3 + 1) % 10} ${(i * 11 + 2) % 10}${(i * 13 + 5) % 10}${LETTERS[(i * 3 + 9) % 23]}`;
  const STREETS = ['West 7th Avenue', 'Vine Street', 'Larch Street', 'Yew Street', 'Cypress Street', 'West 4th Avenue', 'Arbutus Street', 'Balsam Street', 'West 10th Avenue', 'Maple Street', 'Pine Street', 'West 12th Avenue'];
  const address = i => `${[1260, 2415, 1893, 3120, 2207, 1475, 2840, 1018, 3361, 2652][(i * 7) % 10]} ${STREETS[(i * 5) % STREETS.length]}`;
  const vehicles = points(cars).map((f, i) => Object.assign(f, {
    id: i + 1,
    properties: { n: i, plate: plate(i), model: 'Prius', fuel: i === nearest ? 62 : 25 + (i * 17) % 71, address: i === nearest ? '2315 Larch Street' : address(i) },
  }));

  // From the rider to car i: the walk is 1.25 times the straight line, at 5 km/h; 6.23 m per pt at the home zoom.
  function walk(i) {
    const [px, py] = cars[i], km = Math.hypot(px - user[0], py - user[1]) * metersPerPt(camera.center[1], camera.zoom) * 1.25 / 1000;
    return { km, minutes: Math.max(1, Math.round(km / 5 * 60)) };
  }

  return {
    device, camera, frame, walk, nearest, PIN, SELECTED_ZOOM,
    vehicles: { type: 'FeatureCollection', features: vehicles },
    parking: { type: 'FeatureCollection', features: points(parkingSpots) },
    charging: { type: 'FeatureCollection', features: points(chargers) },
    user: { coordinates: at(user) },
    price: { perMinute: 0.49, accessFee: 1.85, rates: [['For 1 minute', 0.49], ['1 hour', 17.99], ['1 day', 104.99], ['3 days', 264.99], ['5 days', 424.99]] },
  };
})();
