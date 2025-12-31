const CACHE_NAME = "bartender-game-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/modalManager.js",
  "/touchDragManager.js",
  "/bartenderGame.js",
  "/pwaManager.js",
  "/main.js",
  "/style.css",
  "/cocktails.json",
  "/instructions.html",
  "/favicon/favicon.svg",
  "/favicon/favicon-96x96.png",
  "/favicon/web-app-manifest-192x192.png",
  "/favicon/web-app-manifest-512x512.png",
  "/manifest.json",
  "/favicon/favicon.ico",
  "/favicon/apple-touch-icon.png",
  "/icons/rum.svg",
  "/icons/tequila.svg",
  "/icons/whiskey.svg",
  "/icons/vodka.svg",
  "/icons/gin.svg",
  "/icons/triple-sec.svg",
  "/icons/vermouth.svg",
  "/icons/campari.svg",
  "/icons/lime-juice.svg",
  "/icons/lemon-juice.svg",
  "/icons/soda.svg",
  "/icons/mint.svg",
  "/icons/lime.svg",
  "/icons/orange.svg",
  "/icons/cherry.svg",
  "/icons/olive.svg",
  "/icons/cranberry.svg",
  "/icons/sugar.svg",
  "/icons/salt.svg",
  "/icons/bitters.svg",
  "/icons/egg-white.svg",
  "/icons/ice.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache).catch((error) => {
          console.error("[ServiceWorker] Caching failed:", error);
          throw error;
        });
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

self.addEventListener("activate", (event) => {
  const cacheWhitelist = [CACHE_NAME];

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheWhitelist.indexOf(cacheName) === -1) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

self.addEventListener("fetch", (event) => {
  if (
    event.request.url.includes("://") &&
    !event.request.url.includes(self.location.origin)
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }

      const fetchRequest = event.request.clone();

      return fetch(fetchRequest)
        .then((response) => {
          if (
            !response ||
            response.status !== 200 ||
            response.type !== "basic"
          ) {
            return response;
          }

          const responseToCache = response.clone();

          if (event.request.method === "GET") {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }

          return response;
        })
        .catch(() => {
          if (event.request.mode === "navigate") {
            return caches.match("/index.html");
          }

          if (event.request.destination === "image") {
            return caches.match("/icons/missing-image.svg");
          }

          return new Response("Offline", {
            status: 503,
            statusText: "Service Unavailable",
          });
        });
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("push", (event) => {
  const title = "Bartender Game";
  const options = {
    body: event.data ? event.data.text() : "You have a new cocktail to try!",
    icon: "/favicon/web-app-manifest-192x192.png",
    badge: "/favicon/web-app-manifest-512x512.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});
