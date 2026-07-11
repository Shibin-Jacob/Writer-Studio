const CACHE_NAME = 'writer-studio-offline-v2';

// Add all essential assets that need to be cached for offline mode
const OFFLINE_ASSETS = [
    '/offline.html',
    '/img/logo-nopadding.png',
    '/img/logo-circle.png',
    '/img/logo-squaricle.png',
    '/manifest.json'
];

self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(OFFLINE_ASSETS);
        })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(clients.claim());
    // Clear old caches
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', event => {
    // For HTML navigation requests (e.g. going to a new page)
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => {
                // Return the custom offline page from cache if network fails
                return caches.match('/offline.html');
            })
        );
    } else {
        // For other assets (images, CSS, JS), try network first, then cache
        event.respondWith(
            fetch(event.request).catch(() => {
                return caches.match(event.request);
            })
        );
    }
});
