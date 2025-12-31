// ===== BARTENDER GAME - COMPLETE WITH STATISTICS =====

class ModalManager {
  constructor() {
    this.currentModal = null;
  }

  showMessage(title, message) {
    return new Promise((resolve) => {
      this.createModal(
        "message",
        title,
        message,
        [{ text: "OK", className: "bartender__btn--recipe", value: true }],
        resolve
      );
    });
  }

  showConfirm(title, message) {
    return new Promise((resolve) => {
      this.createModal(
        "confirm",
        title,
        message,
        [
          { text: "Cancel", className: "bartender__btn--reset", value: false },
          { text: "Reset", className: "bartender__btn--recipe", value: true },
        ],
        resolve
      );
    });
  }

  createModal(type, title, message, buttons, callback) {
    if (this.currentModal) {
      this.currentModal.remove();
    }

    const modal = document.createElement("div");
    modal.className = "bartender__modal";
    modal.id = `${type}-modal`;

    modal.innerHTML = `
            <div class="bartender__modal-content">
                <div class="bartender__modal-header">
                    <h3>${title}</h3>
                    <button class="bartender__modal-close">&times;</button>
                </div>
                <div class="bartender__modal-body">
                    <p>${message}</p>
                    <div class="bartender__modal-actions">
                        ${buttons
                          .map(
                            (btn) =>
                              `<button class="bartender__btn ${btn.className}">${btn.text}</button>`
                          )
                          .join("")}
                    </div>
                </div>
            </div>
        `;

    document.body.appendChild(modal);
    this.currentModal = modal;
    modal.style.display = "flex";

    const closeBtn = modal.querySelector(".bartender__modal-close");
    const actionButtons = modal.querySelectorAll(".bartender__btn");

    const closeModal = (result = false) => {
      modal.style.display = "none";
      setTimeout(() => {
        modal.remove();
        this.currentModal = null;
        callback(result);
      }, 300);
    };

    closeBtn.addEventListener("click", () => closeModal(false));

    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeModal(false);
      }
    });

    actionButtons.forEach((btn, index) => {
      btn.addEventListener("click", () => {
        closeModal(buttons[index].value);
      });
    });
  }
}

class TouchDragManager {
  constructor(game) {
    this.game = game;
    this.isDragging = false;
    this.currentElement = null;
    this.cloneElement = null;
    this.startX = 0;
    this.startY = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.isTouchDevice =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;
    this.dragData = null;
  }

  setupTouchEvents() {
    if (!this.isTouchDevice) return;

    console.log("Setting up touch events for mobile devices...");

    this.game.ingredients.forEach((ingredient) => {
      ingredient.addEventListener(
        "touchstart",
        this.handleTouchStart.bind(this)
      );
      ingredient.addEventListener("touchend", this.handleTouchEnd.bind(this));
      ingredient.addEventListener("touchmove", this.handleTouchMove.bind(this));
      ingredient.addEventListener(
        "touchcancel",
        this.handleTouchCancel.bind(this)
      );
    });

    this.game.glass.addEventListener(
      "touchmove",
      this.handleGlassTouchMove.bind(this)
    );
    this.game.glass.addEventListener(
      "touchend",
      this.handleGlassTouchEnd.bind(this)
    );
    this.game.glass.addEventListener(
      "touchleave",
      this.handleGlassTouchLeave.bind(this)
    );

    document.addEventListener(
      "touchmove",
      (e) => {
        if (this.isDragging) {
          e.preventDefault();
        }
      },
      { passive: false }
    );
  }

  handleTouchStart(e) {
    if (!this.game.levelStarted || !this.game.isTimerRunning) {
      e.preventDefault();
      return;
    }

    const touch = e.touches[0];
    const ingredient = e.currentTarget;
    const type = ingredient.dataset.type;
    const isFlipped = this.game.flipStates[type] || false;

    this.dragData = { type, isFlipped };
    this.isDragging = true;
    this.currentElement = ingredient;
    this.startX = touch.clientX;
    this.startY = touch.clientY;

    const rect = ingredient.getBoundingClientRect();
    this.offsetX = touch.clientX - rect.left;
    this.offsetY = touch.clientY - rect.top;

    this.createDragClone(ingredient, touch.clientX, touch.clientY);

    ingredient.style.opacity = "0.7";
    ingredient.style.transform = "scale(0.95)";

    e.preventDefault();
  }

  handleTouchMove(e) {
    if (!this.isDragging || !this.cloneElement) return;

    const touch = e.touches[0];

    this.cloneElement.style.left = `${touch.clientX - this.offsetX}px`;
    this.cloneElement.style.top = `${touch.clientY - this.offsetY}px`;

    const glassRect = this.game.glass.getBoundingClientRect();
    const isOverGlass =
      touch.clientX >= glassRect.left &&
      touch.clientX <= glassRect.right &&
      touch.clientY >= glassRect.top &&
      touch.clientY <= glassRect.bottom;

    if (isOverGlass) {
      this.game.glass.classList.add("bartender__glass--drop-ready");
    } else {
      this.game.glass.classList.remove("bartender__glass--drop-ready");
    }

    e.preventDefault();
  }

  handleTouchEnd(e) {
    if (!this.isDragging) return;

    const touch = e.changedTouches[0];
    const glassRect = this.game.glass.getBoundingClientRect();
    const isOverGlass =
      touch.clientX >= glassRect.left &&
      touch.clientX <= glassRect.right &&
      touch.clientY >= glassRect.top &&
      touch.clientY <= glassRect.bottom;

    if (isOverGlass && this.dragData) {
      this.game.addIngredientToGlass(
        this.dragData.type,
        this.dragData.isFlipped
      );
    }

    this.cleanupDrag();
    e.preventDefault();
  }

  handleTouchCancel() {
    this.cleanupDrag();
  }

  handleGlassTouchMove(e) {
    if (!this.isDragging) return;
    this.game.glass.classList.add("bartender__glass--drop-ready");
    e.preventDefault();
  }

  handleGlassTouchEnd(e) {
    if (!this.isDragging) return;
    this.game.glass.classList.remove("bartender__glass--drop-ready");

    const touch = e.changedTouches[0];
    const glassRect = this.game.glass.getBoundingClientRect();
    const isOverGlass =
      touch.clientX >= glassRect.left &&
      touch.clientX <= glassRect.right &&
      touch.clientY >= glassRect.top &&
      touch.clientY <= glassRect.bottom;

    if (isOverGlass && this.dragData) {
      this.game.addIngredientToGlass(
        this.dragData.type,
        this.dragData.isFlipped
      );
    }

    this.cleanupDrag();
    e.preventDefault();
  }

