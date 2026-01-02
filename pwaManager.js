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
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();

      this.deferredPrompt = e;

      if (this.installButton) {
        this.installButton.style.display = "block";
      }
      if (this.pwaStatus) {
        this.pwaStatus.textContent = "📱 Tap to Install App";
      }
    });

    window.addEventListener("appinstalled", () => {
      this.deferredPrompt = null;
      this.updateUI();
    });

    window.addEventListener("online", () => {
      this.updateNetworkStatus(true);
    });

    window.addEventListener("offline", () => {
      this.updateNetworkStatus(false);
    });

    if (this.installButton) {
      this.installButton.addEventListener("click", async () => {
        if (this.deferredPrompt) {
          this.installButton.style.display = "none";

          this.deferredPrompt.prompt();

          this.deferredPrompt = null;

          this.updateUI();
        }
      });
    }
  }

  updateUI() {
    if (this.isStandalone) {
      if (this.installButton) {
        this.installButton.style.display = "none";
      }
      if (this.pwaStatus) {
        this.pwaStatus.textContent = "✅ Installed as App";
        this.pwaStatus.style.background = "rgba(76, 175, 80, 0.2)";
        this.pwaStatus.style.color = "#4CAF50";
      }
    } else {
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
        navigator.serviceWorker.register("/~xlynnykb/Bartender/sw.js");
      });
    }
  }
}
