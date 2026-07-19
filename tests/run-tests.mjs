import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const results = [];

async function test(name, fn) {
  try {
    await fn();
    results.push({ name, status: "OK" });
  } catch (error) {
    results.push({ name, status: "FALHOU", message: error.message });
  }
}

class FakeClassList {
  add() {}
  remove() {}
  toggle() {}
}

class FakeElement {
  constructor(id = "") {
    this.id = id;
    this.dataset = {};
    this.listeners = new Map();
    this.classList = new FakeClassList();
    this.style = {};
    this.hidden = false;
    this.clientWidth = 1000;
    this.clientHeight = 560;
    this.width = 1200;
    this.height = 675;
  }

  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(handler);
  }

  dispatch(type, extras = {}) {
    const event = {
      preventDefault() {},
      pointerId: 1,
      ...extras
    };
    for (const handler of this.listeners.get(type) || []) handler(event);
  }

  setPointerCapture() {}

  getContext() {
    return new Proxy(
      {},
      {
        get(target, property) {
          if (!(property in target)) target[property] = () => {};
          return target[property];
        },
        set(target, property, value) {
          target[property] = value;
          return true;
        }
      }
    );
  }
}

function createHarness() {
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) elements.set(id, new FakeElement(id));
    return elements.get(id);
  };
  const directions = ["up", "left", "down", "right"].map((direction) => {
    const button = new FakeElement(`direction-${direction}`);
    button.dataset.direction = direction;
    return button;
  });
  const windowListeners = new Map();
  const documentListeners = new Map();
  const fakeWindow = {
    BEN_GAME_DATA: null,
    AudioContext: null,
    webkitAudioContext: null,
    addEventListener(type, handler) {
      if (!windowListeners.has(type)) windowListeners.set(type, []);
      windowListeners.get(type).push(handler);
    }
  };
  const fakeDocument = {
    hidden: false,
    getElementById: element,
    querySelectorAll(selector) {
      return selector === "[data-direction]" ? directions : [];
    },
    addEventListener(type, handler) {
      if (!documentListeners.has(type)) documentListeners.set(type, []);
      documentListeners.get(type).push(handler);
    }
  };
  class FakeImage {
    constructor() {
      this.listeners = new Map();
    }
    addEventListener(type, handler) {
      this.listeners.set(type, handler);
    }
    set src(value) {
      this._src = value;
    }
  }
  const context = vm.createContext({
    window: fakeWindow,
    document: fakeDocument,
    Image: FakeImage,
    performance: { now: () => 1000 },
    requestAnimationFrame: () => 1,
    cancelAnimationFrame: () => {},
    console,
    Set,
    Map,
    Math,
    Number,
    String,
    Boolean,
    Object,
    Array
  });
  vm.runInContext(fs.readFileSync(path.join(root, "js", "data.js"), "utf8"), context, { filename: "data.js" });
  vm.runInContext(fs.readFileSync(path.join(root, "js", "game.js"), "utf8"), context, { filename: "game.js" });
  const uiCalls = { feedback: [], results: [], prompts: [], found: [] };
  const ui = {
    reset() {},
    showScreen() {},
    updateHUD() {},
    setDescription() {},
    setPrompt(...args) {
      uiCalls.prompts.push(args);
    },
    markFound(product) {
      uiCalls.found.push(product.id);
    },
    showFeedback(product, points, completes) {
      uiCalls.feedback.push({ id: product.id, points, completes });
    },
    showCompletion() {},
    showPause() {},
    hidePause() {},
    setMuted() {},
    showResult(result) {
      uiCalls.results.push(result);
    }
  };
  const game = new fakeWindow.BenGame(ui);
  const key = (value, code = "") => {
    const event = { key: value, code, repeat: false, preventDefault() {} };
    for (const handler of windowListeners.get("keydown") || []) handler(event);
  };
  return { game, uiCalls, key, directions, data: fakeWindow.BEN_GAME_DATA, element };
}

await test("1. index.html existe e referencia os arquivos principais", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(html, /js\/data\.js/);
  assert.match(html, /js\/ui\.js/);
  assert.match(html, /js\/game\.js/);
  assert.match(html, /style\.css/);
});

await test("2. assets/ben.png é PNG com canal alfa", () => {
  const png = fs.readFileSync(path.join(root, "assets", "ben.png"));
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(png[25], 6, "o tipo de cor do PNG deve ser RGBA");
});

await test("3. scripts JavaScript carregam sem erro de sintaxe/execução", () => {
  const harness = createHarness();
  assert.ok(harness.game);
});

await test("4. movimento por WASD altera a posição", () => {
  const { game, key } = createHarness();
  game.start();
  const before = game.debugSnapshot();
  key("d");
  game.update(0.05);
  assert.ok(game.debugSnapshot().x > before.x);
});

await test("5. movimento pelas setas altera a posição", () => {
  const { game, key } = createHarness();
  game.start();
  const before = game.debugSnapshot();
  key("ArrowLeft");
  game.update(0.05);
  assert.ok(game.debugSnapshot().x < before.x);
});

