#!/usr/bin/env python3
"""Backend Frizy Preset. Hanya butuh Python 3.9+; yt-dlp & segno untuk fitur TikTok/QR.
Menyajikan juga folder web/ sehingga satu server cukup (API di path /api/...)."""
import glob, hashlib, io, ipaddress, json, logging, mimetypes, os, re, shutil, socket, tempfile, threading, time, traceback
from collections import defaultdict, deque
from concurrent.futures import ThreadPoolExecutor, as_completed
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError
from urllib.parse import parse_qs, quote, urljoin, urlparse
from urllib.request import HTTPRedirectHandler, Request, build_opener

import links as L

PORT = int(os.environ.get('PORT', 8000))
HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.environ.get('DATA_DIR', os.path.join(HERE, 'data'))
WEB_DIR = os.environ.get('WEB_DIR') or HERE
PUBLIC_EXT = {'.html', '.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.webm', '.mp4', '.webmanifest', '.ico'}  # file .py/Dockerfile tidak pernah disajikan
UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36'
IMG_HOSTS = ('tiktokcdn.com', 'tiktokcdn-us.com', 'tiktokcdn-eu.com', 'tiktok.com', 'tiktokv.com', 'ibyteimg.com', 'byteimg.com', 'ibytedtos.com', 'muscdn.com')
log = logging.getLogger('frizy')
os.makedirs(DATA_DIR, exist_ok=True)


class ApiError(Exception):
    def __init__(self, detail, code=400):
        super().__init__(detail); self.detail, self.code = detail, code


# ---------------------------------------------------------------- jaringan aman (anti-SSRF)
def public_host(host):
    try:
        return all(ipaddress.ip_address(a[4][0].split('%')[0]).is_global for a in socket.getaddrinfo(host, None))
    except Exception:
        return False


class _NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *a, **k): return None


_opener = build_opener(_NoRedirect)


def safe_open(url, timeout=8, headers=None, hops=5):
    h = {'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.8'}; h.update(headers or {})
    for _ in range(hops + 1):
        p = urlparse(url)
        if p.scheme not in ('http', 'https') or not p.hostname or not public_host(p.hostname):
            raise ValueError('blocked')
        try:
            return _opener.open(Request(url, headers=h), timeout=timeout), url
        except HTTPError as e:
            if e.code in (301, 302, 303, 307, 308) and e.headers.get('Location'):
                url = urljoin(url, e.headers['Location']); continue
            return e, url
    raise ValueError('too many redirects')


def status_of(r): return getattr(r, 'status', None) or r.getcode()


# ---------------------------------------------------------------- rate limit & penyimpanan
_hits = defaultdict(deque)
def allow(ip, limit=40, per=60):
    now, q = time.time(), _hits[ip]
    while q and now - q[0] > per: q.popleft()
    if len(q) >= limit: return False
    q.append(now); return True


_store_lock = threading.Lock()
def visitor_id(headers, ip):
    v = headers.get('X-Visitor', '')
    return v if re.fullmatch(r'[A-Za-z0-9_-]{8,64}', v) else 'ip-' + hashlib.sha1(ip.encode()).hexdigest()[:16]

def store_load(vid):
    try:
        with open(os.path.join(DATA_DIR, vid + '.json'), encoding='utf8') as f: return json.load(f)
    except Exception: return {'history': [], 'saved': []}

def store_save(vid, d):
    p = os.path.join(DATA_DIR, vid + '.json'); tmp = p + '.tmp'
    with open(tmp, 'w', encoding='utf8') as f: json.dump(d, f, ensure_ascii=False)
    os.replace(tmp, p)


# ---------------------------------------------------------------- TikTok (yt-dlp)
_INFO, _LOCKS, _glock = {}, {}, threading.Lock()
TTL = 600

def _ytdlp(opts):
    try:
        import yt_dlp
    except ImportError:
        raise ApiError('yt-dlp belum terpasang di server (pip install -r requirements.txt).', 500)
    base = {'quiet': True, 'no_warnings': True, 'noplaylist': True, 'socket_timeout': 15}
    base.update(opts); return yt_dlp.YoutubeDL(base)

