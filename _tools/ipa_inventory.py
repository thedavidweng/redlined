# Unpacks an iOS .ipa into .scratch/<product>/ipa/ and writes inventory.md: Info.plist facts, tech stack guess
# (with evidence), Asset Catalog dump + PNG export, loose images/PDF/SVG, Lottie JSON, fonts, colours, brand/map candidates.
# Local reference only: output stays in .scratch/ (gitignored), never published. Run by hand (macOS: needs
# otool, nm, xcrun assetutil, swiftc; fontTools is the only package):
#   uv run --with fonttools python _tools/ipa_inventory.py .scratch/IPA/com.limebike-3.285.0.ipa lime
# Output: ipa/raw/ (unzipped IPA), ipa/assetcatalog/<car>/ (info.json, index.csv, png/), ipa/inventory.md.
# PNG export goes through the private CoreUI framework (assetutil can only dump metadata); vectors and
# named gradients can't be exported that way and are listed with that reason.
import csv, json, pathlib, plistlib, re, shutil, subprocess, sys, tempfile, zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
LOOSE = {'.png', '.jpg', '.jpeg', '.pdf', '.svg', '.webp', '.gif', '.heic', '.mp4', '.mov'}
FONTS = {'.ttf', '.otf', '.ttc'}
BRAND = re.compile(r'logo|brand|wordmark|splash|launch', re.I)
MARKER = re.compile(r'marker|(?<![a-z])[Pp]in(?![a-z])|annotation|cluster|scooter|bike|vehicle|parking|zone|(?<![a-z])[Mm]ap(?![a-z])')
THIRD_PARTY = re.compile(r'/(Frameworks|PlugIns)/|Stripe|Primer|braze|Mapbox|Veriff|Luciq|Persona|Intercom|Zendesk|Sentry|Firebase|Google|Messaging|CommonUI', re.I)
SELECTED = re.compile(r'select|active|highlight|focus', re.I)

SWIFT = r'''
import Foundation
import ImageIO
import UniformTypeIdentifiers
// usage: car <Assets.car> <outdir>; prints OK/SKIP lines as tab-separated
let a = CommandLine.arguments
dlopen("/System/Library/PrivateFrameworks/CoreUI.framework/CoreUI", RTLD_NOW)
let cls = NSClassFromString("CUICatalog") as! NSObject.Type
let cat = cls.perform(NSSelectorFromString("alloc"))!.takeUnretainedValue() as! NSObject
var err: NSError? = nil
typealias InitFn = @convention(c) (AnyObject, Selector, NSURL, UnsafeMutablePointer<NSError?>) -> AnyObject?
let fn = unsafeBitCast(cat.method(for: NSSelectorFromString("initWithURL:error:")), to: InitFn.self)
guard let c = fn(cat, NSSelectorFromString("initWithURL:error:"), NSURL(fileURLWithPath: a[1]), &err) as? NSObject else { print("ERR\topen failed"); exit(1) }
let out = URL(fileURLWithPath: a[2])
for name in c.value(forKey: "allImageNames") as! [String] {
  let r = c.perform(NSSelectorFromString("imagesWithName:"), with: name)?.takeUnretainedValue() as? [NSObject] ?? []
  for im in r {
    guard im.responds(to: NSSelectorFromString("image")), let p = im.perform(NSSelectorFromString("image"))?.toOpaque() else { print("SKIP\t\(name)\t\(type(of: im))"); continue }
    let scale = (im.responds(to: NSSelectorFromString("scale")) ? im.value(forKey: "scale") as? NSNumber : nil)?.intValue ?? 1
    let safe = name.replacingOccurrences(of: "/", with: "__")
    var k = 1; var u = out.appendingPathComponent("\(safe)@\(scale)x.png")
    while FileManager.default.fileExists(atPath: u.path) { k += 1; u = out.appendingPathComponent("\(safe)@\(scale)x-\(k).png") }
    guard let d = CGImageDestinationCreateWithURL(u as CFURL, UTType.png.identifier as CFString, 1, nil) else { print("SKIP\t\(name)\tno destination"); continue }
    CGImageDestinationAddImage(d, Unmanaged<CGImage>.fromOpaque(p).takeUnretainedValue(), nil)
    print(CGImageDestinationFinalize(d) ? "OK\t\(name)\t\(u.lastPathComponent)" : "SKIP\t\(name)\twrite failed")
  }
}
'''