  handleGlassTouchLeave() {
    if (!this.isDragging) return;
    this.game.glass.classList.remove("bartender__glass--drop-ready");
  }

  createDragClone(element, x, y) {
    this.cloneElement = element.cloneNode(true);
    this.cloneElement.style.position = "fixed";
    this.cloneElement.style.left = `${x - this.offsetX}px`;
    this.cloneElement.style.top = `${y - this.offsetY}px`;
    this.cloneElement.style.width = `${element.offsetWidth}px`;
    this.cloneElement.style.height = `${element.offsetHeight}px`;
    this.cloneElement.style.zIndex = "1000";
    this.cloneElement.style.pointerEvents = "none";
    this.cloneElement.style.opacity = "0.8";
    this.cloneElement.style.boxShadow = "0 10px 30px rgba(0, 0, 0, 0.5)";
    this.cloneElement.style.transition = "transform 0.1s";

    document.body.appendChild(this.cloneElement);
  }

  cleanupDrag() {
    if (this.cloneElement && this.cloneElement.parentNode) {
      this.cloneElement.remove();
      this.cloneElement = null;
    }

    if (this.currentElement) {
      this.currentElement.style.opacity = "1";
      this.currentElement.style.transform = "";
      this.currentElement = null;
    }

    this.isDragging = false;
    this.dragData = null;
    this.game.glass.classList.remove("bartender__glass--drop-ready");
  }
}

class BartenderGame {
  constructor() {
    console.log("🍸 Bartender Game - Complete with Statistics");

    this.modal = new ModalManager();
    this.ingredients = document.querySelectorAll(".bartender__ingredient");
    this.glass = document.getElementById("target-glass");
    this.glassContent = document.getElementById("glass-content");
    this.nextBtn = document.getElementById("btn-next");
    this.startBtn = document.getElementById("btn-start");
    this.timerElement = document.getElementById("timer");
    this.recipeModal = document.getElementById("recipe-modal");
    this.recipeBtn = document.getElementById("btn-recipe");
    this.closeModalBtn = document.getElementById("btn-close-modal");
    this.isLevelResetForReplay = false;
    this.touchManager = new TouchDragManager(this);
    this.isGameCompleted = false;
    this.successRateElement = document.getElementById("success-rate");
    this.avgTimeElement = document.getElementById("avg-time");
    this.gamesPlayedElement = document.getElementById("games-played");
    this.bestTimeElement = document.getElementById("best-time");

    this.addedIngredients = [];
    this.stirCount = 0;
    this.isStirring = false;
    this.levelTime = 0;
    this.timeElapsed = 0;
    this.timerInterval = null;
    this.isTimerRunning = false;
    this.levelStarted = false;
    this.isGamePaused = false;
    this.flipStates = {};
    this.alcoholTypes = [
      "rum",
      "tequila",
      "whiskey",
      "vodka",
      "gin",
      "vermouth",
      "soda",
      "bitters",
    ];
    this.cocktails = [];

    const savedData = JSON.parse(localStorage.getItem("bartenderGame")) || {};
    this.completedLevels = savedData.completedLevels || [];
    this.currentLevel = savedData.currentLevel || 1;
    this.levelStats = savedData.levelStats || {};
    this.totalLevels = 0;
    this.overallBestTime = savedData.overallBestTime || null;
    this.initializeLevelProgress();
    this.init();
  }

  async init() {
    console.log("Initializing game...");

    await this.loadCocktails();
    this.totalLevels = this.cocktails.length;

    if (this.currentLevel > this.totalLevels) {
      this.currentLevel = this.totalLevels;
      this.saveGameState();
    }
    this.updateLevelProgress();
    this.setupDragAndDrop();
    this.touchManager.setupTouchEvents();
    this.setupButtons();
    this.setupFlipControls();
    this.setupModal();

    this.loadLevel(this.currentLevel);
    this.updateLevelStatistics();

    console.log(
      `✅ Game ready! Level: ${this.currentLevel}/${this.totalLevels}`
    );
  }

  setupModal() {
    this.recipeBtn.addEventListener("click", () => {
      this.recipeModal.style.display = "flex";
    });

    this.closeModalBtn.addEventListener("click", () => {
      this.recipeModal.style.display = "none";
    });

    window.addEventListener("click", (event) => {
      if (event.target === this.recipeModal) {
        this.recipeModal.style.display = "none";
      }
    });
  }

  updateLevelStatistics() {
    this.updateCurrentLevelStats();
    this.updateOverallStats();
  }

  updateCurrentLevelStats() {
    if (!this.currentCocktail) return;

    const levelId = this.currentLevel;
    const stats = this.levelStats[levelId] || {
      completed: false,
      bestTime: null,
      attempts: 0,
      totalTime: 0,
      successRate: 0,
      cocktailName: this.currentCocktail.name,
    };

    const isCompleted = this.completedLevels.includes(levelId);

    this.levelStats[levelId] = {
      ...stats,
      completed: isCompleted,
      cocktailName: this.currentCocktail.name,
      lastUpdated: new Date().toISOString(),
    };
  }

  updateOverallStats() {
    if (
      !this.gamesPlayedElement ||
      !this.successRateElement ||
      !this.avgTimeElement
    )
      return;

    let totalAttempts = 0;
    let completedLevels = 0;
    let totalTimeAllAttempts = 0;

    Object.values(this.levelStats).forEach((stats) => {
      totalAttempts += stats.attempts || 0;
      totalTimeAllAttempts += stats.totalTime || 0;

      if (stats.completed) {
        completedLevels++;
      }
    });

    this.gamesPlayedElement.textContent = totalAttempts;

    if (this.totalLevels > 0) {
      const successRate = Math.round(
        (completedLevels / this.totalLevels) * 100
      );
      this.successRateElement.textContent = `${successRate}%`;

      if (successRate === 100) {
        this.successRateElement.style.color = "#4CAF50";
      } else if (successRate >= 50) {
        this.successRateElement.style.color = "#FF9800";
      } else {
        this.successRateElement.style.color = "#F44336";
      }
    } else {
      this.successRateElement.textContent = "0%";
    }

    if (totalAttempts > 0) {
      const avgSeconds = Math.round(totalTimeAllAttempts / totalAttempts);
      const minutes = Math.floor(avgSeconds / 60);
      const seconds = avgSeconds % 60;
      this.avgTimeElement.textContent = `${minutes}:${seconds
        .toString()
        .padStart(2, "0")}`;
    } else {
      this.avgTimeElement.textContent = "--:--";
    }

    this.saveGameState();
  }

