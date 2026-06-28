const CACHE_NAME = 'autoads-cache-v5';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachePromises = ASSETS_TO_CACHE.map(async (url) => {
        try {
          return await cache.add(url);
        } catch (err) {
          console.warn(`Service Worker failed to cache: ${url}`, err);
        }
      });
      await Promise.all(cachePromises);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: clearing old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  // Completely exclude standalone diagnostic and signage routes from Service Worker handling
  if (
    url.includes('/tv') ||
    url.includes('/loader') ||
    url.includes('/kiosk') ||
    url.includes('/legacy-app') ||
    url.includes('/legacy-test') ||
    url.includes('/legacy-auth-test') ||
    url.includes('bypass-sw=true') ||
    url.includes('/api/')
  ) {
    return; // Let the browser fetch directly from network naturally
  }

  const isHtml = event.request.mode === 'navigate' || event.request.url.includes('.html') || event.request.url.endsWith('/') || event.request.url === self.location.origin;
  if (isHtml) {
    // Network First strategy for HTML/Navigation paths
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || caches.match('/');
          });
        })
    );
  } else {
    // Cache First for other non-document assets with on-the-fly caching
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Fallback if offline and not in cache
          return new Response('Offline asset unavailable', { status: 503, statusText: 'Offline' });
        });
      })
    );
  }
});
