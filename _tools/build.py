# Builds the public site into _site/ for GitHub Pages (.github/workflows/pages.yml runs it on every push to main).
# Same files and relative paths as the repo, so the site behaves exactly like double-clicking index.html, minus what
# only matters for authoring and posting: tooling, docs, READMEs, GIFs. Clips are re-encoded for the web: the repo
# keeps the X upload masters (CRF ≤16), the site gets ~1/3 the bytes at the same 1080p. Run by hand:
#   python3 _tools/build.py   → _site/  (preview: cd _site && python3 -m http.server)
import hashlib, pathlib, shutil, subprocess, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from sync import ROOT, sync

OUT = ROOT / '_site'
CACHE = ROOT / '.cache' / 'web-clips'  # encodes keyed by master hash; CI keeps it between runs, so only new clips encode
SKIP_DIRS = {'.git', '.github', '.lody', '.cache', '_site', 'docs', '__pycache__', 'node_modules'}
SKIP_SUFFIXES = {'.md', '.py', '.mjs', '.gif', '.json'}
SKIP_NAMES = {'.DS_Store', '.gitignore', 'frame.css', 'stage.html', 'serve.py'}
KEEP = {'_tools/brand.css', '_tools/logo.svg'}  # the only _tools/ files pages link to


def wanted(rel):
    if rel.parts[0] == '_tools':
        return rel.as_posix() in KEEP
    return not (SKIP_DIRS & set(rel.parts) or rel.suffix in SKIP_SUFFIXES or rel.name in SKIP_NAMES
                or any(p.startswith('.frames-') for p in rel.parts))


ENCODE = ['-an', '-c:v', 'libx264', '-crf', '26', '-preset', 'slow', '-tune', 'animation', '-pix_fmt', 'yuv420p', '-color_range', 'tv',
          '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-movflags', '+faststart']


def web_clip(src, dst):
    key = hashlib.sha256(src.read_bytes() + ' '.join(ENCODE).encode()).hexdigest()[:20]
    cached = CACHE / f'{key}.mp4'
    if not cached.exists():
        CACHE.mkdir(parents=True, exist_ok=True)
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src, *ENCODE, cached.with_suffix('.tmp.mp4')], check=True)
        cached.with_suffix('.tmp.mp4').rename(cached)
    shutil.copy2(cached, dst)


def build():
    sync()
    shutil.rmtree(OUT, ignore_errors=True)
    total = 0
    for src in sorted(ROOT.rglob('*')):
        rel = src.relative_to(ROOT)
        if not src.is_file() or not wanted(rel):
            continue
        dst = OUT / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        if src.name == 'clip.mp4':
            web_clip(src, dst)
        else:
            shutil.copy2(src, dst)
        total += dst.stat().st_size
    (OUT / '.nojekyll').touch()  # folders like _tools/ and _shared/ must be served as-is
    print(f'_site: {sum(1 for p in OUT.rglob("*") if p.is_file())} files, {total / 1e6:.1f} MB')


if __name__ == '__main__':
    build()