def get_info(url):
    """Info video (di-cache, satu permintaan per URL pada satu waktu)."""
    with _glock:
        hit = _INFO.get(url)
        if hit and time.time() - hit[0] < TTL: return hit[1]
        lock = _LOCKS.setdefault(url, threading.Lock())
    with lock:
        hit = _INFO.get(url)
        if hit and time.time() - hit[0] < TTL: return hit[1]
        try:
            info = _ytdlp({'skip_download': True}).extract_info(url, download=False)
        except ApiError: raise
        except Exception as e:
            log.warning('yt-dlp gagal: %s', e)
            raise ApiError('Video tidak ditemukan, privat, atau TikTok menolak permintaan. Coba lagi sebentar lagi.', 422)
        with _glock:
            _INFO[url] = _INFO[str(info['id'])] = (time.time(), info)
        return info

def human(n):
    if not n: return ''
    return ('%.1f MB' % (n / 1048576)).replace('.', ',') if n >= 1048576 else '%d KB' % round(n / 1024)

def _is_wm(f): return f.get('format_id') == 'download' or 'watermark' in (f.get('format_note') or '').lower()
def _codec(f): return (f.get('vcodec') or '').lower()
def _pick(fmts, hevc):
    c = [f for f in fmts if (_codec(f).startswith(('h265', 'hevc', 'bytevc1')) if hevc else _codec(f).startswith(('h264', 'avc')))]
    return max(c, key=lambda f: (f.get('height') or 0, f.get('tbr') or 0), default=None)

def media_list(info):
    vf = [f for f in info.get('formats') or [] if _codec(f) not in ('', 'none')]
    clean = [f for f in vf if not _is_wm(f)] or vf
    out = []
    best, hevc = _pick(clean, False), _pick(clean, True)
    for key, f, title, badge, codec in (('best', best, 'Kualitas terbaik', 'Disarankan', 'H.264'), ('hevc', hevc, 'Resolusi tinggi', 'HEVC', 'HEVC')):
        if f:
            out.append({'key': key, 'title': title, 'badge': badge, 'kind': 'video', 'ext': 'mp4', 'size': human(f.get('filesize') or f.get('filesize_approx')),
                        'meta': ' · '.join(x for x in ((f'{f["height"]}p' if f.get('height') else ''), codec, 'MP4', 'tanpa watermark' if not _is_wm(f) else '') if x)})
    if out and (shutil.which('ffmpeg') or any(_codec(f) == 'none' for f in info.get('formats') or [])):
        out.append({'key': 'audio', 'title': 'Audio saja', 'badge': '', 'kind': 'audio', 'ext': 'mp3', 'size': '', 'meta': 'MP3'})
    if info.get('thumbnail'):
        out.append({'key': 'cover', 'title': 'Gambar sampul', 'badge': '', 'kind': 'image', 'ext': 'jpg', 'size': '', 'meta': 'JPG'})
    return out

def shape_video(info, url):
    return {'id': str(info['id']), 'url': info.get('webpage_url') or url, 'author': info.get('uploader') or '',
            'nickname': info.get('creator') or info.get('channel') or info.get('uploader') or '',
            'desc': info.get('description') or info.get('title') or '', 'cover': info.get('thumbnail') or '', 'avatar': '',
            'duration': int(info.get('duration') or 0), 'plays': info.get('view_count') or 0, 'likes': info.get('like_count') or 0,
            'comment_count': info.get('comment_count') or 0, 'created': info.get('timestamp') or 0, 'media': media_list(info)}


# ---------------------------------------------------------------- komentar (BAGIAN PALING RAPUH: endpoint web TikTok bisa berubah)
def _tt_json(url):
    try:
        r, _ = safe_open(url, timeout=10, headers={'Referer': 'https://www.tiktok.com/', 'Accept': 'application/json'})
        if status_of(r) != 200: return None
        return json.loads(r.read(2_000_000).decode('utf8', 'replace') or 'null')
    except Exception as e:
        log.info('komentar gagal: %s', e); return None

