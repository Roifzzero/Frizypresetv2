(() => {
'use strict';

// Alamat backend: isi lewat <meta name="frizy-api" content="https://api.domainmu.com">,
// kalau kosong dipakai path relatif 'port/8000' seperti semula.
const _apiMeta = document.querySelector('meta[name="frizy-api"]');
const API = _apiMeta ? _apiMeta.content.replace(/\/$/, '') : 'port/8000'; // '' = server yang sama
// Hanya izinkan http(s): mencegah link berbahaya (mis. javascript:) dari komentar
const safeUrl = u => { try { const x = new URL(u, location.href); return /^https?:$/.test(x.protocol) ? x.href : '#'; } catch { return '#'; } };
// Penyimpanan lokal cadangan bila server gagal
const ls = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
const VID = (() => { let v = ls.get('fp_vid', ''); if (!v) { v = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)).replace(/[^\w-]/g, ''); ls.set('fp_vid', v); } return v; })();
const apiFetch = (url, opts = {}) => fetch(url, { ...opts, headers: { ...(opts.headers || {}), 'X-Visitor': VID } });
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const haptic = (ms = 8) => { try { navigator.vibrate && navigator.vibrate(ms); } catch {} };
const nf = new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 });

/* ---------- icons ---------- */
const I = {
  amOpen: '<svg class="i" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="5"/><path d="m10 8.8 5 3.2-5 3.2Z" fill="currentColor" stroke="none"/></svg>',
  qr: '<svg class="i" viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2"/></svg>',
  user: '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>',
  bookmark: '<svg class="i" viewBox="0 0 24 24"><path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1Z"/></svg>',
  bookmarkFill: '<svg class="i" viewBox="0 0 24 24"><path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1Z" fill="currentColor"/></svg>',
  trash: '<svg class="i" viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>',
  copy: '<svg class="i" viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M15 9V6.5A2.5 2.5 0 0 0 12.5 4h-6A2.5 2.5 0 0 0 4 6.5v6A2.5 2.5 0 0 0 6.5 15H9"/></svg>',
  check: '<svg class="i" viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  ext: '<svg class="i" viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-8.5 8.5"/><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/></svg>',
  dl: '<svg class="i" viewBox="0 0 24 24"><path d="M12 4v11M7 10l5 5 5-5"/><path d="M5 20h14"/></svg>',
  am: '<svg class="i" viewBox="0 0 24 24"><path d="M12 3 3.5 7.5 12 12l8.5-4.5L12 3Z"/><path d="m3.5 12 8.5 4.5 8.5-4.5"/><path d="m3.5 16.5 8.5 4.5 8.5-4.5"/></svg>',
  file: '<svg class="i" viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M14 3v5h5"/><path d="m10 13-2 2 2 2M14 13l2 2-2 2"/></svg>',
  capcut: '<svg class="i" viewBox="0 0 24 24"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/></svg>',
  other: '<svg class="i" viewBox="0 0 24 24"><path d="M9.5 14.5 14.5 9.5"/><path d="M11 6.5l1.6-1.6a4.6 4.6 0 0 1 6.5 6.5L17.5 13"/><path d="M13 17.5l-1.6 1.6a4.6 4.6 0 0 1-6.5-6.5L6.5 11"/></svg>',
  video: '<svg class="i" viewBox="0 0 24 24"><rect x="3" y="5" width="13" height="14" rx="3"/><path d="m16 10 5-3v10l-5-3"/></svg>',
  audio: '<svg class="i" viewBox="0 0 24 24"><path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/></svg>',
  image: '<svg class="i" viewBox="0 0 24 24"><rect x="3.5" y="4" width="17" height="16" rx="3"/><circle cx="9" cy="9.5" r="1.8"/><path d="m20.5 15-4.5-4.5L6 20"/></svg>',
  search: '<svg class="i" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg>',
  alert: '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 8v4.5M12 16h.01"/></svg>',
  info: '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/></svg>',
  chev: '<svg class="i arrow" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>',
  clock: '<svg class="i" viewBox="0 0 24 24"><path d="M3.5 12a8.5 8.5 0 1 0 2.5-6"/><path d="M3.5 4.5V9H8"/><path d="M12 8v4.5l3 1.8"/></svg>',
};
const TYPE = {
  am:     { name: 'Alight Motion', tile: 't-am',     icon: I.am },
  file:   { name: 'File / XML',    tile: 't-file',   icon: I.file },
  capcut: { name: 'CapCut',        tile: 't-capcut', icon: I.capcut },
  other:  { name: 'Link lain',     tile: 't-other',  icon: I.other },
};
const SW = { am: '#ff5a8a', file: '#6c8cff', capcut: '#46f0bf', other: '#aaa4bb' };

/* ---------- history store (server, per visitor) ---------- */
let histCache = ls.get('fp_hist', []);
const hist = {
  async load() { try { const r = await apiFetch(`${API}/api/history`); if (r.ok) { histCache = await r.json(); ls.set('fp_hist', histCache); } } catch {} return histCache; },
  add(item) {
    histCache = [item, ...histCache.filter(x => x.id !== item.id)].slice(0, 30); ls.set('fp_hist', histCache);
    apiFetch(`${API}/api/history`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) }).catch(() => {});
  },
  clear() { histCache = []; ls.set('fp_hist', []); apiFetch(`${API}/api/history`, { method: 'DELETE' }).catch(() => {}); },
};

/* ---------- toast ---------- */
let toastT;
function toast(msg, err = false) {
  const el = $('#toast');
  $('.toast-t', el).textContent = msg;
  $('.toast-ic', el).innerHTML = err ? I.alert : I.check;
  el.classList.toggle('is-err', err);
  el.classList.remove('show'); void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('show'), 2200);
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;opacity:0';
    document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch {}
    ta.remove(); return ok;
  }
}

/* ---------- segmented indicator ---------- */
function moveInd(seg) {
  const ind = $('.seg-ind', seg);
  const act = $('button[aria-current=page], button[aria-selected=true]', seg);
  if (!ind || !act) return;
  ind.style.width = act.offsetWidth + 'px';
  ind.style.transform = `translateX(${act.offsetLeft}px)`;
}

/* ---------- navigation ---------- */
const VIEWS = ['home', 'history', 'saved', 'guide'];
const TAB_POS = { home: 0, history: 1, saved: 3, guide: 4 };
function go(view, { scroll = true } = {}) {
  if (!VIEWS.includes(view)) view = 'home';
  $$('.view').forEach(v => v.classList.toggle('is-active', v.dataset.view === view));
  $$('[data-nav]').forEach(b => {
    if (b.tagName !== 'BUTTON') return;
    b.toggleAttribute('aria-current', b.dataset.nav === view);
    if (b.dataset.nav === view) b.setAttribute('aria-current', 'page');
  });
  moveInd($('.topnav .seg'));
  $('.tab-ind').style.transform = `translateX(${TAB_POS[view] * 100}%)`;
  if (view === 'history') renderHistory();
  if (view === 'saved') renderSaved();
  requestAnimationFrame(() => FX.reveal());
  if (scroll) window.scrollTo({ top: 0, behavior: 'smooth' });
}
document.addEventListener('click', e => {
  const n = e.target.closest('[data-nav]');
  if (!n) return;
  e.preventDefault(); haptic(6);
  go(n.dataset.nav);
});
window.addEventListener('resize', () => { $$('.seg').forEach(moveInd); });
if (document.fonts) document.fonts.ready.then(() => $$('.seg').forEach(moveInd));

/* ---------- health ---------- */
async function health() {
  const chip = $('#health');
  try {
    const r = await apiFetch(`${API}/api/health`, { cache: 'no-store' });
    if (!r.ok) throw 0;
    chip.className = 'status-chip on'; $('.label', chip).textContent = 'Online';
  } catch { chip.className = 'status-chip off'; $('.label', chip).textContent = 'Offline'; }
}