await test("6. controle móvel direcional movimenta Ben", () => {
  const { game, directions } = createHarness();
  game.start();
  const before = game.debugSnapshot();
  directions.find((button) => button.dataset.direction === "right").dispatch("pointerdown");
  game.update(0.05);
  assert.ok(game.debugSnapshot().x > before.x);
});

await test("7. Espaço interage com produto próximo", () => {
  const { game, key, uiCalls } = createHarness();
  game.start();
  game.debugSetPosition(238, 300);
  key(" ", "Space");
  assert.equal(uiCalls.feedback.at(-1).id, "alcohol-gel");
});

await test("8. Enter interage com produto próximo", () => {
  const { game, key, uiCalls } = createHarness();
  game.start();
  game.debugSetPosition(378, 300);
  key("Enter");
  assert.equal(uiCalls.feedback.at(-1).id, "perfume");
});

await test("9. colisões impedem atravessar prateleiras", () => {
  const { game } = createHarness();
  game.start();
  game.state.ben.x = 100;
  game.state.ben.y = 170;
  for (let i = 0; i < 20; i += 1) game.moveBen(12, 0);
  assert.ok(game.state.ben.x <= 124, `posição inesperada: ${game.state.ben.x}`);
});

await test("10–12. coleta, bloqueio de repetição e pontuação correta", () => {
  const { game } = createHarness();
  game.start();
  game.debugSetPosition(238, 300);
  game.interact();
  const first = game.debugSnapshot();
  game.resumeAfterOverlay();
  game.interact();
  const second = game.debugSnapshot();
  assert.equal(first.score, 100);
  assert.equal(JSON.stringify(second.found), JSON.stringify(["alcohol-gel"]));
  assert.equal(second.score, 100);
});

await test("13. cronômetro avança e pausa corretamente", () => {
  const { game } = createHarness();
  game.start();
  game.update(1.25);
  assert.ok(game.debugSnapshot().elapsed >= 1.25);
  const elapsed = game.debugSnapshot().elapsed;
  game.togglePause(true);
  game.loop(3000);
  assert.equal(game.debugSnapshot().elapsed, elapsed);
});

await test("14. feedback correto e incorreto aplica regras distintas", () => {
  const { game, uiCalls } = createHarness();
  game.start();
  game.debugSetPosition(510, 300);
  game.interact();
  assert.deepEqual(uiCalls.feedback.at(-1), { id: "vinegar", points: -25, completes: false });
  assert.equal(game.debugSnapshot().score, 0);
  assert.equal(game.debugSnapshot().errors, 1);
});

await test("15. conclusão só ocorre no caixa após três itens", () => {
  const { game, uiCalls } = createHarness();
  game.start();
  for (const [x, y] of [[238, 300], [378, 300], [718, 300]]) {
    game.debugSetPosition(x, y);
    game.interact();
    game.resumeAfterOverlay();
  }
  game.presentCompletion();
  game.continueToCheckout();
  game.debugSetPosition(1080, 607);
  game.interact();
  assert.equal(uiCalls.results.length, 1);
  assert.equal(uiCalls.results[0].correct, 3);
  assert.ok(uiCalls.results[0].score >= 450);
});

await test("16. reinício limpa pontuação, itens e tentativas", () => {
  const { game } = createHarness();
  game.start();
  game.debugSetPosition(238, 300);
  game.interact();
  game.start();
  const state = game.debugSnapshot();
  assert.equal(state.score, 0);
  assert.equal(JSON.stringify(state.found), "[]");
  assert.equal(JSON.stringify(state.attempted), "[]");
});

await test("17. pausa alterna por teclado", () => {
  const { game, key } = createHarness();
  game.start();
  key("p");
  assert.equal(game.debugSnapshot().paused, true);
  key("p");
  assert.equal(game.debugSnapshot().paused, false);
});

await test("18. som pode ser silenciado e reativado", () => {
  const { game } = createHarness();
  assert.equal(game.sound.muted, false);
  game.toggleMute();
  assert.equal(game.sound.muted, true);
  game.toggleMute();
  assert.equal(game.sound.muted, false);
});

await test("19. CSS inclui breakpoints de retrato, paisagem e toque", () => {
  const css = fs.readFileSync(path.join(root, "style.css"), "utf8");
  assert.match(css, /orientation:\s*portrait/);
  assert.match(css, /orientation:\s*landscape/);
  assert.match(css, /pointer:\s*coarse/);
  assert.match(css, /overflow:\s*hidden/);
});

await test("conteúdo científico contém as estruturas exigidas", () => {
  const { data } = createHarness();
  const structures = Object.fromEntries(data.products.map((product) => [product.id, product.structure]));
  assert.equal(structures["alcohol-gel"], "CH₃–CH₂–OH");
  assert.match(structures.antiseptic, /CH₃–CHOH–CH₃/);
  assert.equal(structures.vinegar, "CH₃–COOH");
  assert.equal(structures.acetone, "CH₃–CO–CH₃");
});

for (const result of results) {
  console.log(`${result.status.padEnd(6)} ${result.name}${result.message ? ` — ${result.message}` : ""}`);
}

const failures = results.filter((result) => result.status === "FALHOU");
console.log(`\n${results.length - failures.length}/${results.length} verificações aprovadas.`);
if (failures.length) process.exitCode = 1;