def fetch_comments(vid, author, limit=300):
    out, cursor, reps = [], 0, []
    mine = lambda u: bool(u and author and u.lower() == author.lower())
    while len(out) < limit:
        d = _tt_json(f'https://www.tiktok.com/api/comment/list/?aid=1988&aweme_id={vid}&count=50&cursor={cursor}')
        if not d or not d.get('comments'): break
        for c in d['comments']:
            u = (c.get('user') or {}).get('unique_id', '')
            out.append({'text': c.get('text', ''), 'user': u, 'is_creator': mine(u), 'pinned': bool(c.get('author_pin')), 'is_reply': False})
            if (c.get('reply_comment_total') or 0) > 0 and len(reps) < 25: reps.append(c.get('cid'))
        if not d.get('has_more'): break
        cursor = d.get('cursor') or cursor + 50
    def _rep(cid):
        d = _tt_json(f'https://www.tiktok.com/api/comment/list/reply/?aid=1988&comment_id={cid}&item_id={vid}&count=20&cursor=0') or {}
        return [{'text': c.get('text', ''), 'user': (c.get('user') or {}).get('unique_id', ''), 'is_creator': mine((c.get('user') or {}).get('unique_id', '')),
                 'pinned': False, 'is_reply': True} for c in d.get('comments') or []]
    if reps:
        with ThreadPoolExecutor(4) as ex:
            for r in ex.map(_rep, reps): out.extend(r)
    return out[:limit + 200]


def valid_tiktok(url):
    return bool(re.search(r'(?i)tiktok\.com/', url)) or bool(re.fullmatch(r'\d{15,22}', url))

def do_extract(url, quick):
    t0 = time.time()
    if not valid_tiktok(url): raise ApiError('Itu bukan link TikTok')
    if re.fullmatch(r'\d{15,22}', url): url = f'https://www.tiktok.com/@_/video/{url}'
    info = get_info(url); v = shape_video(info, url)
    comments = [] if quick else fetch_comments(v['id'], v['author'])
    return {'video': v, 'links': L.build_links(v['desc'], comments, v['author']), 'scanned': {'comments': len(comments)},
            'ms': int((time.time() - t0) * 1000), 'partial': quick}


# ---------------------------------------------------------------- cek link
_CHECK, OG = {}, {k: re.compile(r'(?i)<meta[^>]+(?:property|name)=["\']og:%s["\'][^>]+content=["\']([^"\']*)' % k) for k in ('title', 'description', 'image')}
def check_one(u):
    hit = _CHECK.get(u)
    if hit and time.time() - hit[0] < 600: return hit[1]
    res = {'status': 'unknown'}
    try:
        r, final = safe_open(u, timeout=7); code = status_of(r); fh = (urlparse(final).hostname or '').lower()
        if code in (404, 410): res = {'status': 'dead'}
        elif code in (401, 403) or 'accounts.google.' in fh or '/login' in final: res = {'status': 'private'}
        elif code == 200:
            html = r.read(150_000).decode('utf8', 'replace')
            og = {k: (m.group(1) if (m := rx.search(html)) else '') for k, rx in OG.items()}
            res = {'status': 'ok', 'title': og['title'], 'desc': og['description'], 'thumb': og['image'],
                   'app_url': final if 'alightcreative.com' in fh else ''}
    except Exception as e:
        log.info('cek %s: %s', u, e)
    _CHECK[u] = (time.time(), res); return res