/* ---------- banner video (decorative, locked) ---------- */
function lockBanner() {
  const v = $('#bannerVideo');
  if (!v) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || (navigator.connection && navigator.connection.saveData)) { v.pause(); v.removeAttribute('autoplay'); return; }
  v.muted = true; v.defaultMuted = true; v.volume = 0; v.controls = false;
  v.setAttribute('muted', '');
  const play = () => { const p = v.play(); p && p.catch(() => {}); };
  play();
  ['pause', 'volumechange'].forEach(ev => v.addEventListener(ev, () => {
    if (!v.muted) v.muted = true;
    if (v.paused && document.visibilityState === 'visible') play();
  }));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') play(); });
  // first interaction fallback for strict autoplay policies
  const kick = () => { play(); window.removeEventListener('pointerdown', kick); window.removeEventListener('keydown', kick); };
  window.addEventListener('pointerdown', kick, { once: true }); window.addEventListener('keydown', kick, { once: true });
  $('.banner').addEventListener('contextmenu', e => e.preventDefault());
}

/* ---------- search ---------- */
const input = $('#urlInput'), goBtn = $('#goBtn'), clearBtn = $('#clearBtn');
const isTikTok = s => /tiktok\.com\//i.test(s);
const isProfile = s => /^@[\w.\-]{2,40}$/.test(s.trim()) || (/tiktok\.com\/@[\w.\-]+\/?(\?|$)/i.test(s) && !/\/(video|photo)\//i.test(s));
const userFrom = s => { s = s.trim(); const m = s.match(/tiktok\.com\/@([\w.\-]+)/i); const u = m ? m[1] : s.replace(/^@/, ''); return /^[\w.\-]{2,40}$/.test(u) ? u : ''; };
const pickUrl = s => { const m = String(s).match(/https?:\/\/\S+/); return (m ? m[0] : String(s)).trim(); };

input.addEventListener('input', () => { clearBtn.hidden = !input.value; });
clearBtn.addEventListener('click', () => { input.value = ''; clearBtn.hidden = true; input.focus(); });
input.addEventListener('paste', () => setTimeout(() => {
  clearBtn.hidden = !input.value;
  if (isTikTok(input.value) || (mode === 'creator' && userFrom(input.value))) $('#searchForm').requestSubmit();
}, 0));
$('#pasteBtn').addEventListener('click', async () => {
  haptic();
  try {
    const t = await navigator.clipboard.readText();
    if (t && t.trim()) {
      input.value = pickUrl(t); clearBtn.hidden = false;
      if (isTikTok(input.value)) return $('#searchForm').requestSubmit();
      input.focus(); return;
    }
  } catch {}
  input.focus(); toast('Tekan lama kolom input, lalu pilih Tempel');
});
document.addEventListener('keydown', e => {
  if (e.key === '/' && document.activeElement !== input && !e.metaKey && !e.ctrlKey) { e.preventDefault(); go('home', { scroll: false }); input.focus(); input.select(); }
});

let busy = false;
$('#searchForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (busy) return;
  const raw = input.value.trim();
  if (!raw) { input.focus(); shake(); return; }
  const url = pickUrl(raw);
  if (mode === 'creator' || isProfile(url)) {
    const u = userFrom(url);
    if (!u) { toast('Masukkan @username atau link profil TikTok', true); shake(); return; }
    setMode('creator'); input.value = '@' + u; input.blur();
    return runCreator(u);
  }
  if (!isTikTok(url) && !/^\d{15,22}$/.test(url)) { toast('Itu bukan link TikTok', true); shake(); return; }
  input.value = url; input.blur();
  run(url);
});
function shake() {
  const f = $('.search-field');
  f.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }], { duration: 360, easing: 'ease-out' });
}

const resEl = $('#results'), idleEl = $('#idle');

function showLoader() {
  idleEl.hidden = true; resEl.hidden = false;
  const steps = ['Membuka video', 'Membaca caption', 'Memeriksa komentar', 'Membuka balasan kreator', 'Menyusun link'];
  resEl.innerHTML = `
    <div class="loader">
      <div class="sk" style="height:420px"></div>
      <div class="card progress">
        <h3>Sedang mencari…</h3>
        <p>Biasanya selesai dalam 2–5 detik.</p>
        <div class="plist">${steps.map((s, i) => `<div class="pitem" data-i="${i}"><span class="pd">${I.check}</span>${s}</div>`).join('')}</div>
      </div>
    </div>`;
  let i = 0;
  const tick = () => {
    $$('.pitem', resEl).forEach((p, k) => { p.classList.toggle('is-done', k < i); p.classList.toggle('is-on', k === i); });
    if (i < steps.length - 1) i++;
  };
  tick();
  const t = setInterval(tick, 850);
  return () => { clearInterval(t); $$('.pitem', resEl).forEach(p => { p.classList.remove('is-on'); p.classList.add('is-done'); }); };
}

let runId = 0;
let ctl = null;
const post = (path, url) => apiFetch(`${API}${path}`, { method: 'POST', signal: ctl && ctl.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) })
  .then(async r => { let d; try { d = await r.json(); } catch { d = {}; } if (!r.ok) throw new Error(d.detail || 'Terjadi kesalahan, coba lagi.'); return d; });

async function run(url) {
  const id = ++runId;
  if (ctl) ctl.abort(); ctl = new AbortController();
  busy = true; goBtn.disabled = true; goBtn.classList.add('is-loading');
  go('home', { scroll: false });
  const stop = showLoader();
  resEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const pFull = post('/api/extract', url);
  const pQuick = post('/api/quick', url);
  pFull.catch(() => {}); pQuick.catch(() => {});
  let shown = false;
  try {
    // tahap 1: tampilkan hasil cepat (atau hasil lengkap jika lebih dulu selesai)
    const first = await Promise.any([pQuick, pFull]).catch(() => pFull);
    if (id !== runId) return;
    stop();
    await new Promise(r => setTimeout(r, 180));
    render(first, url); shown = true;
    saveHistory(first, url); haptic(12);
    busy = false; goBtn.disabled = false; goBtn.classList.remove('is-loading');
    if (!first.partial) return;
    // tahap 2: lengkapi dengan seluruh komentar & balasan
    try {
      const full = await pFull;
      if (id !== runId || !state) return;
      applyFull(full); saveHistory(full, url);
    } catch {
      if (id === runId) setScan('err');
    }
  } catch (err) {
    if (id !== runId) return;
    stop();
    if (shown) return;
    const msg = err.message === 'Failed to fetch' ? 'Server tidak bisa dihubungi. Periksa koneksi lalu coba lagi.' : err.message;
    resEl.innerHTML = `<div class="card empty"><span class="tile t-dl">${I.alert}</span><h3>Gagal mengambil data</h3><p>${esc(msg)}</p>
      <button class="btn" data-retry>${I.search}<span>Coba lagi</span></button></div>`;
    $('[data-retry]', resEl).onclick = () => run(url);
  } finally {
    if (id === runId && busy) { busy = false; goBtn.disabled = false; goBtn.classList.remove('is-loading'); }
  }
}

function setScan(mode, d) {
  const el = $('#scanStatus', resEl); if (!el) return;
  el.className = 'scan-status is-' + mode;
  el.innerHTML = mode === 'busy' ? '<i class="scan-dot"></i>Memindai komentar lainnya…'
    : mode === 'err' ? 'Pemindaian lanjutan gagal, hasil di atas tetap bisa dipakai'
    : `${I.check}<span>${d.scanned.comments} komentar dibaca · ${(d.ms / 1000).toFixed(1)} dtk</span>`;
}

