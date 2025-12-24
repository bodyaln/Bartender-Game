// ===== BARTENDER GAME - COMPLETE WITH STATISTICS =====

class BartenderGame {
    constructor() {
        console.log('🍸 Bartender Game - Complete with Statistics');

        // Елементи DOM
        this.ingredients = document.querySelectorAll('.ingredient');
        this.glass = document.getElementById('target-glass');
        this.glassContent = document.getElementById('glass-content');
        this.nextBtn = document.getElementById('btn-next');
        this.startBtn = document.getElementById('btn-start');
        this.timerElement = document.getElementById('timer');

        // Елементи статистики
        this.successRateElement = document.getElementById('success-rate');
        this.avgTimeElement = document.getElementById('avg-time');
        this.gamesPlayedElement = document.getElementById('games-played');

        // Стан гри
        this.addedIngredients = [];
        this.stirCount = 0;
        this.isStirring = false;
        this.currentLevelStartTime = null;

        // ТАЙМЕР
        this.levelTime = 0;
        this.timeElapsed = 0;
        this.timerInterval = null;
        this.isTimerRunning = false;
        this.levelStarted = false;

        // ЛОГІКА ПЕРЕВЕРТАННЯ
        this.flipStates = {};

        // Алкогольні напої, які потрібно перевертати
        this.alcoholTypes = ['rum', 'tequila', 'whiskey', 'vodka', 'gin', 'vermouth', 'soda', 'bitters'];

        // СИСТЕМА РІВНІВ
        this.cocktails = [];

        // Завантажуємо збережені дані
        const savedData = JSON.parse(localStorage.getItem('bartenderGame')) || {};
        this.completedLevels = savedData.completedLevels || [];
        this.currentLevel = savedData.currentLevel || 1;
        this.levelStats = savedData.levelStats || {}; // Статистика по рівням
        this.totalLevels = 0;


        this.overallBestTime = savedData.overallBestTime || null;

        this.init();
    }

    async init() {
        console.log('Initializing game with Statistics system...');

        // Завантажуємо коктейлі
        await this.loadCocktails();
        this.totalLevels = this.cocktails.length;

        // Корекція поточного рівня
        if (this.currentLevel > this.totalLevels) {
            this.currentLevel = this.totalLevels;
            this.saveGameState();
        }

        // Налаштовуємо Drag & Drop
        this.setupDragAndDrop();

        // Налаштовуємо кнопки
        this.setupButtons();

        // Налаштовуємо керування перевертанням
        this.setupFlipControls();

        // Завантажуємо поточний рівень
        this.loadLevel(this.currentLevel);

        // Оновлюємо статистику
        this.updateLevelStatistics();

        console.log(`✅ Game ready! Level: ${this.currentLevel}/${this.totalLevels}`);
    }

    // ===== СТАТИСТИКА РІВНІВ =====
    updateLevelStatistics() {
        // Оновлюємо статистику для поточного рівня
        this.updateCurrentLevelStats();

        // Оновлюємо загальну статистику
        this.updateOverallStats();
    }

    updateCurrentLevelStats() {
        if (!this.currentCocktail) return;

        const levelId = this.currentLevel;
        const stats = this.levelStats[levelId] || {
            completed: false,
            bestTime: null,
            attempts: 0,
            successRate: 0,
            cocktailName: this.currentCocktail.name
        };

        // Перевіряємо чи рівень пройдено
        const isCompleted = this.completedLevels.includes(levelId);

        // Оновлюємо статистику
        this.levelStats[levelId] = {
            ...stats,
            completed: isCompleted,
            cocktailName: this.currentCocktail.name,
            lastUpdated: new Date().toISOString()
        };
    }

