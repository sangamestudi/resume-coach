// Service Worker for AI Resume Coach
// Version: 1.0.0

const CACHE_NAME = 'resume-coach-v1.0.0';

// Files to cache for offline access
const urlsToCache = [
  '/Resume-coach/',
  '/Resume-coach/index.html',
  '/Resume-coach/resume-checker.html',
  '/Resume-coach/interview.html',
  '/Resume-coach/live-interview.html',
  '/Resume-coach/manifest.json',
  '/Resume-coach/privacy.html',
  
  // External CSS & JS (CDN)
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js',
  'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
];

// Install event - cache files
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching files...');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('[Service Worker] Cache error:', error);
      })
  );
  
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Take control of all clients
  self.clients.claim();
});

// Fetch event - serve from cache first, then network
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);
  
  // Skip cross-origin requests (except CDN)
  if (requestUrl.origin !== location.origin && 
      !requestUrl.hostname.includes('cdnjs') &&
      !requestUrl.hostname.includes('fonts.googleapis.com') &&
      !requestUrl.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return cached response
        if (response) {
          console.log('[Service Worker] Serving from cache:', event.request.url);
          return response;
        }
        
        // Clone the request
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest)
          .then(response => {
            // Check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response for caching
            const responseToCache = response.clone();
            
            // Cache the fetched response
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
                console.log('[Service Worker] Cached new resource:', event.request.url);
              })
              .catch(error => {
                console.error('[Service Worker] Cache put error:', error);
              });
            
            return response;
          })
          .catch(error => {
            console.error('[Service Worker] Fetch error:', error);
            
            // Return offline fallback page for HTML requests
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/Resume-coach/offline.html')
                .then(offlineResponse => {
                  if (offlineResponse) {
                    return offlineResponse;
                  }
                  return new Response('You are offline. Please check your internet connection.', {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: new Headers({
                      'Content-Type': 'text/html'
                    })
                  });
                });
            }
            
            return new Response('Network error. Please try again.', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// Background sync for offline submissions (optional)
self.addEventListener('sync', event => {
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'sync-resume-analysis') {
    event.waitUntil(syncResumeAnalysis());
  }
});

// Push notification (optional)
self.addEventListener('push', event => {
  console.log('[Service Worker] Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'New update available!',
    icon: '/Resume-coach/icons/icon-192.png',
    badge: '/Resume-coach/icons/icon-72.png',
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'close', title: 'Dismiss' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('AI Resume Coach', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/Resume-coach/')
    );
  }
});

// Helper function for background sync (implement as needed)
async function syncResumeAnalysis() {
  console.log('[Service Worker] Syncing resume analysis...');
  // Implement if needed for offline queue
}