function applyFull(d) {
  const prev = new Set(state.d.links.map(l => l.url));
  const added = d.links.filter(l => !prev.has(l.url));
  state.d = d;
  state.newUrls = new Set(added.map(l => l.url));
  const cnt = $('[data-tab=links] .count', resEl);
  if (cnt) cnt.textContent = d.links.length;
  const panel = $('[data-panel=links]', resEl);
  if (state.filter !== 'all' && !d.links.some(l => l.type === state.filter)) state.filter = 'all';
  panel.innerHTML = linksPanelHTML(d);
  if (d.links.length) renderLinks();
  setScan('done', d);
  checkLinks(resEl);
  if (added.length) toast(`${added.length} link baru ditemukan`);
}

function linksPanelHTML(d) {
  const links = d.links;
  if (!links.length) return d.partial ? `<div class="card empty"><span class="tile t-am">${I.search}</span><h3>Masih mencari…</h3><p>Belum ada link di caption dan komentar teratas. Komentar lainnya sedang diperiksa.</p></div>` : emptyLinks(d);
  const counts = links.reduce((a, l) => (a[l.type] = (a[l.type] || 0) + 1, a), {});
  const f = state.filter;
  return `<div class="filters" role="toolbar" aria-label="Filter jenis link">
      <button class="chip" data-filter="all" aria-pressed="${f === 'all'}">Semua <span class="n">${links.length}</span></button>
      ${Object.keys(TYPE).filter(k => counts[k]).map(k => `<button class="chip" data-filter="${k}" aria-pressed="${f === k}"><span class="sw" style="background:${SW[k]}"></span>${TYPE[k].name} <span class="n">${counts[k]}</span></button>`).join('')}
    </div>
    <div id="linkGroups"></div>`;
}

/* ---------- render ---------- */
let state = null;