def run(*cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, **kw)


def md_table(head, rows):
    if not rows:
        return '_none_\n'
    esc = lambda c: str(c).replace('|', '\\|').replace('\n', ' ')
    return '\n'.join(['| ' + ' | '.join(head) + ' |', '|' + '---|' * len(head)] + ['| ' + ' | '.join(esc(c) for c in r) + ' |' for r in rows]) + '\n'


def find_app(raw):
    apps = list((raw / 'Payload').glob('*.app'))
    if not apps:
        sys.exit('no Payload/*.app in the IPA')
    return apps[0]


def plist_summary(app):
    p = plistlib.loads((app / 'Info.plist').read_bytes())
    perms = {k: v for k, v in p.items() if k.endswith('UsageDescription')}
    schemes = [s for t in p.get('CFBundleURLTypes', []) for s in t.get('CFBundleURLSchemes', [])]
    rows = [('bundle id', p.get('CFBundleIdentifier')), ('name', p.get('CFBundleDisplayName') or p.get('CFBundleName')),
            ('version', f"{p.get('CFBundleShortVersionString')} ({p.get('CFBundleVersion')})"),
            ('min iOS', p.get('MinimumOSVersion')), ('executable', p.get('CFBundleExecutable')),
            ('device family', p.get('UIDeviceFamily')),
            ('orientations (iPhone)', p.get('UISupportedInterfaceOrientations')),
            ('orientations (iPad)', p.get('UISupportedInterfaceOrientations~ipad')),
            ('UIAppFonts', p.get('UIAppFonts')), ('URL schemes', schemes),
            ('LSApplicationQueriesSchemes', p.get('LSApplicationQueriesSchemes')),
            ('launch screen', p.get('UILaunchStoryboardName') or p.get('UILaunchScreen')),
            ('UIUserInterfaceStyle', p.get('UIUserInterfaceStyle'))]
    return p, rows, perms