    updateOverallStats() {
        if (!this.gamesPlayedElement || !this.successRateElement || !this.avgTimeElement) return;

        // Рахуємо загальну статистику
        let totalAttempts = 0;
        let completedLevels = 0;
        let totalTime = 0;
        let completedTimeCount = 0;

        Object.values(this.levelStats).forEach(stats => {
            totalAttempts += stats.attempts || 0;

            if (stats.completed) {
                completedLevels++;

                if (stats.bestTime) {
                    totalTime += stats.bestTime;
                    completedTimeCount++;
                }
            }
        });

        // Оновлюємо DOM
        this.gamesPlayedElement.textContent = totalAttempts;

        // Розраховуємо успішність
        if (this.totalLevels > 0) {
            const successRate = Math.round((completedLevels / this.totalLevels) * 100);
            this.successRateElement.textContent = `${successRate}%`;

            // Змінюємо колір в залежності від відсотка
            if (successRate === 100) {
                this.successRateElement.style.color = '#4CAF50';
            } else if (successRate >= 50) {
                this.successRateElement.style.color = '#FF9800';
            } else {
                this.successRateElement.style.color = '#F44336';
            }
        } else {
            this.successRateElement.textContent = '0%';
        }

        // Розраховуємо середній час
        if (completedTimeCount > 0) {
            const avgSeconds = Math.round(totalTime / completedTimeCount);
            const minutes = Math.floor(avgSeconds / 60);
            const seconds = avgSeconds % 60;
            this.avgTimeElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        } else {
            this.avgTimeElement.textContent = '--:--';
        }

        // Зберігаємо статистику
        this.saveGameState();
    }

    recordLevelCompletion(timeTaken) {
        const levelId = this.currentLevel;

        if (!this.levelStats[levelId]) {
            this.levelStats[levelId] = {
                completed: true,
                bestTime: timeTaken,
                attempts: 1,
                successRate: 100,
                cocktailName: this.currentCocktail?.name || 'Unknown',
                lastPlayed: new Date().toISOString()
            };
        } else {
            const stats = this.levelStats[levelId];
            stats.completed = true;
            stats.attempts = (stats.attempts || 0) + 1;

            // Оновлюємо найкращий час ДЛЯ ЦЬОГО РІВНЯ
            if (!stats.bestTime || timeTaken < stats.bestTime) {
                stats.bestTime = timeTaken;
            }

            stats.successRate = 100;
            stats.lastPlayed = new Date().toISOString();
        }

        // ОНОВЛЮЄМО ЗАГАЛЬНИЙ НАЙКРАЩИЙ ЧАС (між всіма рівнями)
        if (!this.overallBestTime || timeTaken < this.overallBestTime) {
            this.overallBestTime = timeTaken;
            console.log(`🏆 НОВИЙ ЗАГАЛЬНИЙ РЕКОРД: ${this.formatTime(timeTaken)}`);

            // Показати сповіщення про новий рекорд
            this.showNewRecordNotification(timeTaken);
        }

        // Додаємо до пройдених рівнів
        if (!this.completedLevels.includes(levelId)) {
            this.completedLevels.push(levelId);
        }

        // Оновлюємо статистику
        this.updateLevelStatistics();
        this.saveGameState();

        console.log(`📊 Level ${levelId} completed in ${timeTaken}s. Stats updated.`);
    }

// ДОДАТКОВА ФУНКЦІЯ ДЛЯ СПОВІЩЕННЯ
    showNewRecordNotification(timeTaken) {
        // Можна додати візуальне сповіщення
        const formattedTime = this.formatTime(timeTaken);
        console.log(`🎉 НОВИЙ РЕКОРД ГРИ! ${formattedTime}`);

        // Або показати alert
        // alert(`🏆 НОВИЙ РЕКОРД ГРИ! ${formattedTime}`);
    }
    recordLevelFailure() {
        const levelId = this.currentLevel;

        if (!this.levelStats[levelId]) {
            this.levelStats[levelId] = {
                completed: false,
                bestTime: null,
                attempts: 1,
                successRate: 0,
                cocktailName: this.currentCocktail?.name || 'Unknown',
                lastPlayed: new Date().toISOString()
            };
        } else {
            const stats = this.levelStats[levelId];
            stats.attempts = (stats.attempts || 0) + 1;

            // Розраховуємо успішність
            const totalAttempts = stats.attempts;
            const successfulAttempts = stats.completed ? totalAttempts - 1 : 0;
            stats.successRate = Math.round((successfulAttempts / totalAttempts) * 100);
            stats.lastPlayed = new Date().toISOString();
        }

        this.updateLevelStatistics();
        this.saveGameState();

        console.log(`📊 Level ${levelId} failed. Stats updated.`);
    }

