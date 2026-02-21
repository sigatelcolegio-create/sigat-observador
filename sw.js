const CACHE_NAME = 'sigat-observador-v3';
const CACHE_FILES = ['./', './index.html', './manifest.json',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(CACHE_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ns => Promise.all(ns.map(n => n !== CACHE_NAME ? caches.delete(n) : null))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);

  // Solo interceptar http y https.
  // chrome-extension://, data:, blob: y otros esquemas NO son cacheables:
  // intentar c.put() con esas URLs lanza TypeError en la Cache API.
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return;

  // Peticiones a Google Apps Script -> siempre red, nunca cache
  if (u.hostname === 'script.google.com' || u.hostname === 'script.googleusercontent.com') {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response(JSON.stringify({ exito: false, mensaje: 'Sin conexion' }),
          { headers: { 'Content-Type': 'application/json' } })
      )
    );
    return;
  }

  // Estrategia: cache primero, actualizar en background (stale-while-revalidate)
  e.respondWith(
    caches.match(e.request).then(cached => {
      // Actualizar cache en segundo plano sin bloquear la respuesta
      const fetchPromise = fetch(e.request).then(r => {
        if (r && r.status === 200) {
          caches.open(CACHE_NAME).then(c => c.put(e.request, r.clone())).catch(() => {});
        }
        return r;
      }).catch(() => {});

      if (cached) {
        fetchPromise; // actualizacion silenciosa
        return cached;
      }

      // Sin cache: esperar red
      return fetch(e.request).then(r => {
        if (r && r.status === 200) {
          const cl = r.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, cl)).catch(() => {});
        }
        return r;
      }).catch(() => {
        if (e.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