def detect_stack(app, exe_name):
    ev, exe = [], app / exe_name
    fw = app / 'Frameworks'
    names = {x.name for x in fw.iterdir()} if fw.is_dir() else set()
    flags = {'flutter': False, 'rn': False, 'swiftui': False, 'other': []}
    if 'Flutter.framework' in names:
        flags['flutter'] = True
        ev.append('Frameworks/Flutter.framework present')
    if (fw / 'App.framework' / 'flutter_assets').is_dir():
        flags['flutter'] = True
        ev.append('Frameworks/App.framework/flutter_assets present')
    for j in sorted(app.glob('*.jsbundle')):
        flags['rn'] = True
        ev.append(f'{j.relative_to(app)} (JS bundle, {j.stat().st_size} bytes)')
    for n in sorted(names):
        if n.lower().startswith(('hermes', 'react')):
            flags['rn'] = True
            ev.append(f'Frameworks/{n} present')
    for n in ('Capacitor', 'Cordova', 'Xamarin', 'UnityFramework'):
        if any(x.startswith(n) for x in names) or (app / 'www').is_dir() and n in ('Cordova', 'Capacitor'):
            flags['other'].append(n)
            ev.append(f'{n} marker found')
    if exe.is_file():
        crypt = run('otool', '-arch', 'arm64', '-l', str(exe)).stdout
        m = re.search(r'cryptid (\d)', crypt)
        encrypted = bool(m and m.group(1) == '1')
        libs = run('otool', '-arch', 'arm64', '-L', str(exe)).stdout
        if 'SwiftUI.framework' in libs:
            flags['swiftui'] = True
            ev.append('main binary links SwiftUI.framework (otool -L)')
        if 'libswiftCore' in libs or 'Swift' in libs:
            ev.append('main binary links Swift runtime')
        if 'UIKit.framework' in libs:
            ev.append('main binary links UIKit.framework')
        if encrypted:
            ev.append('main binary is FairPlay encrypted (cryptid 1): symbols/strings are not readable, so SwiftUI/RN '
                      'checks on the binary are inconclusive; only linked libraries and bundle files count')
        else:
            syms = run('nm', '-arch', 'arm64', str(exe)).stdout
            if re.search(r'\$s7SwiftUI|SwiftUI\.', syms):
                flags['swiftui'] = True
                ev.append('SwiftUI symbols in main binary (nm)')
            if re.search(r'RCTBridge|RCTRootView|facebook.*react', syms):
                flags['rn'] = True
                ev.append('React Native symbols in main binary (nm)')
        for ext in ('SwiftUI', 'Lottie', 'Mapbox', 'GoogleMaps', 'MapKit', 'MapLibre'):
            if ext in libs or any(ext.lower() in n.lower() for n in names):
                ev.append(f'links/embeds {ext}')
    if flags['flutter']:
        stack = 'Flutter'
    elif flags['rn']:
        stack = 'React Native'
    elif flags['other']:
        stack = '/'.join(flags['other'])
    elif flags['swiftui']:
        stack = 'Native iOS (SwiftUI linked; likely mixed with UIKit)'
    else:
        stack = 'Native iOS (UIKit)'
    return stack, ev


def fonts_info(files, raw, TTFont):
    rows = []
    for f in files:
        try:
            coll = [TTFont(f, fontNumber=0)] if f.suffix != '.ttc' else None
            if coll is None:
                from fontTools.ttLib import TTCollection
                coll = list(TTCollection(f).fonts)
        except Exception as e:
            rows.append((f.name, 'unreadable: ' + str(e)[:60], '', '', f.relative_to(raw).as_posix()))
            continue
        for t in coll:
            n = t['name']
            ps = n.getDebugName(6) or ''
            fam = n.getDebugName(16) or n.getDebugName(1) or ''
            w = t['OS/2'].usWeightClass if 'OS/2' in t else '?'
            var = 'variable' if 'fvar' in t else ''
            rows.append((f.name, ps, f'{fam} / {n.getDebugName(2) or ""}', f'{w} {var}'.strip(), f.relative_to(raw).as_posix()))
    return rows


def lottie_files(raw):
    out = []
    for f in raw.rglob('*'):
        if f.suffix.lower() in ('.json', '.lottie') and f.is_file() and f.stat().st_size < 20_000_000:
            data = None
            try:
                if zipfile.is_zipfile(f):  # dotLottie container
                    with zipfile.ZipFile(f) as z:
                        for n in z.namelist():
                            if n.endswith('.json') and 'manifest' not in n:
                                d = json.loads(z.read(n))
                                if isinstance(d, dict) and 'v' in d and 'layers' in d:
                                    out.append((f, d, f'{n} inside zip'))
                    continue
                data = json.loads(f.read_bytes())
            except Exception:
                continue
            if isinstance(data, dict) and 'v' in data and 'layers' in data:
                out.append((f, data, ''))
    return out


def hexof(c, space):
    if space in ('srgb', 'p3', 'extended srgb', 'display p3') and len(c) >= 3:
        return '#' + ''.join(f'{max(0, min(255, round(v * 255))):02X}' for v in c[:3]), (c[3] if len(c) > 3 else 1)
    if 'gray' in space and len(c) >= 1:
        g = max(0, min(255, round(c[0] * 255)))
        return f'#{g:02X}{g:02X}{g:02X}', (c[1] if len(c) > 1 else 1)
    return None, None


