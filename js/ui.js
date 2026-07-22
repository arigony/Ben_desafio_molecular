(function () {
  "use strict";

  class BenUI {
    constructor() {
      this.screens = [...document.querySelectorAll(".screen")];
      const byId = (id) => document.getElementById(id);
      this.elements = {
        score: byId("score-value"),
        timer: byId("timer-value"),
        found: byId("found-value"),
        required: byId("required-value"),
        gameLayout: document.querySelector(".game-layout"),
        shoppingPanel: byId("shopping-panel"),
        listButton: byId("list-button"),
        listClose: byId("list-close-button"),
        listBackdrop: byId("list-backdrop"),
        list: byId("shopping-list"),
        cartDotsContainer: byId("cart-dots"),
        cartDots: [],
        prompt: byId("interaction-prompt"),
        promptText: document.querySelector("#interaction-prompt span"),
        analysis: byId("analysis-modal"),
        analysisTitle: byId("analysis-title"),
        analysisCompound: byId("analysis-compound"),
        analysisFormula: byId("analysis-formula"),
        analysisStructure: byId("analysis-structure"),
        analysisQuestion: byId("analysis-question"),
        analysisOptions: byId("analysis-options"),
        analysisHint: byId("analysis-hint-button"),
        analysisHints: byId("analysis-hints"),
        analysisReviewNote: byId("analysis-review-note"),
        analysisReviewButton: byId("analysis-review-button"),
        analysisObserve: byId("analysis-observe-button"),
        analysisClose: byId("analysis-close-button"),
        modelContainer: byId("molecule-viewer"),
        modelFallback: byId("molecule-fallback"),
        modelSelector: byId("model-selector"),
        modelSelectorLabel: byId("model-selector-label"),
        moleculeNote: byId("molecule-note"),
        feedback: byId("feedback-modal"),
        feedbackStatus: byId("feedback-status"),
        feedbackIcon: byId("feedback-icon"),
        feedbackResult: byId("feedback-result"),
        feedbackTitle: byId("feedback-title"),
        feedbackExplanation: byId("feedback-explanation"),
        feedbackCompound: byId("feedback-compound"),
        feedbackFunction: byId("feedback-function"),
        feedbackGroup: byId("feedback-group"),
        feedbackGroupName: byId("feedback-group-name"),
        feedbackGroupSymbol: byId("feedback-group-symbol"),
        feedbackFormula: byId("feedback-formula"),
        feedbackStructure: byId("feedback-structure"),
        feedbackEvidence: byId("feedback-evidence"),
        feedbackProductNature: byId("feedback-product-nature"),
        feedbackRepresentationScope: byId("feedback-representation-scope"),
        feedbackRelation: byId("feedback-relation"),
        feedbackPoints: byId("feedback-points"),
        feedbackContinue: byId("feedback-continue-button"),
        pauseModal: byId("pause-modal"),
        pauseButton: byId("pause-button"),
        muteButton: byId("mute-button"),
        description: byId("canvas-description")
      };
      this.game = null;
      this.pendingCompletion = false;
      this.lastFocused = null;
      this.activeDialog = null;
      this.dialogReturnFocus = null;
      this.compactListMode = null;
      this.handleDialogKeydown = (event) => this.trapDialogFocus(event);
      this.handleDialogFocus = (event) => this.keepDialogFocus(event);
      document.addEventListener("keydown", this.handleDialogKeydown);
      document.addEventListener("focusin", this.handleDialogFocus);
      this.moleculeViewer = window.MoleculeViewer
        ? new window.MoleculeViewer({
            container: this.elements.modelContainer,
            fallback: this.elements.modelFallback,
            selector: this.elements.modelSelector,
            selectorLabel: this.elements.modelSelectorLabel,
            note: this.elements.moleculeNote,
            models: window.BEN_GAME_DATA.models
          })
        : null;
      this.renderMission();
      this.bindNavigation();
      this.syncListMode();
      window.addEventListener("resize", () => this.syncListMode());
    }

    attachGame(game) {
      this.game = game;
      this.bindGameControls();
    }

    bindNavigation() {
      document.getElementById("start-button").addEventListener("click", () => this.showScreen("instructions-screen"));
      document.getElementById("open-instructions-button").addEventListener("click", () => this.showScreen("instructions-screen"));
      document.getElementById("instructions-continue-button").addEventListener("click", () => this.showScreen("mission-screen"));
      document.querySelectorAll("[data-back]").forEach((button) => {
        button.addEventListener("click", () => this.showScreen(button.dataset.back));
      });
      document.getElementById("review-mission-button").addEventListener("click", () => this.showScreen("mission-screen"));
    }

    bindGameControls() {
      document.getElementById("mission-start-button").addEventListener("click", () => this.game.start());
      this.elements.analysisHint.addEventListener("click", () => this.game.showHint());
      this.elements.analysisReviewButton.addEventListener("click", () => this.game.reviewCurrentProduct());
      this.elements.analysisObserve.addEventListener("click", () => this.game.cancelAnalysis());
      this.elements.analysisClose.addEventListener("click", () => this.game.cancelAnalysis());
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
      this.elements.listButton.addEventListener("click", () => this.toggleList());
      this.elements.listClose.addEventListener("click", () => this.closeList());
      this.elements.listBackdrop.addEventListener("click", () => this.closeList());
    }

    renderMission() {
      const data = window.BEN_GAME_DATA;
      const missionProducts = data.products.filter((product) => product.correct);
      const required = data.mission.required;
      this.elements.required.textContent = String(required);
      document.getElementById("mission-target-text").textContent =
        `Encontre ${required} ${required === 1 ? "produto correto" : "produtos corretos"}`;
      document.getElementById("complete-count").textContent = String(required);

      this.elements.list.textContent = "";
      missionProducts.slice(0, required).forEach((product) => {
        const item = document.createElement("li");
        item.dataset.item = product.id;
        const status = document.createElement("span");
        status.textContent = "?";
        const copy = document.createElement("div");
        const title = document.createElement("strong");
        title.textContent = "Item misterioso";
        const detail = document.createElement("small");
        detail.className = "item-structure";
        detail.textContent = "Ainda não resolvido";
        const organicFunction = document.createElement("span");
        organicFunction.className = "item-function";
        organicFunction.textContent = "Função: ainda não identificada";
        copy.append(title, organicFunction, detail);
        item.append(status, copy);
        this.elements.list.append(item);
      });

      this.elements.cartDotsContainer.textContent = "";
      for (let index = 0; index < required; index += 1) {
        this.elements.cartDotsContainer.append(document.createElement("i"));
      }
      this.elements.cartDots = [...this.elements.cartDotsContainer.querySelectorAll("i")];
    }

    isCompactListMode() {
      if (typeof window.matchMedia === "function") {
        return window.matchMedia("(max-width: 840px), (max-width: 900px) and (max-height: 620px)").matches;
      }
      return window.innerWidth <= 840 || (window.innerWidth <= 900 && window.innerHeight <= 620);
    }

    syncListMode() {
      const compact = this.isCompactListMode();
      if (compact === this.compactListMode) return;
      this.compactListMode = compact;
      this.elements.shoppingPanel.classList.remove("is-collapsed");
      this.elements.gameLayout.classList.remove("list-collapsed");
      if (compact) {
        this.elements.shoppingPanel.setAttribute("aria-hidden", "true");
        this.elements.listButton.setAttribute("aria-expanded", "false");
      } else {
        this.closeList(false);
        this.elements.shoppingPanel.removeAttribute("aria-hidden");
        this.elements.listButton.setAttribute("aria-expanded", "true");
      }
    }

    toggleList() {
      if (this.isCompactListMode()) {
        if (this.elements.shoppingPanel.classList.contains("is-open")) this.closeList();
        else this.openList();
        return;
      }
      const collapsed = this.elements.shoppingPanel.classList.toggle("is-collapsed");
      this.elements.gameLayout.classList.toggle("list-collapsed", collapsed);
      this.elements.listButton.setAttribute("aria-expanded", String(!collapsed));
    }

    openList() {
      if (!this.isCompactListMode()) return;
      this.elements.shoppingPanel.classList.add("is-open");
      this.elements.shoppingPanel.setAttribute("role", "dialog");
      this.elements.shoppingPanel.setAttribute("aria-modal", "true");
      this.elements.shoppingPanel.setAttribute("aria-hidden", "false");
      this.elements.listBackdrop.hidden = false;
      this.elements.listButton.setAttribute("aria-expanded", "true");
      this.game?.setListOpen(true);
      this.activateDialog(this.elements.shoppingPanel, this.elements.listClose);
    }

    closeList(restoreFocus = true) {
      const wasOpen = this.elements.shoppingPanel.classList.contains("is-open");
      if (wasOpen) this.releaseDialog(this.elements.shoppingPanel, restoreFocus);
      this.elements.shoppingPanel.classList.remove("is-open");
      this.elements.shoppingPanel.removeAttribute("role");
      this.elements.shoppingPanel.removeAttribute("aria-modal");
      this.elements.listBackdrop.hidden = true;
      if (this.isCompactListMode()) {
        this.elements.shoppingPanel.setAttribute("aria-hidden", "true");
        this.elements.listButton.setAttribute("aria-expanded", "false");
      }
      if (wasOpen) {
        this.game?.setListOpen(false);
      }
    }

    focusableElements(container) {
      return [...container.querySelectorAll(
        'button:not([disabled]):not([hidden]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )].filter((element) => element.getAttribute("aria-hidden") !== "true");
    }

    activateDialog(container, initialFocus) {
      if (!this.dialogReturnFocus) this.dialogReturnFocus = document.activeElement;
      this.activeDialog = container;
      initialFocus?.focus({ preventScroll: true });
    }

    releaseDialog(container, restoreFocus = true) {
      if (this.activeDialog !== container) return;
      this.activeDialog = null;
      if (restoreFocus) {
        const target = this.dialogReturnFocus;
        this.dialogReturnFocus = null;
        target?.focus?.({ preventScroll: true });
      }
    }

    trapDialogFocus(event) {
      if (!this.activeDialog) return;
      if (event.key === "Escape" && this.activeDialog === this.elements.shoppingPanel) {
        event.preventDefault();
        this.closeList();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = this.focusableElements(this.activeDialog);
      if (!focusable.length) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (!this.activeDialog.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      }
    }

    keepDialogFocus(event) {
      if (!this.activeDialog || this.activeDialog.contains(event.target)) return;
      this.focusableElements(this.activeDialog)[0]?.focus({ preventScroll: true });
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
      this.renderMission();
      this.elements.score.textContent = "000";
      this.elements.timer.textContent = "00:00";
      this.elements.found.textContent = "0";
      this.elements.prompt.hidden = true;
      this.closeList(false);
      this.elements.list.querySelectorAll("li").forEach((item) => {
        item.classList.remove("found");
        item.querySelector(":scope > span").textContent = "?";
        item.querySelector("strong").textContent = "Item misterioso";
        item.querySelector(".item-function").textContent = "Função: ainda não identificada";
        item.querySelector("small").textContent = "Ainda não resolvido";
      });
      this.elements.cartDots.forEach((dot) => dot.classList.remove("filled"));
      this.hidePause(false);
      this.closeAnalysis(false);
      this.closeFeedback(false);
      this.activeDialog = null;
      this.dialogReturnFocus = null;
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
        item.querySelector(".item-function").textContent = `Função: ${product.organicFunction}`;
        item.querySelector("small").textContent = product.structure;
      }
      this.elements.cartDots.slice(0, count).forEach((dot) => dot.classList.add("filled"));
    }

    setPrompt(visible, label = "Analisar produto") {
      this.elements.prompt.hidden = !visible;
      this.elements.promptText.textContent = label;
    }

    setDescription(text) {
      this.elements.description.textContent = text;
    }

    showAnalysis(product, previousAnswer = null) {
      this.lastFocused = document.activeElement;
      this.elements.analysisTitle.textContent = product.name;
      this.elements.analysisCompound.textContent = product.compound;
      this.renderMolecularFormula(this.elements.analysisFormula, product);
      this.renderCondensedStructure(this.elements.analysisStructure, product, false);
      this.elements.analysisQuestion.textContent = product.quiz.question;
      this.elements.analysisReviewNote.hidden = !previousAnswer;
      this.elements.analysisReviewButton.hidden = !previousAnswer;
      this.elements.analysisHints.textContent = "";
      this.elements.analysisHint.disabled = false;
      this.elements.analysisHint.textContent = "Ver pista";
      this.elements.analysisOptions.textContent = "";
      product.quiz.options.forEach((option, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "answer-option";
        button.dataset.optionId = option.id;
        button.textContent = option.label;
        button.setAttribute("aria-label", `Alternativa ${index + 1}: ${option.label}`);
        if (previousAnswer?.selectedOptionId === option.id) button.classList.add("was-selected");
        button.addEventListener("click", () => this.game.submitAnswer(option.id));
        this.elements.analysisOptions.append(button);
      });
      this.elements.analysis.hidden = false;
      if (this.moleculeViewer) {
        void this.moleculeViewer.show(product).catch(() => {
          this.moleculeViewer.hide3D("Visualização 3D indisponível neste dispositivo.");
        });
      } else {
        this.elements.modelContainer.hidden = true;
        this.elements.modelFallback.hidden = false;
        this.elements.modelFallback.textContent = "Visualização 3D indisponível neste dispositivo.";
      }
      const initialFocus = previousAnswer
        ? this.elements.analysisReviewButton
        : this.elements.analysisOptions.querySelector("button");
      this.activateDialog(this.elements.analysis, initialFocus);
      requestAnimationFrame(() => this.moleculeViewer?.resize());
    }

    showHint(text, used, total) {
      const hint = document.createElement("p");
      hint.textContent = `Pista ${used}: ${text}`;
      this.elements.analysisHints.append(hint);
      this.elements.analysisHint.disabled = used >= total;
      this.elements.analysisHint.textContent = used >= total ? "Pistas utilizadas" : "Ver outra pista";
    }

    closeAnalysis(restoreFocus = true) {
      this.releaseDialog(this.elements.analysis, restoreFocus);
      this.elements.analysis.hidden = true;
      this.moleculeViewer?.clear();
    }

    showScientificFeedback(result, willComplete) {
      const { product, points, correct, review, reason } = result;
      this.pendingCompletion = willComplete;
      const status = this.elements.feedbackStatus;
      status.classList.toggle("wrong", !correct && !review);
      this.elements.feedbackIcon.textContent = review ? "↺" : correct ? "✓" : "×";
      this.elements.feedbackResult.textContent = review ? "REVISÃO" : correct ? "RESPOSTA CORRETA" : "RESPOSTA INCORRETA";
      this.elements.feedbackTitle.textContent = product.name;
      this.elements.feedbackExplanation.textContent = `${reason} ${product.explanation}`;
      this.elements.feedbackCompound.textContent = product.compound;
      this.elements.feedbackFunction.textContent = product.organicFunction;
      this.elements.feedbackGroupName.textContent = product.functionalGroup;
      this.elements.feedbackGroupSymbol.textContent = product.functionalGroupSymbol;
      this.elements.feedbackGroupSymbol.setAttribute(
        "aria-label",
        `Representação do grupo funcional: ${product.functionalGroupSymbol}`
      );
      this.elements.feedbackGroup.classList.toggle(
        "not-applicable",
        product.functionalGroupSymbol === "Não se aplica"
      );
      this.renderMolecularFormula(this.elements.feedbackFormula, product);
      this.elements.feedbackEvidence.textContent = product.quiz.structuralEvidence;
      this.elements.feedbackProductNature.textContent = product.commercialNature;
      this.elements.feedbackRepresentationScope.textContent = product.representationScope;
      this.elements.feedbackRelation.textContent = product.quiz.commercialRelation;
      this.renderHighlightedStructure(product);
      if (review) {
        this.elements.feedbackPoints.textContent = "Revisão — sem alteração de pontos";
      } else {
        const sign = points > 0 ? "+" : points < 0 ? "−" : "";
        this.elements.feedbackPoints.textContent = `${sign}${Math.abs(points)} pontos`;
      }
      this.elements.feedbackPoints.className = `feedback-points ${points >= 0 || review ? "correct" : "wrong"}`;
      this.elements.feedbackContinue.textContent = willComplete ? "Ver lista completa" : "Continuar explorando";
      this.elements.feedback.hidden = false;
      this.activateDialog(this.elements.feedback, this.elements.feedbackContinue);
    }

    appendChemicalText(target, text) {
      const subscriptDigits = {
        "₀": "0",
        "₁": "1",
        "₂": "2",
        "₃": "3",
        "₄": "4",
        "₅": "5",
        "₆": "6",
        "₇": "7",
        "₈": "8",
        "₉": "9"
      };
      let regular = "";
      let subscript = "";
      const flushRegular = () => {
        if (!regular) return;
        target.append(document.createTextNode(regular));
        regular = "";
      };
      const flushSubscript = () => {
        if (!subscript) return;
        const sub = document.createElement("sub");
        sub.textContent = subscript;
        target.append(sub);
        subscript = "";
      };
      [...text].forEach((character) => {
        if (subscriptDigits[character]) {
          flushRegular();
          subscript += subscriptDigits[character];
        } else {
          flushSubscript();
          regular += character;
        }
      });
      flushRegular();
      flushSubscript();
    }

    renderMolecularFormula(target, product) {
      target.textContent = "";
      target.setAttribute(
        "aria-label",
        `Fórmula molecular: ${product.formulaAccessible || product.formula}`
      );
      const visual = document.createElement("span");
      visual.setAttribute("aria-hidden", "true");
      this.appendChemicalText(visual, product.formula);
      target.append(visual);
    }

    renderCondensedStructure(target, product, highlightGroup) {
      target.textContent = "";
      const highlightedDescription = highlightGroup && product.functionalGroupSymbol !== "Não se aplica"
        ? ` Grupo funcional destacado: ${product.functionalGroupSymbol}.`
        : "";
      target.setAttribute(
        "aria-label",
        `Estrutura condensada do composto relacionado: ${product.structure}.${highlightedDescription}`
      );
      const visual = document.createElement("span");
      visual.setAttribute("aria-hidden", "true");
      const token = highlightGroup ? product.highlight : "";
      if (!token || !product.structure.includes(token)) {
        this.appendChemicalText(visual, product.structure);
        target.append(visual);
        return;
      }
      let cursor = 0;
      let start = product.structure.indexOf(token, cursor);
      while (start !== -1) {
        if (start > cursor) {
          this.appendChemicalText(visual, product.structure.slice(cursor, start));
        }
        const mark = document.createElement("mark");
        this.appendChemicalText(mark, token);
        visual.append(mark);
        cursor = start + token.length;
        start = product.structure.indexOf(token, cursor);
      }
      if (cursor < product.structure.length) {
        this.appendChemicalText(visual, product.structure.slice(cursor));
      }
      target.append(visual);
    }

    renderHighlightedStructure(product) {
      this.renderCondensedStructure(this.elements.feedbackStructure, product, true);
    }

    closeFeedback(restoreFocus = true) {
      this.releaseDialog(this.elements.feedback, restoreFocus);
      this.elements.feedback.hidden = true;
    }

    showPause() {
      this.lastFocused = document.activeElement;
      this.elements.pauseModal.hidden = false;
      this.elements.pauseButton.setAttribute("aria-label", "Continuar jogo");
      this.activateDialog(this.elements.pauseModal, document.getElementById("resume-button"));
    }

    hidePause(restoreFocus = true) {
      this.releaseDialog(this.elements.pauseModal, restoreFocus);
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
      document.getElementById("final-correct").textContent = `${result.correct}/${window.BEN_GAME_DATA.mission.required}`;
      document.getElementById("final-errors").textContent = String(result.errors);
      document.getElementById("final-time").textContent = this.formatTime(result.elapsed);
      document.getElementById("final-reviewed").textContent = String(result.reviewed);
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