function fmtDur(s) { s = +s || 0; return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
function capHTML(t) { return esc(t || 'Tanpa caption').replace(/(#[\p{L}\p{N}_.]+)/gu, '<span class="tag-h">$1</span>'); }
function urlHTML(u) {
  try { const x = new URL(u); return `<b>${esc(x.host.replace(/^www\./, ''))}</b>${esc(x.pathname + x.search)}`; } catch { return esc(u); }
}
const img = u => u ? `${API}/api/img?u=${encodeURIComponent(u)}` : '';

function render(d) {
  const v = d.video, links = d.links || [], media = v.media || [];
  state = { d, filter: 'all', tab: 'links', newUrls: new Set() };
  const counts = links.reduce((a, l) => (a[l.type] = (a[l.type] || 0) + 1, a), {});

  resEl.innerHTML = `
  <div class="res-grid">
    <aside class="res-side">
      <article class="card vcard">
        <div class="vcard-media">
          ${v.cover ? `<img src="${img(v.cover)}" alt="Sampul video oleh @${esc(v.author)}" onload="this.classList.add('is-loaded')" onerror="this.remove()">` : ''}
          ${v.duration ? `<span class="vcard-dur">${fmtDur(v.duration)}</span>` : ''}
          <div class="vcard-who">
            ${v.avatar ? `<img class="avatar" src="${img(v.avatar)}" alt="" onerror="this.style.visibility='hidden'">` : '<span class="avatar"></span>'}
            <div style="min-width:0"><div class="who-name">${esc(v.nickname || v.author || 'Kreator')}</div><div class="who-handle">@${esc(v.author || 'tiktok')}</div></div>
          </div>
        </div>
        <div class="vcard-body">
          <p class="caption">${capHTML(v.desc)}</p>
          <div class="stats">
            <div class="stat"><b data-count="${v.plays || 0}">0</b><span>Ditonton</span></div>
            <div class="stat"><b data-count="${v.likes || 0}">0</b><span>Suka</span></div>
            <div class="stat"><b data-count="${v.comment_count || d.scanned.comments}">0</b><span>Komentar</span></div>
          </div>
          <div class="vcard-actions">
            <a class="btn grow" href="${esc(safeUrl(v.url))}" target="_blank" rel="noopener">${I.ext}<span>Buka di TikTok</span></a>
            <button class="btn" data-newsearch aria-label="Cari video lain">${I.search}</button>
          </div>
        </div>
      </article>
    </aside>

    <div class="res-main">
      <div class="tabs">
        <div class="seg" role="tablist" data-seg="res">
          <span class="seg-ind" aria-hidden="true"></span>
          <button role="tab" data-tab="links" aria-selected="${state.tab === 'links'}">Link preset <span class="count">${links.length}</span></button>
          <button role="tab" data-tab="dl" aria-selected="${state.tab === 'dl'}">Unduh <span class="count">${media.length}</span></button>
        </div>
        <span class="scan-status" id="scanStatus"></span>
      </div>

      <div class="panel" data-panel="links" ${state.tab !== 'links' ? 'hidden' : ''}>${linksPanelHTML(d)}</div>

      <div class="panel" data-panel="dl" ${state.tab !== 'dl' ? 'hidden' : ''}>
        ${media.length ? `
          <div class="dl-list">${media.map((m, i) => dlRow(m, i)).join('')}</div>
          <p class="dl-note">${I.info}<span>Video diambil langsung dari TikTok tanpa watermark. Gunakan untuk keperluan pribadi dan tetap beri kredit ke @${esc(v.author || 'kreator')}.</span></p>`
        : `<div class="card empty"><span class="tile t-other">${I.video}</span><h3>Unduhan tidak tersedia</h3><p>TikTok tidak memberikan file untuk video ini. Coba lagi beberapa saat lagi.</p></div>`}
      </div>
    </div>
  </div>`;

  if (links.length) renderLinks();
  setScan(d.partial ? 'busy' : 'done', d);
  checkLinks(resEl);
  const seg = $('[data-seg=res]', resEl);
  requestAnimationFrame(() => moveInd(seg));
  countUp();
}

function emptyLinks(d) {
  return `<div class="card empty"><span class="tile t-am">${I.search}</span><h3>Belum ada link preset</h3>
    <p>Sudah membaca ${d.scanned.comments} komentar dan balasan. Kreator mungkin membagikannya lewat bio, DM, Telegram, atau kode QR di dalam video.</p>
    <a class="btn" href="${esc(d.video.url)}" target="_blank" rel="noopener">${I.ext}<span>Cek di TikTok</span></a></div>`;
}

function renderLinks() {
  const { d, filter } = state;
  const list = d.links.filter(l => filter === 'all' || l.type === filter);
  const creator = list.filter(l => l.is_creator), others = list.filter(l => !l.is_creator);
  let n = 0;
  const group = (title, arr, allBtn) => arr.length ? `
    <div class="group-label"><span>${title} · ${arr.length}</span>${allBtn ? `<button class="grp-act" data-copyall>Salin semua</button>` : ''}</div>
    <div class="links">${arr.map(l => linkCard(l, n++)).join('')}</div>` : '';
  $('#linkGroups').innerHTML = group('Dari kreator', creator, list.length > 1) + group('Dari komentar', others, !creator.length && list.length > 1);
}

function linkCard(l, i, opts = {}) {
  const t = TYPE[l.type] || TYPE.other;
  const where = l.source === 'caption' ? 'caption' : l.source === 'reply' ? 'balasan' : 'komentar';
  const sub = l.label ? l.label : (l.source === 'caption' ? 'Dari caption video' : `Disebut di ${where}`);
  const badges = [
    l.is_creator ? '<span class="badge creator">Kreator</span>' : '',
    l.pinned ? '<span class="badge">Disematkan</span>' : '',
    l.mentions > 1 ? `<span class="badge hot">${l.mentions}× disebut</span>` : '',
    !opts.saved && state && state.newUrls && state.newUrls.has(l.url) ? '<span class="badge new">Baru</span>' : '',
  ].join('');
  if (opts.saved) l = { ...l, mentions: 1, pinned: false };
  const ctx = l.source !== 'caption' && l.context ? `<p class="lctx"><b>@${esc(l.user)}</b> ${esc(l.context.replace(/\s+/g, ' ').slice(0, 180))}</p>` : '';
  const isNew = !opts.saved && state && state.newUrls && state.newUrls.has(l.url);
  return `<article class="card lcard ${i === 0 && l.type === 'am' ? 'is-top' : ''} ${isNew ? 'is-new' : ''}" data-lurl="${esc(l.url)}" data-type="${l.type}" style="animation-delay:${Math.min(i, 10) * 45}ms">
    <div class="lhead"><span class="tile ${t.tile}">${t.icon}</span>
      <div><div class="ltitle">${t.name}</div><div class="lsub">${esc(sub)}</div></div>
      <div class="badges">${badges}${statHTML(l.url)}</div></div>
    <div class="lprev" data-prev hidden></div>
    <div class="lurl">${urlHTML(l.url)}</div>
    ${ctx}
    <div class="lrow">
      <button class="btn btn-primary grow" data-copy="${esc(l.url)}"><span class="swap">${I.copy}<span>Salin link</span></span></button>
      ${openBtn(l)}
      ${opts.saved ? `<button class="btn icon-only" data-unsave="${esc(l.url)}" aria-label="Hapus dari tersimpan">${I.trash}</button>`
        : `<button class="btn icon-only save-btn ${saved.has(l.url) ? 'is-on' : ''}" data-save="${esc(l.url)}" aria-pressed="${saved.has(l.url)}" aria-label="Simpan link">${saved.has(l.url) ? I.bookmarkFill : I.bookmark}</button>`}
    </div></article>`;
}

function dlRow(m, i) {
  const tile = m.kind === 'audio' ? 't-audio' : m.kind === 'image' ? 't-file' : 't-dl';
  const icon = m.kind === 'audio' ? I.audio : m.kind === 'image' ? I.image : I.video;
  return `<button class="card dl" data-dl="${esc(m.key)}" data-ext="${esc(m.ext)}" style="animation-delay:${i * 50}ms">
    <span class="tile ${tile}">${icon}</span>
    <span class="dl-main">
      <span class="dl-title">${esc(m.title)}${m.badge ? `<span class="badge hot">${esc(m.badge)}</span>` : ''}</span>
      <span class="dl-meta" style="display:block">${m.size ? `<span class="dl-msize">${esc(m.size)} · </span>` : ''}${esc(m.meta || '')}</span>
    </span>
    ${m.size ? `<span class="dl-size">${esc(m.size)}</span>` : ''}
    <span class="dl-go">${I.dl}</span>
    <span class="dl-bar"></span>
  </button>`;
}

function countUp() {
  $$('[data-count]', resEl).forEach(el => {
    const to = +el.dataset.count || 0, t0 = performance.now(), dur = 900;
    const step = now => {
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = nf.format(Math.round(to * e));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

/* ---------- results interactions ---------- */
resEl.addEventListener('click', async e => {
  const tab = e.target.closest('[data-tab]');
  if (tab) {
    haptic(5);
    state.tab = tab.dataset.tab;
    $$('[data-tab]', resEl).forEach(b => b.setAttribute('aria-selected', b === tab));
    $$('[data-panel]', resEl).forEach(p => {
      const on = p.dataset.panel === state.tab;
      p.hidden = !on; if (on) { p.classList.remove('is-entering'); void p.offsetWidth; p.classList.add('is-entering'); }
    });
    moveInd($('[data-seg=res]', resEl));
    return;
  }
  const f = e.target.closest('[data-filter]');
  if (f) {
    haptic(5);
    state.filter = f.dataset.filter;
    $$('[data-filter]', resEl).forEach(b => b.setAttribute('aria-pressed', b === f));
    renderLinks(); return;
  }
  const c = e.target.closest('[data-copy]');
  if (c) {
    if (await copyText(c.dataset.copy)) {
      haptic(14); FX.burst(c);
      c.classList.add('is-done'); c.innerHTML = `<span class="swap">${I.check}<span>Tersalin</span></span>`;
      clearTimeout(c._t); c._t = setTimeout(() => { c.classList.remove('is-done'); c.innerHTML = `<span class="swap">${I.copy}<span>Salin link</span></span>`; }, 1700);
    } else toast('Gagal menyalin. Tekan lama link untuk menyalin.', true);
    return;
  }
  const sv = e.target.closest('[data-save]');
  if (sv) { toggleSave(sv, state.d.links.find(l => l.url === sv.dataset.save), state.d.video); return; }
  if (e.target.closest('[data-copyall]')) {
    const list = state.d.links.filter(l => state.filter === 'all' || l.type === state.filter);
    const txt = list.map(l => `${TYPE[l.type].name}${l.label ? ` (${l.label})` : ''}: ${l.url}`).join('\n');
    toast((await copyText(txt)) ? `${list.length} link tersalin` : 'Gagal menyalin', false);
    haptic(14); return;
  }
  if (e.target.closest('[data-newsearch]')) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => { input.focus(); input.select(); }, 350); return;
  }
  const dl = e.target.closest('[data-dl]');
  if (dl) download(dl);
});

/* ---------- download with progress ---------- */
function ring(p) {
  const r = 10, c = 2 * Math.PI * r;
  return `<svg class="ring" viewBox="0 0 26 26"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ff5a8a"/><stop offset="1" stop-color="#4fd2ff"/></linearGradient></defs>
    <circle class="bg" cx="13" cy="13" r="${r}"/><circle class="fg" cx="13" cy="13" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}"/></svg>`;
}
async function download(row) {
  if (row.classList.contains('is-busy')) return;
  haptic(8);
  const v = state.d.video, key = row.dataset.dl;
  const href = `${API}/api/download?vid=${encodeURIComponent(v.id)}&key=${encodeURIComponent(key)}&name=${encodeURIComponent(v.author || 'frizypreset')}`;
  if (/FrizyApp/.test(navigator.userAgent)) { toast('Unduhan dimulai…'); location.href = href; return; } // di aplikasi Android: serahkan ke DownloadManager
  const go = $('.dl-go', row), bar = $('.dl-bar', row), meta = $('.dl-meta', row);
  const metaTxt = meta.innerHTML;
  row.classList.add('is-busy'); row.classList.remove('is-done');
  go.innerHTML = ring(0);
  try {
    const r = await fetch(href);
    if (!r.ok) { let m = 'Unduhan gagal'; try { m = (await r.json()).detail || m; } catch {} throw new Error(m); }
    const total = +r.headers.get('Content-Length') || 0;
    const fname = r.headers.get('X-Filename') || `frizypreset_${v.id}_${key}.${row.dataset.ext}`;
    const reader = r.body.getReader(); const chunks = []; let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value); got += value.length;
      const p = total ? got / total : 0;
      if (total) { bar.style.width = (p * 100).toFixed(1) + '%'; go.innerHTML = ring(p); }
      meta.textContent = total ? `Mengunduh ${Math.round(p * 100)}% · ${(got / 1048576).toFixed(1)} / ${(total / 1048576).toFixed(1)} MB` : `Mengunduh ${(got / 1048576).toFixed(1)} MB`;
    }
    const blob = new Blob(chunks, { type: r.headers.get('Content-Type') || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = fname; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    row.classList.remove('is-busy'); row.classList.add('is-done');
    go.innerHTML = I.check; bar.style.width = '100%';
    meta.innerHTML = `Tersimpan sebagai ${esc(fname)} · <a href="${esc(href)}" target="_blank" rel="noopener" style="text-decoration:underline;text-underline-offset:3px" onclick="event.stopPropagation()">tidak muncul?</a>`;
    toast('Unduhan selesai'); haptic(18);
    setTimeout(() => { bar.style.opacity = '0'; }, 900);
  } catch (err) {
    row.classList.remove('is-busy');
    go.innerHTML = I.dl; bar.style.width = '0';
    meta.innerHTML = metaTxt;
    toast(err.message || 'Unduhan gagal', true);
  }
}

/* ---------- history ---------- */
function saveHistory(d, url) {
  const v = d.video;
  const item = { id: v.id, url, author: v.author, nickname: v.nickname, desc: v.desc, cover: v.cover,
    links: d.links.length, am: d.links.filter(l => l.type === 'am').length, ts: Date.now() };
  hist.add(item);
}
function ago(ts) {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return 'baru saja';
  if (s < 3600) return `${Math.floor(s / 60)} menit lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  return `${Math.floor(s / 86400)} hari lalu`;
}
let histLoaded = false;
async function renderHistory() {
  if (!histLoaded) { histLoaded = true; await hist.load(); }
  const list = histCache;
  $('#historyCount').textContent = list.length ? `${list.length} video` : '';
  $('#clearHistory').hidden = !list.length;
  const el = $('#historyList');
  if (!list.length) {
    el.innerHTML = `<div class="card empty" style="grid-column:1/-1"><span class="tile t-other">${I.clock}</span><h3>Belum ada riwayat</h3><p>Video yang Anda cari akan muncul di sini supaya mudah dibuka lagi.</p>
      <button class="btn" data-nav="home">${I.search}<span>Mulai mencari</span></button></div>`;
    return;
  }
  el.innerHTML = list.map((h, i) => `
    <button class="card hitem" data-hurl="${esc(h.url)}" style="animation-delay:${Math.min(i, 10) * 40}ms">
      ${h.cover ? `<img src="${img(h.cover)}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'hph'}))">` : '<span class="hph"></span>'}
      <span class="hm">
        <span class="hn" style="display:block">@${esc(h.author || 'tiktok')}</span>
        <span class="hc" style="display:block">${esc(h.desc || 'Tanpa caption')}</span>
        <span class="hb">${h.am ? `<span class="badge hot">${h.am} Alight Motion</span>` : ''}<span class="badge">${h.links} link</span><span class="badge">${ago(h.ts)}</span></span>
      </span>
      ${I.chev}
    </button>`).join('');
}
$('#historyList').addEventListener('click', e => {
  const b = e.target.closest('[data-hurl]'); if (!b) return;
  haptic(6); clearBtn.hidden = false;
  if (b.dataset.hurl.startsWith('@')) { setMode('creator'); input.value = b.dataset.hurl; return runCreator(b.dataset.hurl.slice(1)); }
  setMode('video'); input.value = b.dataset.hurl; run(b.dataset.hurl);
});
$('#clearHistory').addEventListener('click', () => { hist.clear(); renderHistory(); toast('Riwayat dihapus'); });

/* ---------- saved links ---------- */
let savedList = ls.get('fp_saved', []);
const saved = { has: u => savedList.some(x => x.url === u) };
async function loadSaved() { try { const r = await apiFetch(`${API}/api/saved`); if (r.ok) { savedList = await r.json(); ls.set('fp_saved', savedList); } } catch {} updateSavedBadge(); }
function updateSavedBadge() {
  const n = savedList.length;
  $$('[data-saved-count]').forEach(el => { el.hidden = !n; el.textContent = n; });
  $$('[data-saved-dot]').forEach(el => { el.hidden = !n; });
}
function toggleSave(btn, l, v) {
  if (!l) return;
  haptic(10);
  const on = !saved.has(l.url);
  if (on) {
    const item = { url: l.url, type: l.type, label: l.label, user: l.user, context: l.context || '', is_creator: !!l.is_creator, source: l.source, video_id: v.id, video_author: v.author || '', ts: Date.now() };
    savedList.unshift(item);
    apiFetch(`${API}/api/saved`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) }).catch(() => {});
    toast('Disimpan ke koleksi'); FX.burst(btn, 10);
  } else {
    savedList = savedList.filter(x => x.url !== l.url);
    apiFetch(`${API}/api/saved?url=${encodeURIComponent(l.url)}`, { method: 'DELETE' }).catch(() => {});
    toast('Dihapus dari koleksi');
  }
  btn.classList.toggle('is-on', on); btn.setAttribute('aria-pressed', on);
  btn.innerHTML = on ? I.bookmarkFill : I.bookmark;
  ls.set('fp_saved', savedList); updateSavedBadge();
}
function renderSaved() {
  const el = $('#savedList');
  $('#savedCount').textContent = savedList.length ? `${savedList.length} link` : '';
  $('#clearSaved').hidden = !savedList.length;
  if (!savedList.length) {
    el.innerHTML = `<div class="card empty" style="grid-column:1/-1"><span class="tile t-am">${I.bookmark}</span><h3>Koleksi masih kosong</h3><p>Ketuk ikon simpan pada kartu link preset untuk menyimpannya di sini.</p>
      <button class="btn" data-nav="home">${I.search}<span>Cari preset</span></button></div>`;
    return;
  }
  el.innerHTML = savedList.map((l, i) => linkCard(l, i, { saved: true })).join('');
  checkLinks(el);
}
$('#savedList').addEventListener('click', async e => {
  const c = e.target.closest('[data-copy]');
  if (c) {
    if (await copyText(c.dataset.copy)) { haptic(14); FX.burst(c); toast('Link tersalin'); }
    return;
  }
  const u = e.target.closest('[data-unsave]');
  if (u) {
    const card = u.closest('.lcard');
    card.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(24px) scale(.97)' }], { duration: 280, easing: 'ease-in' }).onfinish = () => {
      savedList = savedList.filter(x => x.url !== u.dataset.unsave);
      apiFetch(`${API}/api/saved?url=${encodeURIComponent(u.dataset.unsave)}`, { method: 'DELETE' }).catch(() => {});
      ls.set('fp_saved', savedList); updateSavedBadge(); renderSaved();
    };
  }
});
$('#clearSaved').addEventListener('click', () => {
  savedList = []; apiFetch(`${API}/api/saved`, { method: 'DELETE' }).catch(() => {});
  ls.set('fp_saved', savedList); updateSavedBadge(); renderSaved(); toast('Koleksi dikosongkan');
});

/* ---------- FAB: paste & search ---------- */
$('#fab').addEventListener('click', async () => {
  haptic(12);
  try {
    const t = await navigator.clipboard.readText();
    if (t && isTikTok(t)) {
      go('home', { scroll: false }); const u = pickUrl(t); clearBtn.hidden = false;
      if (isProfile(u)) { setMode('creator'); input.value = '@' + userFrom(u); return runCreator(userFrom(u)); }
      setMode('video'); input.value = u; return run(u);
    }
  } catch {}
  go('home');
  setTimeout(() => { input.focus(); toast('Tempel link TikTok di kolom pencarian'); }, 350);
});

/* ---------- FX ---------- */
const FX = (() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;

  // ripple on press
  document.addEventListener('click', e => {
    const t = e.target.closest('.btn, .cta, .chip, .dl, .seg button, .tabbar button, .ghost-btn, .fab, .hitem, .grp-act, .mode button');
    if (!t || reduce || !e.clientX || t.closest('#results, #savedList, #qrModal')) return;
    if (t.closest('.tabbar')) { t.classList.remove('is-press'); void t.offsetWidth; t.classList.add('is-press'); }
    const r = t.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2.2;
    const s = document.createElement('span');
    s.className = 'ripple';
    s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    t.appendChild(s);
    s.addEventListener('animationend', () => s.remove());
  }, { passive: true });

  // spotlight on cards
  if (fine) document.addEventListener('pointermove', e => {
    const c = e.target.closest('.card, .search-field');
    if (!c) return;
    const r = c.getBoundingClientRect();
    c.style.setProperty('--mx', `${e.clientX - r.left}px`);
    c.style.setProperty('--my', `${e.clientY - r.top}px`);
  }, { passive: true });

  // magnetic CTA
  if (fine && !reduce) $$('.cta, .brand').forEach(el => {
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * .18, y = (e.clientY - r.top - r.height / 2) * .28;
      el.style.translate = `${x}px ${y}px`;
    });
    el.addEventListener('pointerleave', () => { el.style.translate = ''; });
  });

  // header + scroll progress
  const bar = $('.topbar'), line = $('.scroll-line span');
  let ticking = false;
  const onScroll = () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      const y = scrollY, h = document.documentElement.scrollHeight - innerHeight;
      bar.classList.toggle('is-scrolled', y > 24);
      line.style.transform = `scaleX(${h > 0 ? Math.min(1, y / h) : 0})`;
      ticking = false;
    });
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // scroll reveal
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
  }), { rootMargin: '0px 0px -8% 0px', threshold: .08 }) : null;
  function reveal() {
    $$('.view.is-active .rv:not(.in)').forEach((el, i) => {
      el.style.setProperty('--d', `${(i % 4) * 70}ms`);
      io ? io.observe(el) : el.classList.add('in');
    });
  }

  // petal burst
  const PC = ['#ff5a8a', '#ff8fb0', '#d063ff', '#7f7dff', '#4fd2ff'];
  function burst(el, n = 14) {
    if (reduce || !el || el.closest('#results, #savedList, #qrModal')) return;
    const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i');
      p.className = 'burst';
      p.style.cssText = `left:${cx}px;top:${cy}px;background:${PC[i % PC.length]}`;
      document.body.appendChild(p);
      const a = (Math.PI * 2 * i) / n + Math.random() * .5, dist = 38 + Math.random() * 46;
      p.animate([
        { transform: 'translate(-50%,-50%) scale(.4) rotate(0deg)', opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(a) * dist}px), calc(-50% + ${Math.sin(a) * dist - 14}px)) scale(1) rotate(${Math.random() * 360}deg)`, opacity: 1, offset: .6 },
        { transform: `translate(calc(-50% + ${Math.cos(a) * dist * 1.2}px), calc(-50% + ${Math.sin(a) * dist + 26}px)) scale(.6) rotate(${Math.random() * 540}deg)`, opacity: 0 },
      ], { duration: 820 + Math.random() * 300, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => p.remove();
    }
  }

  // drifting petals (canvas), echoing the banner video
  function petals() {
    const cv = $('#petals'); if (!cv || reduce) return;
    const ctx = cv.getContext('2d');
    let W, H, dpr, items = [], raf, last = performance.now();
    const N = () => innerWidth < 700 ? 14 : 26;
    const cols = [[255, 90, 138], [255, 120, 160], [208, 99, 255], [127, 125, 255]];
    const mk = (init) => ({
      x: Math.random() * W, y: init ? Math.random() * H : -20 - Math.random() * 80,
      s: 4 + Math.random() * 7, vy: 12 + Math.random() * 22, vx: -6 + Math.random() * 14,
      rot: Math.random() * Math.PI * 2, vr: (-.6 + Math.random() * 1.2), sw: Math.random() * Math.PI * 2,
      a: .18 + Math.random() * .38, c: cols[(Math.random() * cols.length) | 0], flip: Math.random() * Math.PI * 2,
    });
    const size = () => {
      dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight;
      cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      items = Array.from({ length: N() }, () => mk(true));
    };
    const draw = p => {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.scale(1, .55 + .45 * Math.abs(Math.sin(p.flip)));
      ctx.fillStyle = `rgba(${p.c[0]},${p.c[1]},${p.c[2]},${p.a})`;
      ctx.beginPath();
      ctx.moveTo(0, -p.s);
      ctx.bezierCurveTo(p.s * .9, -p.s * .6, p.s * .7, p.s * .7, 0, p.s);
      ctx.bezierCurveTo(-p.s * .7, p.s * .7, -p.s * .9, -p.s * .6, 0, -p.s);
      ctx.fill(); ctx.restore();
    };
    const tick = now => {
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      ctx.clearRect(0, 0, W, H);
      for (const p of items) {
        p.sw += dt * 1.2; p.flip += dt * 1.6; p.rot += p.vr * dt;
        p.x += (p.vx + Math.sin(p.sw) * 16) * dt; p.y += p.vy * dt;
        if (p.y > H + 20 || p.x < -30 || p.x > W + 30) Object.assign(p, mk(false));
        draw(p);
      }
      raf = requestAnimationFrame(tick);
    };
    size(); addEventListener('resize', size);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(raf); else { last = performance.now(); raf = requestAnimationFrame(tick); }
    });
    raf = requestAnimationFrame(tick);
  }

  petals();
  return { burst, reveal };
})();