# ---------------------------------------------------------------- unduhan
_dl_sem = threading.Semaphore(3)
def prepare_download(vid, key):
    hit = _INFO.get(vid)
    info = hit[1] if hit and time.time() - hit[0] < TTL else get_info(f'https://www.tiktok.com/@_/video/{vid}')
    tmp = tempfile.mkdtemp(prefix='frizy_')
    try:
        if key == 'cover':
            r, _ = safe_open(info.get('thumbnail') or '', timeout=15)
            p = os.path.join(tmp, 'cover.jpg')
            with open(p, 'wb') as f: shutil.copyfileobj(r, f)
            return tmp, p, 'jpg', 'image/jpeg'
        fmts = [f for f in info.get('formats') or [] if _codec(f) not in ('', 'none')]
        clean = [f for f in fmts if not _is_wm(f)] or fmts
        f = _pick(clean, key == 'hevc') or _pick(clean, False) or (clean[0] if clean else None)
        if not f: raise ApiError('Format tidak tersedia untuk video ini.', 404)
        opts = {'format': f['format_id'], 'outtmpl': os.path.join(tmp, 'v.%(ext)s')}
        if key == 'audio':
            opts = {'format': 'bestaudio/best', 'outtmpl': os.path.join(tmp, 'v.%(ext)s'),
                    'postprocessors': [{'key': 'FFmpegExtractAudio', 'preferredcodec': 'mp3'}]}
        with _dl_sem:
            _ytdlp(opts).download([info.get('webpage_url') or f'https://www.tiktok.com/@_/video/{vid}'])
        files = glob.glob(os.path.join(tmp, 'v.*'))
        if not files: raise ApiError('Unduhan gagal.', 502)
        ext = files[0].rsplit('.', 1)[-1]
        return tmp, files[0], ext, 'audio/mpeg' if ext == 'mp3' else 'video/mp4'
    except Exception:
        shutil.rmtree(tmp, ignore_errors=True); raise


# ---------------------------------------------------------------- HTTP
def clean_name(s): return re.sub(r'[^\w.-]+', '_', s)[:60] or 'frizypreset'

