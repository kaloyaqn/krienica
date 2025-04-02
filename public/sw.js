const CACHE_NAME = 'krienica-v1.1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-512x512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
];

// Service Worker for background location tracking
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data.type === 'LOCATION_UPDATE') {
    // Store the location update
    const { position, timestamp } = event.data;
    
    // You can store this in IndexedDB or send it to your server
    // For now, we'll just log it
    console.log('Background location update:', { position, timestamp });
    
    // You can also show a notification to the user
    self.registration.showNotification('Location Updated', {
      body: `Your position was updated at ${new Date(timestamp).toLocaleTimeString()}`,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      vibrate: [200, 100, 200],
      tag: 'location-update'
    });
  }
});

// Handle background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'location-sync') {
    event.waitUntil(
      // Perform any necessary background sync tasks
      Promise.resolve()
    );
  }
});

// Handle periodic background fetch
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'location-fetch') {
    event.waitUntil(
      // Perform periodic background tasks
      Promise.resolve()
    );
  }
});

self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin) &&
      !event.request.url.includes('tile.openstreetmap.org')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        return fetch(event.request).then(
          (response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                // Don't cache if it's a map tile and we're offline
                if (!navigator.onLine && event.request.url.includes('tile.openstreetmap.org')) {
                  return;
                }
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
}); 