    // ===== ЗАВАНТАЖЕННЯ КОКТЕЙЛІВ =====
    async loadCocktails() {
        try {
            const response = await fetch('./cocktails.json');
            const data = await response.json();
            this.cocktails = data.cocktails;
            console.log(`Loaded ${this.cocktails.length} cocktails`);
        } catch (error) {
            console.error('Error loading cocktails:', error);
            this.loadFallbackCocktails();
        }
    }

    loadFallbackCocktails() {
        this.cocktails = [
            {
                id: 1, name: "Mojito", emoji: "🍹", timeLimit: 60,
                ingredients: [
                    { "type": "mint", "quantity": 1 },
                    { "type": "lime", "quantity": 1 },
                    { "type": "sugar", "quantity": 1 },
                    { "type": "rum", "quantity": 1 },
                    { "type": "soda", "quantity": 1 },
                    { "type": "ice", "quantity": 1 }
                ],
                requiredStirs: 3
            },
            {
                id: 2, name: "Margarita", emoji: "🍸", timeLimit: 50,
                ingredients: [
                    { "type": "tequila", "quantity": 1 },
                    { "type": "triple_sec", "quantity": 1 },
                    { "type": "lime_juice", "quantity": 1 },
                    { "type": "salt", "quantity": 1 }
                ],
                requiredStirs: 2
            },
            {
                id: 3, name: "Old Fashioned", emoji: "🥃", timeLimit: 45,
                ingredients: [
                    { "type": "whiskey", "quantity": 1 },
                    { "type": "sugar", "quantity": 1 },
                    { "type": "bitters", "quantity": 1 },
                    { "type": "orange", "quantity": 1 }
                ],
                requiredStirs: 1
            }
        ];
    }

    // ===== ЗАВАНТАЖЕННЯ РІВНЯ =====
    loadLevel(levelNumber) {
        if (levelNumber < 1) levelNumber = 1;
        if (levelNumber > this.totalLevels) {
            this.showAllLevelsCompleted();
            return;
        }

        this.currentLevel = levelNumber;
        this.currentCocktail = this.cocktails[levelNumber - 1];

        // Скидаємо стан гри
        this.resetGlass();
        this.stirCount = 0;
        this.isStirring = false;

        // Скидаємо перевертання
        this.flipStates = {};
        this.updateAllFlipStates();

        // ТАЙМЕР
        this.stopTimer();
        this.timeElapsed = 0;
        this.levelStarted = false;
        this.levelTime = this.currentCocktail.timeLimit || 60;

        // Оновлюємо інтерфейс
        this.updateUI();

        // Оновлюємо кнопки
        this.updateNextButton();
        this.updateStartButton();

        // Оновлюємо статистику для цього рівня
        this.updateCurrentLevelStats();

        // Зберігаємо час початку рівня
        this.currentLevelStartTime = Date.now();

        // Зберігаємо стан
        this.saveGameState();

        console.log(`📈 Level ${levelNumber} loaded: ${this.currentCocktail.name}`);
    }

