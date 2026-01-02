const CACHE_NAME = "bartender-game-v1";
const APP_PREFIX = "/~xlynnykb/Bartender";
const urlsToCache = [
  `${APP_PREFIX}/`,
  `${APP_PREFIX}/index.html`,
  `${APP_PREFIX}/modalManager.js`,
  `${APP_PREFIX}/touchDragManager.js`,
  `${APP_PREFIX}/bartenderGame.js`,
  `${APP_PREFIX}/pwaManager.js`,
  `${APP_PREFIX}/main.js`,
  `${APP_PREFIX}/style.css`,
  `${APP_PREFIX}/cocktails.json`,
  `${APP_PREFIX}/instructions.html`,
  `${APP_PREFIX}/favicon/favicon.svg`,
  `${APP_PREFIX}/favicon/favicon-96x96.png`,
  `${APP_PREFIX}/favicon/web-app-manifest-192x192.png`,
  `${APP_PREFIX}/favicon/web-app-manifest-512x512.png`,
  `${APP_PREFIX}/manifest.json`,
  `${APP_PREFIX}/favicon/favicon.ico`,
  `${APP_PREFIX}/favicon/apple-touch-icon.png`,
  `${APP_PREFIX}/icons/rum.svg`,
  `${APP_PREFIX}/icons/tequila.svg`,
  `${APP_PREFIX}/icons/whiskey.svg`,
  `${APP_PREFIX}/icons/vodka.svg`,
  `${APP_PREFIX}/icons/gin.svg`,
  `${APP_PREFIX}/icons/triple-sec.svg`,
  `${APP_PREFIX}/icons/vermouth.svg`,
  `${APP_PREFIX}/icons/campari.svg`,
  `${APP_PREFIX}/icons/lime-juice.svg`,
  `${APP_PREFIX}/icons/lemon-juice.svg`,
  `${APP_PREFIX}/icons/soda.svg`,
  `${APP_PREFIX}/icons/mint.svg`,
  `${APP_PREFIX}/icons/lime.svg`,
  `${APP_PREFIX}/icons/orange.svg`,
  `${APP_PREFIX}/icons/cherry.svg`,
  `${APP_PREFIX}/icons/olive.svg`,
  `${APP_PREFIX}/icons/cranberry.svg`,
  `${APP_PREFIX}/icons/sugar.svg`,
  `${APP_PREFIX}/icons/salt.svg`,
  `${APP_PREFIX}/icons/bitters.svg`,
  `${APP_PREFIX}/icons/egg-white.svg`,
  `${APP_PREFIX}/icons/ice.svg`,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache).catch(() => {});
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
            return caches.match(`${APP_PREFIX}/index.html`);
          }

          if (event.request.destination === "image") {
            return caches.match(`${APP_PREFIX}/icons/missing-image.svg`);
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
    icon: `${APP_PREFIX}/favicon/web-app-manifest-192x192.png`,
    badge: `${APP_PREFIX}/favicon/web-app-manifest-512x512.png`,
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});
