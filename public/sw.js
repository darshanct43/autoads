const CACHE_NAME = 'autoads-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json'
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

self.addEventListener('fetch', (event) => {
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
    // Cache First for other non-document assets
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});