/* ---------- search mode (video / creator) ---------- */
let mode = 'video';
function setMode(m) {
  if (m === mode && document.body.dataset.mode === m) return;
  mode = m; document.body.dataset.mode = m;
  $$('.mode [data-mode]').forEach(b => b.setAttribute('aria-selected', b.dataset.mode === m));
  const ind = $('.mode-ind'), on = $(`.mode [data-mode="${m}"]`);
  if (ind && on) { ind.style.width = on.offsetWidth + 'px'; ind.style.transform = `translateX(${on.offsetLeft - 4}px)`; }
  input.placeholder = m === 'creator' ? 'Ketik @username atau link profil TikTok' : 'Tempel link TikTok di sini';
  input.type = m === 'creator' ? 'text' : 'url';
  input.setAttribute('aria-label', m === 'creator' ? 'Username kreator TikTok' : 'Link video TikTok');
  $('.cta-label').textContent = m === 'creator' ? 'Pindai akun' : 'Cari preset';
  $$('[data-fmts]').forEach(el => { el.hidden = el.dataset.fmts !== m; });
}
$$('.mode [data-mode]').forEach(b => b.addEventListener('click', () => {
  if (b.dataset.mode === mode) return;
  haptic(5); setMode(b.dataset.mode);
  if (input.value && (mode === 'creator') !== isProfile(input.value)) { input.value = ''; clearBtn.hidden = true; }
  input.focus({ preventScroll: true });
}));
addEventListener('resize', () => { const m = mode; mode = ''; setMode(m); });
if (document.fonts) document.fonts.ready.then(() => { const m = mode; mode = ''; setMode(m); });

