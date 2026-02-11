// ═══════════════════════════════════════════════════════
// SIGAT OBSERVADOR DIGITAL — Service Worker
// ═══════════════════════════════════════════════════════
// Este archivo permite que la app funcione sin internet
// después de la primera carga.

const CACHE_NAME = 'sigat-observador-v1';

// Archivos que se cachean al instalar
const CACHE_FILES = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=JetBrains+Mono:wght@500&display=swap'
];

// INSTALAR: Cachear archivos esenciales
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Cacheando archivos');
      return cache.addAll(CACHE_FILES);
    })
  );
  // Activar inmediatamente sin esperar
  self.skipWaiting();
});

// ACTIVAR: Limpiar caches viejos
self.addEventListener('activate', (event) => {
  console.log('[SW] Activado');
  event.waitUntil(
    caches.keys().then((nombres) => {
      return Promise.all(
        nombres.map((nombre) => {
          if (nombre !== CACHE_NAME) {
            console.log('[SW] Eliminando cache viejo:', nombre);
            return caches.delete(nombre);
          }
        })
      );
    })
  );
  // Tomar control de todas las páginas abiertas
  self.clients.claim();
});

// FETCH: Interceptar peticiones
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // NO cachear llamadas a la API de Google Apps Script
  if (url.hostname === 'script.google.com' ||
      url.hostname === 'script.googleusercontent.com') {
    // Para la API: network-only (nunca cachear respuestas de datos)
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({
          exito: false,
          mensaje: 'Sin conexión al servidor'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Para todo lo demás: Cache-first, luego network
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // Devolver desde cache, pero actualizar en segundo plano
        fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, response);
            });
          }
        }).catch(() => {});
        return cached;
      }

      // No está en cache, ir a la red
      return fetch(event.request).then((response) => {
        // Cachear la respuesta para la próxima vez
        if (response && response.status === 200) {
          const clon = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clon);
          });
        }
        return response;
      }).catch(() => {
        // Sin internet y sin cache: devolver la página principal
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
