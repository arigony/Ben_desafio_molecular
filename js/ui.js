(function () {
  "use strict";

  class BenUI {
    constructor() {
      this.screens = [...document.querySelectorAll(".screen")];
      this.elements = {
        score: document.getElementById("score-value"),
        timer: document.getElementById("timer-value"),
        found: document.getElementById("found-value"),
        list: document.getElementById("shopping-list"),
        cartDots: [...document.querySelectorAll("#cart-dots i")],
        prompt: document.getElementById("interaction-prompt"),
        promptText: document.querySelector("#interaction-prompt span"),
        feedback: document.getElementById("feedback-modal"),
        feedbackStatus: document.getElementById("feedback-status"),
        feedbackIcon: document.getElementById("feedback-icon"),
        feedbackResult: document.getElementById("feedback-result"),
        feedbackTitle: document.getElementById("feedback-title"),
        feedbackExplanation: document.getElementById("feedback-explanation"),
        feedbackCompound: document.getElementById("feedback-compound"),
        feedbackFunction: document.getElementById("feedback-function"),
        feedbackFormula: document.getElementById("feedback-formula"),
        feedbackStructure: document.getElementById("feedback-structure"),
        feedbackPoints: document.getElementById("feedback-points"),
        feedbackContinue: document.getElementById("feedback-continue-button"),
        pauseModal: document.getElementById("pause-modal"),
        pauseButton: document.getElementById("pause-button"),
        muteButton: document.getElementById("mute-button"),
        description: document.getElementById("canvas-description")
      };
      this.game = null;
      this.pendingCompletion = false;
      this.lastFocused = null;
      this.bindNavigation();
    }

    attachGame(game) {
      this.game = game;
      this.bindGameControls();
    }

    bindNavigation() {
      document.getElementById("start-button").addEventListener("click", () => this.showScreen("instructions-screen"));
      document
        .getElementById("open-instructions-button")
        .addEventListener("click", () => this.showScreen("instructions-screen"));
      document
        .getElementById("instructions-continue-button")
        .addEventListener("click", () => this.showScreen("mission-screen"));
      document.querySelectorAll("[data-back]").forEach((button) => {
        button.addEventListener("click", () => this.showScreen(button.dataset.back));
      });
      document.getElementById("review-mission-button").addEventListener("click", () => this.showScreen("mission-screen"));
    }

    bindGameControls() {
      document.getElementById("mission-start-button").addEventListener("click", () => this.game.start());
      this.elements.feedbackContinue.addEventListener("click", () => {
        this.closeFeedback();
        if (this.pendingCompletion) {
          this.pendingCompletion = false;
          this.game.presentCompletion();
        } else {
          this.game.resumeAfterOverlay();
        }
      });
      this.elements.pauseButton.addEventListener("click", () => this.game.togglePause());
      document.getElementById("resume-button").addEventListener("click", () => this.game.togglePause(false));
      document.getElementById("restart-from-pause-button").addEventListener("click", () => {
        this.hidePause();
        this.game.start();
      });
      this.elements.muteButton.addEventListener("click", () => this.game.toggleMute());
      document.getElementById("go-to-checkout-button").addEventListener("click", () => this.game.continueToCheckout());
      document.getElementById("play-again-button").addEventListener("click", () => this.game.start());
    }

    showScreen(id) {
      this.screens.forEach((screen) => {
        const active = screen.id === id;
        screen.classList.toggle("active", active);
        screen.setAttribute("aria-hidden", active ? "false" : "true");
      });
      const activeScreen = document.getElementById(id);
      const heading = activeScreen?.querySelector("h1, h2");
      if (heading && id !== "game-screen") {
        heading.setAttribute("tabindex", "-1");
        requestAnimationFrame(() => heading.focus({ preventScroll: true }));
      }
    }

    reset() {
      this.pendingCompletion = false;
      this.elements.score.textContent = "000";
      this.elements.timer.textContent = "00:00";
      this.elements.found.textContent = "0";
      this.elements.prompt.hidden = true;
      this.elements.list.querySelectorAll("li").forEach((item) => {
        item.classList.remove("found");
        item.querySelector(":scope > span").textContent = "?";
        item.querySelector("strong").textContent = "Item misterioso";
        item.querySelector("small").textContent = "Encontre no mercado";
      });
      this.elements.cartDots.forEach((dot) => dot.classList.remove("filled"));
      this.hidePause();
      this.closeFeedback();
    }

    updateHUD(state) {
      this.elements.score.textContent = String(state.score).padStart(3, "0");
      this.elements.timer.textContent = this.formatTime(state.elapsed);
      this.elements.found.textContent = String(state.found.length);
    }

    markFound(product, count) {
      const item = this.elements.list.querySelector(`[data-item="${product.id}"]`);
      if (item) {
        item.classList.add("found");
        item.querySelector(":scope > span").textContent = "✓";
        item.querySelector("strong").textContent = product.name;
        item.querySelector("small").textContent = product.structure;
      }
      this.elements.cartDots.slice(0, count).forEach((dot) => dot.classList.add("filled"));
    }

    setPrompt(visible, label = "Pressione para colocar no carrinho") {
      this.elements.prompt.hidden = !visible;
      this.elements.promptText.textContent = label;
    }

    setDescription(text) {
      this.elements.description.textContent = text;
    }

    showFeedback(product, points, willComplete) {
      this.pendingCompletion = willComplete;
      this.lastFocused = document.activeElement;
      const status = this.elements.feedbackStatus;
      status.classList.toggle("wrong", !product.correct);
      this.elements.feedbackIcon.textContent = product.correct ? "✓" : "×";
      this.elements.feedbackResult.textContent = product.correct ? "ESCOLHA CORRETA" : "VAMOS REVISAR";
      this.elements.feedbackTitle.textContent = product.name;
      this.elements.feedbackExplanation.textContent = product.explanation;
      this.elements.feedbackCompound.textContent = product.compound;
      this.elements.feedbackFunction.textContent = product.organicFunction;
      this.elements.feedbackFormula.textContent = product.formula;
      this.elements.feedbackStructure.textContent = product.structure;
      this.elements.feedbackPoints.textContent = product.correct ? `+${points} pontos` : `−${Math.abs(points)} pontos`;
      this.elements.feedbackPoints.className = `feedback-points ${product.correct ? "correct" : "wrong"}`;
      this.elements.feedbackContinue.textContent = willComplete ? "Ver lista completa" : "Continuar explorando";
      this.elements.feedback.hidden = false;
      requestAnimationFrame(() => this.elements.feedbackContinue.focus());
    }

    closeFeedback() {
      this.elements.feedback.hidden = true;
    }

    showPause() {
      this.lastFocused = document.activeElement;
      this.elements.pauseModal.hidden = false;
      this.elements.pauseButton.setAttribute("aria-label", "Continuar jogo");
      requestAnimationFrame(() => document.getElementById("resume-button").focus());
    }

    hidePause() {
      this.elements.pauseModal.hidden = true;
      this.elements.pauseButton.setAttribute("aria-label", "Pausar jogo");
    }

    showCompletion() {
      this.showScreen("complete-screen");
    }

    showResult(result) {
      document.getElementById("result-title").textContent = result.title;
      document.getElementById("result-message").textContent = result.message;
      document.getElementById("final-score").textContent = String(result.score).padStart(3, "0");
      document.getElementById("final-correct").textContent = `${result.correct}/3`;
      document.getElementById("final-errors").textContent = String(result.errors);
      document.getElementById("final-time").textContent = this.formatTime(result.elapsed);
      document.getElementById("final-time-bonus").textContent = `+${result.timeBonus}`;
      document.querySelectorAll("#molecule-rating span").forEach((molecule, index) => {
        molecule.classList.toggle("inactive", index >= result.rating);
      });
      this.showScreen("result-screen");
    }

    setMuted(muted) {
      this.elements.muteButton.setAttribute("aria-pressed", String(muted));
      this.elements.muteButton.setAttribute("aria-label", muted ? "Ativar áudio" : "Silenciar áudio");
      this.elements.muteButton.textContent = muted ? "×" : "♪";
    }

    formatTime(seconds) {
      const value = Math.max(0, Math.floor(seconds));
      const minutes = Math.floor(value / 60);
      const remainder = value % 60;
      return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
    }
  }

  window.BenUI = BenUI;
})();