def catalogs(app, raw, out, swiftbin):
    sections, summary = [], []
    for car in sorted(app.rglob('*.car')):
        rel = car.relative_to(raw).as_posix()
        slug = re.sub(r'[^A-Za-z0-9]+', '_', car.relative_to(app).as_posix()[:-4]).strip('_')
        d = out / 'assetcatalog' / slug
        (d / 'png').mkdir(parents=True, exist_ok=True)
        r = run('xcrun', 'assetutil', '--info', str(car))
        try:
            info = json.loads(r.stdout)
        except Exception:
            summary.append((rel, 'assetutil --info failed: ' + r.stderr.strip()[:100], '', ''))
            continue
        (d / 'info.json').write_text(json.dumps(info, indent=1))
        types = {}
        for x in info:
            if x.get('AssetType'):
                types[x['AssetType']] = types.get(x['AssetType'], 0) + 1
        exp = run(str(swiftbin), str(car), str(d / 'png')) if swiftbin else None
        ok, skipped = {}, []
        for line in (exp.stdout.splitlines() if exp else []):
            p = line.split('\t')
            if p[0] == 'OK':
                ok.setdefault(p[1], []).append(p[2])
            elif p[0] == 'SKIP':
                skipped.append((p[1], p[2]))
        if exp and exp.returncode:
            skipped.append(('(whole catalog)', 'CoreUI export failed: ' + (exp.stdout + exp.stderr)[-150:]))
        rows = []
        for x in info:
            t = x.get('AssetType')
            if not t:
                continue
            nm = x.get('Name', '')
            files = ';'.join(ok.get(nm, [])) if t in ('Image', 'PackedImage', 'Icon Image', 'MultiSized Image', 'IconImageStack', 'IconGroup') else ''
            rows.append((nm, t, x.get('Scale', ''), x.get('PixelWidth', ''), x.get('PixelHeight', ''), x.get('Idiom', ''),
                         x.get('Appearance', ''), x.get('RenditionName', ''), files, rel))
        with open(d / 'index.csv', 'w', newline='') as fh:
            w = csv.writer(fh)
            w.writerow(['name', 'type', 'scale', 'px_w', 'px_h', 'idiom', 'appearance', 'rendition', 'exported_png', 'source_in_ipa'])
            w.writerows(rows)
        sections.append(dict(rel=rel, slug=slug, rows=rows, info=info, ok=ok, skipped=skipped, types=types))
        summary.append((rel, ', '.join(f'{k} {v}' for k, v in sorted(types.items())),
                        sum(len(v) for v in ok.values()), len(skipped)))
    return sections, summary


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    ipa, product = pathlib.Path(sys.argv[1]).resolve(), sys.argv[2]
    try:
        from fontTools.ttLib import TTFont
    except ImportError:
        sys.exit('needs fontTools: uv run --with fonttools python _tools/ipa_inventory.py <ipa> <product>')
    out = ROOT / '.scratch' / product / 'ipa'
    if out.exists():
        shutil.rmtree(out)
    raw = out / 'raw'
    raw.mkdir(parents=True)
    with zipfile.ZipFile(ipa) as z:
        z.extractall(raw)
    app = find_app(raw)
    plist, plist_rows, perms = plist_summary(app)
    stack, evidence = detect_stack(app, plist.get('CFBundleExecutable', ''))

    tmp = pathlib.Path(tempfile.mkdtemp())
    (tmp / 'car.swift').write_text(SWIFT)
    sb = run('swiftc', '-O', str(tmp / 'car.swift'), '-o', str(tmp / 'car'))
    swiftbin = tmp / 'car' if sb.returncode == 0 else None
    cat_note = '' if swiftbin else f'CoreUI export helper failed to compile: {sb.stderr[-200:]}'
    sections, cat_summary = catalogs(app, raw, out, swiftbin)
    shutil.rmtree(tmp, ignore_errors=True)

    rel = lambda f: f.relative_to(raw).as_posix()
    loose = sorted(f for f in raw.rglob('*') if f.is_file() and f.suffix.lower() in LOOSE)
    fonts = sorted(f for f in raw.rglob('*') if f.is_file() and f.suffix.lower() in FONTS)
    lotties = lottie_files(raw)
    flutter = sorted(rel(f) for f in raw.rglob('flutter_assets/*') if f.is_file())
    rn = sorted(rel(f) for f in app.rglob('*') if f.is_file() and f.suffix in ('.jsbundle', '.hbc', '.bundle') and f.is_file())
    nibs = sum(1 for _ in app.rglob('*.nib')) + sum(1 for _ in app.rglob('*.storyboardc'))

    L = [f'# IPA inventory: {product}', '', f'Source IPA: `{ipa.name}`. Extracted to `.scratch/{product}/ipa/raw/` (local only, never committed or published).', '',
         '**Cannot be recovered from an IPA: UI structure, widget/view tree, layout, spacing, navigation or interaction logic.** '
         'Only assets (images, fonts, colours, animations) and metadata are listed here. Layout must come from reference screenshots.', '',
         '## Info.plist', '', md_table(['key', 'value'], plist_rows), '### Permission descriptions', '',
         md_table(['key', 'text'], sorted(perms.items())), f'## Tech stack: {stack}', '', *[f'- {e}' for e in evidence], '',
         f'Compiled UI files in bundle (`.nib` / `.storyboardc`): {nibs}. They are compiled and not reconstructed here.', '',
         '## Asset catalogs', '', cat_note, md_table(['catalog (source path)', 'asset types', 'PNG exported', 'not exported'], cat_summary)]
    for s in sections:
        L += [f'### `{s["rel"]}`', '', f'Full list with original names, scales and exported file: `assetcatalog/{s["slug"]}/index.csv` (raw dump: `info.json`, PNGs: `png/`).', '']
        if s['skipped']:
            reasons = {}
            for n, why in s['skipped']:
                reasons.setdefault(why, []).append(n)
            L += ['Not exported:', '']
            for why, ns in reasons.items():
                note = {'CUINamedMultisizeImageSet': 'multi-size set (app icon); individual sizes appear as separate Image rows',
                        'CUINamedVectorGlyph': 'vector glyph (SF-style symbol), CoreUI gives no bitmap',
                        'CUINamedVectorImage': 'vector (PDF/SVG-backed) asset: CoreUI only renders it at runtime'}.get(why, why)
                L.append(f'- {len(ns)} x {note}: {", ".join(sorted(set(ns))[:12])}{" ..." if len(set(ns)) > 12 else ""}')
            L.append('')
        vec = [r for r in s['rows'] if r[1] == 'Vector']
        if vec:
            L += [f'Vector assets ({len(vec)}) are listed in index.csv with no bitmap: assetutil only reports metadata for them and CoreUI draws them at runtime.', '']
    # colours
    crow = []
    for s in sections:
        for x in s['info']:
            if x.get('AssetType') == 'Color':
                h, a = hexof(x.get('Color components', []), x.get('Colorspace', ''))
                if h:
                    crow.append((x['Name'], h, a, x.get('Colorspace'), x.get('Appearance', ''), s['rel']))
    L += ['## Colours (named colours from Asset Catalog)', '', 'Hex is the raw component values in the stated colour space (P3 values are not converted to sRGB). Only named catalog colours are listed; colours hard-coded in code or in the binary are not recoverable.', '',
          md_table(['name', 'hex', 'alpha', 'colorspace', 'appearance', 'source'], crow)]
    # candidates
    cand, sdk = [], {}
    for s in sections:
        main = not THIRD_PARTY.search(s['rel'])
        seen = set()
        for r in s['rows']:
            if r[1] not in ('Image', 'PackedImage') or not r[8] or r[0] in seen:
                continue
            if BRAND.search(r[0]) or MARKER.search(r[0]):
                seen.add(r[0])
                if main:
                    kind = 'brand/logo' if BRAND.search(r[0]) else 'map marker'
                    cand.append((kind, 'selected/active' if SELECTED.search(r[0]) else '', r[0], f'assetcatalog/{s["slug"]}/png/' + sorted(r[8].split(';'))[-1], f'{r[3]}x{r[4]}', r[9]))
                else:
                    sdk[s['rel']] = sdk.get(s['rel'], 0) + 1
    for f in loose:
        if (BRAND.search(f.name) or MARKER.search(f.name)) and 'Frameworks' not in f.parts and not any(p.endswith('.bundle') for p in f.parts):
            cand.append(('brand/logo' if BRAND.search(f.name) else 'map marker', 'selected/active' if SELECTED.search(f.name) else '', f.name, f'raw/{rel(f)}', '', rel(f)))
    cand.sort()
    L += ['## Brand logo and map marker candidates', '', 'Matched by name only (logo, brand, splash, marker, pin, annotation, cluster, scooter, bike, vehicle, parking, zone, map), from the app\'s own catalogs (everything not under Frameworks/, PlugIns/ or a known SDK name) and loose app-root files; one row per asset name, path shows the highest-scale PNG. Look at the PNGs before using one.', '',
          md_table(['kind', 'state', 'original name', 'exported / file (under ipa/)', 'px', 'source in IPA'], cand),
          'Name matches inside SDK/third-party catalogs (not listed, see each index.csv): ' + (', '.join(f'`{k}` {v}' for k, v in sdk.items()) or 'none') + '.', '']
    # loose
    L += ['## Loose image, PDF, SVG and media files', '', f'{len(loose)} files outside Asset Catalogs. By extension: ' +
          ', '.join(f'{e} {sum(1 for f in loose if f.suffix.lower() == e)}' for e in sorted({f.suffix.lower() for f in loose})) + '.', '']
    L.append(md_table(['original name', 'size', 'source in IPA'], [(f.name, f.stat().st_size, rel(f)) for f in loose[:400]]))
    if len(loose) > 400:
        L.append(f'_{len(loose) - 400} more not shown; use `find raw -type f`._\n')
    # lottie
    L += ['## Lottie animations', '', 'Recognised by JSON with `v` and `layers` fields.', '',
          md_table(['original name', 'lottie v', 'layers', 'size WxH', 'source in IPA'],
                   [(f.name + (f' ({note})' if note else ''), d.get('v'), len(d['layers']), f'{d.get("w")}x{d.get("h")}', rel(f)) for f, d, note in lotties])]
    # fonts
    frows = fonts_info(fonts, raw, TTFont)
    L += ['## Fonts', '', f'Font files are for local reference only; do not commit or publish them (licensing). UIAppFonts: {plist.get("UIAppFonts")}.', '',
          md_table(['file', 'PostScript name', 'family / style', 'weight class (400 regular, 700 bold)', 'source in IPA'], frows)]
    # flutter / rn
    L += ['## Flutter artefacts', '', f'{len(flutter)} files under flutter_assets.' if flutter else '_none_', '']
    if flutter:
        L.append(md_table(['source in IPA'], [(x,) for x in flutter[:300]]))
    L += ['## React Native artefacts', '', md_table(['source in IPA'], [(x,) for x in rn])]
    (out / 'inventory.md').write_text('\n'.join(L))
    print(f'{product}: {stack}; catalogs {len(sections)}, PNG {sum(len(v) for s in sections for v in s["ok"].values())}, '
          f'loose {len(loose)}, fonts {len(frows)}, lottie {len(lotties)}, colours {len(crow)}, candidates {len(cand)} -> {out / "inventory.md"}')


if __name__ == '__main__':
    main()
