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
