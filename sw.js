// Service worker SPPG: cache cangkang aplikasi saja. Permintaan ke Supabase/API TIDAK pernah di-cache.
const CACHE = 'sppg-shell-v2';
const SHELL = ['./', 'index.html', 'config.js', 'api.js', 'manifest.json', 'icon-192.png', 'icon-512.png', 'privasi.html', 'syarat.html', 'refund.html', 'faq.html'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request)));
});
