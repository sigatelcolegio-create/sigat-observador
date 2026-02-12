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
  if (u.hostname === 'script.google.com' || u.hostname === 'script.googleusercontent.com') {
    e.respondWith(fetch(e.request).catch(() => new Response(JSON.stringify({exito:false,mensaje:'Sin conexión'}),{headers:{'Content-Type':'application/json'}})));
    return;
  }
  e.respondWith(caches.match(e.request).then(cached => {
    if (cached) { fetch(e.request).then(r => { if(r&&r.status===200) caches.open(CACHE_NAME).then(c=>c.put(e.request,r)) }).catch(()=>{}); return cached; }
    return fetch(e.request).then(r => { if(r&&r.status===200){const cl=r.clone();caches.open(CACHE_NAME).then(c=>c.put(e.request,cl))} return r }).catch(()=>{ if(e.request.mode==='navigate')return caches.match('./index.html') });
  }));
});
