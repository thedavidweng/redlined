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
  // One entry per parking spot above, in the same order: street, kind, level, reserved spots, hours, short text (compact card), details (expanded card). All invented.
  const SPOTS = [
    ['2290 West 4th Ave', 'parkade-underground', 'P1', 6, 'Open 24/7', 'Underground parkade, Level P1 - reserved Evo bays by the lift', 'Underground parkade with 6 reserved Evo spots on level P1, next to the elevator lobby'],
    ['1475 Vine Street', 'lot', '', 4, 'Open 6am–11pm', 'Surface lot behind the building - Evo bays at the back', 'Surface lot behind the building with 4 reserved Evo spots along the back fence'],
    ['3120 Yew Street', 'street', '', 3, 'Open 24/7', 'Street parking - Evo bays marked on the east side', 'Street parking with 3 Evo bays marked on the east side of the block'],
    ['2415 Larch Street', 'parkade-above', 'L2', 8, 'Open 24/7', 'Parkade Reserved Level 2 - follow the Evo signs', 'Parkade with 8 reserved Evo spots on Level 2, entrance from the lane'],
    ['1893 Cypress Street', 'lot', '', 5, 'Open 6am–11pm', 'Gated lot - Evo bays right of the entrance', 'Gated lot with 5 reserved Evo spots to the right of the entrance, gate opens with the Evo app'],
    ['2840 Arbutus Street', 'parkade-underground', 'P2', 10, 'Open 24/7', 'Underground Level P2 - overflow available on P3', 'Underground parkade with 10 reserved Evo spots on level P2 and overflow on level P3'],
    ['1018 Balsam Street', 'street', '', 2, 'Open 24/7', 'Street parking - two Evo bays by the corner', 'Street parking with 2 Evo bays by the corner, next to the mailbox'],
    ['3361 West 10th Ave', 'parkade-above', 'L3', 10, 'Open 24/7', 'North Parkade Reserved Level 3 - overflow available on the roof', 'North parkade with 10 reserved Evo spots on Level 3 and overflow on roof (level 8)'],
    ['2652 Maple Street', 'lot', '', 6, 'Open 7am–10pm', 'Surface lot - Evo bays near the bike racks', 'Surface lot with 6 reserved Evo spots near the bike racks'],
    ['1260 Pine Street', 'parkade-underground', 'P1', 4, 'Open 24/7', 'Underground Level P1 - reserved bays by the stairs', 'Underground parkade with 4 reserved Evo spots on level P1, beside the stairwell'],
    ['2207 West 12th Ave', 'street', '', 3, 'Open 24/7', 'Street parking - Evo bays on the north side', 'Street parking with 3 Evo bays on the north side of the avenue'],
    ['1700 West 7th Ave', 'lot', '', 5, 'Open 6am–11pm', 'Surface lot - enter from the lane', 'Surface lot with 5 reserved Evo spots, entrance from the lane'],
    ['2950 Larch Street', 'parkade-above', 'L1', 7, 'Open 24/7', 'Parkade Reserved Level 1 - overflow on Level 2', 'Parkade with 7 reserved Evo spots on Level 1 and overflow on Level 2'],
    ['1550 West 4th Ave', 'parkade-underground', 'P1', 12, 'Open 24/7', 'Underground Level P1 - 12 reserved spots', 'Underground parkade with 12 reserved Evo spots on level P1, entrance on Yew Street'],
  ];
  const parking = points(parkingSpots).map((f, i) => {
    const [street, kind, level, spots, hours, short, details] = SPOTS[i];
    return Object.assign(f, { id: i + 1, properties: { n: i, name: `${street}${level ? ` - ${level}` : ''}: ${spots} Reserved Spots${kind === 'parkade-above' ? ' & Overflow Parking' : ''}`, short, details, hours, kind, level } });
  });
  const nearestParking = 3;

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

  // The app shows the straight line from the rider to the spot ("> 10.62 km"), not a walk.
  const distance = i => Math.hypot(parkingSpots[i][0] - user[0], parkingSpots[i][1] - user[1]) * metersPerPt(camera.center[1], camera.zoom) / 1000;

  return {
    device, camera, frame, walk, distance, nearest, nearestParking, PIN, SELECTED_ZOOM,
    vehicles: { type: 'FeatureCollection', features: vehicles },
    parking: { type: 'FeatureCollection', features: parking },
    charging: { type: 'FeatureCollection', features: points(chargers) },
    user: { coordinates: at(user) },
    price: { perMinute: 0.49, accessFee: 1.85, rates: [['For 1 minute', 0.49], ['1 hour', 17.99], ['1 day', 104.99], ['3 days', 264.99], ['5 days', 424.99]] },
  };
})();
