/* Frizy Preset service worker: network-first, cache as offline fallback only. */
const CACHE = 'frizy-v10';
const SHELL = ['./', 'index.html', 'styles.css?v=9', 'app.js?v=9', 'logo-mark.png', 'logo-word.png', 'icon-192.png', 'manifest.webmanifest', 'banner-poster.jpg'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.includes('/port/') || url.pathname.includes('/api/') || url.pathname.includes('/banner.')) return;
  e.respondWith(fetch(req).then(res => {
    if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: req.mode === 'navigate' }).then(r => r || caches.match('./'))));
});
