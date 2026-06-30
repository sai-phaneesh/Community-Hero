const CACHE_NAME = "community-hero-media-cache-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Identify media requests (local uploads or GCS public URLs)
  const isMedia =
    url.pathname.includes("/uploads/") ||
    url.hostname.includes("storage.googleapis.com") ||
    event.request.destination === "image" ||
    event.request.destination === "video";

  if (isMedia && event.request.method === "GET") {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            // Serve cached copy immediately, update cache in background (Stale-While-Revalidate)
            fetch(event.request)
              .then((networkResponse) => {
                if (networkResponse.status === 200) {
                  cache.put(event.request, networkResponse);
                }
              })
              .catch((err) => console.log("SW background fetch failed:", err));
            return cachedResponse;
          }

          // Fallback to network and cache the response
          return fetch(event.request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          });
        });
      })
    );
  }
});