/* ---------- link status & preset preview ---------- */
const linfo = new Map();
const isAndroid = /Android/i.test(navigator.userAgent);
const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isMobile = isAndroid || isIOS || matchMedia('(pointer: coarse)').matches;
function statHTML(url) {
  const i = linfo.get(url);
  if (!i) return '<span class="lstat is-wait" data-stat><i></i>Memeriksa</span>';
  return statInner(i);
}
function statInner(i) {
  if (i.status === 'ok') return '<span class="lstat is-ok" data-stat><i></i>Aktif</span>';
  if (i.status === 'dead') return '<span class="lstat is-dead" data-stat><i></i>Link mati</span>';
  if (i.status === 'private') return '<span class="lstat is-priv" data-stat><i></i>Akses terbatas</span>';
  return '<span class="lstat is-hide" data-stat></span>';
}
function openBtn(l) {
  if (l.type === 'am') return `<button class="btn btn-am" data-openam="${esc(l.url)}" aria-label="Buka preset di Alight Motion">${I.amOpen}<span>${isMobile ? 'Buka di AM' : 'Buka di AM'}</span></button>`;
  return `<a class="btn" href="${esc(safeUrl(l.url))}" target="_blank" rel="noopener noreferrer" aria-label="Buka link">${I.ext}<span>Buka</span></a>`;
}
function presetMeta(i) {
  const m = (i.desc || '').match(/contains\s+(\d+)\s+project.*?total\s+([\d.,]+\s*[KMG]?B)/i);
  if (m) return `${m[1]} proyek · ${m[2].replace('.', ',')}`;
  return i.desc && !/^This /.test(i.desc) ? i.desc : '';
}
function paint(card, i) {
  const st = $('[data-stat]', card);
  if (st) { const tmp = document.createElement('div'); tmp.innerHTML = statInner(i); const n = tmp.firstChild; n.classList.add('pop-in'); st.replaceWith(n); }
  card.classList.toggle('is-dead', i.status === 'dead');
  const pv = $('[data-prev]', card);
  if (pv && pv.hidden && (i.title || i.thumb) && i.status !== 'dead') {
    const meta = presetMeta(i);
    pv.innerHTML = `${i.thumb ? `<img src="${API}/api/thumb?u=${encodeURIComponent(i.thumb)}" alt="" loading="lazy" onerror="this.remove()">` : `<span class="lprev-ic">${(TYPE[card.dataset.type] || TYPE.file).icon}</span>`}
      <span class="lprev-t"><b>${esc(i.title || 'Proyek Alight Motion')}</b>${meta ? `<small>${esc(meta)}</small>` : ''}</span>`;
    pv.hidden = false;
  }
}
async function checkLinks(root) {
  const cards = $$('[data-lurl]', root);
  cards.forEach(c => { const i = linfo.get(c.dataset.lurl); if (i) paint(c, i); });
  const need = [...new Set(cards.map(c => c.dataset.lurl))].filter(u => !linfo.has(u));
  for (let k = 0; k < need.length; k += 12) {
    const chunk = need.slice(k, k + 12);
    try {
      const r = await apiFetch(`${API}/api/check`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ urls: chunk }) });
      if (!r.ok) throw 0;
      const res = await r.json();
      for (const u of chunk) {
        const i = res[u] || { status: 'unknown' };
        linfo.set(u, i);
        $$('[data-lurl]').filter(c => c.dataset.lurl === u).forEach(c => paint(c, i));
      }
    } catch { for (const u of chunk) { const i = { status: 'unknown' }; linfo.set(u, i); $$('[data-lurl]').filter(c => c.dataset.lurl === u).forEach(c => paint(c, i)); } }
  }
}