class H(BaseHTTPRequestHandler):
    server_version = 'FrizyPreset/1.0'
    def log_message(self, fmt, *a): log.info('%s %s', self.address_string(), fmt % a)

    # --- util
    def ip(self): return self.headers.get('X-Forwarded-For', self.client_address[0]).split(',')[0].strip()
    def cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Visitor')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Expose-Headers', 'Content-Length, X-Filename, Content-Disposition')
    def json(self, obj, code=200):
        b = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code); self.cors()
        self.send_header('Content-Type', 'application/json; charset=utf-8'); self.send_header('Content-Length', str(len(b)))
        self.send_header('Cache-Control', 'no-store'); self.end_headers()
        if self.command != 'HEAD': self.wfile.write(b)
    def body(self):
        n = int(self.headers.get('Content-Length') or 0)
        if n > 65536: raise ApiError('Permintaan terlalu besar', 413)
        try: return json.loads(self.rfile.read(n) or b'{}')
        except ValueError: raise ApiError('JSON tidak valid')

    def handle_any(self):
        try:
            u = urlparse(self.path); q = {k: v[0] for k, v in parse_qs(u.query).items()}
            if self.command == 'OPTIONS':
                self.send_response(204); self.cors(); self.send_header('Content-Length', '0'); return self.end_headers()
            if u.path.startswith('/api/'):
                if u.path not in ('/api/health', '/api/img', '/api/thumb', '/api/qr') and not allow(self.ip()):
                    raise ApiError('Terlalu banyak permintaan. Coba lagi sebentar lagi.', 429)
                return self.api(u.path[5:], q)
            return self.static(u.path)
        except ApiError as e: self.json({'detail': e.detail}, e.code)
        except (BrokenPipeError, ConnectionResetError): pass
        except Exception:
            log.error(traceback.format_exc()); self.json({'detail': 'Terjadi kesalahan di server.'}, 500)
    do_GET = do_POST = do_DELETE = do_OPTIONS = do_HEAD = handle_any

    # --- API
    def api(self, name, q):
        m, vid = self.command, visitor_id(self.headers, self.ip())
        if name == 'health': return self.json({'ok': True, 'time': int(time.time())})
        if name in ('history', 'saved'):
            with _store_lock:
                d = store_load(vid); lst = d.setdefault(name, [])
                if m == 'GET': return self.json(lst)
                if m == 'POST':
                    it = self.body()
                    if not isinstance(it, dict): raise ApiError('Data tidak valid')
                    key = 'id' if name == 'history' else 'url'
                    lst[:] = [it] + [x for x in lst if x.get(key) != it.get(key)]
                    del lst[30 if name == 'history' else 500:]
                elif m == 'DELETE':
                    if name == 'saved' and q.get('url'): lst[:] = [x for x in lst if x.get('url') != q['url']]
                    else: lst.clear()
                store_save(vid, d)
            return self.json({'ok': True})
        if name in ('extract', 'quick') and m == 'POST':
            return self.json(do_extract(str(self.body().get('url', '')).strip(), name == 'quick'))
        if name == 'check' and m == 'POST':
            urls = [u for u in (self.body().get('urls') or [])[:12] if isinstance(u, str)]
            with ThreadPoolExecutor(6) as ex: res = list(ex.map(check_one, urls))
            return self.json(dict(zip(urls, res)))
        if name in ('img', 'thumb'): return self.image(q.get('u', ''), name == 'thumb')
        if name == 'qr': return self.qr(q.get('u', ''))
        if name == 'download': return self.download(q)
        if name == 'creator' and m == 'POST': return self.creator(self.body())
        raise ApiError('Endpoint tidak ditemukan', 404)

    def image(self, u, any_host):
        p = urlparse(u); host = (p.hostname or '').lower()
        if p.scheme != 'https' or not (any_host or any(host == h or host.endswith('.' + h) for h in IMG_HOSTS)): raise ApiError('Sumber gambar tidak diizinkan', 400)
        try: r, _ = safe_open(u, timeout=10, headers={'Referer': 'https://www.tiktok.com/'})
        except Exception: raise ApiError('Gambar tidak bisa diambil', 502)
        ct = r.headers.get('Content-Type', '')
        if status_of(r) != 200 or not ct.startswith('image/'): raise ApiError('Bukan gambar', 502)
        data = r.read(3_000_000)
        self.send_response(200); self.cors(); self.send_header('Content-Type', ct); self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'public, max-age=86400'); self.end_headers(); self.wfile.write(data)

    def qr(self, u):
        if not re.match(r'(?i)https?://', u) or len(u) > 1500: raise ApiError('URL tidak valid')
        try: import segno
        except ImportError: raise ApiError('Modul segno belum terpasang di server', 501)
        buf = io.BytesIO(); segno.make(u, error='m').save(buf, kind='png', scale=8, border=2, dark='#0b0a10', light='#ffffff')
        b = buf.getvalue()
        self.send_response(200); self.cors(); self.send_header('Content-Type', 'image/png'); self.send_header('Content-Length', str(len(b)))
        self.send_header('Cache-Control', 'public, max-age=86400'); self.end_headers(); self.wfile.write(b)

    def download(self, q):
        vid, key = q.get('vid', ''), q.get('key', '')
        if not re.fullmatch(r'\d{10,25}', vid) or key not in ('best', 'hevc', 'audio', 'cover'): raise ApiError('Parameter tidak valid')
        tmp, path, ext, ct = prepare_download(vid, key)
        try:
            name = f'{clean_name(q.get("name", ""))}_{vid}_{key}.{ext}'
            self.send_response(200); self.cors()
            self.send_header('Content-Type', ct); self.send_header('Content-Length', str(os.path.getsize(path)))
            self.send_header('Content-Disposition', f'attachment; filename="{name}"'); self.send_header('X-Filename', name); self.end_headers()
            with open(path, 'rb') as f: shutil.copyfileobj(f, self.wfile, 256 * 1024)
        finally: shutil.rmtree(tmp, ignore_errors=True)

    def creator(self, b):
        user = str(b.get('user', '')).lstrip('@')
        if not re.fullmatch(r'[\w.\-]{2,40}', user): raise ApiError('Username tidak valid')
        limit = max(1, min(int(b.get('limit') or 30), 30))
        try:
            ent = (_ytdlp({'extract_flat': True, 'skip_download': True, 'playlistend': limit}).extract_info(f'https://www.tiktok.com/@{user}', download=False) or {}).get('entries') or []
        except ApiError: raise
        except Exception as e:
            log.warning('profil gagal: %s', e); raise ApiError('Akun tidak ditemukan atau TikTok menolak permintaan.', 422)
        ent = [e for e in ent if e and e.get('url')][:limit]
        self.send_response(200); self.cors(); self.send_header('Content-Type', 'application/x-ndjson; charset=utf-8')
        self.send_header('Cache-Control', 'no-store'); self.end_headers()
        wl = threading.Lock()
        def out(o):
            with wl: self.wfile.write((json.dumps(o, ensure_ascii=False) + '\n').encode()); self.wfile.flush()
        if not ent: return out({'type': 'total', 'total': 0})
        first = get_info(ent[0]['url'])
        out({'type': 'profile', 'user': user, 'nickname': first.get('creator') or first.get('channel') or user, 'avatar': '',
             'verified': False, 'followers': first.get('channel_follower_count') or 0, 'videos': len(ent)})
        out({'type': 'total', 'total': len(ent)})
        def work(e):
            try:
                info = get_info(e['url']); v = shape_video(info, e['url'])
                lk = L.build_links(v['desc'], fetch_comments(v['id'], v['author'], 100), v['author'])
                return {'type': 'video', 'video': {k: v[k] for k in ('id', 'url', 'desc', 'cover', 'plays', 'created')}, 'links': lk} if lk else {'type': 'skip'}
            except Exception: return {'type': 'skip'}
        with ThreadPoolExecutor(4) as ex:
            for f in as_completed([ex.submit(work, e) for e in ent]): out(f.result())

    # --- file statis (frontend)
    def static(self, path):
        if not WEB_DIR: raise ApiError('Folder web tidak ditemukan', 404)
        rel = 'index.html' if path in ('', '/') else os.path.normpath(path.lstrip('/'))
        full = os.path.realpath(os.path.join(WEB_DIR, rel)); root = os.path.realpath(WEB_DIR)
        if not (full == root or full.startswith(root + os.sep)) or not os.path.isfile(full): raise ApiError('Tidak ditemukan', 404)
        if os.path.splitext(full)[1].lower() not in PUBLIC_EXT or os.path.basename(full).startswith('.') or os.path.dirname(full) != root: raise ApiError('Tidak ditemukan', 404)
        ct = mimetypes.guess_type(full)[0] or 'application/octet-stream'
        size = os.path.getsize(full)
        if rel == 'index.html':
            data = open(full, 'rb').read().replace(b'<head>', b'<head><meta name="frizy-api" content="">', 1)
            self.send_response(200); self.send_header('Content-Type', 'text/html; charset=utf-8'); self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'no-cache'); self.end_headers()
            if self.command != 'HEAD': self.wfile.write(data)
            return
        start, end, code = 0, size - 1, 200
        if (m := re.match(r'bytes=(\d*)-(\d*)', self.headers.get('Range', ''))):
            a, b = m.groups()
            start, end, code = (size - int(b), size - 1, 206) if (not a and b) else (int(a or 0), min(int(b) if b else size - 1, size - 1), 206)
            if start > end: self.send_response(416); self.send_header('Content-Range', f'bytes */{size}'); self.send_header('Content-Length', '0'); return self.end_headers()
        self.send_response(code); self.send_header('Content-Type', ct); self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Content-Length', str(end - start + 1))
        if code == 206: self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.send_header('Cache-Control', 'no-cache' if rel in ('sw.js', 'manifest.webmanifest') else 'public, max-age=3600'); self.end_headers()
        if self.command == 'HEAD': return
        with open(full, 'rb') as f:
            f.seek(start); left = end - start + 1
            while left > 0:
                chunk = f.read(min(262144, left))
                if not chunk: break
                self.wfile.write(chunk); left -= len(chunk)


class Server(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO, format='%(asctime)s %(message)s')
    log.info('Frizy Preset berjalan di http://0.0.0.0:%d (web: %s)', PORT, WEB_DIR or '-')
    Server(('0.0.0.0', PORT), H).serve_forever()
