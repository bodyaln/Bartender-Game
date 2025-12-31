document.addEventListener("DOMContentLoaded", () => {
  const game = new BartenderGame();
  window.game = game;

  const pwaManager = new PWAManager();
  pwaManager.registerServiceWorker();

  setInterval(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          registration.update();
        }
      });
    }
  }, 600000);
});
