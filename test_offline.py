"""Uji tanpa internet: python test_offline.py"""
import json, os, tempfile, threading, urllib.request, urllib.error
os.environ['DATA_DIR'] = tempfile.mkdtemp()
import links as L, server as S

def req(base, path, method='GET', body=None, headers=None):
    r = urllib.request.Request(base + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                               headers={'Content-Type': 'application/json', 'X-Visitor': 'testvisitor01', **(headers or {})})
    try:
        with urllib.request.urlopen(r, timeout=10) as x: return x.status, x.read(), dict(x.headers)
    except urllib.error.HTTPError as e: return e.code, e.read(), dict(e.headers)

ok = 0
def check(name, cond):
    global ok; ok += 1
    print(('PASS' if cond else 'FAIL'), name)
    if not cond: raise SystemExit(1)

# --- links.py
txt = "preset: https://alight.link/AbC123. xml di drive.google.com/file/d/1x/view?usp=sharing, capcut https://www.capcut.com/t/Z1 dan tiktok.com/@a/video/1 serta mega.nz/file/zz"
u = L.extract_urls(txt)
check('extract 4 link dikenali (tiktok diabaikan)', len(u) == 4)
check('titik penutup dibuang', u[0] == 'https://alight.link/AbC123')
check('klasifikasi', [L.classify(x)[0] for x in u] == ['am', 'file', 'capcut', 'file'])
lk = L.build_links('Preset https://alight.link/AbC123', [
    {'text': 'minta link https://alight.link/AbC123', 'user': 'x', 'is_creator': False, 'pinned': False, 'is_reply': False},
    {'text': 'xml https://www.mediafire.com/file/q', 'user': 'kreator', 'is_creator': True, 'pinned': False, 'is_reply': True}], 'kreator')
check('gabung duplikat + hitung mention', lk[0]['mentions'] == 2 and lk[0]['is_creator'])
check('urutan: kreator dulu lalu AM', [x['type'] for x in lk] == ['am', 'file'] and lk[1]['source'] == 'reply')
check('email/teks biasa tidak dianggap link', L.extract_urls('hubungi a@mega.nz atau hello.world/x') == [])

# --- server
S.get_info = lambda url: {'id': '7300000000000000001', 'uploader': 'kreator', 'creator': 'Kreator', 'description': 'Preset https://alight.link/AbC123 #am',
    'thumbnail': 'https://p16.tiktokcdn.com/x.jpg', 'duration': 12, 'view_count': 1000, 'like_count': 50, 'comment_count': 3, 'timestamp': 1700000000,
    'webpage_url': 'https://www.tiktok.com/@kreator/video/7300000000000000001',
    'formats': [{'format_id': 'download', 'vcodec': 'h264', 'height': 720}, {'format_id': 'h264_540', 'vcodec': 'h264', 'height': 540, 'filesize': 3145728},
                {'format_id': 'bytevc1_720', 'vcodec': 'bytevc1', 'height': 720, 'filesize_approx': 2097152}]}
S.fetch_comments = lambda vid, author, limit=300: [{'text': 'xml https://mediafire.com/file/zz', 'user': 'kreator', 'is_creator': True, 'pinned': True, 'is_reply': True}]
srv = S.Server(('127.0.0.1', 0), S.H); base = f'http://127.0.0.1:{srv.server_address[1]}'
threading.Thread(target=srv.serve_forever, daemon=True).start()

c, b, h = req(base, '/api/health'); check('health', c == 200 and json.loads(b)['ok'])
check('CORS header ada', h.get('Access-Control-Allow-Origin') == '*')
c, b, _ = req(base, '/api/quick', 'POST', {'url': 'https://vt.tiktok.com/ZSabc/'}); d = json.loads(b)
check('quick: partial + 1 link caption', c == 200 and d['partial'] and len(d['links']) == 1)
c, b, _ = req(base, '/api/extract', 'POST', {'url': 'https://vt.tiktok.com/ZSabc/'}); d = json.loads(b)
check('extract: 2 link, komentar terbaca', not d['partial'] and len(d['links']) == 2 and d['scanned']['comments'] == 1)
keys = [m['key'] for m in d['video']['media']]
check('media tanpa format watermark, ada best/hevc/cover', 'best' in keys and 'hevc' in keys and 'cover' in keys)
check('format best = 540p non-watermark', '540p' in next(m for m in d['video']['media'] if m['key'] == 'best')['meta'])
c, b, _ = req(base, '/api/extract', 'POST', {'url': 'https://example.com/x'}); check('tolak non-TikTok', c == 400)
c, b, _ = req(base, '/api/check', 'POST', {'urls': ['http://127.0.0.1:1/x', 'http://169.254.169.254/latest']}); d = json.loads(b)
check('SSRF: alamat privat diblokir', all(v['status'] == 'unknown' for v in d.values()))
c, _, _ = req(base, '/api/img?u=' + 'https://evil.example.com/a.jpg'); check('proxy gambar hanya host TikTok', c == 400)
for name, item in (('history', {'id': 'a', 'url': 'u1'}), ('saved', {'url': 'https://alight.link/x', 'type': 'am'})):
    req(base, f'/api/{name}', 'POST', item); c, b, _ = req(base, f'/api/{name}'); check(f'{name}: simpan & baca', json.loads(b)[0].get('url') or json.loads(b)[0].get('id'))
req(base, '/api/saved?url=' + 'https://alight.link/x', 'DELETE'); c, b, _ = req(base, '/api/saved'); check('saved: hapus satu', json.loads(b) == [])
c, b, _ = req(base, '/api/history', headers={'X-Visitor': 'otherperson99'}); check('riwayat terpisah per pengunjung', json.loads(b) == [])
c, b, h = req(base, '/'); check('index disajikan + meta API disuntik', c == 200 and b'name="frizy-api"' in b)
c, _, _ = req(base, '/../etc/passwd'); check('path traversal ditolak', c == 404)
for f in ('/server.py', '/links.py', '/Dockerfile', '/requirements.txt'):
    c, _, _ = req(base, f); check('kode sumber tidak bocor: ' + f, c == 404)
c, b, h = req(base, '/banner.mp4', headers={'Range': 'bytes=0-9'}); check('Range video (iOS)', c == 206 and len(b) == 10)
c, b, _ = req(base, '/api/creator', 'POST', {'user': 'a b'}); check('validasi username', c == 400)
print(f'\n{ok} uji lulus')
