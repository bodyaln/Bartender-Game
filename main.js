document.addEventListener("DOMContentLoaded", () => {
  try {
    // Инициализация основной игры
    const game = new BartenderGame();
    window.game = game;

    // Инициализация PWA функционала
    const pwaManager = new PWAManager();
    pwaManager.registerServiceWorker();
    console.log("[PWA] PWA functionality initialized");

    // Ручное обновление приложения каждые 10 минут
    setInterval(() => {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistration().then((registration) => {
          if (registration) {
            registration.update();
          }
        });
      }
    }, 600000);
  } catch (error) {
    alert("Game initialization failed.");
    console.error("Initialization error:", error);
  }
});
