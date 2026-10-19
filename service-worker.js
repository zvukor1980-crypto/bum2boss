// Cache names include the worker scope so other games on the same origin stay intact.
const PREFIX = 'b2b-' + encodeURIComponent(self.registration.scope) + '-';
const CACHE = PREFIX + 'v7-boss3';
const ASSETS = ['./', './index.html', './style.css', './data.js', './audio.js', './game.js', './shine.js', './boss3.js', './manifest.webmanifest',
  './icons/apple-touch-icon.png', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/favicon-32.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin ||
      !url.href.startsWith(self.registration.scope)) return;
  const fresh = e.request.mode === 'navigate' || /\.(?:html|js|css|webmanifest)$/.test(url.pathname);
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(e.request, {ignoreSearch: true});
    if (hit && !fresh) return hit;
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 4500);
    try {
      const response = await fetch(e.request, {cache: 'no-cache', signal: ctl.signal});
      if (response.ok && response.type !== 'opaque' && !response.redirected) await cache.put(e.request, response.clone());
      return response;
    } catch (err) {
      if (hit) return hit;
      if (e.request.mode === 'navigate') { const shell = await cache.match('./index.html'); if (shell) return shell; }
      return Response.error();
    } finally { clearTimeout(timer); }
  })());
});
