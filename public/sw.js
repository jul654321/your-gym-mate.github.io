// Service Worker for Your Gym Mate PWA
// Minimal, deterministic SW with cache-first for static assets
// and network-first for dynamic data

const CACHE_NAME = "gymmate-static-v4";
const RUNTIME_CACHE = "gymmate-runtime-v4";
const BASE_PATH = "/your-gym-mate.github.io/";

// Static assets to precache - will be updated by build process
const ASSETS = [
  BASE_PATH,
  `${BASE_PATH}index.html`,
  `${BASE_PATH}manifest.json`,
  `${BASE_PATH}icons/icon-192.png`,
  `${BASE_PATH}icons/icon-512.png`,
  `${BASE_PATH}icons/apple-touch-icon.png`,
];

// Install event: precache static assets
// Do NOT call skipWaiting() unconditionally — let the page trigger it via message
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Precaching static assets");
      return cache.addAll(ASSETS);
    })
  );
  // No self.skipWaiting() here — wait for user to accept update
});

// Activate event: clean up old caches and take control
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log("[SW] Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log("[SW] Claiming clients");
        return self.clients.claim();
      })
  );
});

// Fetch event: cache-first for static, network-first for dynamic
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith("http")) {
    return;
  }

  // Network-first for navigation requests to ensure fresh HTML after deploy
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkResp) => {
          // Update cached index.html for offline fallback
          const copy = networkResp.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(`${BASE_PATH}index.html`, copy);
          });
          return networkResp;
        })
        .catch(() => {
          // Fallback to cached index.html when offline
          return caches.match(`${BASE_PATH}index.html`);
        })
    );
    return;
  }

  // Network-first for API-like endpoints (future-proofing)
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/data/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache successful responses
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(request);
        })
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      // If not in cache, fetch from network
      return fetch(request)
        .then((response) => {
          // Don't cache non-successful responses
          if (
            !response ||
            response.status !== 200 ||
            response.type === "error"
          ) {
            return response;
          }

          // Clone and cache for next time
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });

          return response;
        })
        .catch(() => {
          // If both cache and network fail, return offline page or error
          // For now, just fail silently
          console.error("[SW] Failed to fetch:", request.url);
        });
    })
  );
});

// Message handler for skip waiting
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    console.log("[SW] Received SKIP_WAITING message");
    self.skipWaiting();
  }
});
