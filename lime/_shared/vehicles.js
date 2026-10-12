// Mock Lime data, shared by the mock and every redline. Everything here is fictional. Positions are written as screen points
// (pt, 390 x 844) at the home camera and converted to coordinates, so the layout can be tuned against the reference by eye.
// device mirrors stage.json (390 x 844, iPhone 16e: notch, no Dynamic Island); classic scripts can't read the JSON, so keep
// both in step. The camera is the West End by the Burrard Bridge (Beach Ave, Hornby, English Bay's False Creek shore), about 1.2 km from where the reference screenshots were taken: never move it there.
// Keep every scooter and parking spot out of the status bar and the top pill in the selected camera (home shifted by -16, +63): nothing may land at y 0-110 there.
globalThis.LimeData = (() => {
  const device = { width: 390, height: 844, radius: 47.33, cutout: 'notch', safe: { top: 47, bottom: 34 } };
  const camera = { center: [-123.1330, 49.2752], zoom: 16.7, bearing: 0 };

  // Screen point -> [lng, lat] at the home camera (Web Mercator, 512 px tiles; flat is accurate enough for a few hundred metres).
  const metersPerPt = 40075016.686 * Math.cos(camera.center[1] * Math.PI / 180) / (512 * 2 ** camera.zoom);
  const rad = camera.bearing * Math.PI / 180;
  const at = ([x, y]) => {
    const right = (x - device.width / 2) * metersPerPt, up = (device.height / 2 - y) * metersPerPt;
    const east = right * Math.cos(rad) + up * Math.sin(rad), north = up * Math.cos(rad) - right * Math.sin(rad);
    return [+(camera.center[0] + east / (111320 * Math.cos(camera.center[1] * Math.PI / 180))).toFixed(6), +(camera.center[1] + north / 110574).toFixed(6)];
  };

  // Inverse of at() for a north-up camera: the centre that puts `coordinates` at screen point [x, y] (used to open straight into a selected state).
  const frame = ([lng, lat], [x, y]) => [+(lng - (x - device.width / 2) * metersPerPt / (111320 * Math.cos(lat * Math.PI / 180))).toFixed(6), +(lat + (y - device.height / 2) * metersPerPt / 110574).toFixed(6)];

  const user = [195, 374];
  // Four scooters as on the reference screen, then more outside it for panning.
  const scooters = [[128, 166], [116, 190], [53, 252], [216, 322],
    [-60, 120], [-110, 330], [-40, 470], [450, 60], [470, 300], [430, 500], [120, -110], [300, -120], [250, -260], [-30, -200],
    [-190, 60], [520, 180], [-150, 560], [560, 420], [40, -330], [380, -130]];
  const nearest = scooters.reduce((best, p, i) => Math.hypot(p[0] - user[0], p[1] - user[1]) < Math.hypot(scooters[best][0] - user[0], scooters[best][1] - user[1]) ? i : best, 0);
  const points = list => list.map(p => ({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: at(p) } }));
  // Plates look like the real ones (three characters, a dash, three), all made up.
  const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const plate = i => [3, 11, 17, 5, 2, 9].map((a, k) => LETTERS[(i * [7, 5, 3, 11, 13, 17][k] + a) % LETTERS.length]).join('').replace(/(...)/, '$1-');
  const vehicles = points(scooters).map((f, i) => Object.assign(f, {
    id: i + 1,
    properties: { n: i, plate: plate(i), kind: 'scooter', range: i === nearest ? 13 : 5 + (i * 7) % 19, near: i === nearest },
  }));
  const polygon = ring => ({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[...ring, ring[0]].map(at)] } });

  // Dotted walk from the rider to scooter i: a curve that turns one corner, and a made-up time (30 pt per minute).
  function walk(i) {
    const [px, py] = scooters[i], path = [];
    for (let t = 0; t <= 1.001; t += .1) path.push([user[0] * (1 - t) ** 2 + 2 * user[0] * t * (1 - t) + px * t * t, user[1] * (1 - t) ** 2 + 2 * py * t * (1 - t) + py * t * t]);
    const length = path.slice(1).reduce((sum, p, k) => sum + Math.hypot(p[0] - path[k][0], p[1] - path[k][1]), 0);
    return { minutes: Math.max(1, Math.round(length / 30)), coordinates: at(scooters[i]),
      route: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: path.map(at) } } };
  }

  return {
    device, camera, frame, walk, nearest,
    vehicles: { type: 'FeatureCollection', features: vehicles },
    parking: { type: 'FeatureCollection', features: points([[301, 172], [79, 229], [289, 501], [-120, 250], [480, 380], [350, -120]]) },
    // No-parking and slow zones: red outline, translucent red fill.
    zones: { type: 'FeatureCollection', features: [
      polygon([[105, 630], [217, 633], [217, 671], [134, 667]]),
      polygon([[-30, 614], [42, 616], [112, 675], [90, 700], [-30, 800]]),
      polygon([[370, 545], [400, 540], [400, 625], [374, 612], [382, 580]]),
    ] },
    // Where the rider stands, and which way they face (compass degrees: left of the screen at the home camera).
    user: { coordinates: at(user), heading: (camera.bearing + 260) % 360 },
  };
})();
