# Dev server for the whole repo: static files, never cached. Each request for <product>/_shared/redlines.js
# re-runs sync.py first, so new or renamed redline folders show up on reload. Run from anywhere:
#   python3 _tools/serve.py [port]   → http://127.0.0.1:4173/<product>/
import http.server, pathlib, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from sync import ROOT, sync


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_GET(self):
        if self.path.split('?')[0].endswith('/_shared/redlines.js'):
            sync()
        super().do_GET()


class Server(http.server.ThreadingHTTPServer):
    request_queue_size = 128  # the default (5) resets connections when two iframes load at once


port = int(sys.argv[1]) if sys.argv[1:] else 4173
sync()
print(f'Serving {ROOT} at http://127.0.0.1:{port}/')
Server(('127.0.0.1', port), Handler).serve_forever()