/* ---------- open in Alight Motion ---------- */
function openAM(url) {
  const i = linfo.get(url);
  if (i && i.status === 'dead') { toast('Link ini sudah tidak aktif', true); return; }
  haptic(10);
  const target = (i && i.app_url) || url;
  if (isAndroid) {
    let u; try { u = new URL(target); } catch { toast('Link tidak valid', true); return; }
    location.href = `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=com.alightcreative.motion;S.browser_fallback_url=${encodeURIComponent(url)};end`;
    return;
  }
  if (isIOS) { location.href = target; return; }
  showQR(url, i);
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-openam]');
  if (b) { e.preventDefault(); openAM(b.dataset.openam); }
});

/* ---------- QR modal (desktop) ---------- */
const qrModal = $('#qrModal');
let qrUrl = '', lastFocus = null;
function showQR(url, i) {
  qrUrl = url; lastFocus = document.activeElement;
  $('#qrImg').src = `${API}/api/qr?u=${encodeURIComponent(url)}`;
  $('#qrName').textContent = i && i.title ? i.title : url.replace(/^https?:\/\//, '');
  $('#qrOpen').href = safeUrl(url);
  qrModal.hidden = false; requestAnimationFrame(() => qrModal.classList.add('open'));
  $('#qrCopy').focus();
}
function hideQR() {
  qrModal.classList.remove('open');
  setTimeout(() => { qrModal.hidden = true; lastFocus && lastFocus.focus && lastFocus.focus(); }, 280);
}
qrModal.addEventListener('click', e => { if (e.target.closest('[data-close]')) hideQR(); });
document.addEventListener('keydown', e => {
  if (qrModal.hidden) return;
  if (e.key === 'Escape') return hideQR();
  if (e.key !== 'Tab') return;
  const f = [...qrModal.querySelectorAll('button, a[href]')].filter(x => x.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});
$('#qrCopy').addEventListener('click', async e => {
  const b = e.currentTarget;
  if (await copyText(qrUrl)) {
    haptic(14); FX.burst(b);
    b.innerHTML = `<span class="swap">${I.check}<span>Tersalin</span></span>`;
    setTimeout(() => { b.innerHTML = `<span class="swap">${I.copy}<span>Salin link</span></span>`; }, 1600);
  }
});

/* ---------- creator scan ---------- */
function cLinkRow(l, vid) {
  const t = TYPE[l.type] || TYPE.other;
  return `<div class="cl" data-lurl="${esc(l.url)}" data-type="${l.type}">
    <span class="tile sm ${t.tile}">${t.icon}</span>
    <span class="cl-main"><span class="cl-url">${esc(l.url.replace(/^https?:\/\/(www\.)?/, ''))}</span>
      <span class="cl-sub">${statHTML(l.url)}<span>${l.is_creator ? 'Dari kreator' : l.source === 'caption' ? 'Caption' : '@' + esc(l.user)}</span></span></span>
    <span class="cl-act">
      <button class="btn icon-only" data-ccopy="${esc(l.url)}" aria-label="Salin link">${I.copy}</button>
      ${l.type === 'am' ? `<button class="btn icon-only btn-am" data-openam="${esc(l.url)}" aria-label="Buka di Alight Motion">${I.amOpen}</button>` : `<a class="btn icon-only" href="${esc(safeUrl(l.url))}" target="_blank" rel="noopener noreferrer" aria-label="Buka link">${I.ext}</a>`}
    </span>
  </div>`;
}
function cVideoCard(v, links, i) {
  const d = v.created ? new Date(v.created * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  return `<article class="card cvid" style="animation-delay:${Math.min(i, 6) * 40}ms">
    <div class="cv-head">
      <span class="cv-cover">${v.cover ? `<img src="${img(v.cover)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</span>
      <span class="cv-meta"><span class="cv-desc">${esc(v.desc || 'Tanpa caption')}</span>
        <span class="cv-stats">${nf.format(v.plays)} tayangan · ${d}</span>
        <span class="cv-badges">${links.some(l => l.type === 'am') ? `<span class="badge hot">${links.filter(l => l.type === 'am').length} Alight Motion</span>` : ''}<span class="badge">${links.length} link</span></span></span>
    </div>
    <div class="cv-links">${links.map(l => cLinkRow(l, v.id)).join('')}</div>
    <button class="cv-more" data-cvurl="${esc(v.url)}">Lihat semua komentar video ini ${I.chev}</button>
  </article>`;
}
let cState = null;
async function runCreator(user) {
  const id = ++runId;
  busy = true; goBtn.disabled = true; goBtn.classList.add('is-loading');
  go('home', { scroll: false });
  idleEl.hidden = true; resEl.hidden = false;
  cState = { user, prof: null, total: 0, done: 0, withLinks: 0, links: [], none: 0 };
  resEl.innerHTML = `<div class="creator">
    <div class="card cprof is-loading" id="cprof">
      <span class="cp-av sk"></span>
      <span class="cp-main"><span class="cp-name"><span class="sk sk-t"></span></span><span class="cp-sub">Membuka profil @${esc(user)}…</span></span>
      <div class="cp-prog"><span class="cp-bar"><i style="transform:scaleX(.04)"></i></span><span class="cp-pt" id="cpt">Menyiapkan…</span></div>
    </div>
    <div class="cgrid" id="cgrid"></div>
    <p class="cnone" id="cnone" hidden></p>
  </div>`;
  resEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const prof = $('#cprof', resEl), grid = $('#cgrid', resEl);
  const prog = () => {
    const p = cState.total ? cState.done / cState.total : .06;
    $('.cp-bar i', prof).style.transform = `scaleX(${Math.max(.04, p)})`;
    $('#cpt', resEl).textContent = cState.total ? (cState.done < cState.total ? `Memindai ${cState.done} dari ${cState.total} video` : `${cState.total} video dipindai`) : 'Mengambil daftar video…';
  };
  try {
    const r = await apiFetch(`${API}/api/creator`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user, limit: 30 }) });
    if (!r.ok) { let d = {}; try { d = await r.json(); } catch {} throw new Error(d.detail || 'Gagal memindai akun.'); }
    const reader = r.body.getReader(), dec = new TextDecoder();
    let buf = '';
    const handle = m => {
      if (id !== runId) return;
      if (m.type === 'profile') {
        cState.prof = m;
        prof.classList.remove('is-loading');
        $('.cp-av', prof).outerHTML = m.avatar ? `<img class="cp-av" src="${img(m.avatar)}" alt="" onerror="this.style.visibility='hidden'">` : '<span class="cp-av"></span>';
        $('.cp-name', prof).innerHTML = `${esc(m.nickname || m.user)}${m.verified ? ' <span class="badge creator">Terverifikasi</span>' : ''}`;
        $('.cp-sub', prof).innerHTML = `@${esc(m.user)} · ${nf.format(m.followers)} pengikut · ${nf.format(m.videos)} video`;
        prof.insertAdjacentHTML('beforeend', `<div class="cp-actions">
          <button class="btn btn-primary" id="cpCopyAm" disabled><span class="swap">${I.copy}<span>Salin semua link AM</span></span></button>
          <a class="btn" href="https://www.tiktok.com/@${esc(m.user)}" target="_blank" rel="noopener">${I.ext}<span>Profil TikTok</span></a></div>
          <div class="cp-sum" id="cpSum"></div>`);
      } else if (m.type === 'total') {
        cState.total = m.total;
        if (!m.total) throw new Error('Akun ini belum punya video publik.');
      } else if (m.type === 'video' || m.type === 'skip') {
        cState.done++;
        if (m.type === 'video' && m.links.length) {
          cState.withLinks++; cState.links.push(...m.links.map(l => ({ ...l, _vid: m.video.id })));
          grid.insertAdjacentHTML('beforeend', cVideoCard(m.video, m.links, cState.withLinks));
          checkLinks(grid.lastElementChild);
        } else cState.none++;
        const am = cState.links.filter(l => l.type === 'am').length;
        $('#cpSum', resEl).innerHTML = `<span><b>${cState.links.length}</b> link</span><span><b>${am}</b> Alight Motion</span><span><b>${cState.withLinks}</b> video berisi preset</span>`;
        const ca = $('#cpCopyAm', resEl); if (ca) ca.disabled = !am;
      }
      prog();
    };
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n'); buf = lines.pop();
      for (const ln of lines) if (ln.trim()) handle(JSON.parse(ln));
    }
    if (buf.trim()) handle(JSON.parse(buf));
    if (id !== runId) return;
    prof.classList.add('is-done');
    const none = $('#cnone', resEl);
    if (!cState.withLinks) {
      grid.innerHTML = `<div class="card empty"><span class="tile t-other">${I.search}</span><h3>Belum ada link preset</h3><p>Dari ${cState.total} video terbaru @${esc(user)}, belum ada link preset di caption maupun komentar teratas.</p></div>`;
    } else if (cState.none) { none.hidden = false; none.textContent = `${cState.none} video lain tidak memuat link preset.`; }
    haptic(12);
    const am = cState.links.filter(l => l.type === 'am').length;
    hist.add({ id: 'creator:' + user, url: '@' + user, author: user, nickname: cState.prof ? cState.prof.nickname : user,
      desc: `Pindai akun · ${cState.total} video`, cover: cState.prof ? cState.prof.avatar : '', links: cState.links.length, am, ts: Date.now() });
  } catch (err) {
    if (id !== runId) return;
    const msg = err.message === 'Failed to fetch' ? 'Server tidak bisa dihubungi. Periksa koneksi lalu coba lagi.' : err.message;
    resEl.innerHTML = `<div class="card empty"><span class="tile t-dl">${I.alert}</span><h3>Gagal memindai akun</h3><p>${esc(msg)}</p>
      <button class="btn" data-retry>${I.search}<span>Coba lagi</span></button></div>`;
    $('[data-retry]', resEl).onclick = () => runCreator(user);
  } finally {
    if (id === runId) { busy = false; goBtn.disabled = false; goBtn.classList.remove('is-loading'); }
  }
}
resEl.addEventListener('click', async e => {
  const c = e.target.closest('[data-ccopy]');
  if (c) {
    if (await copyText(c.dataset.ccopy)) { haptic(14); FX.burst(c); c.innerHTML = I.check; c.classList.add('is-done'); setTimeout(() => { c.innerHTML = I.copy; c.classList.remove('is-done'); }, 1500); toast('Link tersalin'); }
    return;
  }
  if (e.target.closest('#cpCopyAm')) {
    const b = $('#cpCopyAm', resEl);
    const urls = [...new Set(cState.links.filter(l => l.type === 'am' && (linfo.get(l.url) || {}).status !== 'dead').map(l => l.url))];
    if (urls.length && await copyText(urls.join('\n'))) { haptic(14); FX.burst(b, 18); toast(`${urls.length} link Alight Motion tersalin`); }
    return;
  }
  const v = e.target.closest('[data-cvurl]');
  if (v) { haptic(6); setMode('video'); input.value = v.dataset.cvurl; clearBtn.hidden = false; run(v.dataset.cvurl); }
});

/* ---------- install (PWA) & share target ---------- */
let deferredPrompt = null;
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); deferredPrompt = e;
  $('#installBtn').hidden = false;
  $('#installNote').textContent = 'Gratis, ringan, dan tidak perlu Play Store.';
});
addEventListener('appinstalled', () => {
  deferredPrompt = null; $('#installBtn').hidden = true;
  toast('Frizy Preset terpasang. Coba tekan Bagikan di TikTok.');
  $('#shareCard').classList.add('is-installed');
});
async function doInstall() {
  haptic(10);
  if (deferredPrompt) { deferredPrompt.prompt(); const r = await deferredPrompt.userChoice; deferredPrompt = null; $('#installBtn').hidden = r.outcome === 'accepted'; return; }
  if (isIOS) { toast('Di Safari: ketuk Bagikan, lalu Tambahkan ke Layar Utama'); return; }
  if (standalone) { toast('Frizy Preset sudah terpasang di perangkat ini'); return; }
  toast(isAndroid ? 'Buka menu Chrome (⋮), lalu pilih Instal aplikasi' : 'Buka situs ini di HP untuk memasang aplikasinya');
}
$('#installBtn').addEventListener('click', doInstall);
$('#installBtn2').addEventListener('click', doInstall);
if (standalone) {
  $('#shareCard').classList.add('is-installed');
  $('#installNote').textContent = 'Sudah terpasang. Di TikTok, tekan Bagikan lalu pilih Frizy Preset.';
}
if (isIOS) $('#installNote').textContent = 'iPhone belum mendukung berbagi langsung ke web app. Tetap bisa pakai tombol Tempel.';


/* ---------- boot ---------- */
lockBanner();
health(); setInterval(() => { if (!document.hidden) health(); }, 30000); loadSaved(); setMode('video'); hist.load().then(() => { histLoaded = true; });
requestAnimationFrame(() => go('home', { scroll: false }));
const qs = new URLSearchParams(location.search);
const shared = [qs.get('url'), qs.get('text'), qs.get('title')].filter(Boolean).join(' ');
if (shared) {
  const u = pickUrl(shared);
  history.replaceState(null, '', location.pathname);
  if (isProfile(u)) { setMode('creator'); input.value = '@' + userFrom(u); clearBtn.hidden = false; runCreator(userFrom(u)); }
  else if (isTikTok(u)) { input.value = u; clearBtn.hidden = false; run(u); toast('Link dari TikTok diterima'); }
}
if (location.hash === '#saved') go('saved', { scroll: false });
addEventListener('hashchange', () => { const v = location.hash.slice(1); if (VIEWS.includes(v)) go(v, { scroll: false }); });
})();