  recordLevelCompletion(timeTaken) {
    const levelId = this.currentLevel;

    if (!this.levelStats[levelId]) {
      this.levelStats[levelId] = {
        completed: true,
        bestTime: timeTaken,
        attempts: 1,
        totalTime: timeTaken,
        successRate: 100,
        cocktailName: this.currentCocktail?.name || "Unknown",
        lastPlayed: new Date().toISOString(),
      };
    } else {
      const stats = this.levelStats[levelId];
      stats.completed = true;
      stats.attempts = (stats.attempts || 0) + 1;
      stats.totalTime = (stats.totalTime || 0) + timeTaken;

      if (!stats.bestTime || timeTaken < stats.bestTime) {
        stats.bestTime = timeTaken;
      }

      stats.successRate = 100;
      stats.lastPlayed = new Date().toISOString();
    }

    if (!this.overallBestTime || timeTaken < this.overallBestTime) {
      this.overallBestTime = timeTaken;
      this.modal.showMessage(
        "🏆 New Record!",
        `🎉 NEW GAME RECORD! ${this.formatTime(timeTaken)}`
      );
    }

    if (!this.completedLevels.includes(levelId)) {
      this.completedLevels.push(levelId);
    }

    this.updateLevelStatistics();
    this.saveGameState();
  }

  recordLevelAttempt() {
    const levelId = this.currentLevel;
    const timeTaken = this.timeElapsed > 0 ? this.timeElapsed : 0;

    if (!this.levelStats[levelId]) {
      this.levelStats[levelId] = {
        completed: false,
        bestTime: null,
        attempts: 1,
        totalTime: timeTaken,
        successRate: 0,
        cocktailName: this.currentCocktail?.name || "Unknown",
        lastPlayed: new Date().toISOString(),
      };
    } else {
      const stats = this.levelStats[levelId];
      stats.attempts = (stats.attempts || 0) + 1;
      stats.totalTime = (stats.totalTime || 0) + timeTaken;

      if (!stats.completed) {
        const totalAttempts = stats.attempts;
        const successfulAttempts = 0;
        stats.successRate = Math.round(
          (successfulAttempts / totalAttempts) * 100
        );
      }

      stats.lastPlayed = new Date().toISOString();
    }

    this.updateLevelStatistics();
    this.saveGameState();
  }

  async loadCocktails() {
    try {
      const response = await fetch("./cocktails.json");
      const data = await response.json();
      this.cocktails = data.cocktails;
      console.log(`Loaded ${this.cocktails.length} cocktails`);
    } catch (error) {
      console.error("Error loading cocktails:", error);
      this.loadFallbackCocktails();
    }
  }

  initializeLevelProgress() {
    const levelsContainer = document.querySelector(".bartender__levels");
    if (!levelsContainer) return;

    // Сохраняем исходное содержимое контейнера
    const originalContent = levelsContainer.innerHTML;

    // Создаем заглушку на время загрузки
    levelsContainer.innerHTML = `
        <div class="bartender__level-placeholder">
            <span>Loading levels...</span>
        </div>
    `;

    // Когда коктейли будут загружены, обновим прогресс
    setTimeout(() => {
      if (this.totalLevels > 0) {
        this.updateLevelProgress();
      } else {
        // Если не удалось загрузить коктейли, возвращаем исходное содержимое
        levelsContainer.innerHTML = originalContent;
      }
    }, 300);
  }

  loadFallbackCocktails() {
    this.cocktails = [
      {
        id: 1,
        name: "Mojito",
        emoji: "🍹",
        timeLimit: 60,
        ingredients: [
          { type: "mint", quantity: 1 },
          { type: "lime", quantity: 1 },
          { type: "sugar", quantity: 1 },
          { type: "rum", quantity: 1 },
          { type: "soda", quantity: 1 },
          { type: "ice", quantity: 1 },
        ],
        requiredStirs: 3,
      },
      {
        id: 2,
        name: "Margarita",
        emoji: "🍸",
        timeLimit: 50,
        ingredients: [
          { type: "tequila", quantity: 1 },
          { type: "triple_sec", quantity: 1 },
          { type: "lime_juice", quantity: 1 },
          { type: "salt", quantity: 1 },
        ],
        requiredStirs: 2,
      },
      {
        id: 3,
        name: "Old Fashioned",
        emoji: "🥃",
        timeLimit: 45,
        ingredients: [
          { type: "whiskey", quantity: 1 },
          { type: "sugar", quantity: 1 },
          { type: "bitters", quantity: 1 },
          { type: "orange", quantity: 1 },
        ],
        requiredStirs: 1,
      },
    ];
  }

  loadLevel(levelNumber) {
    if (levelNumber < 1) levelNumber = 1;
    if (levelNumber > this.totalLevels) {
      this.showAllLevelsCompleted();
      return;
    }

    this.currentLevel = levelNumber;
    this.currentCocktail = this.cocktails[levelNumber - 1];

    this.resetLevelState();
    this.saveGameState();
    console.log(`📈 Level ${levelNumber} loaded: ${this.currentCocktail.name}`);
  }

  resetLevelState() {
    this.resetGlass();
    this.stirCount = 0;
    this.isStirring = false;
    this.isGamePaused = false;
    this.flipStates = {};
    this.updateAllFlipStates();

    this.stopTimer();
    this.timeElapsed = 0;
    this.levelStarted = false;
    this.levelTime = this.currentCocktail.timeLimit || 60;

    this.updateUI();
    this.updateNextButton();
    this.updateStartButton();
    this.updateCurrentLevelStats();

    if (this.nextBtn) {
      this.nextBtn.innerHTML = "Next →";
    }
  }

