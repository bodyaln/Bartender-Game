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
    this.previousBtn = document.getElementById("btn-previous");

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
    this.updatePreviousButton();

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

    if (this.previousBtn) {
      this.previousBtn.addEventListener("click", () => {
        this.previousLevel();
      });
    }
  }

  updatePreviousButton() {
    if (!this.previousBtn) return;

    const isPreviousLevelCompleted = this.completedLevels.includes(
      this.currentLevel - 1
    );
    const isFirstLevel = this.currentLevel <= 1;
    const isCurrentLevelCompleted = this.completedLevels.includes(
      this.currentLevel
    );

    // Активируем кнопку Previous только если:
    // 1. Это не первый уровень
    // 2. Предыдущий уровень пройден
    // 3. Текущий уровень пройден
    if (!isFirstLevel && isPreviousLevelCompleted && isCurrentLevelCompleted) {
      this.previousBtn.disabled = false;
    } else {
      this.previousBtn.disabled = true;
    }
  }

  async previousLevel() {
    if (this.currentLevel <= 1) {
      await this.modal.showMessage(
        "Error",
        "❌ You are already at the first level!"
      );
      return;
    }

    if (!this.completedLevels.includes(this.currentLevel - 1)) {
      await this.modal.showMessage(
        "Error",
        "❌ Complete previous level first!"
      );
      return;
    }

    if (!this.completedLevels.includes(this.currentLevel)) {
      await this.modal.showMessage("Error", "❌ Complete current level first!");
      return;
    }

    this.currentLevel--;
    this.loadLevel(this.currentLevel);
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
    this.updateNextButton();
    this.updatePreviousButton();
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
                <button class="bartender__btn bartender__btn--start" id="btn-view-stats">
                    📊 View Statistics
                </button>
                <button class="bartender__btn bartender__btn--reset" id="btn-restart-full">
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
