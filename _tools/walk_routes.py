"""Precompute routes along streets, so mocks need no runtime fetch (pages work from file://). Walking by default, driving with --profile car.

    uv run python _tools/walk_routes.py <in.json> <out.js> <GlobalName> [--profile foot|car] [--names]

in.json:  {"from": [lng, lat], "to": [[lng, lat], ...]}
out.js:   classic script, globalThis.<GlobalName> = [{ "distance": m, "duration": s, "coordinates": [[lng, lat], ...] }, ...]
          (index = position in "to"; the line is trimmed to start and end exactly at the given points, see trim()).
          --names adds "name": the street the router snapped the end point to ("" if unnamed), for labels.
Router: OSM Germany (routing.openstreetmap.de), queried one at a time with a short delay. Profiles: foot (default, routed-foot) and
car (routed-car, driving: one-ways and turn rules apply, no live traffic).
"""
import json, math, sys, time, urllib.request

PROFILES = {'foot': 'routed-foot/route/v1/foot', 'car': 'routed-car/route/v1/driving'}
URL = 'https://routing.openstreetmap.de/{}/{},{};{},{}?overview=full&geometries=geojson'
LABELS = {'foot': 'Walking routes from routing.openstreetmap.de (OSRM foot profile, OpenStreetMap data).',
          'car': 'Driving routes from routing.openstreetmap.de (OSRM car profile, OpenStreetMap data).'}


def closest(line, p):
    """(squared distance, segment index, point) of the point on the polyline nearest to p, in local metres."""
    k = math.cos(math.radians(p[1]))
    best = None
    for i in range(len(line) - 1):
        (x0, y0), (x1, y1) = line[i], line[i + 1]
        dx, dy = (x1 - x0) * k, y1 - y0
        t = 0 if dx == dy == 0 else max(0, min(1, (((p[0] - x0) * k) * dx + (p[1] - y0) * dy) / (dx * dx + dy * dy)))
        q = [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]
        d = ((p[0] - q[0]) * k) ** 2 + (p[1] - q[1]) ** 2
        if best is None or d < best[0]: best = (d, i, q)
    return best


def trim(line, a, b):
    """The router snaps both ends to a street, so the line may run past an endpoint and double back. Cut it to the stretch between the
    points nearest to the exact endpoints, then join the endpoints themselves."""
    if len(line) < 2: return [a, b]
    _, i, p = closest(line, a)
    _, j, q = closest(line, b)
    if i > j: return [a] + line + [b]
    mid = line[i + 1:j + 1]
    return [a, [round(p[0], 6), round(p[1], 6)]] + mid + [[round(q[0], 6), round(q[1], 6)], b]


def route(a, b, profile='foot', names=False):
    req = urllib.request.Request(URL.format(PROFILES[profile], *a, *b), headers={'User-Agent': 'redlined-walk-routes/1.0'})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                reply = json.load(r)
            best = reply['routes'][0]
            break
        except Exception as e:
            if attempt == 3:
                raise
            print('retry', e, file=sys.stderr)
            time.sleep(2 * (attempt + 1))
    line = [[round(x, 6), round(y, 6)] for x, y in best['geometry']['coordinates']]
    line = trim(line, list(a), list(b))
    line = [p for k, p in enumerate(line) if k == 0 or p != line[k - 1]]
    result = {'distance': round(best['distance'], 1), 'duration': round(best['duration'], 1), 'coordinates': line}
    if names: result['name'] = reply['waypoints'][1].get('name', '')
    return result


def main(src, out, name, profile='foot', names=False):
    spec = json.load(open(src))
    start = [round(v, 6) for v in spec['from']]
    routes = []
    for i, to in enumerate(spec['to']):
        routes.append(route(start, [round(v, 6) for v in to], profile, names))
        print(i, routes[-1]['distance'], 'm', routes[-1]['duration'], 's', file=sys.stderr)
        time.sleep(1)
    flags = (f' --profile {profile}' if profile != 'foot' else '') + (' --names' if names else '')
    head = (f'// Generated, do not edit. {LABELS[profile]}\n'
            f'// Regenerate: uv run python _tools/walk_routes.py {src} {out} {name}{flags}\n')
    body = ',\n'.join('  ' + json.dumps(r, separators=(',', ':')) for r in routes)
    open(out, 'w').write(f'{head}globalThis.{name} = [\n{body}\n];\n')


if __name__ == '__main__':
    args = sys.argv[1:]
    names = '--names' in args
    if names: args.remove('--names')
    profile = 'foot'
    if '--profile' in args:
        i = args.index('--profile')
        profile = args[i + 1] if i + 1 < len(args) else ''
        del args[i:i + 2]
    if len(args) != 3 or profile not in PROFILES: sys.exit(__doc__)
    main(*args, profile, names)