  async showAllLevelsCompleted() {
    let statsMessage = "📊 YOUR FINAL STATISTICS:\n\n";

    for (let i = 1; i <= this.totalLevels; i++) {
      const stats = this.levelStats[i] || {};
      const levelName = this.cocktails[i - 1]?.name || `Level ${i}`;
      const bestTime = stats.bestTime
        ? this.formatTime(stats.bestTime)
        : "Not completed";
      const attempts = stats.attempts || 0;
      const successRate = stats.successRate || 0;

      statsMessage += `${i}. ${levelName}:\n`;
      statsMessage += `   Best time: ${bestTime}\n`;
      statsMessage += `   Attempts: ${attempts}\n`;
      statsMessage += `   Success: ${successRate}%\n\n`;
    }

    await this.modal.showMessage(
      "🎉 CONGRATULATIONS!",
      `You have completed ALL levels!\n\n${statsMessage}\nClick "Restart" to play again from level 1.`
    );

    this.currentLevel = 1;
    this.completedLevels = [];
    this.saveGameState();
    this.loadLevel(1);
  }

  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }

  saveGameState() {
    const gameState = {
      currentLevel: this.currentLevel,
      completedLevels: this.completedLevels,
      levelStats: this.levelStats,
      overallBestTime: this.overallBestTime,
      lastSave: new Date().toISOString(),
    };
    localStorage.setItem("bartenderGame", JSON.stringify(gameState));
  }

  updateUI() {
    if (!this.currentCocktail) return;

    const cocktailElement = document.getElementById("current-cocktail");
    if (cocktailElement) {
      cocktailElement.innerHTML = `${this.currentCocktail.emoji} ${this.currentCocktail.name}`;
    }

    this.updateTimerDisplay();
    this.updateRecipeList();
    this.updateLevelProgress();
    this.updateStartButton();
    this.showCurrentLevelStats();
  }

  showCurrentLevelStats() {
    if (this.bestTimeElement) {
      const levelStats = this.levelStats[this.currentLevel];
      if (levelStats && levelStats.bestTime) {
        this.bestTimeElement.textContent = this.formatTime(levelStats.bestTime);
      } else {
        this.bestTimeElement.textContent = "0:00";
      }
    }
  }

  startTimer() {
    if (this.isTimerRunning) return;

    this.isTimerRunning = true;
    this.levelStarted = true;
    this.isGamePaused = false;

    this.updateTimerDisplay();

    this.timerInterval = setInterval(() => {
      if (!this.isTimerRunning) return;
      this.timeElapsed++;
      this.updateTimerDisplay();

      if (this.timeElapsed >= this.levelTime) {
        this.timeOut();
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.isTimerRunning = false;
  }

  pauseTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.isTimerRunning = false;
    this.isGamePaused = true;
  }

  updateTimerDisplay() {
    if (!this.timerElement) return;

    const timeLeft = Math.max(0, this.levelTime - this.timeElapsed);
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    this.timerElement.textContent = `${minutes}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }

  async timeOut() {
    this.stopTimer();
    this.recordLevelAttempt();

    const confirmed = await this.modal.showConfirm(
      "⏱️ TIME'S UP!",
      `Level ${this.currentLevel} failed!\n\nYou ran out of time (${this.levelTime}s).\n\nDo you want to try again?`
    );

    if (confirmed) {
      // Пользователь хочет попробовать снова немедленно
      this.resetLevelState();
    } else {
      // Пользователь хочет сначала посмотреть что сделал неправильно
      // Сбрасываем только состояние игры, но оставляем содержимое стакана для просмотра
      this.levelStarted = false;
      this.isTimerRunning = false;
      this.isGamePaused = false;

      this.updateStartButton(); // Это важно - обновит текст кнопки на "🎮 Start Level"
      console.log("⏰ Time out - game state reset for restart option");
    }
  }

  updateStartButton() {
    if (!this.startBtn) return;

    if (this.levelStarted && this.isTimerRunning) {
      this.startBtn.disabled = false;
      this.startBtn.innerHTML = "⏹️ Stop Game";
    } else if (this.levelStarted && this.isGamePaused) {
      this.startBtn.disabled = false;
      this.startBtn.innerHTML = "🏃‍♂️ Continue Game";
    } else if (this.isLevelResetForReplay) {
      // Уровень сброшен для повторного прохождения
      this.startBtn.disabled = false;
      this.startBtn.innerHTML = "🎮 Start Level";
    } else if (this.isGameCompleted) {
      // Игра полностью завершена и пользователь хочет посмотреть статистику
      this.startBtn.disabled = false;
      this.startBtn.innerHTML = "🔄 Reset Game";
    } else if (this.completedLevels.includes(this.currentLevel)) {
      // Уровень пройден и не сброшен
      this.startBtn.disabled = false;
      this.startBtn.innerHTML = "🔄 Reset Level";
    } else {
      // Обычный непройденный уровень
      this.startBtn.disabled = false;
      this.startBtn.innerHTML = "🎮 Start Level";
    }
  }

  // НОВЫЙ МЕТОД: Сброс уровня для повторного прохождения
  async resetCompletedLevel() {
    // Записываем попытку в статистику, если игра уже была начата в этой сессии
    if (this.levelStarted && this.timeElapsed > 0) {
      this.recordLevelAttempt();
    }

    // Сбрасываем состояние уровня, но НЕ удаляем его из пройденных
    this.resetGlass();
    this.stirCount = 0;
    this.isStirring = false;
    this.isGamePaused = false;
    this.flipStates = {};
    this.updateAllFlipStates();
    this.stopTimer();
    this.timeElapsed = 0;
    this.levelStarted = false;

    // ВАЖНО: Не сбрасываем this.levelTime, оставляем исходное значение
    if (!this.levelTime || this.levelTime === 0) {
      this.levelTime = this.currentCocktail.timeLimit || 60;
    }

    // Обновляем UI
    this.updateTimerDisplay();
    this.updateRecipeList();
    this.updateLevelProgress();
    this.updateNextButton();

    // Не меняем кнопку на "Start Level", оставляем возможность сброса
    this.startBtn.disabled = false;
    this.startBtn.innerHTML = "🔄 Reset Level";

    console.log(
      `🔄 Level ${this.currentLevel} reset for replay (stats preserved)`
    );

    await this.modal.showMessage(
      "Level Reset",
      `🔄 Level ${this.currentLevel} has been reset for replay!`
    );
  }

  setupFlipControls() {
    this.ingredients.forEach((ing) => {
      let tapCount = 0;
      let tapTimer;

      ing.addEventListener("touchstart", (e) => {
        e.preventDefault();
        tapCount++;

        if (tapCount === 1) {
          tapTimer = setTimeout(() => {
            tapCount = 0;
          }, 300);
        } else if (tapCount === 2) {
          clearTimeout(tapTimer);
          tapCount = 0;

          const type = ing.dataset.type;
          if (this.alcoholTypes.includes(type)) {
            this.toggleFlip(type);
          }
        }
      });

      ing.addEventListener("dblclick", (e) => {
        e.preventDefault();
        const type = ing.dataset.type;
        if (this.alcoholTypes.includes(type)) {
          this.toggleFlip(type);
        }
      });

      ing.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        const type = ing.dataset.type;
        if (this.alcoholTypes.includes(type)) {
          this.toggleFlip(type);
        }
      });
    });
  }

  toggleFlip(type) {
    if (!this.levelStarted || !this.isTimerRunning) return;
    if (!this.alcoholTypes.includes(type)) return;

    this.flipStates[type] = !this.flipStates[type];
    this.updateSpecificFlipState(type);
  }

  updateSpecificFlipState(type) {
    this.ingredients.forEach((ingredient) => {
      if (ingredient.dataset.type === type) {
        const isFlipped = this.flipStates[type] || false;

        if (isFlipped) {
          ingredient.classList.add("bartender__ingredient--flipped");
          ingredient.style.transform = "rotate(180deg)";
        } else {
          ingredient.classList.remove("bartender__ingredient--flipped");
          ingredient.style.transform = "";
        }
      }
    });
  }

  updateAllFlipStates() {
    this.ingredients.forEach((ingredient) => {
      const type = ingredient.dataset.type;

      if (this.alcoholTypes.includes(type)) {
        const isFlipped = this.flipStates[type] || false;

        if (isFlipped) {
          ingredient.classList.add("bartender__ingredient--flipped");
          ingredient.style.transform = "rotate(180deg)";
        } else {
          ingredient.classList.remove("bartender__ingredient--flipped");
          ingredient.style.transform = "";
        }
      }
    });
  }

  setupDragAndDrop() {
    this.ingredients.forEach((ingredient) => {
      ingredient.addEventListener("dragstart", (e) => {
        if (!this.levelStarted || !this.isTimerRunning) {
          e.preventDefault();
          return;
        }

        const type = ingredient.dataset.type;
        const isFlipped = this.flipStates[type] || false;

        e.dataTransfer.setData(
          "text/plain",
          JSON.stringify({
            type: type,
            isFlipped: isFlipped,
          })
        );

        ingredient.style.opacity = "0.7";
      });

      ingredient.addEventListener("dragend", (e) => {
        ingredient.style.opacity = "1";
      });
    });

    this.glass.addEventListener("dragover", (e) => {
      e.preventDefault();
      this.glass.classList.add("bartender__glass--drop-ready");
    });

    this.glass.addEventListener("dragleave", (e) => {
      this.glass.classList.remove("bartender__glass--drop-ready");
    });

    this.glass.addEventListener("drop", (e) => {
      e.preventDefault();
      this.glass.classList.remove("bartender__glass--drop-ready");

      if (!this.levelStarted || !this.isTimerRunning) return;

      try {
        const data = JSON.parse(e.dataTransfer.getData("text/plain"));
        if (data.type) {
          this.addIngredientToGlass(data.type, data.isFlipped);
        }
      } catch (error) {
        console.error("Error parsing drag data:", error);
      }
    });
  }

  async addIngredientToGlass(type, isFlipped) {
    if (this.addedIngredients.length >= 8) return;

    if (this.alcoholTypes.includes(type) && !isFlipped) {
      await this.modal.showMessage(
        "Flip Required",
        `🔄 You must FLIP ${type.toUpperCase()} bottle upside down first!\n\nDouble-tap on mobile or double-click on desktop to flip.`
      );
      return;
    }

    const element = document.createElement("div");
    element.className = "bartender__glass-ingredient";
    element.textContent = type.toUpperCase();
    element.dataset.type = type;

    if (isFlipped && this.alcoholTypes.includes(type)) {
      element.classList.add("bartender__glass-ingredient--flipped");

      const flipBadge = document.createElement("span");
      flipBadge.className = "bartender__flip-badge";
      flipBadge.title = "This was poured from upside down bottle";
      element.appendChild(flipBadge);
    }

    const pos = this.calculateIngredientPosition();
    element.style.left = `${pos.x}%`;
    element.style.top = `${pos.y}%`;
    element.style.animation = "popIn 0.5s ease";

    this.glassContent.appendChild(element);
    this.addedIngredients.push({
      type: type,
      element: element,
      wasFlipped: isFlipped,
    });

    this.updateProgress();
  }

  calculateIngredientPosition() {
    const total = this.addedIngredients.length;
    if (total === 0) return { x: 40, y: 70 };

    const layer = Math.floor(total / 2);
    const side = total % 2;

    let x, y;
    if (side === 0) {
      x = 25 + Math.random() * 10;
      y = 60 - layer * 15;
    } else {
      x = 55 + Math.random() * 10;
      y = 60 - layer * 15;
    }

    return {
      x: Math.max(15, Math.min(85, x)),
      y: Math.max(20, Math.min(80, y)),
    };
  }

  async checkSolution() {
    if (!this.levelStarted) {
      await this.modal.showMessage("Error", "❌ Start the level first!");
      return;
    }

    if (!this.isTimerRunning) {
      await this.modal.showMessage(
        "Error",
        "❌ Time is up or level not started!"
      );
      return;
    }

    if (!this.currentCocktail) {
      await this.modal.showMessage("Error", "❌ No cocktail loaded!");
      return;
    }

    if (this.addedIngredients.length === 0) {
      await this.modal.showMessage("Error", "❌ Glass is empty!");
      return;
    }

    const ingredientsCorrect = await this.checkIngredients();
    const stirsCorrect = this.checkStirs();

    if (ingredientsCorrect && stirsCorrect) {
      await this.levelCompleted();
    } else {
      await this.levelFailed(ingredientsCorrect, stirsCorrect);
    }
  }

  async checkIngredients() {
    const required = this.currentCocktail.ingredients;
    const added = this.addedIngredients;

    const addedCounts = {};
    const flippedCounts = {};

    added.forEach((ing) => {
      addedCounts[ing.type] = (addedCounts[ing.type] || 0) + 1;
      if (ing.wasFlipped) {
        flippedCounts[ing.type] = (flippedCounts[ing.type] || 0) + 1;
      }
    });

    for (const req of required) {
      const addedQty = addedCounts[req.type] || 0;

      if (addedQty < req.quantity) {
        return false;
      }

      if (this.alcoholTypes.includes(req.type)) {
        const flippedQty = flippedCounts[req.type] || 0;
        if (flippedQty < req.quantity) {
          await this.modal.showMessage(
            "Error",
            `❌ ${req.type.toUpperCase()} must be poured from FLIPPED bottle!`
          );
          return false;
        }
      }
    }

    return true;
  }

  checkStirs() {
    const required = this.currentCocktail.requiredStirs || 3;
    const actual = this.stirCount;
    if (actual < required) {
      return false;
    } else {
      return true;
    }
  }

  async levelCompleted() {
    this.stopTimer();
    this.levelStarted = false;

    console.log(
      `🎉 Level ${this.currentLevel} completed in ${this.timeElapsed}s!`
    );
    this.recordLevelCompletion(this.timeElapsed);
    this.updateLevelProgress();
    this.updateNextButton();

    let message = `✅ Level ${this.currentLevel} completed in ${this.formatTime(
      this.timeElapsed
    )}!`;
    const stats = this.levelStats[this.currentLevel];
    if (stats && stats.bestTime) {
      const previousBest = stats.bestTime;
      if (this.timeElapsed < previousBest) {
        message += `\n🏆 NEW LEVEL RECORD! (Previous: ${this.formatTime(
          previousBest
        )})`;
      } else {
        message += `\n⏱️ Best time: ${this.formatTime(previousBest)}`;
      }
    }
    this.showCurrentLevelStats();
    if (this.currentLevel < this.totalLevels) {
      message += `\nClick "Next" for level ${this.currentLevel + 1}`;
      await this.modal.showMessage("Level Completed!", message);
      this.updateStartButton();
    } else {
      // Последний уровень завершен
      await this.modal.showMessage("🎉 ALL LEVELS COMPLETED!", message);
      // Показываем варианты после небольшой задержки
      setTimeout(() => {
        this.showCompletionOptions();
      }, 1000);
    }
  }
  async levelFailed(ingredientsCorrect, stirsCorrect) {
    let message = "❌ ";
    if (!ingredientsCorrect && !stirsCorrect) {
      message += "Wrong ingredients and wrong stirring!";
    } else if (!ingredientsCorrect) {
      message += "Wrong ingredients!";
    } else if (!stirsCorrect) {
      message += "Wrong stirring!";
    }

    message += "\n\nDo you want to try again?";

    const confirmed = await this.modal.showConfirm("Level Failed", message);

    if (confirmed) {
      this.stopTimer();
      this.resetLevelState();
    }
  }

  async stirGlass() {
    if (this.addedIngredients.length === 0) {
      await this.modal.showMessage("Error", "❌ Glass is empty!");
      return;
    }

    if (this.isStirring) return;

    this.isStirring = true;
    this.stirCount++;

    const stirCountElement = document.getElementById("stir-count");
    if (stirCountElement) {
      stirCountElement.textContent = this.stirCount;
    }

    this.glass.classList.add("bartender__glass--stirring");
    this.mixIngredients();

    setTimeout(() => {
      this.glass.classList.remove("bartender__glass--stirring");
      this.isStirring = false;
    }, 800);
  }

  mixIngredients() {
    this.addedIngredients.forEach((ingredient) => {
      if (ingredient.element) {
        const moveX = Math.random() * 10 - 5;
        const moveY = Math.random() * 10 - 5;

        const currentLeft = parseFloat(ingredient.element.style.left);
        const currentTop = parseFloat(ingredient.element.style.top);

        const newLeft = Math.max(10, Math.min(85, currentLeft + moveX));
        const newTop = Math.max(15, Math.min(85, currentTop + moveY));

        ingredient.element.style.left = `${newLeft}%`;
        ingredient.element.style.top = `${newTop}%`;

        const rotation = Math.random() * 30 - 15;
        ingredient.element.style.transform = `rotate(${rotation}deg)`;
      }
    });
  }

  async resetCompletedLevelForReplay() {
    // Сбрасываем состояние, но оставляем уровень в пройденных
    this.resetGlass();
    this.stirCount = 0;
    this.isStirring = false;
    this.isGamePaused = false;
    this.flipStates = {};
    this.updateAllFlipStates();
    this.stopTimer();
    this.timeElapsed = 0;
    this.levelStarted = false;

    // Устанавливаем флаг, что уровень сброшен для повторного прохождения
    this.isLevelResetForReplay = true;

    // ВАЖНО: не удаляем уровень из completedLevels!

    // Обновляем UI
    this.updateTimerDisplay();
    this.updateRecipeList();
    this.updateLevelProgress();
    this.updateNextButton();
    this.updateStartButton(); // Это установит кнопку как "🎮 Start Level"

    await this.modal.showMessage(
      "Level Reset",
      `🔄 Level ${this.currentLevel} has been reset for replay!`
    );
  }

  setupButtons() {
    if (this.startBtn) {
      this.startBtn.addEventListener("click", async () => {
        if (!this.levelStarted && !this.isTimerRunning) {
          if (this.isGameCompleted) {
            const confirmed = await this.modal.showConfirm(
              "Reset Game",
              "Are you sure you want to reset all game statistics and start from the beginning?"
            );
            if (confirmed) {
              this.restartGameCompletely();
            }
            return;
          }
          // Если уровень сброшен для повторного прохождения
          if (this.isLevelResetForReplay) {
            await this.startLevel();
            this.isLevelResetForReplay = false; // Сбрасываем флаг после старта
            return;
          }

          // Если уровень уже пройден и нажата кнопка "Reset Level"
          if (this.completedLevels.includes(this.currentLevel)) {
            const confirmed = await this.modal.showConfirm(
              "Reset Level",
              `Do you want to replay level ${this.currentLevel}? Your previous completion and statistics will be preserved.`
            );
            if (confirmed) {
              await this.resetCompletedLevelForReplay();
            }
          } else {
            // Если уровень не пройден, начинаем его
            await this.startLevel();
          }
        } else if (this.levelStarted && this.isTimerRunning) {
          this.pauseTimer();
          this.updateStartButton();
          await this.modal.showMessage(
            "Game Paused",
            '⏸️ Game paused. Click "Continue Game" to resume.'
          );
        } else if (this.levelStarted && this.isGamePaused) {
          this.startTimer();
          this.updateStartButton();
        }
      });
    }

    const resetBtn = document.getElementById("btn-reset");
    if (resetBtn) {
      resetBtn.addEventListener("click", async () => {
        const confirmed = await this.modal.showConfirm(
          "Reset Glass",
          "Are you sure you want to reset the glass? This will remove all ingredients."
        );
        if (confirmed) {
          this.resetGlass();
        }
      });
    }

    const checkBtn = document.getElementById("btn-check");
    if (checkBtn) {
      checkBtn.addEventListener("click", () => {
        this.checkSolution();
      });
    }

    const stirBtn = document.getElementById("btn-stir");
    if (stirBtn) {
      stirBtn.addEventListener("click", () => {
        if (!this.levelStarted || !this.isTimerRunning) {
          this.modal.showMessage("Error", "Start the game first!");
          return;
        }
        this.stirGlass();
      });
    }

    if (this.nextBtn) {
      this.nextBtn.addEventListener("click", () => {
        this.nextLevel();
      });
    }

    const solutionBtn = document.getElementById("btn-solution");
    if (solutionBtn) {
      solutionBtn.addEventListener("click", () => {
        this.showSolution();
      });
    }

    const restartBtn = document.getElementById("btn-restart");
    if (restartBtn) {
      restartBtn.addEventListener("click", async () => {
        const confirmed = await this.modal.showConfirm(
          "Restart Game",
          "Are you sure you want to restart the game from level 1? All statistics will be lost."
        );
        if (confirmed) {
          this.restartGame();
        }
      });
    }

    const statsBtn = document.getElementById("btn-stats");
    if (statsBtn) {
      statsBtn.addEventListener("click", () => {
        this.showDetailedStatistics();
      });
    }
  }

  async showDetailedStatistics() {
    let statsMessage = "📊 DETAILED STATISTICS:\n\n";

    for (let i = 1; i <= this.totalLevels; i++) {
      const stats = this.levelStats[i] || {};
      const levelName = this.cocktails[i - 1]?.name || `Level ${i}`;
      const completed = stats.completed ? "✅" : "❌";
      const bestTime = stats.bestTime
        ? this.formatTime(stats.bestTime)
        : "--:--";
      const attempts = stats.attempts || 0;
      const successRate = stats.successRate || 0;

      statsMessage += `${completed} ${i}. ${levelName}\n`;
      statsMessage += `   Best time: ${bestTime}\n`;
      statsMessage += `   Attempts: ${attempts}\n`;
      statsMessage += `   Success: ${successRate}%\n\n`;
    }

    const totalAttempts = Object.values(this.levelStats).reduce(
      (sum, stats) => sum + (stats.attempts || 0),
      0
    );
    const completedLevels = Object.values(this.levelStats).filter(
      (stats) => stats.completed
    ).length;
    const overallSuccess =
      this.totalLevels > 0
        ? Math.round((completedLevels / this.totalLevels) * 100)
        : 0;

    statsMessage += `📈 OVERALL:\n`;
    statsMessage += `   Levels completed: ${completedLevels}/${this.totalLevels}\n`;
    statsMessage += `   Total attempts: ${totalAttempts}\n`;
    statsMessage += `   Overall success: ${overallSuccess}%`;

    await this.modal.showMessage("Detailed Statistics", statsMessage);
  }

  updateProgress() {
    if (!this.currentCocktail) return;

    const target = this.currentCocktail.ingredients.length;
    const current = this.addedIngredients.length;
    console.log(`Progress: ${current}/${target}`);
  }

  updateRecipeList() {
    const recipeList = document.getElementById("recipe-list");
    if (!recipeList || !this.currentCocktail) return;

    recipeList.innerHTML = "";

    this.currentCocktail.ingredients.forEach((ing) => {
      const li = document.createElement("li");
      li.className = "bartender__recipe-step";

      const needsFlip = this.alcoholTypes.includes(ing.type);
      const flipIcon = needsFlip ? " 🔄" : "";

      li.textContent = `Add ${ing.type}${flipIcon}`;
      recipeList.appendChild(li);
    });

    const requiredStirs = this.currentCocktail.requiredStirs || 3;
    const stirLi = document.createElement("li");
    stirLi.className = "bartender__recipe-step bartender__recipe-step--stir";

    let stirEmojis = "";
    for (let i = 0; i < requiredStirs; i++) {
      stirEmojis += "🔄 ";
    }

    stirLi.innerHTML = `
            <div class="bartender__stir-instruction">
                <span class="bartender__stir-emoji">${stirEmojis}</span>
                <span class="bartender__stir-text">Stir ${requiredStirs} times</span>
            </div>
        `;

    recipeList.appendChild(stirLi);
  }

  updateLevelProgress() {
    const levelsContainer = document.querySelector(".bartender__levels");
    const completedCountElement = document.getElementById("completed-levels");
    const levelsTextElement = document.querySelector(".bartender__levels-text");

    if (!levelsContainer || !completedCountElement || !levelsTextElement) {
      console.warn("Level progress elements not found in DOM");
      return;
    }

    // Очищаем контейнер уровней
    levelsContainer.innerHTML = "";

    // Создаем элементы уровней динамически
    for (let i = 1; i <= this.totalLevels; i++) {
      const levelElement = document.createElement("div");
      levelElement.className = "bartender__level";
      levelElement.textContent = i;
      levelElement.dataset.level = i;

      // Добавляем классы в зависимости от статуса уровня
      if (this.completedLevels.includes(i)) {
        levelElement.classList.add("bartender__level--completed");
      }

      if (i === this.currentLevel) {
        levelElement.classList.add("bartender__level--current");
      }

      // Добавляем визуальную обратную связь при наведении
      levelElement.addEventListener("mouseenter", () => {
        const stats = this.levelStats[i] || {};
        let tooltipText = `Level ${i}: `;

        if (stats.bestTime) {
          tooltipText += `Best: ${this.formatTime(stats.bestTime)}`;
        } else {
          tooltipText += "Not completed yet";
        }

        // Показываем подсказку в консоли или можно создать визуальную подсказку
        console.log(tooltipText);
      });

      levelsContainer.appendChild(levelElement);
    }

    // Обновляем счетчик пройденных уровней
    completedCountElement.textContent = this.completedLevels.length;

    // Обновляем текст с общим количеством уровней
    levelsTextElement.innerHTML = `Completed: <span id="completed-levels">${this.completedLevels.length}</span>/${this.totalLevels}`;
  }

  updateNextButton() {
    if (!this.nextBtn) return;

    const isLevelCompleted = this.completedLevels.includes(this.currentLevel);
    const isLastLevel = this.currentLevel >= this.totalLevels;

    this.nextBtn.innerHTML = "Next →";

    if (isLevelCompleted && !isLastLevel) {
      this.nextBtn.disabled = false;
    } else {
      this.nextBtn.disabled = true;
      if (isLastLevel && isLevelCompleted) {
        this.nextBtn.innerHTML = "🎉 All Done!";
      }
    }
  }

  async startLevel() {
    // Если уровень уже пройден, но мы сбрасываем для повторного прохождения
    if (
      this.completedLevels.includes(this.currentLevel) &&
      this.isLevelResetForReplay
    ) {
      this.resetLevelState();
      this.isLevelResetForReplay = false;
    }
    // Если уровень уже пройден и не сброшен для повторного прохождения
    else if (this.completedLevels.includes(this.currentLevel)) {
      await this.modal.showMessage(
        "Level Completed",
        "✅ This level is already completed!"
      );
      return;
    }
    // Если игра уже запущена
    else if (this.levelStarted && this.isTimerRunning) {
      await this.modal.showMessage(
        "Game in Progress",
        "⚠️ Level already in progress!"
      );
      return;
    }

    // ВАЖНО: Полностью сбрасываем стакан перед началом
    this.resetGlass();
    this.timeElapsed = 0;
    this.levelTime = this.currentCocktail.timeLimit || 60;
    this.startTimer();
    this.updateStartButton();

    // Показываем сообщение только для первого прохождения или после сброса
    await this.modal.showMessage(
      "Level Started",
      `🎮 Level ${this.currentLevel} started!\nTime limit: ${this.levelTime} seconds`
    );
  }

  async restartGame() {
    this.stopTimer();
    this.currentLevel = 1;
    this.completedLevels = [];
    this.levelStats = {};
    this.overallBestTime = null;
    this.saveGameState();
    this.loadLevel(1);
    this.updateLevelStatistics();
    await this.modal.showMessage(
      "Game Restarted",
      "🔄 Game restarted from level 1! Statistics cleared."
    );
  }

  async showSolution() {
    if (!this.currentCocktail) return;

    const requiredStirs = this.currentCocktail.requiredStirs || 3;
    const ingredients = this.currentCocktail.ingredients
      .map((i) => {
        const needsFlip = this.alcoholTypes.includes(i.type);
        return `${i.type}${needsFlip ? " (FLIPPED)" : ""}`;
      })
      .join(", ");

    await this.modal.showMessage(
      "Solution",
      `📖 Solution:\n\nIngredients: ${ingredients}\nStir: ${requiredStirs} times\nTime limit: ${this.levelTime}s`
    );
  }

  async nextLevel() {
    if (!this.completedLevels.includes(this.currentLevel)) {
      await this.modal.showMessage("Error", "❌ Complete current level first!");
      return;
    }

    if (this.currentLevel >= this.totalLevels) {
      await this.modal.showMessage(
        "Congratulations",
        "🎉 You have completed all levels!"
      );
      return;
    }

    this.currentLevel++;
    this.loadLevel(this.currentLevel);
  }

  resetGlass() {
    if (this.glassContent) {
      this.glassContent.innerHTML = "";
    }

    this.addedIngredients = [];
    this.stirCount = 0;

    const stirCountElement = document.getElementById("stir-count");
    if (stirCountElement) {
      stirCountElement.textContent = this.stirCount;
    }

    this.updateProgress();
    console.log("✅ Glass reset");
  }

  async showCompletionOptions() {
    // Не показываем опции, если это не последний уровень
    if (
      this.currentLevel < this.totalLevels ||
      !this.completedLevels.includes(this.currentLevel)
    ) {
      return;
    }

    const modal = document.createElement("div");
    modal.className = "bartender__modal";
    modal.innerHTML = `
    <div class="bartender__modal-content">
        <div class="bartender__modal-header">
            <h3>🎉 CONGRATULATIONS!</h3>
            <button class="bartender__modal-close">&times;</button>
        </div>
        <div class="bartender__modal-body">
            <p>You have completed ALL levels!</p>
            <div class="bartender__modal-actions" style="margin-top: 20px; justify-content: space-around;">
                <button class="bartender__btn bartender__btn--reset" id="btn-view-stats">
                    📊 View Statistics
                </button>
                <button class="bartender__btn bartender__btn--recipe" id="btn-restart-full">
                    🔄 Restart Game
                </button>
            </div>
        </div>
    </div>
    `;

    document.body.appendChild(modal);
    modal.style.display = "flex";

    // Обработчики кнопок
    document.getElementById("btn-view-stats").addEventListener("click", () => {
      modal.remove();
      this.isGameCompleted = true;
      this.updateStartButton();
    });

    document
      .getElementById("btn-restart-full")
      .addEventListener("click", () => {
        modal.remove();
        this.restartGameCompletely();
      });

    // Закрытие по клику вне модального окна
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.remove();
        this.isGameCompleted = true;
        this.updateStartButton();
      }
    });
  }

  async restartGameCompletely() {
    const confirmed = await this.modal.showConfirm(
      "Restart Game",
      "Are you sure you want to restart the game from level 1? All statistics will be lost."
    );

    if (!confirmed) return;

    // Полный сброс статистики
    this.currentLevel = 1;
    this.completedLevels = [];
    this.levelStats = {};
    this.overallBestTime = null;
    this.isGameCompleted = false;

    // Очистка localStorage
    localStorage.removeItem("bartenderGame");

    // Перезагрузка уровней
    this.loadLevel(1);
    this.updateLevelStatistics();

    // Сбрасываем текст кнопки Next после перезапуска
    if (this.nextBtn) {
      this.nextBtn.innerHTML = "Next →";
      this.nextBtn.disabled = true;
    }

    await this.modal.showMessage(
      "Game Restarted",
      "🔄 Game restarted from level 1! All statistics cleared."
    );
  }
}

document.addEventListener("DOMContentLoaded", () => {
  try {
    const game = new BartenderGame();
    window.game = game;

    console.log("Game commands:");
    console.log("- window.game.showDetailedStatistics() - show detailed stats");
  } catch (error) {
    console.error("Game failed:", error);
    alert("Game initialization failed.");
  }
});
