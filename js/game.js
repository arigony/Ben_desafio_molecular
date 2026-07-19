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
      this.tone(523.25, 0.15, "sine", 0);
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
      this.image = new Image();
      this.image.src = "assets/ben.png";
      this.imageLoaded = false;
      this.image.addEventListener("load", () => {
        this.imageLoaded = true;
        this.draw();
      });
      this.image.addEventListener("error", () => {
        this.ui.setDescription("Não foi possível carregar a imagem oficial do Ben.");
      });

      this.obstacles = [
        { x: 145, y: 120, w: 420, h: 112, kind: "shelf", label: "HIGIENE & BELEZA" },
        { x: 640, y: 120, w: 420, h: 112, kind: "shelf", label: "CUIDADOS PESSOAIS" },
        { x: 145, y: 445, w: 420, h: 112, kind: "shelf", label: "MERCEARIA" },
        { x: 640, y: 445, w: 285, h: 112, kind: "shelf", label: "BEBIDAS" },
        { x: 1000, y: 442, w: 175, h: 114, kind: "checkout", label: "CAIXA" }
      ];
      this.checkout = { x: 1080, y: 607, radius: 80 };
      this.keys = new Set();
      this.touchDirections = new Set();
      this.lastFrame = performance.now();
      this.raf = null;
      this.running = false;
      this.manualPaused = false;
      this.overlayPaused = false;
      this.completionPresented = false;
      this.lastDirection = "up";
      this.nearby = null;
      this.checkoutNearby = false;
      this.portraitCamera = false;
      this.state = this.freshState();
      this.bindInput();
      this.resizeCanvas();
      window.addEventListener("resize", () => this.resizeCanvas());
      document.addEventListener("visibilitychange", () => {
        if (document.hidden && this.running && !this.manualPaused && !this.overlayPaused) this.togglePause(true);
      });
      this.draw();
    }

    freshState() {
      return {
        ben: { x: 600, y: 620, speed: 225 },
        score: 0,
        elapsed: 0,
        found: [],
        attempted: new Set(),
        errors: 0,
        phase: "explore"
      };
    }

    bindInput() {
      const movementKeys = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", "W", "A", "S", "D"]);
      window.addEventListener("keydown", (event) => {
        if (!this.running) return;
        if (movementKeys.has(event.key)) {
          event.preventDefault();
          this.keys.add(event.key.toLowerCase());
          if (!event.repeat && !this.manualPaused && !this.overlayPaused) {
            this.nudgeFromKey(event.key.toLowerCase());
          }
        }
        if ((event.code === "Space" || event.key === "Enter") && !event.repeat && !this.manualPaused && !this.overlayPaused) {
          event.preventDefault();
          this.interact();
        }
        if ((event.key === "p" || event.key === "P" || event.key === "Escape") && !event.repeat && !this.overlayPaused) {
          event.preventDefault();
          this.togglePause();
        }
      });
      window.addEventListener("keyup", (event) => this.keys.delete(event.key.toLowerCase()));
      window.addEventListener("blur", () => {
        this.keys.clear();
        this.touchDirections.clear();
      });

      document.querySelectorAll("[data-direction]").forEach((button) => {
        const begin = (event) => {
          event.preventDefault();
          button.setPointerCapture?.(event.pointerId);
          this.touchDirections.add(button.dataset.direction);
          button.classList.add("is-active");
        };
        const end = (event) => {
          event.preventDefault();
          this.touchDirections.delete(button.dataset.direction);
          button.classList.remove("is-active");
        };
        button.addEventListener("pointerdown", begin);
        button.addEventListener("pointerup", end);
        button.addEventListener("pointercancel", end);
        button.addEventListener("pointerleave", end);
      });
      document.getElementById("touch-interact-button").addEventListener("click", () => this.interact());
    }

    start() {
      this.sound.unlock();
      this.state = this.freshState();
      this.keys.clear();
      this.touchDirections.clear();
      this.running = true;
      this.manualPaused = false;
      this.overlayPaused = false;
      this.completionPresented = false;
      this.nearby = null;
      this.checkoutNearby = false;
      this.lastDirection = "up";
      this.lastFrame = performance.now();
      this.ui.reset();
      this.ui.showScreen("game-screen");
      requestAnimationFrame(() => this.resizeCanvas());
      this.ui.updateHUD(this.state);
      this.syncDomState();
      this.ui.setDescription("Ben está na entrada. Explore os corredores e aproxime-se de um produto para analisá-lo.");
      if (!this.raf) this.raf = requestAnimationFrame((time) => this.loop(time));
    }

    loop(time) {
      const delta = Math.min((time - this.lastFrame) / 1000, 0.05);
      this.lastFrame = time;
      if (this.running && !this.manualPaused && !this.overlayPaused) {
        this.update(delta);
      }
      this.draw();
      this.raf = requestAnimationFrame((nextTime) => this.loop(nextTime));
    }

    update(delta) {
      this.state.elapsed += delta;
      const direction = this.getMovementVector();
      if (direction.x || direction.y) {
        const length = Math.hypot(direction.x, direction.y);
        direction.x /= length;
        direction.y /= length;
        const amount = this.state.ben.speed * delta;
        this.moveBen(direction.x * amount, direction.y * amount);
        if (Math.abs(direction.x) > Math.abs(direction.y)) this.lastDirection = direction.x > 0 ? "right" : "left";
        else this.lastDirection = direction.y > 0 ? "down" : "up";
      }
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

    nudgeFromKey(key) {
      const step = 8;
      if (key === "arrowleft" || key === "a") {
        this.moveBen(-step, 0);
        this.lastDirection = "left";
      } else if (key === "arrowright" || key === "d") {
        this.moveBen(step, 0);
        this.lastDirection = "right";
      } else if (key === "arrowup" || key === "w") {
        this.moveBen(0, -step);
        this.lastDirection = "up";
      } else if (key === "arrowdown" || key === "s") {
        this.moveBen(0, step);
        this.lastDirection = "down";
      }
      this.updateNearby();
      this.syncDomState();
    }

    moveBen(dx, dy) {
      const ben = this.state.ben;
      const nextX = Math.max(38, Math.min(WORLD.width - 38, ben.x + dx));
      if (!this.collides(nextX, ben.y)) ben.x = nextX;
      const nextY = Math.max(54, Math.min(WORLD.height - 34, ben.y + dy));
      if (!this.collides(ben.x, nextY)) ben.y = nextY;
    }

    collides(x, y) {
      const body = { x: x - 20, y: y - 24, w: 40, h: 46 };
      return this.obstacles.some(
        (obstacle) =>
          body.x < obstacle.x + obstacle.w &&
          body.x + body.w > obstacle.x &&
          body.y < obstacle.y + obstacle.h &&
          body.y + body.h > obstacle.y
      );
    }

    updateNearby() {
      const ben = this.state.ben;
      let closest = null;
      let closestDistance = Infinity;
      DATA.products.forEach((product) => {
        if (this.state.attempted.has(product.id)) return;
        const distance = Math.hypot(ben.x - product.x, ben.y - product.y);
        if (distance < 82 && distance < closestDistance) {
          closest = product;
          closestDistance = distance;
        }
      });
      this.nearby = closest;
      this.checkoutNearby =
        this.state.found.length === DATA.mission.required &&
        Math.hypot(ben.x - this.checkout.x, ben.y - this.checkout.y) < this.checkout.radius;
      if (this.checkoutNearby) {
        this.ui.setPrompt(true, "Pressione para finalizar no caixa");
        this.ui.setDescription("Ben chegou ao caixa com a lista completa. Pressione Espaço, Enter ou Analisar para finalizar.");
      } else if (closest) {
        this.ui.setPrompt(true);
        this.ui.setDescription(`${closest.name} está próximo. Pressione Espaço, Enter ou Analisar para investigar.`);
      } else {
        this.ui.setPrompt(false);
      }
    }

    interact() {
      if (!this.running || this.manualPaused || this.overlayPaused) return;
      this.updateNearby();
      if (this.checkoutNearby) {
        this.finish();
        return;
      }
      const product = this.nearby;
      if (!product) return;
      this.state.attempted.add(product.id);
      this.overlayPaused = true;
      let points;
      if (product.correct) {
        points = DATA.mission.correctPoints;
        this.state.score += points;
        this.state.found.push(product.id);
        this.ui.markFound(product, this.state.found.length);
        this.sound.correct();
      } else {
        points = -DATA.mission.wrongPenalty;
        this.state.score = Math.max(0, this.state.score + points);
        this.state.errors += 1;
        this.sound.wrong();
      }
      this.nearby = null;
      this.ui.setPrompt(false);
      this.ui.updateHUD(this.state);
      this.syncDomState();
      const completesList = product.correct && this.state.found.length === DATA.mission.required;
      this.ui.showFeedback(product, points, completesList);
    }

    resumeAfterOverlay() {
      this.overlayPaused = false;
      this.lastFrame = performance.now();
    }

    presentCompletion() {
      this.overlayPaused = true;
      this.completionPresented = true;
      this.state.phase = "checkout";
      this.ui.showCompletion();
    }

    continueToCheckout() {
      this.ui.showScreen("game-screen");
      this.overlayPaused = false;
      this.lastFrame = performance.now();
      this.ui.setDescription("Lista completa. Leve Ben ao caixa destacado no canto inferior direito.");
    }

    togglePause(force) {
      if (!this.running || this.overlayPaused) return;
      this.manualPaused = typeof force === "boolean" ? force : !this.manualPaused;
      this.keys.clear();
      this.touchDirections.clear();
      if (this.manualPaused) this.ui.showPause();
      else {
        this.ui.hidePause();
        this.lastFrame = performance.now();
      }
    }

    toggleMute() {
      this.sound.unlock();
      this.sound.setMuted(!this.sound.muted);
      this.ui.setMuted(this.sound.muted);
    }

    finish() {
      this.running = false;
      this.overlayPaused = true;
      this.ui.setPrompt(false);
      const elapsed = Math.floor(this.state.elapsed);
      const timeBonus = Math.max(0, 180 - elapsed);
      const score = this.state.score + DATA.mission.completionBonus + timeBonus;
      let rating = 1;
      if (this.state.errors === 0 && elapsed <= 180) rating = 3;
      else if (this.state.errors <= 2 && elapsed <= 300) rating = 2;
      const titles = {
        3: "Excelente investigação!",
        2: "Bom desempenho!",
        1: "Missão concluída!"
      };
      const messages = {
        3: "Três moléculas! Você reconheceu os álcoois com precisão e concluiu a missão rapidamente.",
        2: "Duas moléculas! Você concluiu a lista e demonstrou bom domínio. Revise os feedbacks para ficar ainda melhor.",
        1: "Uma molécula! A missão foi concluída, mas vale revisar as diferenças entre álcool, cetona, ácido carboxílico e éster."
      };
      this.sound.complete();
      this.ui.showResult({
        title: titles[rating],
        message: messages[rating],
        score,
        correct: this.state.found.length,
        errors: this.state.errors,
        elapsed,
        timeBonus,
        rating
      });
    }

    resizeCanvas() {
      const wrap = document.getElementById("canvas-wrap");
      if (!wrap) return;
      const availableWidth = wrap.clientWidth || WORLD.width;
      const availableHeight = wrap.clientHeight || WORLD.height;
      this.portraitCamera = window.innerWidth <= 600 && window.innerHeight > window.innerWidth;
      if (this.portraitCamera) {
        if (this.canvas.width !== 600) this.canvas.width = 600;
        if (this.canvas.height !== 800) this.canvas.height = 800;
        this.canvas.style.width = `${Math.max(1, availableWidth)}px`;
        this.canvas.style.height = `${Math.max(1, availableHeight)}px`;
        return;
      }
      if (this.canvas.width !== WORLD.width) this.canvas.width = WORLD.width;
      if (this.canvas.height !== WORLD.height) this.canvas.height = WORLD.height;
      const ratio = WORLD.width / WORLD.height;
      let width = availableWidth;
      let height = width / ratio;
      if (height > availableHeight) {
        height = availableHeight;
        width = height * ratio;
      }
      this.canvas.style.width = `${Math.max(1, width)}px`;
      this.canvas.style.height = `${Math.max(1, height)}px`;
    }

    syncDomState() {
      this.canvas.dataset.benX = String(Math.round(this.state.ben.x));
      this.canvas.dataset.benY = String(Math.round(this.state.ben.y));
      this.canvas.dataset.score = String(this.state.score);
      this.canvas.dataset.found = String(this.state.found.length);
      this.canvas.dataset.phase = this.state.phase;
    }

    draw() {
      const ctx = this.ctx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      if (this.portraitCamera) {
        const scale = this.canvas.height / WORLD.height;
        const viewWidth = this.canvas.width / scale;
        const cameraX = Math.max(0, Math.min(WORLD.width - viewWidth, this.state.ben.x - viewWidth / 2));
        ctx.setTransform(scale, 0, 0, scale, -cameraX * scale, 0);
      }
      this.drawFloor(ctx);
      this.obstacles.forEach((obstacle) => this.drawObstacle(ctx, obstacle));
      this.drawCheckoutZone(ctx);
      DATA.products.forEach((product) => this.drawProduct(ctx, product));
      this.drawCart(ctx);
      this.drawBen(ctx);
      this.drawWorldLabels(ctx);
      if (this.manualPaused) {
        ctx.fillStyle = "rgba(11, 39, 54, 0.22)";
        ctx.fillRect(0, 0, WORLD.width, WORLD.height);
      }
    }

    drawFloor(ctx) {
      ctx.fillStyle = "#eef1df";
      ctx.fillRect(0, 0, WORLD.width, WORLD.height);
      ctx.strokeStyle = "rgba(49, 103, 94, 0.09)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= WORLD.width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, WORLD.height);
        ctx.stroke();
      }
      for (let y = 0; y <= WORLD.height; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(WORLD.width, y);
        ctx.stroke();
      }
      ctx.fillStyle = "#d7e9d8";
      ctx.fillRect(0, 0, WORLD.width, 58);
      ctx.fillStyle = "#fff8e9";
      ctx.beginPath();
      ctx.roundRect(450, 575, 300, 82, 28);
      ctx.fill();
      ctx.strokeStyle = "#9bcdbf";
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 10]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    drawObstacle(ctx, obstacle) {
      if (obstacle.kind === "checkout") {
        ctx.save();
        ctx.fillStyle = "#234f66";
        ctx.beginPath();
        ctx.roundRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h, 16);
        ctx.fill();
        ctx.fillStyle = "#f7c852";
        ctx.beginPath();
        ctx.roundRect(obstacle.x + 8, obstacle.y + 8, obstacle.w - 16, 27, 9);
        ctx.fill();
        ctx.fillStyle = "#14364b";
        ctx.beginPath();
        ctx.roundRect(obstacle.x + 115, obstacle.y - 27, 43, 43, 6);
        ctx.fill();
        ctx.fillStyle = "#bce6d9";
        ctx.fillRect(obstacle.x + 123, obstacle.y - 19, 27, 15);
        ctx.fillStyle = "#fff";
        ctx.font = "800 15px Nunito, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("CAIXA", obstacle.x + obstacle.w / 2, obstacle.y + 27);
        ctx.restore();
        return;
      }
      ctx.save();
      ctx.shadowColor = "rgba(25, 59, 67, 0.16)";
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 7;
      ctx.fillStyle = "#fffdf7";
      ctx.beginPath();
      ctx.roundRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h, 16);
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.fillStyle = "#244b5e";
      ctx.beginPath();
      ctx.roundRect(obstacle.x, obstacle.y, obstacle.w, 32, [16, 16, 0, 0]);
      ctx.fill();
      ctx.fillStyle = "#ecbd57";
      ctx.fillRect(obstacle.x + 8, obstacle.y + 58, obstacle.w - 16, 9);
      ctx.fillStyle = "#d9e7e2";
      ctx.fillRect(obstacle.x + 8, obstacle.y + 89, obstacle.w - 16, 9);
      ctx.fillStyle = "rgba(81, 115, 122, 0.18)";
      ctx.beginPath();
      for (let x = obstacle.x + 24; x < obstacle.x + obstacle.w - 12; x += 43) {
        ctx.roundRect(x, obstacle.y + 43, 27, 17, 4);
        ctx.roundRect(x, obstacle.y + 72, 27, 15, 4);
      }
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "800 13px Nunito, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(obstacle.label, obstacle.x + obstacle.w / 2, obstacle.y + 21);
      ctx.restore();
    }

    drawCheckoutZone(ctx) {
      const available = this.state.found.length === DATA.mission.required;
      ctx.save();
      ctx.fillStyle = available ? "rgba(49, 185, 148, 0.18)" : "rgba(96, 122, 128, 0.09)";
      ctx.strokeStyle = available ? "#31b994" : "#9cb0b2";
      ctx.lineWidth = available ? 5 : 2;
      ctx.setLineDash(available ? [12, 8] : [6, 8]);
      ctx.beginPath();
      ctx.ellipse(this.checkout.x, this.checkout.y, 85, 47, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = available ? "#147b64" : "#789093";
      ctx.font = "900 15px Nunito, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(available ? "FINALIZE AQUI" : "CAIXA BLOQUEADO", this.checkout.x, this.checkout.y + 5);
      ctx.restore();
    }

    drawProduct(ctx, product) {
      const attempted = this.state.attempted.has(product.id);
      const found = this.state.found.includes(product.id);
      const nearby = this.nearby?.id === product.id;
      ctx.save();
      if (nearby) {
        const pulse = 1 + Math.sin(performance.now() / 180) * 0.08;
        ctx.strokeStyle = "#f0a43c";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(product.x, product.y, 48 * pulse, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (attempted && !found) ctx.globalAlpha = 0.45;
      if (found) ctx.globalAlpha = 0.22;
      ctx.shadowColor = "rgba(18, 58, 67, 0.22)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 5;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.roundRect(product.x - 39, product.y - 34, 78, 66, 12);
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.fillStyle = product.color;
      this.drawProductIcon(ctx, product);
      ctx.fillStyle = "#203e4d";
      ctx.font = "900 10px Nunito, sans-serif";
      ctx.textAlign = "center";
      const lines = product.shortLabel.split("\n");
      lines.forEach((line, index) => ctx.fillText(line, product.x, product.y + 20 + index * 10));
      if (attempted) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = found ? "#21a982" : "#9b5960";
        ctx.beginPath();
        ctx.arc(product.x + 31, product.y - 28, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "900 17px Nunito, sans-serif";
        ctx.fillText(found ? "✓" : "×", product.x + 31, product.y - 22);
      }
      ctx.restore();
    }

    drawProductIcon(ctx, product) {
      const x = product.x;
      const y = product.y - 13;
      ctx.save();
      if (product.icon === "perfume") {
        ctx.beginPath();
        ctx.roundRect(x - 14, y - 12, 28, 27, 7);
        ctx.fill();
        ctx.fillRect(x - 5, y - 19, 10, 8);
        ctx.fillRect(x + 2, y - 22, 15, 4);
      } else if (product.icon === "can") {
        ctx.beginPath();
        ctx.roundRect(x - 11, y - 21, 22, 39, 5);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,.75)";
        ctx.fillRect(x - 8, y - 3, 16, 4);
      } else if (product.icon === "box") {
        ctx.beginPath();
        ctx.roundRect(x - 16, y - 20, 32, 38, 4);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "900 14px Nunito, sans-serif";
        ctx.fillText("NaCl", x, y + 4);
      } else if (product.icon === "spray") {
        ctx.beginPath();
        ctx.roundRect(x - 13, y - 15, 26, 33, 7);
        ctx.fill();
        ctx.fillRect(x - 5, y - 23, 10, 8);
        ctx.fillRect(x + 2, y - 25, 17, 5);
      } else {
        ctx.beginPath();
        ctx.roundRect(x - 12, y - 17, 24, 35, 7);
        ctx.fill();
        ctx.fillRect(x - 5, y - 23, 10, 7);
        if (product.icon === "gel") {
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    drawCart(ctx) {
      const ben = this.state.ben;
      const offsets = {
        up: { x: 48, y: 10, flip: 1 },
        down: { x: 50, y: 13, flip: 1 },
        left: { x: -55, y: 10, flip: -1 },
        right: { x: 55, y: 10, flip: 1 }
      };
      const offset = offsets[this.lastDirection];
      const x = ben.x + offset.x;
      const y = ben.y + offset.y;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(offset.flip, 1);
      ctx.strokeStyle = "#244a5e";
      ctx.lineWidth = 5;
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(-30, -25);
      ctx.lineTo(-22, 14);
      ctx.lineTo(25, 14);
      ctx.lineTo(32, -17);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = "rgba(72, 157, 178, 0.38)";
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(30, -18);
      ctx.lineTo(46, -27);
      ctx.stroke();
      ctx.fillStyle = "#244a5e";
      ctx.beginPath();
      ctx.arc(-14, 23, 7, 0, Math.PI * 2);
      ctx.arc(20, 23, 7, 0, Math.PI * 2);
      ctx.fill();
      this.state.found.forEach((id, index) => {
        const product = DATA.products.find((item) => item.id === id);
        ctx.fillStyle = product.color;
        ctx.beginPath();
        ctx.roundRect(-18 + index * 14, -14 - (index % 2) * 6, 14, 19, 3);
        ctx.fill();
      });
      ctx.restore();
    }

    drawBen(ctx) {
      const ben = this.state.ben;
      ctx.save();
      ctx.shadowColor = "rgba(20, 50, 55, 0.28)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 7;
      ctx.fillStyle = "rgba(20, 50, 55, 0.18)";
      ctx.beginPath();
      ctx.ellipse(ben.x, ben.y + 20, 33, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = "transparent";
      if (this.imageLoaded) {
        ctx.drawImage(this.image, ben.x - 88, ben.y - 146, 176, 176);
      } else {
        ctx.fillStyle = "#39b995";
        ctx.beginPath();
        ctx.arc(ben.x, ben.y - 25, 30, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    drawWorldLabels(ctx) {
      ctx.save();
      ctx.fillStyle = "#244d5f";
      ctx.font = "900 17px Nunito, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("ENTRADA", 600, 625);
      ctx.fillStyle = "#67848b";
      ctx.font = "700 12px Nunito, sans-serif";
      ctx.fillText("Explore os corredores e observe os produtos", 600, 649);
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.roundRect(26, 16, 100, 29, 10);
      ctx.fill();
      ctx.fillStyle = "#2b6573";
      ctx.font = "900 12px Nunito, sans-serif";
      ctx.fillText("MERCADO BEN", 76, 36);
      ctx.restore();
    }

    // Pequenos ganchos de diagnóstico usados apenas pelos testes locais.
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
        attempted: [...this.state.attempted],
        errors: this.state.errors,
        paused: this.manualPaused || this.overlayPaused,
        imageLoaded: this.imageLoaded,
        nearby: this.nearby?.id || null,
        checkoutNearby: this.checkoutNearby
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
