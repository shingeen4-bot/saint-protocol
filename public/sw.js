// Offline app-shell cache. The personal data remains in IndexedDB.
const CACHE = 'saint-protocol-v2';
const ROOT = new URL(self.registration.scope);
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const index = await fetch(ROOT.href);
    if (!index.ok) throw new Error('Unable to cache app');
    const html = await index.clone().text();
    await cache.put(ROOT.href, index);
    const assets = [...html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css))["']/g)]
      .map(match => new URL(match[1], ROOT).href);
    await cache.addAll([...assets, new URL('manifest.webmanifest', ROOT).href, new URL('icon-192.png', ROOT).href]);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) {const copy = response.clone();caches.open(CACHE).then(cache => cache.put(event.request, copy));}
    return response;
  }).catch(() => caches.match(event.request).then(cached => cached || (event.request.mode === 'navigate' ? caches.match(ROOT.href) : Response.error()))));
});
