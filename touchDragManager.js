class TouchDragManager {
  constructor(app) {
    this.app = app;
    this.activeDrag = false;
    this.selectedElement = null;
    this.dragClone = null;
    this.initialX = 0;
    this.initialY = 0;
    this.elementOffsetX = 0;
    this.elementOffsetY = 0;
    this.currentIngredient = null;
    this.touchIdentifier = null;
    this.draggingStarted = false;
    this.minDragDistance = 8;
    this.dragStartTimestamp = 0;
    this.lastTouchPoint = { x: 0, y: 0 };
    this.supportsTouch = this.detectTouchSupport();
    this.handlers = {
      start: this.handleStart.bind(this),
      end: this.handleEnd.bind(this),
      move: this.handleMove.bind(this),
      cancel: this.handleCancel.bind(this),
      glassMove: this.handleGlassMove.bind(this),
      glassEnd: this.handleGlassEnd.bind(this),
      glassLeave: this.handleGlassLeave.bind(this),
      globalEnd: this.handleGlobalEnd.bind(this),
      windowResize: this.handleResize.bind(this),
    };
    window.addEventListener("resize", this.handlers.windowResize);
  }

  detectTouchSupport() {
    return (
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0 ||
      /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) ||
      (window.innerWidth <= 768 && "maxTouchPoints" in navigator)
    );
  }

  initializeTouch() {
    this.cleanupListeners();
    this.supportsTouch = this.detectTouchSupport();
    if (!this.supportsTouch) return;
    this.applyTouchStyles();
    this.bindIngredientListeners();
    this.bindGlassListeners();
    this.bindDocumentListeners();
  }

  applyTouchStyles() {
    if (this.app.glass) this.app.glass.style.touchAction = "none";
    this.app.ingredients.forEach((item) => {
      item.style.touchAction = "none";
      item.style.userSelect = "none";
      item.style.webkitUserSelect = "none";
      item.style.msUserSelect = "none";
    });
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";
    document.body.style.msUserSelect = "none";
  }

  bindIngredientListeners() {
    this.app.ingredients.forEach((item) => {
      item.addEventListener("touchstart", this.handlers.start, {
        passive: false,
      });
      item.addEventListener("touchend", this.handlers.end, { passive: true });
      item.addEventListener("touchmove", this.handlers.move, {
        passive: false,
      });
      item.addEventListener("touchcancel", this.handlers.cancel, {
        passive: true,
      });
    });
  }

  bindGlassListeners() {
    if (!this.app.glass) return;
    this.app.glass.addEventListener("touchmove", this.handlers.glassMove, {
      passive: false,
    });
    this.app.glass.addEventListener("touchend", this.handlers.glassEnd, {
      passive: true,
    });
    this.app.glass.addEventListener("touchleave", this.handlers.glassLeave, {
      passive: true,
    });
  }

  bindDocumentListeners() {
    document.addEventListener("touchend", this.handlers.globalEnd, {
      passive: true,
    });
    document.addEventListener("touchcancel", this.handlers.globalEnd, {
      passive: true,
    });
  }

  cleanupListeners() {
    this.app.ingredients.forEach((item) => {
      item.removeEventListener("touchstart", this.handlers.start);
      item.removeEventListener("touchend", this.handlers.end);
      item.removeEventListener("touchmove", this.handlers.move);
      item.removeEventListener("touchcancel", this.handlers.cancel);
    });
    if (this.app.glass) {
      this.app.glass.removeEventListener("touchmove", this.handlers.glassMove);
      this.app.glass.removeEventListener("touchend", this.handlers.glassEnd);
      this.app.glass.removeEventListener(
        "touchleave",
        this.handlers.glassLeave
      );
    }
    document.removeEventListener("touchend", this.handlers.globalEnd);
    document.removeEventListener("touchcancel", this.handlers.globalEnd);
  }

  handleResize() {
    if (this.app.levelStarted) this.initializeTouch();
  }

  handleStart(e) {
    e.preventDefault();
    if (this.activeDrag || e.touches.length > 1) return;
    if (!this.app.levelStarted || !this.app.isTimerRunning) return;
    const touchPoint = e.touches[0];
    this.touchIdentifier = touchPoint.identifier;
    this.initialX = touchPoint.clientX;
    this.initialY = touchPoint.clientY;
    this.dragStartTimestamp = Date.now();
    this.draggingStarted = true;
    this.lastTouchPoint = { x: touchPoint.clientX, y: touchPoint.clientY };
    const ingredient = e.currentTarget;
    const ingredientType = ingredient.dataset.type;
    const isFlipped = this.app.flipStates[ingredientType] || false;
    this.currentIngredient = { type: ingredientType, flipped: isFlipped };
    this.selectedElement = ingredient;
    ingredient.style.opacity = "0.7";
    ingredient.style.transform = "scale(0.95)";
  }

  handleMove(e) {
    if (!this.draggingStarted || !this.currentIngredient) return;
    const touchPoint = Array.from(e.touches).find(
      (t) => t.identifier === this.touchIdentifier
    );
    if (!touchPoint) return;
    e.preventDefault();
    const distanceX = Math.abs(touchPoint.clientX - this.initialX);
    const distanceY = Math.abs(touchPoint.clientY - this.initialY);
    if (
      !this.activeDrag &&
      (distanceX > this.minDragDistance || distanceY > this.minDragDistance)
    ) {
      this.activeDrag = true;
      const rect = this.selectedElement.getBoundingClientRect();
      this.elementOffsetX = touchPoint.clientX - rect.left;
      this.elementOffsetY = touchPoint.clientY - rect.top;
      this.createDragPreview(
        this.selectedElement,
        touchPoint.clientX,
        touchPoint.clientY
      );
    }
    if (this.activeDrag && this.dragClone) {
      this.dragClone.style.left = `${
        touchPoint.clientX - this.elementOffsetX
      }px`;
      this.dragClone.style.top = `${
        touchPoint.clientY - this.elementOffsetY
      }px`;
      this.lastTouchPoint = { x: touchPoint.clientX, y: touchPoint.clientY };
      const glassRect = this.app.glass.getBoundingClientRect();
      const overGlass =
        touchPoint.clientX >= glassRect.left &&
        touchPoint.clientX <= glassRect.right &&
        touchPoint.clientY >= glassRect.top &&
        touchPoint.clientY <= glassRect.bottom;
      if (overGlass) {
        this.app.glass.classList.add("bartender__glass--drop-ready");
      } else {
        this.app.glass.classList.remove("bartender__glass--drop-ready");
      }
    }
  }

  handleEnd(e) {
    const touchPoint = Array.from(e.changedTouches).find(
      (t) => t.identifier === this.touchIdentifier
    );
    if (!touchPoint || !this.draggingStarted) return;
    if (this.activeDrag) {
      const glassRect = this.app.glass.getBoundingClientRect();
      const overGlass =
        touchPoint.clientX >= glassRect.left &&
        touchPoint.clientX <= glassRect.right &&
        touchPoint.clientY >= glassRect.top &&
        touchPoint.clientY <= glassRect.bottom;
      if (overGlass && this.currentIngredient) {
        this.app.addIngredientToGlass(
          this.currentIngredient.type,
          this.currentIngredient.flipped
        );
      }
      this.clearDragPreview();
    } else if (this.selectedElement) {
      this.selectedElement.style.opacity = "1";
      this.selectedElement.style.transform = "";
    }
    this.resetDraggingState();
  }

  handleCancel(e) {
    if (!this.draggingStarted) return;
    const touchPoint = Array.from(e.changedTouches).find(
      (t) => t.identifier === this.touchIdentifier
    );
    if (!touchPoint) return;
    this.clearDragPreview();
    this.resetDraggingState();
  }

  handleGlassMove(e) {
    if (!this.activeDrag) return;
    const touchPoint = Array.from(e.touches).find(
      (t) => t.identifier === this.touchIdentifier
    );
    if (!touchPoint) return;
    e.preventDefault();
    const glassRect = this.app.glass.getBoundingClientRect();
    const overGlass =
      touchPoint.clientX >= glassRect.left &&
      touchPoint.clientX <= glassRect.right &&
      touchPoint.clientY >= glassRect.top &&
      touchPoint.clientY <= glassRect.bottom;
    if (overGlass) {
      this.app.glass.classList.add("bartender__glass--drop-ready");
    } else {
      this.app.glass.classList.remove("bartender__glass--drop-ready");
    }
  }

  handleGlassEnd(e) {
    const touchPoint = Array.from(e.changedTouches).find(
      (t) => t.identifier === this.touchIdentifier
    );
    if (!touchPoint || !this.activeDrag) return;
    const glassRect = this.app.glass.getBoundingClientRect();
    const overGlass =
      touchPoint.clientX >= glassRect.left &&
      touchPoint.clientX <= glassRect.right &&
      touchPoint.clientY >= glassRect.top &&
      touchPoint.clientY <= glassRect.bottom;
    if (overGlass && this.currentIngredient) {
      this.app.addIngredientToGlass(
        this.currentIngredient.type,
        this.currentIngredient.flipped
      );
    }
    this.clearDragPreview();
    this.resetDraggingState();
  }

  handleGlassLeave(e) {
    if (!this.activeDrag) return;
    const touchPoint = Array.from(e.changedTouches).find(
      (t) => t.identifier === this.touchIdentifier
    );
    if (!touchPoint) return;
    this.app.glass.classList.remove("bartender__glass--drop-ready");
  }

  handleGlobalEnd(e) {
    if (this.activeDrag) {
      const touchPoint = Array.from(e.changedTouches).find(
        (t) => t.identifier === this.touchIdentifier
      );
      if (touchPoint) {
        this.clearDragPreview();
        this.resetDraggingState();
      }
    }
  }

  createDragPreview(element, x, y) {
    this.dragClone = element.cloneNode(true);
    Object.assign(this.dragClone.style, {
      position: "fixed",
      left: `${x - this.elementOffsetX}px`,
      top: `${y - this.elementOffsetY}px`,
      width: `${element.offsetWidth}px`,
      height: `${element.offsetHeight}px`,
      zIndex: "1000",
      pointerEvents: "none",
      opacity: "0.8",
      boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
      transition: "none",
      transform: "scale(1.1)",
    });
    this.dragClone.classList.add("bartender__drag-clone");
    document.body.appendChild(this.dragClone);
    setTimeout(() => {
      if (this.dragClone) {
        this.dragClone.style.transition = "transform 0.1s";
        this.dragClone.style.transform = "scale(1)";
      }
    }, 10);
  }

  clearDragPreview() {
    if (this.dragClone) {
      this.dragClone.style.transition = "opacity 0.2s, transform 0.2s";
      this.dragClone.style.opacity = "0";
      this.dragClone.style.transform = "scale(0.9)";
      setTimeout(() => {
        if (this.dragClone && this.dragClone.parentNode) {
          this.dragClone.remove();
          this.dragClone = null;
        }
      }, 200);
    }
    if (this.selectedElement) {
      this.selectedElement.style.opacity = "1";
      this.selectedElement.style.transform = "";
      this.selectedElement = null;
    }
    this.app.glass.classList.remove("bartender__glass--drop-ready");
  }

  resetDraggingState() {
    this.draggingStarted = false;
    this.activeDrag = false;
    this.currentIngredient = null;
    this.touchIdentifier = null;
  }

  refreshTouchSystem() {
    this.clearDragPreview();
    this.resetDraggingState();
    this.initializeTouch();
  }

  destroy() {
    this.cleanupListeners();
    window.removeEventListener("resize", this.handlers.windowResize);
    if (this.dragClone && this.dragClone.parentNode) this.dragClone.remove();
    document.body.style.userSelect = "";
    document.body.style.webkitUserSelect = "";
    document.body.style.msUserSelect = "";
    if (this.app.glass) this.app.glass.style.touchAction = "";
    this.app.ingredients.forEach((item) => {
      item.style.touchAction = "";
      item.style.userSelect = "";
      item.style.webkitUserSelect = "";
      item.style.msUserSelect = "";
    });
  }
}