    showAllLevelsCompleted() {
        // Показуємо детальну статистику
        let statsMessage = '📊 YOUR FINAL STATISTICS:\n\n';

        for (let i = 1; i <= this.totalLevels; i++) {
            const stats = this.levelStats[i] || {};
            const levelName = this.cocktails[i-1]?.name || `Level ${i}`;
            const bestTime = stats.bestTime ? this.formatTime(stats.bestTime) : 'Not completed';
            const attempts = stats.attempts || 0;
            const successRate = stats.successRate || 0;

            statsMessage += `${i}. ${levelName}:\n`;
            statsMessage += `   Best time: ${bestTime}\n`;
            statsMessage += `   Attempts: ${attempts}\n`;
            statsMessage += `   Success: ${successRate}%\n\n`;
        }

        alert(`🎉 CONGRATULATIONS!\n\nYou have completed ALL levels!\n\n${statsMessage}\nClick "Restart" to play again from level 1.`);

        this.currentLevel = 1;
        this.completedLevels = [];
        this.saveGameState();
        this.loadLevel(1);
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    // ===== ЗБЕРІГАННЯ СТАНУ ГРИ =====
    saveGameState() {
        const gameState = {
            currentLevel: this.currentLevel,
            completedLevels: this.completedLevels,
            levelStats: this.levelStats,
            overallBestTime: this.overallBestTime, // ← ДОДАЄМО
            lastSave: new Date().toISOString()
        };
        localStorage.setItem('bartenderGame', JSON.stringify(gameState));
    }

    updateUI() {
        if (!this.currentCocktail) return;

        const cocktailElement = document.getElementById('current-cocktail');
        if (cocktailElement) {
            cocktailElement.innerHTML = `${this.currentCocktail.emoji} ${this.currentCocktail.name}`;
        }

        const levelElement = document.getElementById('current-level');
        if (levelElement) {
            levelElement.textContent = `${this.currentLevel}/${this.totalLevels}`;
        }

        this.updateTimerDisplay();
        this.updateRecipeList();
        this.updateLevelProgress();
        this.updateStartButton();

        // Показуємо статистику для поточного рівня
        this.showCurrentLevelStats();
    }

    showCurrentLevelStats() {
        const bestTimeElement = document.getElementById('best-time');

        if (this.overallBestTime) {
            // ↓↓↓ ПОКАЗУЄМО ЗАГАЛЬНИЙ BEST, а не для рівня
            bestTimeElement.textContent = this.formatTime(this.overallBestTime);
        } else {
            bestTimeElement.textContent = '--:--';
        }
    }

    // ===== ТАЙМЕР =====
    startTimer() {
        if (this.isTimerRunning) return;

        this.isTimerRunning = true;
        this.levelStarted = true;

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

    updateTimerDisplay() {
        if (!this.timerElement) return;

        const timeLeft = Math.max(0, this.levelTime - this.timeElapsed);
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;

        this.timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    timeOut() {
        this.stopTimer();
        this.recordLevelFailure();
        alert(`⏱️ TIME'S UP!\n\nLevel ${this.currentLevel} failed!\n\nYou ran out of time (${this.levelTime}s).`);
        this.resetGlass();
        this.levelStarted = false;
        this.updateStartButton();
    }

    updateStartButton() {
        if (!this.startBtn) return;

        if (this.levelStarted && this.isTimerRunning) {
            this.startBtn.disabled = true;
            this.startBtn.innerHTML = '⏱️ Time Running...';
        } else if (this.levelStarted && !this.isTimerRunning) {
            this.startBtn.disabled = true;
            this.startBtn.innerHTML = 'Level Completed';
        } else {
            this.startBtn.disabled = false;
            this.startBtn.innerHTML = '🎮 Start Level';
        }
    }

    // ===== ЛОГІКА ПЕРЕВЕРТАННЯ =====
    setupFlipControls() {
        this.ingredients.forEach(ing => {
            ing.addEventListener('dblclick', (e) => {
                e.preventDefault();
                const type = ing.dataset.type;
                if (this.alcoholTypes.includes(type)) {
                    this.toggleFlip(type);
                }
            });

            ing.addEventListener('contextmenu', (e) => {
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
        this.ingredients.forEach(ingredient => {
            if (ingredient.dataset.type === type) {
                const isFlipped = this.flipStates[type] || false;

                if (isFlipped) {
                    ingredient.classList.add('flipped');
                    ingredient.style.transform = 'rotate(180deg)';
                } else {
                    ingredient.classList.remove('flipped');
                    ingredient.style.transform = '';
                }
            }
        });
    }

    updateAllFlipStates() {
        this.ingredients.forEach(ingredient => {
            const type = ingredient.dataset.type;

            if (this.alcoholTypes.includes(type)) {
                const isFlipped = this.flipStates[type] || false;

                if (isFlipped) {
                    ingredient.classList.add('flipped');
                    ingredient.style.transform = 'rotate(180deg)';
                } else {
                    ingredient.classList.remove('flipped');
                    ingredient.style.transform = '';
                }
            }
        });
    }

    // ===== DRAG & DROP =====
    setupDragAndDrop() {
        this.ingredients.forEach(ingredient => {
            ingredient.addEventListener('dragstart', (e) => {
                if (!this.levelStarted || !this.isTimerRunning) {
                    e.preventDefault();
                    return;
                }

                const type = ingredient.dataset.type;
                const isFlipped = this.flipStates[type] || false;

                e.dataTransfer.setData('text/plain', JSON.stringify({
                    type: type,
                    isFlipped: isFlipped
                }));

                ingredient.style.opacity = '0.7';
            });

            ingredient.addEventListener('dragend', (e) => {
                ingredient.style.opacity = '1';
            });
        });

        this.glass.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.glass.classList.add('drop-ready');
        });

        this.glass.addEventListener('dragleave', (e) => {
            this.glass.classList.remove('drop-ready');
        });

        this.glass.addEventListener('drop', (e) => {
            e.preventDefault();
            this.glass.classList.remove('drop-ready');

            if (!this.levelStarted || !this.isTimerRunning) return;

            try {
                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                if (data.type) {
                    this.addIngredientToGlass(data.type, data.isFlipped);
                }
            } catch (error) {
                console.error('Error parsing drag data:', error);
            }
        });
    }

    addIngredientToGlass(type, isFlipped) {
        if (this.addedIngredients.length >= 8) return;

        if (this.alcoholTypes.includes(type) && !isFlipped) {
            alert(`🔄 You must FLIP ${type.toUpperCase()} bottle upside down first!\n\nDouble-click or right-click to flip.`);
            return;
        }

        const element = document.createElement('div');
        element.className = 'glass-ingredient';
        element.textContent = type.toUpperCase();
        element.dataset.type = type;

        element.style.transform = '';

        if (isFlipped && this.alcoholTypes.includes(type)) {
            element.classList.add('was-flipped');

            const flipBadge = document.createElement('span');
            flipBadge.className = 'flip-badge';
            flipBadge.title = 'This was poured from upside down bottle';
            element.appendChild(flipBadge);
        }

        const pos = this.calculateIngredientPosition();
        element.style.left = `${pos.x}%`;
        element.style.top = `${pos.y}%`;

        element.style.animation = 'popIn 0.5s ease';

        this.glassContent.appendChild(element);
        this.addedIngredients.push({
            type: type,
            element: element,
            wasFlipped: isFlipped
        });

        this.updateProgress();
        console.log(`✅ Added ${type} (was flipped: ${isFlipped})`);
    }

    calculateIngredientPosition() {
        const total = this.addedIngredients.length;
        if (total === 0) return { x: 40, y: 70 };

        const layer = Math.floor(total / 2);
        const side = total % 2;

        let x, y;
        if (side === 0) {
            x = 25 + Math.random() * 10;
            y = 60 - (layer * 15);
        } else {
            x = 55 + Math.random() * 10;
            y = 60 - (layer * 15);
        }

        return {
            x: Math.max(15, Math.min(85, x)),
            y: Math.max(20, Math.min(80, y))
        };
    }

    // ===== ПЕРЕВІРКА РІШЕННЯ =====
    checkSolution() {
        if (!this.levelStarted) {
            alert('❌ Start the level first!');
            return;
        }

        if (!this.isTimerRunning) {
            alert('❌ Time is up or level not started!');
            return;
        }

        if (!this.currentCocktail) {
            alert('❌ No cocktail loaded!');
            return;
        }

        if (this.addedIngredients.length === 0) {
            alert('❌ Glass is empty!');
            return;
        }

        const ingredientsCorrect = this.checkIngredients();
        const stirsCorrect = this.checkStirs();

        if (ingredientsCorrect && stirsCorrect) {
            this.levelCompleted();
        } else {
            this.levelFailed(ingredientsCorrect, stirsCorrect);
        }
    }

    checkIngredients() {
        const required = this.currentCocktail.ingredients;
        const added = this.addedIngredients;

        const addedCounts = {};
        const flippedCounts = {};

        added.forEach(ing => {
            addedCounts[ing.type] = (addedCounts[ing.type] || 0) + 1;
            if (ing.wasFlipped) {
                flippedCounts[ing.type] = (flippedCounts[ing.type] || 0) + 1;
            }
        });

        for (const req of required) {
            const addedQty = addedCounts[req.type] || 0;

            if (addedQty < req.quantity) {
                console.log(`❌ Missing ${req.type}`);
                return false;
            }

            if (this.alcoholTypes.includes(req.type)) {
                const flippedQty = flippedCounts[req.type] || 0;
                if (flippedQty < req.quantity) {
                    alert(`❌ ${req.type.toUpperCase()} must be poured from FLIPPED bottle!`);
                    return false;
                }
            }
        }

        console.log('✅ All ingredients correct!');
        return true;
    }

    checkStirs() {
        const required = this.currentCocktail.requiredStirs || 3;
        const actual = this.stirCount;
        const isCorrect = Math.abs(actual - required) <= 1;
        return isCorrect;
    }

    levelCompleted() {
        this.stopTimer();

        // Записуємо успішне завершення
        this.recordLevelCompletion(this.timeElapsed);

        this.updateLevelProgress();
        this.updateNextButton();
        this.updateStartButton();

        let message = `✅ Level ${this.currentLevel} completed in ${this.formatTime(this.timeElapsed)}!`;

        // Показуємо найкращий час
        const stats = this.levelStats[this.currentLevel];
        if (stats && stats.bestTime) {
            const previousBest = stats.bestTime;
            if (this.timeElapsed < previousBest) {
                message += `\n\n🏆 NEW BEST TIME! (Previous: ${this.formatTime(previousBest)})`;
            } else {
                message += `\n\n⏱️ Best time: ${this.formatTime(previousBest)}`;
            }
        }

        if (this.currentLevel < this.totalLevels) {
            message += `\n\nClick "Next" for level ${this.currentLevel + 1}`;
        } else {
            message += `\n\n🎉 You completed ALL levels!`;
        }

        alert(message);
    }

    levelFailed(ingredientsCorrect, stirsCorrect) {
        this.recordLevelFailure();

        let message = '❌ ';
        if (!ingredientsCorrect && !stirsCorrect) {
            message += 'Wrong ingredients and wrong stirring!';
        } else if (!ingredientsCorrect) {
            message += 'Wrong ingredients!';
        } else if (!stirsCorrect) {
            message += 'Wrong stirring!';
        }

        message += '\n\nTry again!';
        alert(message);
    }

    // ===== МІШАННЯ =====
    stirGlass() {
        if (this.addedIngredients.length === 0) {
            alert('❌ Glass is empty!');
            return;
        }

        if (this.isStirring) return;

        this.isStirring = true;
        this.stirCount++;

        this.glass.classList.add('stirring');
        this.mixIngredients();

        setTimeout(() => {
            this.glass.classList.remove('stirring');
            this.isStirring = false;
        }, 800);
    }

    mixIngredients() {
        this.addedIngredients.forEach(ingredient => {
            if (ingredient.element) {
                const moveX = (Math.random() * 10 - 5);
                const moveY = (Math.random() * 10 - 5);

                const currentLeft = parseFloat(ingredient.element.style.left);
                const currentTop = parseFloat(ingredient.element.style.top);

                const newLeft = Math.max(10, Math.min(85, currentLeft + moveX));
                const newTop = Math.max(15, Math.min(85, currentTop + moveY));

                ingredient.element.style.left = `${newLeft}%`;
                ingredient.element.style.top = `${newTop}%`;

                const rotation = (Math.random() * 30 - 15);
                ingredient.element.style.transform = `rotate(${rotation}deg)`;
            }
        });
    }

    // ===== КНОПКИ =====
    setupButtons() {
        if (this.startBtn) {
            this.startBtn.addEventListener('click', () => {
                this.startLevel();
            });
        }

        const resetBtn = document.getElementById('btn-reset');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (this.levelStarted && this.isTimerRunning) {
                    if (confirm('Reset glass?')) {
                        this.resetGlass();
                    }
                } else {
                    this.resetGlass();
                }
            });
        }

        const checkBtn = document.getElementById('btn-check');
        if (checkBtn) {
            checkBtn.addEventListener('click', () => {
                this.checkSolution();
            });
        }

        const hintBtn = document.getElementById('btn-hint');
        if (hintBtn) {
            hintBtn.addEventListener('click', () => {
                alert('💡 Add all ingredients from the recipe and stir correct number of times');
            });
        }

        const stirBtn = document.getElementById('btn-stir');
        if (stirBtn) {
            stirBtn.addEventListener('click', () => {
                if (!this.levelStarted || !this.isTimerRunning) return;
                this.stirGlass();
            });
        }

        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => {
                this.nextLevel();
            });
        }

        const solutionBtn = document.getElementById('btn-solution');
        if (solutionBtn) {
            solutionBtn.addEventListener('click', () => {
                this.showSolution();
            });
        }

        const restartBtn = document.getElementById('btn-restart');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                if (confirm('Restart game from level 1? All statistics will be lost.')) {
                    this.restartGame();
                }
            });
        }

        // Кнопка перегляду статистики
        const statsBtn = document.getElementById('btn-stats');
        if (statsBtn) {
            statsBtn.addEventListener('click', () => {
                this.showDetailedStatistics();
            });
        }
    }

    showDetailedStatistics() {
        let statsMessage = '📊 DETAILED STATISTICS:\n\n';

        for (let i = 1; i <= this.totalLevels; i++) {
            const stats = this.levelStats[i] || {};
            const levelName = this.cocktails[i-1]?.name || `Level ${i}`;
            const completed = stats.completed ? '✅' : '❌';
            const bestTime = stats.bestTime ? this.formatTime(stats.bestTime) : '--:--';
            const attempts = stats.attempts || 0;
            const successRate = stats.successRate || 0;

            statsMessage += `${completed} ${i}. ${levelName}\n`;
            statsMessage += `   Best time: ${bestTime}\n`;
            statsMessage += `   Attempts: ${attempts}\n`;
            statsMessage += `   Success: ${successRate}%\n\n`;
        }

        // Загальна статистика
        const totalAttempts = Object.values(this.levelStats).reduce((sum, stats) => sum + (stats.attempts || 0), 0);
        const completedLevels = Object.values(this.levelStats).filter(stats => stats.completed).length;
        const overallSuccess = this.totalLevels > 0 ? Math.round((completedLevels / this.totalLevels) * 100) : 0;

        statsMessage += `📈 OVERALL:\n`;
        statsMessage += `   Levels completed: ${completedLevels}/${this.totalLevels}\n`;
        statsMessage += `   Total attempts: ${totalAttempts}\n`;
        statsMessage += `   Overall success: ${overallSuccess}%`;

        alert(statsMessage);
    }

    // ===== ДОПОМІЖНІ МЕТОДИ =====
    updateProgress() {
        if (!this.currentCocktail) return;

        const target = this.currentCocktail.ingredients.length;
        const current = this.addedIngredients.length;
        const progress = (current / target) * 100;

        const fill = document.getElementById('progress-fill');
        const text = document.getElementById('progress-text');

        if (fill) fill.style.width = `${progress}%`;
        if (text) text.textContent = `${Math.round(progress)}%`;
    }

    updateRecipeList() {
        const recipeList = document.getElementById('recipe-list');
        if (!recipeList || !this.currentCocktail) return;

        recipeList.innerHTML = '';

        this.currentCocktail.ingredients.forEach(ing => {
            const li = document.createElement('li');
            li.className = 'recipe-step';

            const needsFlip = this.alcoholTypes.includes(ing.type);
            const flipIcon = needsFlip ? ' 🔄' : '';

            li.textContent = `Add ${ing.type}${flipIcon}`;
            recipeList.appendChild(li);
        });

        const requiredStirs = this.currentCocktail.requiredStirs || 3;
        const stirLi = document.createElement('li');
        stirLi.className = 'recipe-step stir-step';

        let stirEmojis = '';
        for (let i = 0; i < requiredStirs; i++) {
            stirEmojis += '🔄 ';
        }

        stirLi.innerHTML = `
            <div class="stir-instruction">
                <span class="stir-emoji">${stirEmojis}</span>
                <span class="stir-text">Stir ${requiredStirs} times</span>
            </div>
        `;

        recipeList.appendChild(stirLi);
    }

    updateLevelProgress() {
        const levels = document.querySelectorAll('.level');
        const completedCount = document.getElementById('completed-levels');

        levels.forEach((level, index) => {
            level.classList.remove('completed', 'current');

            const levelNumber = index + 1;
            if (this.completedLevels.includes(levelNumber)) {
                level.classList.add('completed');
            }

            if (levelNumber === this.currentLevel) {
                level.classList.add('current');
            }
        });

        if (completedCount) {
            completedCount.textContent = this.completedLevels.length;
        }
    }

    updateNextButton() {
        if (!this.nextBtn) return;

        const isLevelCompleted = this.completedLevels.includes(this.currentLevel);
        const isLastLevel = this.currentLevel >= this.totalLevels;

        if (isLevelCompleted && !isLastLevel) {
            this.nextBtn.disabled = false;
        } else {
            this.nextBtn.disabled = true;
            if (isLastLevel && isLevelCompleted) {
                this.nextBtn.innerHTML = '🎉 All Done!';
            }
        }
    }

    // ===== СТАРТ РІВНЯ =====
    startLevel() {
        if (this.completedLevels.includes(this.currentLevel)) {
            alert('✅ This level is already completed!');
            return;
        }

        if (this.levelStarted && this.isTimerRunning) {
            alert('⚠️ Level already in progress!');
            return;
        }

        this.resetGlass();
        this.startTimer();
        this.updateStartButton();

        alert(`🎮 Level ${this.currentLevel} started!\n\nTime limit: ${this.levelTime} seconds`);
    }

    restartGame() {
        this.stopTimer();
        this.currentLevel = 1;
        this.completedLevels = [];
        this.levelStats = {};
        this.saveGameState();
        this.loadLevel(1);
        this.updateLevelStatistics();
        alert('🔄 Game restarted from level 1! Statistics cleared.');
    }

    showSolution() {
        if (!this.currentCocktail) return;

        const requiredStirs = this.currentCocktail.requiredStirs || 3;
        const ingredients = this.currentCocktail.ingredients.map(i => {
            const needsFlip = this.alcoholTypes.includes(i.type);
            return `${i.type}${needsFlip ? ' (FLIPPED)' : ''}`;
        }).join(', ');

        alert(`📖 Solution:\n\nIngredients: ${ingredients}\nStir: ${requiredStirs} times\nTime limit: ${this.levelTime}s`);
    }

    nextLevel() {
        if (!this.completedLevels.includes(this.currentLevel)) {
            alert('❌ Complete current level first!');
            return;
        }

        if (this.currentLevel >= this.totalLevels) {
            alert('🎉 You have completed all levels!');
            return;
        }

        this.currentLevel++;
        this.loadLevel(this.currentLevel);
    }

    resetGlass() {
        this.addedIngredients.forEach(ingredient => {
            if (ingredient.element) {
                ingredient.element.remove();
            }
        });

        this.addedIngredients = [];
        this.stirCount = 0;
        this.updateProgress();
    }
}

// ===== ЗАПУСК ГРИ =====
document.addEventListener('DOMContentLoaded', () => {
    try {
        const game = new BartenderGame();
        window.game = game;

        console.log('Game commands:');
        console.log('- window.game.showDetailedStatistics() - show detailed stats');

    } catch (error) {
        console.error('Game failed:', error);
        alert('Game initialization failed.');
    }
});