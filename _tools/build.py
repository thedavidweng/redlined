# Builds the public site into _site/ for GitHub Pages (.github/workflows/pages.yml runs it on every push to main).
# Same files and relative paths as the repo, so the site behaves exactly like double-clicking index.html, minus what
# only matters for authoring and posting: tooling, docs, READMEs, GIFs and every media/ folder (recorded clips are
# local-only, for X; the pages run the mocks live through _tools/stage.html). Run by hand:
#   python3 _tools/build.py   → _site/  (preview: cd _site && python3 -m http.server)
import pathlib, shutil, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from sync import ROOT, sync

OUT = ROOT / '_site'
SKIP_DIRS = {'.git', '.github', '.lody', '.cache', '.scratch', '_site', 'docs', '__pycache__', 'node_modules', 'media'}
SKIP_SUFFIXES = {'.md', '.py', '.mjs', '.gif', '.json'}
SKIP_NAMES = {'.DS_Store', '.gitignore', 'frame.css', 'serve.py'}
KEEP = {'_tools/brand.css', '_tools/logo.svg', '_tools/stage.html', '_tools/play.js',
        '_tools/previewer.css', '_tools/previewer.js'}  # the only _tools/ files pages link to


def wanted(rel):
    if rel.parts[0] == '_tools':
        return rel.as_posix() in KEEP
    return not (SKIP_DIRS & set(rel.parts) or rel.suffix in SKIP_SUFFIXES or rel.name in SKIP_NAMES
                or any(p.startswith('.frames-') for p in rel.parts))


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
        shutil.copy2(src, dst)
        total += dst.stat().st_size
    (OUT / '.nojekyll').touch()  # folders like _tools/ and _shared/ must be served as-is
    print(f'_site: {sum(1 for p in OUT.rglob("*") if p.is_file())} files, {total / 1e6:.1f} MB')


if __name__ == '__main__':
    build()
