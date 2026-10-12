// Mock Modo data, shared by the mock and every redline. Everything here is fictional: stations, plates, member. Positions are written as screen
// points (pt, 390 x 844) at the home camera and converted to coordinates, so the layout can be tuned against the reference by eye.
// The device is IosDevices['iphone-16e'] (_ios/devices.js, also named in stage.json): load that script first.
// The camera is Fairview, Vancouver (Granville St and W 8th Ave), about 3 km from where the references were taken.
globalThis.ModoData = (() => {
  const device = IosDevices['iphone-16e'];
  // The present. ?now=<ISO local time> (like ?state=, only read from the URL) freezes it, so recordings do not depend on the hour; without it, the real clock.
  const fixed = new URLSearchParams(location.search).get('now'), pinned = fixed && new Date(fixed);
  const clock = () => pinned && !isNaN(pinned) ? new Date(pinned) : new Date();
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

  // One car per pin (index = pin n), invented. `class` and `features` use the Filters sheet's vocabulary (class: CAR/SUV/VAN/CARGO; features: its lowercase rows), `seats` is a number
  // (the sheet's "N +" chips mean at least N), so a redline can count matches with `match`. Pin 0 is the car every earlier state shows. The photo is still the one Corolla asset.
  const C = (name, type, seats, fuel, cls, ...features) => ({ name, type, seats, fuel, plan: 'Daily Drives', class: cls, features });
  const cars = [
    C('Toyota Corolla Hatchback', '4-door Hatchback', 5, 'Gas', 'CAR', 'audio: apple carplay'),
    C('Toyota RAV4', 'SUV', 5, 'Gas', 'SUV', 'all-wheel drive', 'roof rack'),
    C('Toyota Prius Prime PHEV', '4-door Hatchback', 5, 'Plug-in Hybrid', 'CAR', 'plug-in hybrid', 'hybrid', 'audio: apple carplay'),
    C('Hyundai Kona Electric', 'SUV', 5, 'Electric', 'SUV', 'electric vehicle', 'audio: android auto'),
    C('Honda Civic Sedan', '4-door Sedan', 5, 'Gas', 'CAR', 'audio: apple carplay', 'audio: android auto'),
    C('Chrysler Grand Caravan', 'Minivan', 7, 'Gas', 'VAN', 'child seat'),
    C('Ford Transit Cargo', 'Cargo Van', 2, 'Gas', 'CARGO', 'dolly: hand truck'),
    C('Mazda3 Hatchback', '4-door Hatchback', 5, 'Gas', 'CAR', 'audio: android auto'),
    C('Toyota Prius', '4-door Hatchback', 5, 'Hybrid', 'CAR', 'hybrid'),
    C('Subaru Outback', 'Wagon', 5, 'Gas', 'SUV', 'all-wheel drive', 'roof rack', 'winter tires'),
    C('Kia Soul', '4-door Hatchback', 5, 'Gas', 'CAR', 'bike rack - holds 2 bikes'),
    C('Nissan Leaf', '4-door Hatchback', 5, 'Electric', 'CAR', 'electric vehicle'),
    C('Honda CR-V Hybrid', 'SUV', 5, 'Hybrid', 'SUV', 'all-wheel drive', 'hybrid'),
    C('Toyota Sienna Hybrid', 'Minivan', 8, 'Hybrid', 'VAN', 'hybrid', 'child seat'),
    C('Mazda MX-5 Convertible', '2-door Convertible', 2, 'Gas', 'CAR', 'convertible'),
    C('Ford Ranger', 'Pickup Truck', 5, 'Gas', 'CARGO', 'pickup truck'),
    C('Toyota Corolla Hatchback', '4-door Hatchback', 5, 'Gas', 'CAR'),
    C('Hyundai Elantra', '4-door Sedan', 5, 'Gas', 'CAR', 'audio: apple carplay'),
    C('Tesla Model 3', '4-door Sedan', 5, 'Electric', 'CAR', 'electric vehicle'),
    C('Volkswagen Golf', '4-door Hatchback', 5, 'Gas', 'CAR', 'ski/snowboard rack', 'winter tires'),
  ];
  // Pin numbers whose car matches a filter choice: { classes: ['SUV'], seats: 5 (at least), features: ['hybrid'] (all of them) }; every key is optional. A redline counts with `.length`.
  const match = ({ classes = [], seats = 0, features = [] } = {}) => cars.flatMap((c, n) => (!classes.length || classes.includes(c.class)) && c.seats >= seats && features.every(f => c.features.includes(f)) ? [n] : []);

  // Availability (invented; the reference only shows the near car free from now). Busy windows are [start, end) in quarter hours from the START OF THE CURRENT HOUR, so
  // every recording looks the same apart from the clock labels. Pin 0 is free from now until +68.5 h (Latest Availability: 8:30 AM three days on, as in the booked reference, whose strip is free for the whole visible afternoon), busy after.
  const Q = 9e5, FAR = 4000;
  const busy = n => {
    if (n === 0) return [[274, FAR]];
    const a = (n * 11) % 24 - 8, b = a + 8 + (n * 5) % 16 + 12 + (n * 7) % 60, c = b + 8 + (n * 3) % 20 + 40 + (n * 17) % 100;
    return [[a, a + 8 + (n * 5) % 16], [b, c], [c + 30, FAR]];
  };
  const floorHour = (now = clock()) => new Date(now).setMinutes(0, 0, 0);
  // Busy intervals of pin n as [Date, Date] pairs, ordered, anchored to the hour of `now`.
  const availability = (n, now = clock()) => busy(n).map(([a, b]) => [new Date(floorHour(now) + a * Q), new Date(floorHour(now) + b * Q)]);
  // The free window containing [start, end]: { earliest, latest } (Dates; earliest is never before the current hour, latest is the next busy start), or null if it overlaps a busy interval.
  const window = (n, start, end, now = clock()) => {
    const iv = availability(n, now);
    if (iv.some(([a, b]) => start < b && end > a)) return null;
    const before = iv.filter(([, b]) => b <= start).pop(), next = iv.find(([a]) => a >= end);
    return { earliest: new Date(Math.max(floorHour(now), before ? +before[1] : 0)), latest: next ? next[0] : null };
  };

  return {
    device, camera, now: clock, frame, near, at, availability, window, cars, match,
    pins: { type: 'FeatureCollection', features: pins },
    clusters: { type: 'FeatureCollection', features: clusterFeatures },
    user: { coordinates: at([195, 404]) },
    // The member on the vehicle page: the author's name, by choice, with a made-up number (not the real member number).
    member: '114514 David Weng',
    car: cars[near],
    parking: 'Level P2, stalls 14 and 15 in the Hemlock Street entrance. Take the ramp on the lane side of the building and keep right. Return the car to the same stall.',
    address: '1500 W 8th Avenue, Vancouver, BC',
  };
})();
