// Mock Mobi data, shared by the mock and every redline. Everything here is fictional: the stations, counts, distances, bike numbers and
// the User Code. Positions are written as screen points (pt, 390 x 844) at the home camera and converted to coordinates, so the layout
// can be tuned against the reference by eye. The device is IosDevices['iphone-16e'] (_ios/devices.js, also named in stage.json): load it first.
// The camera is Yaletown by Pacific Boulevard, about 1.1 km from where the reference screenshots were taken: never move it there.
// The walking routes are in routes.js (station i there is station i here); load it first too.
globalThis.MobiData = (() => {
  const device = IosDevices['iphone-16e'];
  const camera = { center: [-123.11866, 49.27543], zoom: 15.9, bearing: 0 };
  const FRAME = { zoom: 17, mid: [182, 280] };  // selected camera: zoom, and where the middle of rider and station sits (above the half sheet)

  const KX = 111320 * Math.cos(camera.center[1] * Math.PI / 180), KY = 110574;
  const metersPerPt = zoom => 40075016.686 * Math.cos(camera.center[1] * Math.PI / 180) / (512 * 2 ** zoom);
  // Screen point -> [lng, lat] at the home camera (flat is accurate enough for a few hundred metres).
  const at = ([x, y]) => [+(camera.center[0] + (x - device.width / 2) * metersPerPt(camera.zoom) / KX).toFixed(6), +(camera.center[1] - (y - device.height / 2) * metersPerPt(camera.zoom) / KY).toFixed(6)];

  // [name, bikes, docks, electric bikes among the bikes, operational]. The first seven are on the home screen, as in the reference.
  const LIST = [
    ['Hamilton & Nelson', 8, 11, 3], ['Nelson & Cambie', 19, 4, 6], ['Cambie & Pacific', 10, 9, 4], ['Pacific & Beatty', 17, 0, 5],
    ['Pacific & Davie', 19, 6, 7], ['Davie & Marinaside', 5, 14, 2], ['Pacific & Expo', 12, 8, 4], ['Richards & Smithe', 6, 13, 1],
    ['Hamilton & Davie', 14, 5, 5, false], ['Smithe & Cambie', 3, 16, 0], ['Expo & Robson', 9, 10, 3], ['Homer & Nelson', 15, 4, 6],
    ['Richards & Nelson', 7, 12, 2], ['Pacific & Mainland', 11, 8, 4], ['Marinaside & Boathouse', 4, 15, 1], ['Marinaside & Cooperage', 13, 6, 5],
    ['Marinaside & Davie', 18, 3, 8], ['Nelson & Seymour', 2, 17, 0], ['Homer & Smithe', 16, 3, 6], ['Robson & Beatty', 10, 9, 3],
  ];
  // Bike numbers: five digits, made up, stable per station.
  const bikeIds = (i, count) => Array.from({ length: count }, (_, k) => 30000 + (i * 7919 + k * 1543 + 211) % 9000 + k);
  const stations = LIST.map(([name, bikes, docks, electric, operational = true], i) => ({
    n: i, name: `Station ${name}`, bikes, docks, electric, operational,
    ft: MobiRoutes.stations[i].ft, minutes: Math.max(1, Math.round(MobiRoutes.stations[i].ft / 290)),
    electricIds: bikeIds(i, electric), mechanicalIds: bikeIds(i + 31, bikes - electric),
  }));
  const feature = (coordinates, properties = {}, id) => ({ type: 'Feature', id, properties, geometry: { type: 'Point', coordinates } });
  const polygon = ring => ({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[...ring, ring[0]].map(at)] } });

  // The selected camera: zoom and centre that put the middle of rider and station at FRAME.mid, shrinking the zoom if they would not fit.
  function frame(i) {
    const [ux, uy] = MobiRoutes.user, [sx, sy] = MobiRoutes.stations[i].at;
    const dx = Math.abs(sx - ux) * KX, dy = Math.abs(sy - uy) * KY;
    let zoom = FRAME.zoom;
    const fit = Math.max(dx / metersPerPt(zoom) / 300, dy / metersPerPt(zoom) / 270);
    if (fit > 1) zoom -= Math.log2(fit);
    const m = metersPerPt(zoom);
    return { zoom, center: [+((ux + sx) / 2 + (device.width / 2 - FRAME.mid[0]) * m / KX).toFixed(6), +((uy + sy) / 2 - (device.height / 2 - FRAME.mid[1]) * m / KY).toFixed(6)] };
  }

  return {
    device, camera, frame, stations, nearest: 3, unavailable: 8,
    user: MobiRoutes.user,
    code: '4081265',  // User Code: seven digits, made up
    stationPoints: { type: 'FeatureCollection', features: stations.map(s => feature(MobiRoutes.stations[s.n].at, { n: s.n }, s.n + 1)) },
    routes: { type: 'FeatureCollection', features: stations.map(s => ({ type: 'Feature', id: s.n + 1, properties: { n: s.n }, geometry: { type: 'LineString', coordinates: MobiRoutes.stations[s.n].route } })) },
    // The out-of-service zone: red outline over diagonal hatching.
    zones: { type: 'FeatureCollection', features: [
      polygon([[-40, -40], [262, -40], [222, 92], [92, 118], [-40, 176]]),
      polygon([[336, -40], [440, -40], [440, 128], [388, 108], [350, 70]]),
    ] },
  };
})();
