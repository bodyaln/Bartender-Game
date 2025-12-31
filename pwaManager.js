class PWAManager {
  constructor() {
    this.deferredPrompt = null;
    this.installButton = document.getElementById("pwa-install-button");
    this.pwaStatus = document.getElementById("pwa-status");
    this.isStandalone = this.checkStandaloneMode();
    this.setupEventListeners();
    this.updateUI();
  }

  checkStandaloneMode() {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone ||
      document.referrer.includes("android-app://")
    );
  }

  setupEventListeners() {
    // Обработка события beforeinstallprompt (Android и Chrome)
    window.addEventListener("beforeinstallprompt", (e) => {
      console.log("[PWA] beforeinstallprompt event fired");
      // Предотвращаем автоматическую установку
      e.preventDefault();
      // Сохраняем событие для последующего использования
      this.deferredPrompt = e;
      // Показываем кнопку установки
      if (this.installButton) {
        this.installButton.style.display = "block";
      }
      if (this.pwaStatus) {
        this.pwaStatus.textContent = "📱 Tap to Install App";
      }
    });

    // Обработка успешной установки приложения
    window.addEventListener("appinstalled", () => {
      console.log("[PWA] App was installed");
      this.deferredPrompt = null;
      this.updateUI();
    });

    // Обработка офлайн/онлайн статуса
    window.addEventListener("online", () => {
      console.log("[PWA] Online mode");
      this.updateNetworkStatus(true);
    });

    window.addEventListener("offline", () => {
      console.log("[PWA] Offline mode");
      this.updateNetworkStatus(false);
    });

    // Обработка нажатия на кнопку установки
    if (this.installButton) {
      this.installButton.addEventListener("click", async () => {
        if (this.deferredPrompt) {
          // Скрываем кнопку
          this.installButton.style.display = "none";
          // Запускаем установку
          this.deferredPrompt.prompt();
          // Ждем результат установки
          const { outcome } = await this.deferredPrompt.userChoice;
          console.log(`[PWA] User response to install prompt: ${outcome}`);
          // Сбрасываем отложенное событие
          this.deferredPrompt = null;
          // Обновляем интерфейс
          this.updateUI();
        }
      });
    }
  }

  updateUI() {
    if (this.isStandalone) {
      // Приложение установлено, скрываем кнопки установки
      if (this.installButton) {
        this.installButton.style.display = "none";
      }
      if (this.pwaStatus) {
        this.pwaStatus.textContent = "✅ Installed as App";
        this.pwaStatus.style.background = "rgba(76, 175, 80, 0.2)";
        this.pwaStatus.style.color = "#4CAF50";
      }
    } else {
      // Приложение не установлено
      if (this.deferredPrompt && this.installButton) {
        this.installButton.style.display = "block";
      }
      if (this.pwaStatus) {
        if (navigator.onLine) {
          this.pwaStatus.textContent = "📱 Install as App";
        } else {
          this.pwaStatus.textContent = "📴 Operating in Offline Mode";
          this.pwaStatus.style.background = "rgba(244, 67, 54, 0.2)";
          this.pwaStatus.style.color = "#F44336";
        }
      }
    }

    // Обновляем статус сети
    this.updateNetworkStatus(navigator.onLine);
  }

  updateNetworkStatus(isOnline) {
    const body = document.body;
    if (isOnline) {
      body.classList.remove("offline");
    } else {
      body.classList.add("offline");
    }
  }

  registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("./sw.js")
          .then((registration) => {
            console.log(
              "[PWA] ServiceWorker registered with scope:",
              registration.scope
            );

            // Проверка на обновления приложения
            registration.onupdatefound = () => {
              const installingWorker = registration.installing;
              installingWorker.onstatechange = () => {
                if (installingWorker.state === "installed") {
                  if (navigator.serviceWorker.controller) {
                    console.log(
                      "[PWA] New content is available; please refresh."
                    );
                    // Можно показать уведомление пользователю о доступном обновлении
                  } else {
                    console.log("[PWA] Content is cached for offline use.");
                  }
                }
              };
            };
          })
          .catch((error) => {
            console.error("[PWA] ServiceWorker registration failed:", error);
          });
      });
    }
  }
}
