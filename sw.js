const CACHE_NAME = 'pokecatch-v1.0.1.1'; // Change this string to force update next time (e.g., v10)
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './pokemon.js',
  './explore.js',
  './daily.js',
  './manifest.json'
];

// 1. INSTALL: Cache assets but force new SW to activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting(); // CRITICAL: Forces this SW to become active immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. ACTIVATE: Clean up old caches and take control of the page
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      return self.clients.claim(); // CRITICAL: Tells all open tabs to use this SW now
    })
  );
});

// 3. FETCH: Network First for HTML, Cache First for Assets
self.addEventListener('fetch', (event) => {
  // If it's the HTML page (navigation), try Network first, then Cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
  } else {
    // For images/scripts, try Cache first, then Network
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});
