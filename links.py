"""Pengenal & penyusun link preset dari caption/komentar (tanpa dependensi luar)."""
import re
from urllib.parse import urlparse

HOSTS = {
    'am': {'alight.link': 'Alight Motion', 'alightcreative.com': 'Alight Motion', 'alightmotion.com': 'Alight Motion',
           'alightmotion.page.link': 'Alight Motion'},
    'file': {'drive.google.com': 'Google Drive', 'docs.google.com': 'Google Drive', 'mediafire.com': 'Mediafire',
             'mega.nz': 'Mega', 'mega.io': 'Mega', 'sfile.mobi': 'Sfile', 'sfile.co': 'Sfile',
             'dropbox.com': 'Dropbox', '4shared.com': '4shared', 'gofile.io': 'Gofile', 'workupload.com': 'Workupload'},
    'capcut': {'capcut.com': 'Template CapCut', 'capcut.net': 'Template CapCut'},
    'other': {'linktr.ee': 'Linktree', 'bit.ly': 'Bitly', 's.id': 's.id', 't.me': 'Telegram', 'telegram.me': 'Telegram',
              'tinyurl.com': 'TinyURL', 'cutt.ly': 'Cuttly', 'lynk.id': 'Lynk', 'trakteer.id': 'Trakteer'},
}
ORDER = {'am': 0, 'file': 1, 'capcut': 2, 'other': 3}
_ALL = {h: t for t, d in HOSTS.items() for h in d}
_BARE = '|'.join(re.escape(h) for h in sorted(_ALL, key=len, reverse=True))
URL_RE = re.compile(r'(?i)(https?://[^\s<>"\'`]+)|(?<![\w@./-])((?:www\.)?(?:%s)/[^\s<>"\'`]*)' % _BARE)
TRAIL = '.,;:!?)]}>"\'\u2019\u201d'


def _host_type(host):
    host = host.lower().removeprefix('www.')
    for h, t in _ALL.items():
        if host == h or host.endswith('.' + h):
            return t, HOSTS[t][h]
    return None, ''


def normalize(url):
    url = url.strip().rstrip(TRAIL)
    if not re.match(r'(?i)https?://', url):
        url = 'https://' + url
    return url


def extract_urls(text):
    """Semua URL yang dikenali (berurutan, tanpa duplikat)."""
    seen, out = set(), []
    for m in URL_RE.finditer(text or ''):
        u = normalize(m.group(0))
        p = urlparse(u)
        if not p.hostname:
            continue
        t, _ = _host_type(p.hostname)
        if not t:
            continue
        key = (p.hostname.lower().removeprefix('www.'), p.path.rstrip('/'), p.query)
        if key in seen:
            continue
        seen.add(key)
        out.append(u)
    return out


def classify(url):
    p = urlparse(url)
    t, label = _host_type(p.hostname or '')
    return (t or 'other'), (label if t != 'am' else '')


def build_links(caption, comments, author=''):
    """comments: [{text,user,is_creator,pinned,is_reply}] -> daftar link sesuai kontrak frontend."""
    items = {}

    def add(url, source, user, context, creator, pinned):
        p = urlparse(url)
        key = ((p.hostname or '').lower().removeprefix('www.'), p.path.rstrip('/'), p.query)
        t, label = classify(url)
        e = items.get(key)
        if not e:
            items[key] = {'url': url, 'type': t, 'label': label, 'source': source, 'user': user, 'context': context,
                          'is_creator': bool(creator), 'pinned': bool(pinned), 'mentions': 1}
            return
        e['mentions'] += 1
        if creator and not e['is_creator']:
            e.update(source=source, user=user, context=context, is_creator=True)
        e['pinned'] = e['pinned'] or bool(pinned)

    for u in extract_urls(caption):
        add(u, 'caption', author, caption, True, False)
    for c in comments or []:
        src = 'reply' if c.get('is_reply') else 'comment'
        for u in extract_urls(c.get('text', '')):
            add(u, src, c.get('user', ''), c.get('text', ''), c.get('is_creator'), c.get('pinned'))
    return sorted(items.values(), key=lambda e: (not e['is_creator'], ORDER[e['type']], -e['mentions']))
