const CACHE_NAME = "bartender-game-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/game.js",
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

// Install event - кешируем ресурсы при установке
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

// Activate event - очищаем старый кеш
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

// Fetch event - обрабатываем запросы, используя кеш
self.addEventListener("fetch", (event) => {
  // Игнорируем запросы к API и внешним ресурсам
  if (
    event.request.url.includes("://") &&
    !event.request.url.includes(self.location.origin)
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Если ресурс есть в кеше, возвращаем его
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

          // Клонируем ответ для кеширования
          const responseToCache = response.clone();

          // Кешируем только GET запросы
          if (event.request.method === "GET") {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }

          return response;
        })
        .catch(() => {
          // Если нет интернета и ресурса нет в кеше
          if (event.request.mode === "navigate") {
            // Для навигационных запросов возвращаем index.html
            return caches.match("/index.html");
          }

          // Для изображений возвращаем стандартную иконку ошибки
          if (event.request.destination === "image") {
            return caches.match("/icons/missing-image.svg");
          }

          // Для остальных ресурсов возвращаем ошибку
          return new Response("Offline", {
            status: 503,
            statusText: "Service Unavailable",
          });
        });
    })
  );
});

// Обработка сообщений от клиента
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Обработка push-уведомлений
self.addEventListener("push", (event) => {
  const title = "Bartender Game";
  const options = {
    body: event.data ? event.data.text() : "You have a new cocktail to try!",
    icon: "/favicon/favicon-192x192.png",
    badge: "/favicon/favicon-96x96.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});
