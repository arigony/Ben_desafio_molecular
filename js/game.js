(function () {
  "use strict";

  const WORLD = { width: 1200, height: 675 };
  const DATA = window.BEN_GAME_DATA;

  class SoundEngine {
    constructor() {
      this.context = null;
      this.muted = false;
    }
    unlock() {
      if (!this.context) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) this.context = new AudioContext();
      }
      if (this.context?.state === "suspended") this.context.resume();
    }
    setMuted(value) {
      this.muted = value;
    }
    tone(frequency, duration, type = "sine", delay = 0, volume = 0.08) {
      if (this.muted || !this.context) return;
      const start = this.context.currentTime + delay;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      oscillator.connect(gain).connect(this.context.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.02);
    }
    correct() {
      this.tone(523.25, 0.15);
      this.tone(659.25, 0.17, "sine", 0.1);
      this.tone(783.99, 0.22, "sine", 0.2);
    }
    wrong() {
      this.tone(220, 0.2, "triangle", 0, 0.06);
      this.tone(174.61, 0.3, "triangle", 0.16, 0.05);
    }
    complete() {
      [392, 523.25, 659.25, 783.99].forEach((frequency, index) => {
        this.tone(frequency, 0.28, "sine", index * 0.11, 0.07);
      });
    }
  }

  class BenGame {
    constructor(ui) {
      this.ui = ui;
      this.canvas = document.getElementById("game-canvas");
      this.ctx = this.canvas.getContext("2d", { alpha: false });
      this.sound = new SoundEngine();
      const sharedBenImage = document.getElementById("ben-asset");
      this.image = sharedBenImage?.tagName === "IMG" ? sharedBenImage : new Image();
      this.imageLoaded = false;
      this.benBodyCanvas = null;
      let pngFallbackUsed = false;
      const prepareBenImage = () => {
        this.imageLoaded = true;
        this.prepareBenBody();
        this.draw();
      };
      this.image.addEventListener("load", prepareBenImage);
      this.image.addEventListener("error", () => {
        if (!pngFallbackUsed) {
          pngFallbackUsed = true;
          this.image.parentElement?.querySelector('source[type="image/webp"]')?.remove();
          this.image.src = "assets/ben.png";
          return;
        }
        this.ui.setDescription("Não foi possível carregar a imagem oficial do Ben.");
      });
      const benImageReady = this.image.complete && this.image.naturalWidth;
      if (!benImageReady && this.image !== sharedBenImage) this.image.src = "assets/ben.webp";

      this.stands = [
        {
          id: "hygiene-beauty", x: 90, y: 90, w: 460, h: 145, kind: "stand",
          label: "HIGIENE E BELEZA", color: "#d95f99", dark: "#8f3466", light: "#ffe5f1"
        },
        {
          id: "personal-care", x: 650, y: 90, w: 460, h: 145, kind: "stand",
          label: "CUIDADOS PESSOAIS", color: "#259f92", dark: "#17685f", light: "#dcf6ef"
        },
        {
          id: "grocery", x: 90, y: 420, w: 520, h: 130, kind: "stand",
          label: "MERCEARIA", color: "#e2a329", dark: "#8c5d08", light: "#fff1c8"
        },
        {
          id: "beverages", x: 670, y: 420, w: 260, h: 130, kind: "stand",
          label: "BEBIDAS", color: "#3d83d7", dark: "#23518b", light: "#e0efff"
        }
      ];
      this.checkoutStand = {
        id: "checkout", x: 990, y: 420, w: 185, h: 130, kind: "checkout",
        label: "CAIXA", color: "#173b50", dark: "#0d2939", light: "#f8cc5b"
      };
      this.obstacles = [...this.stands, this.checkoutStand];
      this.standsById = new Map(this.stands.map((stand) => [stand.id, stand]));
      this.productsById = new Map(DATA.products.map((product) => [product.id, product]));
      this.productsByDepth = [...DATA.products].sort((a, b) => a.displayY - b.displayY || a.slot - b.slot);
      this.productDisplays = this.buildProductDisplayPositions();
      this.checkout = { x: 1080, y: 607, radius: 80 };
      this.keys = new Set();
      this.touchDirections = new Set();
      this.activeDirectionInputs = new Map();
      this.directionButtons = [];
      this.lastInteractionTrigger = -Infinity;
      this.lastFrame = performance.now();
      this.raf = null;
      this.running = false;
      this.manualPaused = false;
      this.overlayPaused = false;
      this.listOpen = false;
      this.completionPresented = false;
      this.lastDirection = "up";
      this.nearby = null;
      this.currentAnalysis = null;
      this.currentHintsUsed = 0;
      this.checkoutNearby = false;
      this.portraitCamera = false;
      this.cameraBounds = { left: 0, right: WORLD.width };
      this.renderDpr = 1;
      this.logicalCanvasWidth = WORLD.width;
      this.logicalCanvasHeight = WORLD.height;
      this.staticScene = document.createElement("canvas");
      this.staticSceneBuilds = 0;
      this.state = this.freshState();
      this.bindInput();
      this.resizeCanvas();
      const handleViewportChange = () => {
        this.clearDirectionalInput();
        this.resizeCanvas();
      };
      window.addEventListener("resize", handleViewportChange);
      window.addEventListener("orientationchange", handleViewportChange);
      window.visualViewport?.addEventListener("resize", handleViewportChange);
      document.addEventListener("visibilitychange", () => {
        this.clearDirectionalInput();
        if (document.hidden && this.running && !this.manualPaused && !this.overlayPaused) this.togglePause(true);
      });
      if (benImageReady) prepareBenImage();
      else this.draw();
    }

    freshState() {
      return {
        ben: { x: 630, y: 620, speed: 225, walkTime: 0, isMoving: false },
        cart: { wheelAngle: 0, wheelRadius: 8 },
        celebrationTime: 0,
        score: 0,
        elapsed: 0,
        found: [],
        collectedProducts: new Set(),
        reviewedProducts: new Set(),
        answers: new Map(),
        errors: 0,
        phase: "explore"
      };
    }

    buildProductDisplayPositions() {
      const displays = new Map();
      DATA.products.forEach((product) => {
        displays.set(product.id, {
          x: product.displayX,
          y: product.displayY,
          standId: product.standId,
          slot: product.slot
        });
      });
      return displays;
    }

    syncTouchDirections() {
      this.touchDirections.clear();
      for (const direction of this.activeDirectionInputs.values()) this.touchDirections.add(direction);
    }

    startDirection(direction, inputId, button) {
      if (!this.running || this.manualPaused || this.overlayPaused || this.activeDirectionInputs.has(inputId)) return false;
      this.activeDirectionInputs.set(inputId, direction);
      this.syncTouchDirections();
      const directionKeys = {
        up: "arrowup", left: "arrowleft", down: "arrowdown", right: "arrowright"
      };
      this.nudgeFromKey(directionKeys[direction]);
      button?.classList.add("is-active");
      return true;
    }

    finishDirection(inputId) {
      const direction = this.activeDirectionInputs.get(inputId);
      if (!direction) return false;
      this.activeDirectionInputs.delete(inputId);
      this.syncTouchDirections();
      if (!this.touchDirections.has(direction)) {
        this.directionButtons
          .filter((button) => button.dataset.direction === direction)
          .forEach((button) => button.classList.remove("is-active"));
      }
      const movement = this.getMovementVector();
      if (!movement.x && !movement.y) this.state.ben.isMoving = false;
      return true;
    }

    clearDirectionalInput() {
      this.activeDirectionInputs.clear();
      this.touchDirections.clear();
      this.directionButtons.forEach((button) => button.classList.remove("is-active"));
      if (this.state?.ben) this.state.ben.isMoving = false;
    }

    triggerInteraction(event) {
      event?.preventDefault?.();
      const now = performance.now();
      if (now - this.lastInteractionTrigger < 350) return false;
      this.lastInteractionTrigger = now;
      return this.interact();
    }

    bindInput() {
      const movementKeys = new Set([
        "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
        "w", "a", "s", "d", "W", "A", "S", "D"
      ]);
      window.addEventListener("keydown", (event) => {
        if (!this.running) return;
        if (event.key === "Escape" && !event.repeat && this.currentAnalysis) {
          event.preventDefault();
          this.cancelAnalysis();
          return;
        }
        if (this.manualPaused || this.overlayPaused) return;
        if (movementKeys.has(event.key)) {
          event.preventDefault();
          this.keys.add(event.key.toLowerCase());
          if (!event.repeat) this.nudgeFromKey(event.key.toLowerCase());
          return;
        }
        const interactionKey =
          event.code === "KeyE" || event.code === "Space" || event.key === "Enter";
        if (interactionKey && !event.repeat) {
          event.preventDefault();
          this.interact();
          return;
        }
        if ((event.key === "p" || event.key === "P" || event.key === "Escape") && !event.repeat) {
          event.preventDefault();
          this.togglePause();
        }
      });
      window.addEventListener("keyup", (event) => this.keys.delete(event.key.toLowerCase()));
      window.addEventListener("blur", () => {
        this.keys.clear();
        this.clearDirectionalInput();
      });
      this.directionButtons = [...document.querySelectorAll("[data-direction]")];
      this.directionButtons.forEach((button) => {
        const beginPointer = (event) => {
          event.preventDefault();
          button.setPointerCapture?.(event.pointerId);
          this.startDirection(button.dataset.direction, `pointer:${event.pointerId ?? "primary"}`, button);
        };
        const endPointer = (event) => {
          event.preventDefault();
          this.finishDirection(`pointer:${event.pointerId ?? "primary"}`);
        };
        const beginTouch = (event) => {
          event.preventDefault();
          if (window.PointerEvent) return;
          for (const touch of event.changedTouches || []) {
            this.startDirection(button.dataset.direction, `touch:${touch.identifier}`, button);
          }
        };
        const endTouch = (event) => {
          event.preventDefault();
          if (window.PointerEvent) return;
          const changedTouches = event.changedTouches || [];
          if (!changedTouches.length) this.clearDirectionalInput();
          for (const touch of changedTouches) this.finishDirection(`touch:${touch.identifier}`);
        };
        button.addEventListener("pointerdown", beginPointer);
        button.addEventListener("pointerup", endPointer);
        button.addEventListener("pointercancel", endPointer);
        button.addEventListener("touchstart", beginTouch, { passive: false });
        button.addEventListener("touchend", endTouch, { passive: false });
        button.addEventListener("touchcancel", endTouch, { passive: false });
      });
      const finishPointer = (event) => this.finishDirection(`pointer:${event.pointerId ?? "primary"}`);
      const finishTouch = (event) => {
        if (window.PointerEvent) return;
        event.preventDefault();
        for (const touch of event.changedTouches || []) this.finishDirection(`touch:${touch.identifier}`);
      };
      window.addEventListener("pointerup", finishPointer);
      window.addEventListener("pointercancel", finishPointer);
      window.addEventListener("touchend", finishTouch, { passive: false });
      window.addEventListener("touchcancel", finishTouch, { passive: false });

      document.getElementById("interaction-prompt").addEventListener("click", (event) => this.triggerInteraction(event));
      const touchInteract = document.getElementById("touch-interact-button");
      touchInteract.addEventListener("pointerup", (event) => this.triggerInteraction(event));
      touchInteract.addEventListener("touchend", (event) => this.triggerInteraction(event), { passive: false });
      touchInteract.addEventListener("click", (event) => this.triggerInteraction(event));
    }

    start() {
      this.stopAnimationLoop(false);
      this.sound.unlock();
      this.state = this.freshState();
      this.keys.clear();
      this.clearDirectionalInput();
      this.lastInteractionTrigger = -Infinity;
      this.running = true;
      this.manualPaused = false;
      this.overlayPaused = false;
      this.listOpen = false;
      this.completionPresented = false;
      this.nearby = null;
      this.currentAnalysis = null;
      this.currentHintsUsed = 0;
      this.checkoutNearby = false;
      this.lastDirection = "up";
      this.lastFrame = performance.now();
      this.ui.reset();
      this.ui.showScreen("game-screen");
      requestAnimationFrame(() => this.resizeCanvas());
      this.ui.updateHUD(this.state);
      this.syncDomState();
      this.ui.setDescription("Ben está na entrada. Aproxime-se de um produto para analisar sua fórmula.");
      this.scheduleAnimationLoop();
    }

    loop(time) {
      this.raf = null;
      const delta = Math.min((time - this.lastFrame) / 1000, 0.05);
      this.lastFrame = time;
      if (!this.isAnimationActive()) {
        this.canvas.dataset.animationActive = "false";
        this.draw();
        return;
      }
      this.update(delta);
      this.draw();
      this.scheduleAnimationLoop();
    }

    isAnimationActive() {
      return this.running && !this.manualPaused && !this.overlayPaused && !document.hidden;
    }

    scheduleAnimationLoop() {
      if (!this.raf && this.isAnimationActive()) {
        this.raf = requestAnimationFrame((time) => this.loop(time));
        this.canvas.dataset.animationActive = "true";
      } else if (!this.raf) {
        this.canvas.dataset.animationActive = "false";
      }
    }

    stopAnimationLoop(redraw = true) {
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = null;
      this.canvas.dataset.animationActive = "false";
      if (redraw) this.draw();
    }

    update(delta) {
      this.state.elapsed += delta;
      const direction = this.getMovementVector();
      if (direction.x || direction.y) {
        const length = Math.hypot(direction.x, direction.y);
        direction.x /= length;
        direction.y /= length;
        const nextDirection = this.directionFromVector(direction.x, direction.y);
        this.lastDirection = nextDirection;
        const amount = this.state.ben.speed * delta;
        const moved = this.moveBen(direction.x * amount, direction.y * amount, nextDirection);
        this.advanceMotion(moved, direction.x, direction.y, delta);
      } else {
        this.state.ben.isMoving = false;
      }
      this.state.celebrationTime = Math.max(0, this.state.celebrationTime - delta);
      this.updateNearby();
      this.ui.updateHUD(this.state);
      this.syncDomState();
    }

    getMovementVector() {
      const left = this.keys.has("arrowleft") || this.keys.has("a") || this.touchDirections.has("left");
      const right = this.keys.has("arrowright") || this.keys.has("d") || this.touchDirections.has("right");
      const up = this.keys.has("arrowup") || this.keys.has("w") || this.touchDirections.has("up");
      const down = this.keys.has("arrowdown") || this.keys.has("s") || this.touchDirections.has("down");
      return { x: Number(right) - Number(left), y: Number(down) - Number(up) };
    }

    directionFromVector(x, y) {
      if (Math.abs(x) > Math.abs(y)) return x > 0 ? "right" : "left";
      return y > 0 ? "down" : "up";
    }

    nudgeFromKey(key) {
      const vectors = {
        arrowleft: [-8, 0, "left"], a: [-8, 0, "left"],
        arrowright: [8, 0, "right"], d: [8, 0, "right"],
        arrowup: [0, -8, "up"], w: [0, -8, "up"],
        arrowdown: [0, 8, "down"], s: [0, 8, "down"]
      };
      const vector = vectors[key];
      if (!vector) return;
      this.lastDirection = vector[2];
      const moved = this.moveBen(vector[0], vector[1], vector[2]);
      this.advanceMotion(moved, vector[0], vector[1], moved / this.state.ben.speed);
      this.updateNearby();
      this.syncDomState();
    }

    advanceMotion(distance, dx, dy, delta) {
      const moving = distance > 0.01;
      this.state.ben.isMoving = moving;
      if (!moving) return;
      this.state.ben.walkTime += delta;
      const dominant = Math.abs(dx) >= Math.abs(dy) ? dx : dy;
      const sign = dominant >= 0 ? 1 : -1;
      this.state.cart.wheelAngle += (sign * distance) / this.state.cart.wheelRadius;
    }

    moveBen(dx, dy, direction = this.lastDirection) {
      const ben = this.state.ben;
      const startX = ben.x;
      const startY = ben.y;
      const nextX = Math.max(38, Math.min(WORLD.width - 38, ben.x + dx));
      if (this.canMoveTo(nextX, ben.y, direction)) ben.x = nextX;
      const nextY = Math.max(54, Math.min(WORLD.height - 34, ben.y + dy));
      if (this.canMoveTo(ben.x, nextY, direction)) ben.y = nextY;
      return Math.hypot(ben.x - startX, ben.y - startY);
    }

    getBenHitbox(x = this.state.ben.x, y = this.state.ben.y) {
      return { x: x - 18, y: y - 23, w: 36, h: 43 };
    }

    getCartTransform(direction = this.lastDirection, benPosition = this.state.ben) {
      const offsets = {
        right: { x: 56, y: 6, scaleX: 1, angle: -0.025 },
        left: { x: -56, y: 6, scaleX: -1, angle: 0.025 },
        up: { x: 0, y: -50, scaleX: 1, angle: 0 },
        down: { x: 0, y: 50, scaleX: 1, angle: 0 }
      };
      const value = offsets[direction] || offsets.right;
      const x = benPosition.x + value.x;
      const y = benPosition.y + value.y;
      const handOffset = direction === "right" ? 10 : direction === "left" ? -10 : 12;
      return {
        x,
        y,
        scaleX: value.scaleX,
        angle: value.angle,
        handle: {
          start: { x: x - value.scaleX * 58, y: y - 22 },
          end: { x: benPosition.x + handOffset, y: benPosition.y - 36 }
        },
        wheels: [
          { x: x - value.scaleX * 42, y: y + 24 },
          { x: x + value.scaleX * 21, y: y + 24 }
        ],
        depth: y + 24
      };
    }

    getCartHitbox(
      x = this.state.ben.x,
      y = this.state.ben.y,
      direction = this.lastDirection
    ) {
      const transform = this.getCartTransform(direction, { x, y });
      const narrow = direction === "up" || direction === "down";
      const w = narrow ? 20 : 42;
      return { x: transform.x - w / 2, y: transform.y - 14, w, h: 37 };
    }

    rectanglesOverlap(a, b) {
      return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }

    canMoveTo(nextBenX, nextBenY, direction = this.lastDirection) {
      if (nextBenX < 38 || nextBenX > WORLD.width - 38 || nextBenY < 54 || nextBenY > WORLD.height - 34) {
        return false;
      }
      const benBox = this.getBenHitbox(nextBenX, nextBenY);
      const cartBox = this.getCartHitbox(nextBenX, nextBenY, direction);
      return !this.obstacles.some(
        (obstacle) => this.rectanglesOverlap(benBox, obstacle) || this.rectanglesOverlap(cartBox, obstacle)
      );
    }

    collides(x, y) {
      return !this.canMoveTo(x, y, this.lastDirection);
    }

    updateNearby() {
      const ben = this.state.ben;
      let closest = null;
      let closestDistance = Infinity;
      DATA.products.forEach((product) => {
        const distance = Math.hypot(ben.x - product.interactionX, ben.y - product.interactionY);
        if (distance <= product.interactionRadius && distance < closestDistance) {
          closest = product;
          closestDistance = distance;
        }
      });
      this.nearby = closest;
      this.checkoutNearby =
        this.state.found.length >= DATA.mission.required &&
        Math.hypot(ben.x - this.checkout.x, ben.y - this.checkout.y) < this.checkout.radius;
      if (this.checkoutNearby) {
        this.ui.setPrompt(true, "Finalizar no caixa");
        this.ui.setDescription("Ben chegou ao caixa. Pressione E, Espaço ou Enter para finalizar.");
      } else if (closest) {
        this.ui.setPrompt(true, "Analisar produto");
        this.ui.setDescription(`${closest.name} está próximo. Pressione E, Espaço ou Enter para analisar.`);
      } else {
        this.ui.setPrompt(false);
      }
    }

    interact() {
      if (!this.running || this.manualPaused || this.overlayPaused) return false;
      this.updateNearby();
      if (this.checkoutNearby) {
        this.finish();
        return true;
      }
      if (!this.nearby) return false;
      return this.analyzeProduct(this.nearby);
    }

    analyzeProduct(product) {
      if (!product || this.overlayPaused || this.manualPaused) return false;
      this.currentAnalysis = product;
      this.currentHintsUsed = 0;
      this.overlayPaused = true;
      this.keys.clear();
      this.clearDirectionalInput();
      this.ui.showAnalysis(product, this.state.answers.get(product.id) || null);
      this.ui.setPrompt(false);
      this.stopAnimationLoop();
      return true;
    }

    cancelAnalysis() {
      if (!this.currentAnalysis) return;
      this.currentAnalysis = null;
      this.currentHintsUsed = 0;
      this.overlayPaused = false;
      this.lastFrame = performance.now();
      this.updateNearby();
      this.ui.closeAnalysis();
      this.scheduleAnimationLoop();
    }

    showHint() {
      if (!this.currentAnalysis) return null;
      const hints = this.currentAnalysis.quiz.hints;
      if (this.currentHintsUsed >= hints.length || this.currentHintsUsed >= 2) return null;
      const text = hints[this.currentHintsUsed];
      this.currentHintsUsed += 1;
      this.ui.showHint(text, this.currentHintsUsed, Math.min(2, hints.length));
      return { text, used: this.currentHintsUsed };
    }

    reviewCurrentProduct() {
      if (!this.currentAnalysis) return null;
      const product = this.currentAnalysis;
      const previousAnswer = this.state.answers.get(product.id);
      if (!previousAnswer) return null;
      const result = {
        product,
        optionId: previousAnswer.selectedOptionId,
        correct: previousAnswer.correct,
        points: 0,
        collected: false,
        reason: "Você reabriu este produto para revisar a classificação, sem alterar a pontuação.",
        review: true,
        hintsUsed: previousAnswer.hintsUsed
      };
      this.currentAnalysis = null;
      this.currentHintsUsed = 0;
      this.ui.closeAnalysis(false);
      this.syncDomState();
      this.showScientificFeedback(result, false);
      return result;
    }

    submitAnswer(optionId) {
      if (!this.currentAnalysis) return null;
      const product = this.currentAnalysis;
      if (!product.quiz.options.some((option) => option.id === optionId)) return null;
      const result = this.evaluateAnswer(product, optionId, this.currentHintsUsed);
      this.currentAnalysis = null;
      this.currentHintsUsed = 0;
      this.ui.closeAnalysis(false);
      this.ui.updateHUD(this.state);
      this.syncDomState();
      const completesList =
        result.collected && this.state.found.length >= DATA.mission.required;
      this.showScientificFeedback(result, completesList);
      return result;
    }

    evaluateAnswer(product, optionId, hintsUsed) {
      const previousAnswer = this.state.answers.get(product.id);
      const review = Boolean(previousAnswer);
      const correct = optionId === product.quiz.correctOptionId;
      let points = 0;
      let collected = false;
      this.state.reviewedProducts.add(product.id);

      if (!review) {
        if (correct) {
          const rewards = [
            DATA.mission.scoring.correctWithoutHint,
            DATA.mission.scoring.correctAfterOneHint,
            DATA.mission.scoring.correctAfterTwoHints
          ];
          points = rewards[Math.min(hintsUsed, 2)];
          this.state.score += points;
        } else {
          points = -DATA.mission.scoring.incorrectPenalty;
          this.state.score = Math.max(0, this.state.score + points);
          this.state.errors += 1;
        }
        this.state.answers.set(product.id, {
          selectedOptionId: optionId,
          correct,
          hintsUsed: Math.min(hintsUsed, 2),
          points
        });

        if (product.correct && !this.state.collectedProducts.has(product.id)) {
          this.state.collectedProducts.add(product.id);
          this.state.found.push(product.id);
          collected = true;
          this.ui.markFound(product, this.state.found.length);
        }
      }

      const reason = review
        ? "Você reabriu este produto para revisar a classificação, sem alterar a pontuação."
        : correct
          ? "Você identificou corretamente a classificação principal do composto."
          : "A alternativa escolhida não corresponde à evidência presente na estrutura.";
      if (correct) {
        this.sound.correct();
        if (!review) this.state.celebrationTime = 0.9;
      }
      else this.sound.wrong();
      this.nearby = null;
      return { product, optionId, correct, points, collected, reason, review, hintsUsed };
    }

    showScientificFeedback(result, willComplete) {
      this.overlayPaused = true;
      this.ui.showScientificFeedback(result, willComplete);
      this.stopAnimationLoop();
    }

    resumeAfterOverlay() {
      this.overlayPaused = false;
      this.lastFrame = performance.now();
      this.updateNearby();
      this.scheduleAnimationLoop();
    }

    setListOpen(open) {
      if (!this.running || this.manualPaused || this.currentAnalysis) return;
      this.listOpen = Boolean(open);
      this.keys.clear();
      this.clearDirectionalInput();
      this.overlayPaused = this.listOpen;
      if (this.listOpen) {
        this.stopAnimationLoop();
      } else {
        this.lastFrame = performance.now();
        this.updateNearby();
        this.scheduleAnimationLoop();
      }
    }

    presentCompletion() {
      this.overlayPaused = true;
      this.completionPresented = true;
      this.state.phase = "checkout";
      this.ui.showCompletion();
      this.stopAnimationLoop();
    }

    continueToCheckout() {
      this.ui.showScreen("game-screen");
      this.overlayPaused = false;
      this.lastFrame = performance.now();
      this.ui.setDescription("Lista completa. Leve Ben ao caixa destacado no canto inferior direito.");
      this.scheduleAnimationLoop();
    }

    togglePause(force) {
      if (!this.running || this.overlayPaused) return;
      this.manualPaused = typeof force === "boolean" ? force : !this.manualPaused;
      this.keys.clear();
      this.clearDirectionalInput();
      if (this.manualPaused) {
        this.ui.showPause();
        this.stopAnimationLoop();
      }
      else {
        this.ui.hidePause();
        this.lastFrame = performance.now();
        this.scheduleAnimationLoop();
      }
    }

    toggleMute() {
      this.sound.unlock();
      this.sound.setMuted(!this.sound.muted);
      this.ui.setMuted(this.sound.muted);
    }

    finish() {
      if (this.state.found.length < DATA.mission.required) return;
      this.running = false;
      this.overlayPaused = true;
      this.stopAnimationLoop(false);
      this.ui.setPrompt(false);
      const elapsed = Math.floor(this.state.elapsed);
      const score = this.state.score;
      let rating = 1;
      if (this.state.errors === 0 && elapsed <= 180) rating = 3;
      else if (this.state.errors <= 2 && elapsed <= 300) rating = 2;
      const titles = { 3: "Excelente investigação!", 2: "Bom desempenho!", 1: "Missão concluída!" };
      const messages = {
        3: "Você investigou as estruturas com precisão e concluiu a missão rapidamente.",
        2: "Você concluiu a lista e demonstrou bom domínio das evidências estruturais.",
        1: "Missão concluída. Reveja os produtos para comparar os diferentes grupos funcionais."
      };
      this.sound.complete();
      this.ui.showResult({
        title: titles[rating],
        message: messages[rating],
        score,
        correct: this.state.found.length,
        errors: this.state.errors,
        elapsed,
        reviewed: this.state.reviewedProducts.size,
        rating
      });
    }

    resizeCanvas() {
      const wrap = document.getElementById("canvas-wrap");
      if (!wrap) return;
      const availableWidth = wrap.clientWidth || WORLD.width;
      const availableHeight = wrap.clientHeight || WORLD.height;
      const nextDpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
      const dprChanged = nextDpr !== this.renderDpr;
      this.renderDpr = nextDpr;
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      this.portraitCamera = window.innerWidth <= 600 && viewportHeight > window.innerWidth;
      if (this.portraitCamera) {
        this.logicalCanvasWidth = 600;
        this.logicalCanvasHeight = 800;
        const backingWidth = Math.round(this.logicalCanvasWidth * this.renderDpr);
        const backingHeight = Math.round(this.logicalCanvasHeight * this.renderDpr);
        if (this.canvas.width !== backingWidth) this.canvas.width = backingWidth;
        if (this.canvas.height !== backingHeight) this.canvas.height = backingHeight;
        this.canvas.style.width = `${Math.max(1, availableWidth)}px`;
        this.canvas.style.height = `${Math.max(1, availableHeight)}px`;
        this.canvas.dataset.dpr = String(this.renderDpr);
        if (dprChanged || !this.staticSceneBuilds) this.prepareStaticScene();
        this.draw();
        return;
      }
      this.logicalCanvasWidth = WORLD.width;
      this.logicalCanvasHeight = WORLD.height;
      const backingWidth = Math.round(this.logicalCanvasWidth * this.renderDpr);
      const backingHeight = Math.round(this.logicalCanvasHeight * this.renderDpr);
      if (this.canvas.width !== backingWidth) this.canvas.width = backingWidth;
      if (this.canvas.height !== backingHeight) this.canvas.height = backingHeight;
      const ratio = WORLD.width / WORLD.height;
      let width = availableWidth;
      let height = width / ratio;
      if (height > availableHeight) {
        height = availableHeight;
        width = height * ratio;
      }
      this.canvas.style.width = `${Math.max(1, width)}px`;
      this.canvas.style.height = `${Math.max(1, height)}px`;
      this.canvas.dataset.dpr = String(this.renderDpr);
      if (dprChanged || !this.staticSceneBuilds) this.prepareStaticScene();
      this.draw();
    }

    syncDomState() {
      this.canvas.dataset.benX = String(Math.round(this.state.ben.x));
      this.canvas.dataset.benY = String(Math.round(this.state.ben.y));
      this.canvas.dataset.score = String(this.state.score);
      this.canvas.dataset.found = String(this.state.found.length);
      this.canvas.dataset.phase = this.state.phase;
      this.canvas.dataset.analysisOpen = String(Boolean(this.currentAnalysis));
      this.canvas.dataset.nearbyStand = this.nearby?.standId || "";
      this.canvas.dataset.renderDpr = String(this.renderDpr);
      this.canvas.dataset.staticSceneBuilds = String(this.staticSceneBuilds);
    }

    prepareBenBody() {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 420;
        canvas.height = 285;
        const context = canvas.getContext("2d");
        context.drawImage(this.image, 0, 0, this.image.naturalWidth, this.image.naturalHeight, 0, 0, 420, 420);
        const fade = context.createLinearGradient(0, 205, 0, 285);
        fade.addColorStop(0, "#fff");
        fade.addColorStop(0.72, "#fff");
        fade.addColorStop(1, "rgba(255,255,255,0)");
        context.globalCompositeOperation = "destination-in";
        context.fillStyle = fade;
        context.fillRect(0, 0, 420, 285);
        context.globalCompositeOperation = "source-over";
        this.benBodyCanvas = canvas;
      } catch (_error) {
        this.benBodyCanvas = null;
      }
    }

    prepareStaticScene() {
      const dpr = this.renderDpr;
      const width = Math.round(WORLD.width * dpr);
      const height = Math.round(WORLD.height * dpr);
      if (this.staticScene.width === width && this.staticScene.height === height && this.staticSceneBuilds) return;
      this.staticScene.width = width;
      this.staticScene.height = height;
      const context = this.staticScene.getContext("2d", { alpha: false });
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.drawFloor(context);
      this.stands.forEach((stand) => this.drawStand(context, stand));
      this.drawCheckout(context, this.checkoutStand);
      this.drawWorldLabels(context);
      this.staticSceneBuilds += 1;
    }

    draw() {
      const ctx = this.ctx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.cameraBounds = { left: 0, right: WORLD.width };
      if (this.portraitCamera) {
        const scale = this.logicalCanvasHeight / WORLD.height;
        const viewWidth = this.logicalCanvasWidth / scale;
        const cameraX = Math.max(0, Math.min(WORLD.width - viewWidth, this.state.ben.x - viewWidth / 2));
        this.cameraBounds = { left: cameraX, right: cameraX + viewWidth };
        ctx.setTransform(
          this.renderDpr * scale,
          0,
          0,
          this.renderDpr * scale,
          -cameraX * this.renderDpr * scale,
          0
        );
      } else {
        ctx.setTransform(this.renderDpr, 0, 0, this.renderDpr, 0, 0);
      }
      if (!this.staticSceneBuilds) this.prepareStaticScene();
      ctx.drawImage(
        this.staticScene,
        0,
        0,
        this.staticScene.width,
        this.staticScene.height,
        0,
        0,
        WORLD.width,
        WORLD.height
      );
      this.drawStandHighlights(ctx);
      this.drawCheckoutZone(ctx);
      this.productsByDepth.forEach((product) => this.drawProduct(ctx, product));
      this.drawBenAndCart(ctx);
      if (this.nearby && !this.overlayPaused && !this.manualPaused) this.drawProximityCard(ctx, this.nearby);
      if (this.manualPaused) {
        ctx.fillStyle = "rgba(11, 39, 54, 0.22)";
        ctx.fillRect(0, 0, WORLD.width, WORLD.height);
      }
    }

    drawFloor(ctx) {
      const gradient = ctx.createLinearGradient(0, 0, 0, WORLD.height);
      gradient.addColorStop(0, "#dcebdc");
      gradient.addColorStop(0.55, "#eff2df");
      gradient.addColorStop(1, "#f8ecd6");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);
      ctx.strokeStyle = "rgba(49, 103, 94, 0.1)";
      ctx.lineWidth = 1;
      const vanishX = WORLD.width / 2;
      for (let x = -300; x <= WORLD.width + 300; x += 80) {
        ctx.beginPath();
        ctx.moveTo(vanishX + (x - vanishX) * 0.12, 45);
        ctx.lineTo(x, WORLD.height);
        ctx.stroke();
      }
      for (let y = 70; y <= WORLD.height; y += 54) {
        const perspectiveY = 45 + Math.pow(y / WORLD.height, 1.65) * (WORLD.height - 45);
        ctx.beginPath();
        ctx.moveTo(0, perspectiveY);
        ctx.lineTo(WORLD.width, perspectiveY);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(165, 212, 188, 0.58)";
      ctx.fillRect(0, 0, WORLD.width, 58);
      ctx.fillStyle = "rgba(255,248,233,.9)";
      ctx.beginPath();
      ctx.roundRect(450, 575, 300, 82, 28);
      ctx.fill();
      ctx.strokeStyle = "#83bcae";
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 10]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    drawStand(ctx, stand) {
      const depth = 18;
      ctx.save();
      ctx.fillStyle = "rgba(18, 45, 55, 0.15)";
      ctx.beginPath();
      ctx.ellipse(
        stand.x + stand.w / 2 + 12,
        stand.y + stand.h + 13,
        stand.w / 2 + 18,
        18,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();

      ctx.fillStyle = stand.dark;
      ctx.beginPath();
      ctx.moveTo(stand.x + stand.w, stand.y + 18);
      ctx.lineTo(stand.x + stand.w + depth, stand.y + 4);
      ctx.lineTo(stand.x + stand.w + depth, stand.y + stand.h - 8);
      ctx.lineTo(stand.x + stand.w, stand.y + stand.h);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = stand.light;
      ctx.beginPath();
      ctx.roundRect(stand.x, stand.y + 18, stand.w, stand.h - 18, 14);
      ctx.fill();

      ctx.fillStyle = stand.color;
      ctx.beginPath();
      ctx.moveTo(stand.x, stand.y + 18);
      ctx.lineTo(stand.x + depth, stand.y + 4);
      ctx.lineTo(stand.x + stand.w + depth, stand.y + 4);
      ctx.lineTo(stand.x + stand.w, stand.y + 18);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
      ctx.beginPath();
      ctx.roundRect(stand.x + 11, stand.y + 35, stand.w - 22, stand.h - 50, 9);
      ctx.fill();

      ctx.fillStyle = "rgba(38, 67, 78, 0.12)";
      for (let x = stand.x + 25; x < stand.x + stand.w - 20; x += 48) {
        ctx.beginPath();
        ctx.roundRect(x, stand.y + 48, 29, 25, 4);
        ctx.fill();
      }

      ctx.fillStyle = stand.dark;
      ctx.fillRect(stand.x + 10, stand.y + 78, stand.w - 20, 8);
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.fillRect(stand.x + 15, stand.y + 79, stand.w - 30, 2);
      ctx.fillStyle = stand.color;
      ctx.fillRect(stand.x + 8, stand.y + stand.h - 17, stand.w - 16, 11);
      ctx.fillStyle = stand.dark;
      ctx.fillRect(stand.x + 21, stand.y + stand.h - 7, 18, 15);
      ctx.fillRect(stand.x + stand.w - 39, stand.y + stand.h - 7, 18, 15);

      ctx.fillStyle = stand.dark;
      ctx.beginPath();
      ctx.roundRect(stand.x + 22, stand.y - 16, stand.w - 44, 39, 11);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
      ctx.fillRect(stand.x + 35, stand.y - 10, stand.w - 70, 3);
      ctx.fillStyle = "#fff";
      ctx.font = "900 14px Trebuchet MS, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(stand.label, stand.x + stand.w / 2, stand.y + 8);
      ctx.restore();
    }

    drawStandHighlights(ctx) {
      const stand = this.nearby ? this.standsById.get(this.nearby.standId) : null;
      if (!stand || this.overlayPaused || this.manualPaused) return;
      const pulse = 0.32 + Math.sin(this.state.elapsed * 7) * 0.06;
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.fillStyle = "rgba(255, 224, 122, 0.08)";
      ctx.strokeStyle = "rgba(242, 173, 40, 0.72)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(stand.x - 4, stand.y - 19, stand.w + 20, stand.h + 31, 17);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    drawCheckout(ctx, obstacle) {
      ctx.save();
      ctx.fillStyle = "rgba(18, 45, 55, 0.18)";
      ctx.beginPath();
      ctx.ellipse(obstacle.x + obstacle.w / 2 + 12, obstacle.y + obstacle.h + 13, obstacle.w / 2 + 20, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = obstacle.dark;
      ctx.beginPath();
      ctx.moveTo(obstacle.x + obstacle.w, obstacle.y + 21);
      ctx.lineTo(obstacle.x + obstacle.w + 16, obstacle.y + 7);
      ctx.lineTo(obstacle.x + obstacle.w + 16, obstacle.y + obstacle.h - 8);
      ctx.lineTo(obstacle.x + obstacle.w, obstacle.y + obstacle.h);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = obstacle.color;
      ctx.beginPath();
      ctx.roundRect(obstacle.x, obstacle.y + 21, obstacle.w, obstacle.h - 21, 15);
      ctx.fill();

      ctx.fillStyle = "#3f7183";
      ctx.beginPath();
      ctx.moveTo(obstacle.x, obstacle.y + 21);
      ctx.lineTo(obstacle.x + 16, obstacle.y + 7);
      ctx.lineTo(obstacle.x + obstacle.w + 16, obstacle.y + 7);
      ctx.lineTo(obstacle.x + obstacle.w, obstacle.y + 21);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#d9e5e6";
      ctx.beginPath();
      ctx.roundRect(obstacle.x + 15, obstacle.y + 34, obstacle.w - 30, 34, 8);
      ctx.fill();
      ctx.fillStyle = "#8399a0";
      for (let x = obstacle.x + 27; x < obstacle.x + obstacle.w - 25; x += 22) {
        ctx.fillRect(x, obstacle.y + 39, 3, 24);
      }

      ctx.fillStyle = obstacle.light;
      ctx.beginPath();
      ctx.roundRect(obstacle.x + obstacle.w - 61, obstacle.y - 17, 43, 41, 8);
      ctx.fill();
      ctx.fillStyle = "#173b50";
      ctx.fillRect(obstacle.x + obstacle.w - 54, obstacle.y - 9, 29, 18);

      ctx.fillStyle = obstacle.light;
      ctx.beginPath();
      ctx.roundRect(obstacle.x + 19, obstacle.y + 81, obstacle.w - 38, 30, 8);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "900 15px Trebuchet MS, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("CAIXA", obstacle.x + obstacle.w / 2, obstacle.y + 102);
      ctx.restore();
    }

    drawCheckoutZone(ctx) {
      const available = this.state.found.length >= DATA.mission.required;
      ctx.save();
      ctx.fillStyle = available ? "rgba(49,185,148,.18)" : "rgba(96,122,128,.09)";
      ctx.strokeStyle = available ? "#218f73" : "#879da0";
      ctx.lineWidth = available ? 5 : 2;
      ctx.setLineDash(available ? [12, 8] : [6, 8]);
      ctx.beginPath();
      ctx.ellipse(this.checkout.x, this.checkout.y, 85, 47, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = available ? "#147b64" : "#667d80";
      ctx.font = "900 15px Trebuchet MS, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(available ? "FINALIZE AQUI" : "CAIXA BLOQUEADO", this.checkout.x, this.checkout.y + 5);
      ctx.restore();
    }

    drawProduct(ctx, product) {
      const resolved = this.state.reviewedProducts.has(product.id);
      const reviewed = this.state.reviewedProducts.has(product.id);
      const answerWasCorrect = this.state.answers.get(product.id)?.correct;
      const nearby = this.nearby?.id === product.id;
      const display = this.productDisplays.get(product.id);
      if (!display) return;

      if (nearby && !this.overlayPaused && !this.manualPaused) {
        const pulse = 0.72 + Math.sin(this.state.elapsed * 8) * 0.12;
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.strokeStyle = "#d58a00";
        ctx.fillStyle = "rgba(255, 246, 186, 0.48)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(product.interactionX, product.interactionY, 30, 11, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#b66a00";
        ctx.beginPath();
        ctx.moveTo(product.interactionX, product.interactionY - 15);
        ctx.lineTo(product.interactionX - 7, product.interactionY - 5);
        ctx.lineTo(product.interactionX + 7, product.interactionY - 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      ctx.save();
      ctx.translate(display.x, display.y);
      if (nearby) {
        const pulse = 1 + Math.sin(this.state.elapsed * 8) * 0.04;
        ctx.scale(pulse, pulse);
        ctx.fillStyle = "rgba(255, 224, 105, 0.28)";
        ctx.strokeStyle = "#c87300";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.roundRect(-41, -39, 82, 78, 13);
        ctx.fill();
        ctx.stroke();
      }
      if (resolved) ctx.globalAlpha = 0.42;
      ctx.fillStyle = "rgba(26,55,62,.19)";
      ctx.beginPath();
      ctx.ellipse(4, 35, 37, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.roundRect(-35, -33, 70, 66, 10);
      ctx.fill();
      ctx.fillStyle = "rgba(27, 58, 69, 0.11)";
      ctx.beginPath();
      ctx.moveTo(35, -27);
      ctx.lineTo(42, -33);
      ctx.lineTo(42, 25);
      ctx.lineTo(35, 33);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = product.color;
      this.drawProductIcon(ctx, product, 0, -10);
      ctx.fillStyle = "#203e4d";
      ctx.font = "900 10px Trebuchet MS, sans-serif";
      ctx.textAlign = "center";
      product.shortLabel.split("\n").forEach((line, index) => ctx.fillText(line, 0, 20 + index * 10));
      if (reviewed) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = answerWasCorrect ? "#16866a" : "#ad5a28";
        ctx.beginPath();
        ctx.arc(30, -28, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "900 15px Trebuchet MS, sans-serif";
        ctx.fillText(answerWasCorrect ? "✓" : "↻", 30, -23);
      }
      ctx.restore();
    }

    drawProductIcon(ctx, product, x = 0, y = -10) {
      ctx.save();
      if (product.icon === "perfume") {
        ctx.beginPath(); ctx.roundRect(x - 14, y - 12, 28, 27, 7); ctx.fill();
        ctx.fillRect(x - 5, y - 19, 10, 8); ctx.fillRect(x + 2, y - 22, 15, 4);
      } else if (product.icon === "can") {
        ctx.beginPath(); ctx.roundRect(x - 11, y - 21, 22, 39, 5); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,.75)"; ctx.fillRect(x - 8, y - 3, 16, 4);
      } else if (product.icon === "box") {
        ctx.beginPath(); ctx.roundRect(x - 16, y - 20, 32, 38, 4); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.font = "900 14px Trebuchet MS"; ctx.fillText("NaCl", x, y + 4);
      } else if (product.icon === "spray") {
        ctx.beginPath(); ctx.roundRect(x - 13, y - 15, 26, 33, 7); ctx.fill();
        ctx.fillRect(x - 5, y - 23, 10, 8); ctx.fillRect(x + 2, y - 25, 17, 5);
      } else {
        ctx.beginPath(); ctx.roundRect(x - 12, y - 17, 24, 35, 7); ctx.fill();
        ctx.fillRect(x - 5, y - 23, 10, 7);
        if (product.icon === "gel") {
          ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();
    }

    drawBenAndCart(ctx) {
      const cart = this.getCartTransform();
      const centerX = (this.state.ben.x + cart.x) / 2;
      const radiusX = Math.abs(this.state.ben.x - cart.x) / 2 + 42;
      ctx.save();
      ctx.fillStyle = "rgba(15, 45, 52, 0.16)";
      ctx.beginPath();
      ctx.ellipse(centerX, Math.max(this.state.ben.y, cart.y) + 23, radiusX, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      this.drawCartHandle(ctx, cart);
      this.drawWheel(ctx, cart.wheels[0].x, cart.wheels[0].y, this.state.cart.wheelAngle);
      this.drawBen(ctx);
      this.drawCartBasket(ctx, cart);
      this.drawWheel(ctx, cart.wheels[1].x, cart.wheels[1].y, this.state.cart.wheelAngle);
      this.drawCartProducts(ctx, cart);
      this.drawCelebration(ctx, cart);
    }

    drawCelebration(ctx, cart) {
      if (this.state.celebrationTime <= 0) return;
      const progress = 1 - this.state.celebrationTime / 0.9;
      const centerX = (this.state.ben.x + cart.x) / 2;
      const centerY = Math.min(this.state.ben.y, cart.y) - 45;
      ctx.save();
      for (let index = 0; index < 8; index += 1) {
        const angle = (Math.PI * 2 * index) / 8 + progress * 0.7;
        const radius = 48 + progress * 34;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius * 0.55;
        ctx.fillStyle = index % 2 ? "#f0b62e" : "#25aa8b";
        ctx.beginPath();
        ctx.arc(x, y, 4 + (index % 3), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    drawWheel(ctx, x, y, angle) {
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = "#193d4d";
      ctx.beginPath(); ctx.arc(0, 0, 9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#dce9e6";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.stroke();
      ctx.rotate(angle);
      for (let i = 0; i < 3; i += 1) {
        ctx.rotate((Math.PI * 2) / 3);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(6, 0); ctx.stroke();
      }
      ctx.fillStyle = "#f4c45b";
      ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    drawCartHandle(ctx, transform = this.getCartTransform()) {
      ctx.save();
      ctx.strokeStyle = "#244a5e";
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(transform.handle.start.x, transform.handle.start.y);
      ctx.lineTo(transform.handle.end.x, transform.handle.end.y);
      ctx.stroke();
      ctx.restore();
    }

    drawCartBasket(ctx, transform = this.getCartTransform()) {
      ctx.save();
      ctx.translate(transform.x, transform.y);
      ctx.rotate(transform.angle);
      ctx.scale(transform.scaleX, 1);
      ctx.strokeStyle = "#244a5e";
      ctx.lineWidth = 5;
      ctx.lineJoin = "round";
      ctx.fillStyle = "rgba(72,157,178,.38)";
      ctx.beginPath();
      ctx.moveTo(-60, -30); ctx.lineTo(-48, 16); ctx.lineTo(25, 16); ctx.lineTo(34, -19); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }

    drawCartProducts(ctx, transform = this.getCartTransform()) {
      ctx.save();
      ctx.translate(transform.x, transform.y);
      ctx.rotate(transform.angle);
      ctx.scale(transform.scaleX, 1);
      this.state.found.forEach((id, index) => {
        const product = this.productsById.get(id);
        if (!product) return;
        ctx.save();
        ctx.translate(-42 + index * 20, -8 - (index % 2) * 7);
        ctx.scale(0.43, 0.43);
        ctx.fillStyle = product.color;
        this.drawProductIcon(ctx, product, 0, 0);
        ctx.restore();
      });
      ctx.restore();
    }

    drawBen(ctx) {
      const ben = this.state.ben;
      const moving = ben.isMoving;
      const step = moving ? Math.sin(ben.walkTime * 11) : 0;
      const celebrating = this.state.celebrationTime > 0;
      const celebrationPhase = celebrating ? Math.sin((0.9 - this.state.celebrationTime) * 22) : 0;
      const bob = (moving ? Math.abs(step) * -3 : 0) - (celebrating ? Math.abs(celebrationPhase) * 10 : 0);
      const lean = moving ? (this.lastDirection === "left" ? -0.035 : this.lastDirection === "right" ? 0.035 : 0) : 0;
      let visualX = ben.x;
      let visualY = ben.y;
      if (this.lastDirection === "right") visualX += 12;
      else if (this.lastDirection === "left") visualX -= 12;
      else if (this.lastDirection === "up") visualY -= 20;
      else visualY += 25;
      ctx.save();
      ctx.translate(visualX, visualY - 40 + bob);
      ctx.rotate(lean + (celebrating ? celebrationPhase * 0.025 : 0));
      if (celebrating) ctx.scale(1 + Math.abs(celebrationPhase) * 0.035, 1 + Math.abs(celebrationPhase) * 0.035);
      if (this.imageLoaded) {
        const source = this.benBodyCanvas || this.image;
        ctx.drawImage(source, -75, -78, 150, this.benBodyCanvas ? 104 : 150);
      } else {
        ctx.fillStyle = "#39b995"; ctx.beginPath(); ctx.arc(0, -22, 26, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    overlapArea(a, b) {
      const width = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
      const height = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
      return width * height;
    }

    getUnitVisualBounds() {
      const cart = this.getCartTransform();
      const left = Math.min(this.state.ben.x - 78, cart.x - 45);
      const right = Math.max(this.state.ben.x + 78, cart.x + 45);
      const top = Math.min(this.state.ben.y - 138, cart.y - 38);
      const bottom = Math.max(this.state.ben.y + 32, cart.y + 34);
      return { x: left, y: top, w: right - left, h: bottom - top };
    }

    getProximityCardPosition(product, cardW, cardH) {
      const margin = 12;
      const unitBox = this.getUnitVisualBounds();
      const productBox = { x: product.displayX - 45, y: product.displayY - 43, w: 90, h: 86 };
      const markerBox = { x: product.interactionX - 34, y: product.interactionY - 18, w: 68, h: 36 };
      const vertical = product.displayY - cardH - 18;
      const candidates = [
        { x: product.displayX + 58, y: vertical },
        { x: product.displayX - cardW - 58, y: vertical },
        { x: product.displayX + 58, y: unitBox.y + unitBox.h + 8 },
        { x: product.displayX - cardW - 58, y: unitBox.y + unitBox.h + 8 },
        { x: product.displayX + 58, y: unitBox.y - cardH - 8 },
        { x: product.displayX - cardW - 58, y: unitBox.y - cardH - 8 },
        { x: product.interactionX - cardW / 2, y: product.interactionY + 38 },
        { x: product.interactionX - cardW / 2, y: product.interactionY - cardH - 38 }
      ];
      let best = null;
      candidates.forEach((candidate, index) => {
        const x = Math.max(this.cameraBounds.left + margin, Math.min(this.cameraBounds.right - cardW - margin, candidate.x));
        const y = Math.max(58, Math.min(WORLD.height - cardH - 16, candidate.y));
        const box = { x, y, w: cardW, h: cardH };
        const score =
          this.overlapArea(box, productBox) * 50 +
          this.overlapArea(box, unitBox) * 20 +
          this.overlapArea(box, markerBox) * 8 +
          index;
        if (!best || score < best.score) best = { x, y, score };
      });
      return best;
    }

    drawProximityCard(ctx, product) {
      const cardW = product.id === "antiseptic" ? 270 : 235;
      const cardH = 118;
      const { x, y } = this.getProximityCardPosition(product, cardW, cardH);
      ctx.save();
      ctx.fillStyle = "rgba(8,35,49,.22)";
      ctx.beginPath(); ctx.roundRect(x + 6, y + 7, cardW, cardH, 14); ctx.fill();
      ctx.fillStyle = "#fffdf7";
      ctx.strokeStyle = "#173b50";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(x, y, cardW, cardH, 14); ctx.fill(); ctx.stroke();
      ctx.textAlign = "left";
      ctx.fillStyle = "#14364b";
      ctx.font = "900 16px Trebuchet MS, sans-serif";
      ctx.fillText(product.name, x + 14, y + 24);
      ctx.fillStyle = "#526b7b";
      ctx.font = "700 13px Trebuchet MS, sans-serif";
      ctx.fillText(product.compound, x + 14, y + 45, cardW - 28);
      ctx.fillStyle = "#173247";
      ctx.font = "900 15px Trebuchet MS, sans-serif";
      ctx.fillText(product.formula, x + 14, y + 67, cardW - 28);
      ctx.font = "800 12px Trebuchet MS, sans-serif";
      ctx.fillText(product.structure, x + 14, y + 86, cardW - 28);
      ctx.fillStyle = "#147b64";
      ctx.font = "900 13px Trebuchet MS, sans-serif";
      ctx.fillText("E — Analisar", x + 14, y + 106);
      ctx.restore();
    }

    drawWorldLabels(ctx) {
      ctx.save();
      ctx.fillStyle = "#244d5f"; ctx.font = "900 17px Trebuchet MS"; ctx.textAlign = "center";
      ctx.fillText("ENTRADA", 600, 625);
      ctx.fillStyle = "#67848b"; ctx.font = "700 12px Trebuchet MS";
      ctx.fillText("Explore, analise e decida", 600, 649);
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.roundRect(26, 16, 112, 29, 10); ctx.fill();
      ctx.fillStyle = "#2b6573"; ctx.font = "900 12px Trebuchet MS";
      ctx.fillText("MERCADO BEN", 82, 36);
      ctx.restore();
    }

    debugSetPosition(x, y) {
      this.state.ben.x = x;
      this.state.ben.y = y;
      this.updateNearby();
      this.syncDomState();
    }

    debugSnapshot() {
      return {
        x: Math.round(this.state.ben.x),
        y: Math.round(this.state.ben.y),
        score: this.state.score,
        elapsed: this.state.elapsed,
        found: [...this.state.found],
        collectedProducts: [...this.state.collectedProducts],
        reviewedProducts: [...this.state.reviewedProducts],
        answers: [...this.state.answers.entries()].map(([productId, answer]) => ({ productId, ...answer })),
        hintsUsed: this.currentHintsUsed,
        errors: this.state.errors,
        paused: this.manualPaused || this.overlayPaused,
        imageLoaded: this.imageLoaded,
        nearby: this.nearby?.id || null,
        analysis: this.currentAnalysis?.id || null,
        checkoutNearby: this.checkoutNearby,
        nearbyStand: this.nearby?.standId || null,
        listOpen: this.listOpen,
        walkTime: this.state.ben.walkTime,
        isMoving: this.state.ben.isMoving,
        wheelAngle: this.state.cart.wheelAngle,
        celebrationTime: this.state.celebrationTime,
        renderDpr: this.renderDpr,
        staticSceneBuilds: this.staticSceneBuilds,
        animationActive: this.isAnimationActive()
      };
    }
  }

  window.BenGame = BenGame;
  window.addEventListener("DOMContentLoaded", () => {
    const ui = new window.BenUI();
    const game = new BenGame(ui);
    ui.attachGame(game);
    window.benGame = game;
    window.benUI = ui;
  });
})();
