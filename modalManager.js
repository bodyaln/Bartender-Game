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
        [{ text: "OK", className: "bartender__btn--start", value: true }],
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
          { text: "Cancel", className: "bartender__btn--cancel", value: false },
          { text: "Reset", className: "bartender__btn--reset", value: true },
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
