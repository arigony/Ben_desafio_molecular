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
  constructor() {
    this.values = new Set();
  }
  add(...names) {
    names.forEach((name) => this.values.add(name));
  }
  remove(...names) {
    names.forEach((name) => this.values.delete(name));
  }
  toggle(name, force) {
    const enabled = force === undefined ? !this.values.has(name) : Boolean(force);
    if (enabled) this.values.add(name);
    else this.values.delete(name);
    return enabled;
  }
  contains(name) {
    return this.values.has(name);
  }
}

function fakeContext() {
  return new Proxy(
    {
      createLinearGradient() {
        return { addColorStop() {} };
      }
    },
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

class FakeElement {
  constructor(id = "") {
    this.id = id;
    this.dataset = {};
    this.listeners = new Map();
    this.classList = new FakeClassList();
    this.style = {
      setProperty(name, value) { this[name] = value; }
    };
    this.hidden = false;
    this.clientWidth = 1000;
    this.clientHeight = 560;
    this.width = 1200;
    this.height = 675;
    this.innerHTML = "";
    this.children = [];
  }
  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(handler);
  }
  dispatch(type, extras = {}) {
    const event = { preventDefault() {}, pointerId: 1, ...extras };
    for (const handler of this.listeners.get(type) || []) handler(event);
  }
  append(...children) {
    this.children.push(...children);
  }
  setAttribute(name, value) {
    this[name] = String(value);
  }
  setPointerCapture() {}
  getContext() {
    return fakeContext();
  }
}

function createHarness(options = {}) {
  const testConsole = options.console || console;
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) {
      const created = new FakeElement(id);
      if (id === "canvas-wrap") {
        created.clientWidth = options.wrapWidth || 1000;
        created.clientHeight = options.wrapHeight || 560;
      }
      elements.set(id, created);
    }
    return elements.get(id);
  };
  const directions = ["up", "left", "down", "right"].map((direction) => {
    const button = new FakeElement(`direction-${direction}`);
    button.dataset.direction = direction;
    return button;
  });
  const windowListeners = new Map();
  const documentListeners = new Map();
  let rafRequests = 0;
  const cancelledFrames = [];
  const fakeWindow = {
    BEN_GAME_DATA: null,
    AudioContext: null,
    webkitAudioContext: null,
    innerWidth: options.innerWidth || 1280,
    innerHeight: options.innerHeight || 976,
    devicePixelRatio: options.devicePixelRatio || 1,
    addEventListener(type, handler) {
      if (!windowListeners.has(type)) windowListeners.set(type, []);
      windowListeners.get(type).push(handler);
    }
  };
  if (options.pointerEvents) fakeWindow.PointerEvent = function PointerEvent() {};
  if (options.visualViewportHeight) {
    const visualListeners = new Map();
    fakeWindow.visualViewport = {
      height: options.visualViewportHeight,
      addEventListener(type, handler) {
        if (!visualListeners.has(type)) visualListeners.set(type, []);
        visualListeners.get(type).push(handler);
      }
    };
  }
  const fakeDocument = {
    hidden: false,
    getElementById: element,
    querySelectorAll(selector) {
      return selector === "[data-direction]" ? directions : [];
    },
    addEventListener(type, handler) {
      if (!documentListeners.has(type)) documentListeners.set(type, []);
      documentListeners.get(type).push(handler);
    },
    createElement() {
      return new FakeElement();
    }
  };
  class FakeImage {
    constructor() {
      this.listeners = new Map();
      this.naturalWidth = 1024;
      this.naturalHeight = 1024;
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
    requestAnimationFrame: () => {
      rafRequests += 1;
      return rafRequests;
    },
    cancelAnimationFrame: (id) => cancelledFrames.push(id),
    console: testConsole,
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
  const uiCalls = { analysis: [], analysisDetails: [], feedback: [], hints: [], results: [], prompts: [], found: [] };
  const ui = {
    reset() {},
    showScreen() {},
    updateHUD() {},
    setDescription() {},
    setPrompt(...args) { uiCalls.prompts.push(args); },
    markFound(product) { uiCalls.found.push(product.id); },
    showAnalysis(product, previousAnswer) {
      uiCalls.analysis.push(product.id);
      uiCalls.analysisDetails.push({ id: product.id, previousAnswer });
    },
    showHint(text, used, total) { uiCalls.hints.push({ text, used, total }); },
    closeAnalysis() {},
    showScientificFeedback(result, completes) {
      uiCalls.feedback.push({ id: result.product.id, points: result.points, correct: result.correct, review: result.review, completes });
    },
    showCompletion() {},
    showPause() {},
    hidePause() {},
    setMuted() {},
    showResult(result) { uiCalls.results.push(result); }
  };
  const game = new fakeWindow.BenGame(ui);
  const key = (keyValue, code = "", repeat = false) => {
    let prevented = 0;
    const event = { key: keyValue, code, repeat, preventDefault() { prevented += 1; } };
    for (const handler of windowListeners.get("keydown") || []) handler(event);
    return prevented;
  };
  const dispatchWindow = (type, extras = {}) => {
    const event = { preventDefault() {}, pointerId: 1, ...extras };
    for (const handler of windowListeners.get(type) || []) handler(event);
  };
  const dispatchDocument = (type, extras = {}) => {
    const event = { preventDefault() {}, ...extras };
    for (const handler of documentListeners.get(type) || []) handler(event);
  };
  return {
    game,
    uiCalls,
    key,
    directions,
    data: fakeWindow.BEN_GAME_DATA,
    element,
    fakeWindow,
    fakeDocument,
    dispatchWindow,
    dispatchDocument,
    rafStats: () => ({ requests: rafRequests, cancelled: [...cancelledFrames] })
  };
}

function nearAndAnalyze(game, product) {
  game.debugSetPosition(product.interactionX, product.interactionY);
  assert.equal(game.interact(), true);
}

function atomCount(xyz) {
  return Number(xyz.trim().split(/\r?\n/)[0]);
}

function createUIRenderingHarness() {
  const createdDocument = {
    createTextNode(text) { return { nodeType: 3, textContent: text }; },
    createElement(tagName) {
      const node = new FakeElement();
      node.tagName = tagName.toUpperCase();
      return node;
    }
  };
  const uiWindow = {};
  const uiContext = vm.createContext({ window: uiWindow, document: createdDocument, requestAnimationFrame: () => 1, console });
  vm.runInContext(fs.readFileSync(path.join(root, "js", "ui.js"), "utf8"), uiContext, { filename: "ui.js" });
  return { instance: Object.create(uiWindow.BenUI.prototype), document: createdDocument };
}

function createMobileEnvironmentHarness({ maxTouchPoints = 0, touchFallback = false, innerHeight = 844, visualHeight = 0 } = {}) {
  const rootElement = new FakeElement("html");
  const windowListeners = new Map();
  const visualListeners = new Map();
  const mobileWindow = {
    navigator: { maxTouchPoints },
    innerHeight,
    addEventListener(type, handler) {
      if (!windowListeners.has(type)) windowListeners.set(type, []);
      windowListeners.get(type).push(handler);
    }
  };
  if (touchFallback) mobileWindow.ontouchstart = null;
  if (visualHeight) {
    mobileWindow.visualViewport = {
      height: visualHeight,
      addEventListener(type, handler) {
        if (!visualListeners.has(type)) visualListeners.set(type, []);
        visualListeners.get(type).push(handler);
      }
    };
  }
  const context = vm.createContext({
    window: mobileWindow,
    navigator: mobileWindow.navigator,
    document: { documentElement: rootElement },
    Math,
    Number
  });
  vm.runInContext(fs.readFileSync(path.join(root, "js", "mobile.js"), "utf8"), context, { filename: "mobile.js" });
  return {
    rootElement,
    mobileWindow,
    dispatchWindow(type) {
      for (const handler of windowListeners.get(type) || []) handler();
    },
    dispatchVisual(type) {
      for (const handler of visualListeners.get(type) || []) handler();
    }
  };
}

function fakeNodeText(node) {
  if (node.nodeType === 3) return node.textContent;
  return (node.children || []).map(fakeNodeText).join("") || node.textContent || "";
}

function reachableNavigationPoints(game, step = 10) {
  const directions = [
    { dx: step, dy: 0, name: "right" },
    { dx: -step, dy: 0, name: "left" },
    { dx: 0, dy: step, name: "down" },
    { dx: 0, dy: -step, name: "up" }
  ];
  const queue = [{ x: 630, y: 620, direction: "up" }];
  const visited = new Set(["630,620,up"]);
  const points = [];
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    points.push(current);
    for (const move of directions) {
      const x = current.x + move.dx;
      const y = current.y + move.dy;
      const key = `${x},${y},${move.name}`;
      if (visited.has(key) || !game.canMoveTo(x, y, move.name)) continue;
      visited.add(key);
      queue.push({ x, y, direction: move.name });
    }
  }
  return points;
}

await test("1. KeyE abre o modal quando há produto próximo", () => {
  const { game, key, uiCalls, data } = createHarness();
  const product = data.products.find((item) => item.id === "alcohol-gel");
  game.start();
  game.debugSetPosition(product.interactionX, product.interactionY);
  key("e", "KeyE");
  assert.deepEqual(uiCalls.analysis, ["alcohol-gel"]);
});

await test("2. KeyE não faz nada sem produto próximo", () => {
  const { game, key, uiCalls } = createHarness();
  game.start();
  game.debugSetPosition(600, 620);
  key("e", "KeyE");
  assert.equal(uiCalls.analysis.length, 0);
});

await test("3. Espaço e Enter continuam funcionando", () => {
  const a = createHarness();
  const alcoholGel = a.data.products.find((item) => item.id === "alcohol-gel");
  a.game.start();
  a.game.debugSetPosition(alcoholGel.interactionX, alcoholGel.interactionY);
  a.key(" ", "Space");
  assert.equal(a.uiCalls.analysis.at(-1), "alcohol-gel");
  const b = createHarness();
  const perfume = b.data.products.find((item) => item.id === "perfume");
  b.game.start();
  b.game.debugSetPosition(perfume.interactionX, perfume.interactionY);
  b.key("Enter");
  assert.equal(b.uiCalls.analysis.at(-1), "perfume");
});

await test("4. um keydown não gera duas interações e repeat é ignorado", () => {
  const { game, key, uiCalls, data } = createHarness();
  const perfume = data.products.find((item) => item.id === "perfume");
  game.start();
  game.debugSetPosition(perfume.interactionX, perfume.interactionY);
  key("e", "KeyE");
  key("e", "KeyE", true);
  assert.equal(uiCalls.analysis.length, 1);
});

await test("5. abrir análise não altera pontos", () => {
  const { game, data } = createHarness();
  game.start();
  nearAndAnalyze(game, data.products[0]);
  assert.equal(game.state.score, 0);
});

await test("6. abrir análise não marca produto como tentado ou revisado", () => {
  const { game, data } = createHarness();
  game.start();
  nearAndAnalyze(game, data.products[0]);
  assert.equal(game.state.reviewedProducts.size, 0);
  assert.equal(game.state.answers.size, 0);
});

await test("7. cada produto configura pergunta, quatro alternativas e duas pistas", () => {
  const { data } = createHarness();
  assert.ok(data.mission.required > 0);
  assert.ok(data.products.filter((product) => product.correct).length >= data.mission.required);
  for (const product of data.products) {
    assert.equal(product.quiz.question, "Qual é a função orgânica principal deste composto?");
    assert.equal(product.quiz.options.length, 4, product.id);
    assert.equal(product.quiz.hints.length, 2, product.id);
    assert.ok(product.quiz.options.some((option) => option.id === product.quiz.correctOptionId), product.id);
  }
});

await test("8. resposta correta sem pista concede +100", () => {
  const { game, data } = createHarness();
  game.start();
  const product = data.products[0];
  nearAndAnalyze(game, product);
  const result = game.submitAnswer(product.quiz.correctOptionId);
  assert.equal(result.correct, true);
  assert.equal(game.state.score, 100);
  assert.equal(JSON.stringify(game.state.found), JSON.stringify(["alcohol-gel"]));
});

await test("9. resposta correta após uma pista concede +80", () => {
  const { game, data } = createHarness();
  game.start();
  const product = data.products.find((p) => p.id === "vinegar");
  nearAndAnalyze(game, product);
  game.showHint();
  const result = game.submitAnswer(product.quiz.correctOptionId);
  assert.equal(result.points, 80);
  assert.equal(game.state.score, 80);
});

await test("10. resposta correta após duas pistas concede +60", () => {
  const { game, data } = createHarness();
  game.start();
  const product = data.products.find((p) => p.id === "acetone");
  nearAndAnalyze(game, product);
  game.showHint();
  game.showHint();
  const result = game.submitAnswer(product.quiz.correctOptionId);
  assert.equal(result.points, 60);
  assert.equal(game.state.score, 60);
});

await test("11. pistas são exibidas em ordem e limitadas a duas", () => {
  const { game, data, uiCalls } = createHarness();
  game.start();
  const product = data.products.find((p) => p.id === "oil");
  nearAndAnalyze(game, product);
  assert.equal(game.showHint().text, product.quiz.hints[0]);
  assert.equal(game.showHint().text, product.quiz.hints[1]);
  assert.equal(game.showHint(), null);
  assert.equal(uiCalls.hints.length, 2);
});

await test("12. resposta incorreta desconta 15 pontos", () => {
  const { game, data } = createHarness();
  game.start();
  game.state.score = 100;
  const product = data.products.find((p) => p.id === "perfume");
  nearAndAnalyze(game, product);
  const wrongOption = product.quiz.options.find((option) => option.id !== product.quiz.correctOptionId);
  const result = game.submitAnswer(wrongOption.id);
  assert.equal(result.correct, false);
  assert.equal(result.points, -15);
  assert.equal(game.state.score, 85);
  assert.equal(game.state.errors, 1);
});

await test("13. pontuação nunca fica negativa", () => {
  const { game, data } = createHarness();
  game.start();
  const product = data.products.find((p) => p.id === "vinegar");
  nearAndAnalyze(game, product);
  const wrongOption = product.quiz.options.find((option) => option.id !== product.quiz.correctOptionId);
  game.submitAnswer(wrongOption.id);
  assert.equal(game.state.score, 0);
});

await test("14. produto analisado reabre para revisão sem repontuação", () => {
  const { game, data, uiCalls } = createHarness();
  game.start();
  const product = data.products.find((p) => p.id === "acetone");
  nearAndAnalyze(game, product);
  game.submitAnswer(product.quiz.correctOptionId);
  const score = game.state.score;
  game.resumeAfterOverlay();
  nearAndAnalyze(game, product);
  assert.equal(uiCalls.analysisDetails.at(-1).previousAnswer.correct, true);
  const second = game.submitAnswer(product.quiz.correctOptionId);
  assert.equal(second.review, true);
  assert.equal(second.points, 0);
  assert.equal(game.state.score, score);
});

await test("15. revisão com alternativa incorreta também não altera pontos nem erros", () => {
  const { game, data } = createHarness();
  game.start();
  const product = data.products.find((p) => p.id === "salt");
  nearAndAnalyze(game, product);
  game.submitAnswer(product.quiz.correctOptionId);
  game.resumeAfterOverlay();
  nearAndAnalyze(game, product);
  const wrongOption = product.quiz.options.find((option) => option.id !== product.quiz.correctOptionId);
  const result = game.submitAnswer(wrongOption.id);
  assert.equal(result.review, true);
  assert.equal(game.state.score, 100);
  assert.equal(game.state.errors, 0);
});

await test("16. Ben e carrinho não se sobrepõem nas quatro direções", () => {
  const { game } = createHarness();
  for (const direction of ["up", "down", "left", "right"]) {
    const ben = game.getBenHitbox(600, 350);
    const cart = game.getCartHitbox(600, 350, direction);
    assert.equal(game.rectanglesOverlap(ben, cart), false, direction);
  }
});

await test("17. distância entre Ben e carrinho permanece entre 45 e 60 px", () => {
  const { game } = createHarness();
  for (const direction of ["left", "right"]) {
    const t = game.getCartTransform(direction, { x: 600, y: 350 });
    assert.ok(Math.abs(t.x - 600) >= 45 && Math.abs(t.x - 600) <= 60);
  }
  for (const direction of ["up", "down"]) {
    const t = game.getCartTransform(direction, { x: 600, y: 350 });
    assert.ok(Math.abs(t.y - 350) >= 45 && Math.abs(t.y - 350) <= 60);
  }
});

await test("18. rosto do Ben não é coberto pelo carrinho", () => {
  const { game } = createHarness();
  const face = { x: 565, y: 205, w: 70, h: 65 };
  for (const direction of ["up", "down", "left", "right"]) {
    const transform = game.getCartTransform(direction, { x: 600, y: 350 });
    const cart = game.getCartHitbox(600, 350, direction);
    const covered =
      game.rectanglesOverlap(face, cart) &&
      transform.depth > 370;
    assert.equal(covered, false, direction);
  }
});

await test("19. walkTime muda durante movimento", () => {
  const { game } = createHarness();
  game.start();
  const before = game.state.ben.walkTime;
  game.keys.add("d");
  game.update(0.05);
  assert.ok(game.state.ben.walkTime > before);
});

await test("20. walkTime permanece estável quando Ben para", () => {
  const { game } = createHarness();
  game.start();
  game.keys.add("d");
  game.update(0.05);
  game.keys.clear();
  const before = game.state.ben.walkTime;
  game.update(0.05);
  assert.equal(game.state.ben.walkTime, before);
  assert.equal(game.state.ben.isMoving, false);
});

await test("21. wheelAngle muda durante movimento", () => {
  const { game } = createHarness();
  game.start();
  game.keys.add("d");
  game.update(0.05);
  assert.notEqual(game.state.cart.wheelAngle, 0);
});

await test("22. wheelAngle permanece estável parado", () => {
  const { game } = createHarness();
  game.start();
  game.keys.add("d");
  game.update(0.05);
  game.keys.clear();
  const before = game.state.cart.wheelAngle;
  game.update(0.05);
  assert.equal(game.state.cart.wheelAngle, before);
});

await test("23. rodas giram em sentidos coerentes e opostos", () => {
  const right = createHarness().game;
  right.start();
  right.advanceMotion(10, 1, 0, 0.05);
  const left = createHarness().game;
  left.start();
  left.advanceMotion(10, -1, 0, 0.05);
  assert.ok(right.state.cart.wheelAngle > 0);
  assert.ok(left.state.cart.wheelAngle < 0);
});

await test("24. hitbox pequena de Ben preserva colisões", () => {
  const { game } = createHarness();
  const box = game.getBenHitbox(600, 350);
  assert.ok(box.w <= 40 && box.h <= 46);
  assert.equal(game.canMoveTo(200, 170, "left"), false);
});

await test("25. carrinho não atravessa prateleira quando Ben está no corredor", () => {
  const { game } = createHarness();
  assert.equal(game.canMoveTo(600, 170, "right"), false);
  assert.equal(game.rectanglesOverlap(game.getBenHitbox(600, 170), game.obstacles[1]), false);
});

await test("26. ficha de proximidade inclui fórmula e chamada E — Analisar", () => {
  const source = fs.readFileSync(path.join(root, "js", "game.js"), "utf8");
  assert.match(source, /drawProximityCard/);
  assert.match(source, /product\.formula/);
  assert.match(source, /E — Analisar/);
});

await test("27. classificação correta só é preenchida no feedback posterior", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const uiSource = fs.readFileSync(path.join(root, "js", "ui.js"), "utf8");
  const analysis = html.slice(html.indexOf('id="analysis-modal"'), html.indexOf('id="feedback-modal"'));
  const analysisRenderer = uiSource.slice(uiSource.indexOf("showAnalysis(product"), uiSource.indexOf("showHint(text"));
  assert.doesNotMatch(analysis, /feedback-function|organicFunction/);
  assert.doesNotMatch(analysisRenderer, /organicFunction|functionalGroup/);
  assert.match(html, /id="feedback-function"/);
  assert.match(analysis, /Qual é a função orgânica principal deste composto\?/);
  assert.match(analysis, /id="analysis-options"/);
  assert.match(analysis, /id="analysis-hint-button"[^>]*>Ver pista</);
});

await test("28. modal molecular e script 3D explícito estão presentes", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(html, /id="analysis-modal"/);
  assert.match(html, /3dmol@2\.5\.5/);
  assert.match(html, /js\/molecule3d\.js/);
});

await test("29. etanol tem fórmula e modelo XYZ com 9 átomos", () => {
  const { data } = createHarness();
  const ethanolProducts = data.products.filter((p) => p.modelKeys.includes("ethanol"));
  assert.ok(ethanolProducts.every((p) => /C₂H₆O/.test(p.formula)));
  assert.equal(atomCount(data.models.ethanol), 9);
  assert.equal((data.models.ethanol.match(/^H /gm) || []).length, 6);
});

await test("30. ácido acético e acetona não são classificados como álcool", () => {
  const { data } = createHarness();
  assert.equal(data.products.find((p) => p.id === "vinegar").organicFunction, "Ácido carboxílico");
  assert.equal(data.products.find((p) => p.id === "acetone").organicFunction, "Cetona");
  assert.equal(atomCount(data.models.aceticAcid), 8);
  assert.equal(atomCount(data.models.acetone), 10);
});

await test("31. fallback funciona sem 3Dmol.js e sem WebGL", () => {
  const container = new FakeElement("viewer");
  const fallback = new FakeElement("fallback");
  const selector = new FakeElement("selector");
  const selectorLabel = new FakeElement("label");
  const note = new FakeElement("note");
  const fakeWindow = { $3Dmol: null, WebGLRenderingContext: null };
  const fakeDocument = { createElement: () => ({ getContext: () => null }) };
  const context = vm.createContext({ window: fakeWindow, document: fakeDocument, requestAnimationFrame: () => 1, console });
  vm.runInContext(fs.readFileSync(path.join(root, "js", "molecule3d.js"), "utf8"), context);
  const viewer = new fakeWindow.MoleculeViewer({ container, fallback, selector, selectorLabel, note, models: { ethanol: "1\nx\nH 0 0 0" } });
  viewer.show({ modelKeys: ["ethanol"], modelLabels: ["Etanol"] });
  assert.equal(container.hidden, true);
  assert.equal(fallback.hidden, false);
  assert.match(fallback.textContent, /indisponível/);
});

await test("32. controles móveis continuam movimentando e analisando", () => {
  const { game, directions, element, uiCalls, data } = createHarness();
  const product = data.products.find((item) => item.id === "alcohol-gel");
  game.start();
  const before = game.state.ben.x;
  directions.find((b) => b.dataset.direction === "right").dispatch("pointerdown");
  assert.ok(game.state.ben.x > before, "um toque rápido deve produzir deslocamento imediato");
  const afterTap = game.state.ben.x;
  game.update(0.05);
  assert.ok(game.state.ben.x > afterTap);
  directions.find((b) => b.dataset.direction === "right").dispatch("pointerup");
  game.togglePause();
  const pausedX = game.state.ben.x;
  directions.find((b) => b.dataset.direction === "right").dispatch("pointerdown");
  assert.equal(game.state.ben.x, pausedX);
  game.togglePause();
  game.debugSetPosition(product.interactionX, product.interactionY);
  element("touch-interact-button").dispatch("click");
  assert.equal(uiCalls.analysis.at(-1), "alcohol-gel");
});

await test("33. botão móvel mantém o texto Analisar", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(html, /id="touch-interact-button"[^>]*>Analisar<\/button>/);
});

await test("34. cronômetro pausa durante análise e feedback", () => {
  const { game, data } = createHarness();
  game.start();
  game.update(1);
  nearAndAnalyze(game, data.products[0]);
  const duringAnalysis = game.state.elapsed;
  game.loop(3000);
  assert.equal(game.state.elapsed, duringAnalysis);
  game.submitAnswer(data.products[0].quiz.correctOptionId);
  game.loop(4000);
  assert.equal(game.state.elapsed, duringAnalysis);
});

await test("35. progresso usa mission.required e conta somente produtos da missão", () => {
  const { game, data } = createHarness();
  game.start();
  const distractor = data.products.find((p) => p.id === "vinegar");
  nearAndAnalyze(game, distractor);
  game.submitAnswer(distractor.quiz.correctOptionId);
  game.resumeAfterOverlay();
  assert.equal(game.state.found.length, 0);
  for (const product of data.products.filter((p) => p.correct).slice(0, data.mission.required)) {
    nearAndAnalyze(game, product);
    game.submitAnswer(product.quiz.correctOptionId);
    game.resumeAfterOverlay();
  }
  assert.equal(game.state.found.length, data.mission.required);
});

await test("36. caixa permanece bloqueado antes da quantidade required", () => {
  const { game } = createHarness();
  game.start();
  game.debugSetPosition(1080, 607);
  assert.equal(game.checkoutNearby, false);
  game.interact();
  assert.equal(game.running, true);
});

await test("37. resultado final funciona após required e caixa", () => {
  const { game, data, uiCalls } = createHarness();
  game.start();
  for (const product of data.products.filter((p) => p.correct).slice(0, data.mission.required)) {
    nearAndAnalyze(game, product);
    game.submitAnswer(product.quiz.correctOptionId);
    game.resumeAfterOverlay();
  }
  game.debugSetPosition(1080, 607);
  game.interact();
  assert.equal(uiCalls.results.length, 1);
  assert.equal(uiCalls.results[0].correct, data.mission.required);
  assert.equal(uiCalls.results[0].score, data.mission.required * 100);
  assert.equal(uiCalls.results[0].reviewed, data.mission.required);
});

await test("38. reinício limpa respostas, pistas, progresso, erros e pontuação", () => {
  const { game, data } = createHarness();
  game.start();
  const product = data.products[0];
  nearAndAnalyze(game, product);
  game.showHint();
  game.submitAnswer(product.quiz.correctOptionId);
  game.start();
  assert.equal(game.state.score, 0);
  assert.equal(game.state.errors, 0);
  assert.equal(game.state.found.length, 0);
  assert.equal(game.state.answers.size, 0);
  assert.equal(game.state.reviewedProducts.size, 0);
  assert.equal(game.currentHintsUsed, 0);
});

await test("39. HTML e UI não fixam a meta em três produtos", () => {
  for (const file of ["index.html", "js/ui.js", "js/game.js"]) {
    const source = fs.readFileSync(path.join(root, file), "utf8");
    assert.doesNotMatch(source, /\b3\/3\b/, file);
  }
  const uiSource = fs.readFileSync(path.join(root, "js", "ui.js"), "utf8");
  assert.match(uiSource, /mission\.required/);
});

await test("40. estrutura é compatível com GitHub Pages", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.ok(fs.existsSync(path.join(root, "index.html")));
  assert.match(html, /src="assets\/ben\.png"/);
  assert.match(html, /src="js\/game\.js"/);
});

await test("41. não existem caminhos absolutos incompatíveis", () => {
  for (const file of ["index.html", "style.css", "js/data.js", "js/game.js", "js/ui.js", "js/molecule3d.js"]) {
    const source = fs.readFileSync(path.join(root, file), "utf8");
    assert.doesNotMatch(source, /(?:[A-Za-z]:\\|file:\/\/|src="\/|href="\/)/, file);
  }
});

await test("42. todos os modelos locais têm a contagem de átomos declarada", () => {
  const { data } = createHarness();
  const expected = { ethanol: 9, isopropanol: 12, aceticAcid: 8, acetone: 10, sodiumChloride: 2, esterFragment: 11 };
  for (const [key, count] of Object.entries(expected)) assert.equal(atomCount(data.models[key]), count, key);
});

await test("43. assets oficiais e LICENSE foram preservados", () => {
  const png = fs.readFileSync(path.join(root, "assets", "ben.png"));
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.ok(fs.statSync(path.join(root, "LICENSE")).size > 0);
});

await test("44. revisão direta reabre a explicação sem exigir nova resposta", () => {
  const { game, data, uiCalls } = createHarness();
  game.start();
  const product = data.products.find((item) => item.id === "perfume");
  nearAndAnalyze(game, product);
  game.submitAnswer(product.quiz.correctOptionId);
  const score = game.state.score;
  game.resumeAfterOverlay();
  nearAndAnalyze(game, product);
  const result = game.reviewCurrentProduct();
  assert.equal(result.review, true);
  assert.equal(result.points, 0);
  assert.equal(game.state.score, score);
  assert.equal(game.currentAnalysis, null);
  assert.equal(uiCalls.feedback.at(-1).review, true);
});

await test("45. produto comercial está rotulado antes e depois da resposta", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const occurrences = html.match(/Produto comercial/g) || [];
  assert.ok(occurrences.length >= 2);
  assert.match(html, /id="analysis-review-button"[^>]*>Rever resposta e explicação<\/button>/);
});

await test("46. todas as ocorrências do grupo funcional são destacadas", () => {
  const { instance } = createUIRenderingHarness();
  const target = new FakeElement("feedback-structure");
  instance.elements = { feedbackStructure: target };
  instance.renderHighlightedStructure({
    structure: "CH₃–CH₂–OH ou CH₃–CH(OH)–CH₃",
    highlight: "OH",
    functionalGroupSymbol: "–OH"
  });
  const visual = target.children[0];
  const marks = visual.children.filter((node) => node.tagName === "MARK");
  assert.equal(marks.length, 2);
  assert.ok(marks.every((mark) => fakeNodeText(mark) === "OH"));
  assert.match(target["aria-label"], /Grupo funcional destacado: –OH/);
});

await test("47. mission.required funciona com valor diferente de três", () => {
  const { game, data, uiCalls } = createHarness();
  data.mission.required = 2;
  game.start();
  const products = data.products.filter((product) => product.correct).slice(0, data.mission.required);
  nearAndAnalyze(game, products[0]);
  game.submitAnswer(products[0].quiz.correctOptionId);
  game.resumeAfterOverlay();
  nearAndAnalyze(game, products[1]);
  game.submitAnswer(products[1].quiz.correctOptionId);
  assert.equal(game.state.found.length, 2);
  assert.equal(uiCalls.feedback.at(-1).completes, true);
});

await test("48. HUD preserva pontos, tempo, progresso, pausa, áudio e Lista", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  for (const id of ["score-value", "timer-value", "found-value", "required-value", "pause-button", "mute-button", "list-button"]) {
    assert.match(html, new RegExp(`id="${id}"`), id);
  }
  assert.match(html, /id="list-button"[^>]*aria-controls="shopping-panel"[^>]*>Lista<\/button>/);
});

await test("49. lista molecular informa pendências, função e estrutura", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const uiSource = fs.readFileSync(path.join(root, "js", "ui.js"), "utf8");
  assert.match(html, /id="shopping-panel"/);
  assert.match(html, /id="list-close-button"/);
  assert.match(html, /id="list-backdrop"/);
  assert.match(uiSource, /Ainda não resolvido/);
  assert.match(uiSource, /Função: ainda não identificada/);
  assert.match(uiSource, /product\.organicFunction/);
  assert.match(uiSource, /product\.structure/);
});

await test("50. abrir a lista móvel pausa jogo e cronômetro até o fechamento", () => {
  const { game } = createHarness();
  game.start();
  game.update(1);
  const elapsed = game.state.elapsed;
  game.setListOpen(true);
  assert.equal(game.listOpen, true);
  assert.equal(game.overlayPaused, true);
  game.loop(3000);
  assert.equal(game.state.elapsed, elapsed);
  game.setListOpen(false);
  assert.equal(game.listOpen, false);
  assert.equal(game.overlayPaused, false);
});

await test("51. modal prende o foco e o restaura ao fechar", () => {
  const focusDocument = { activeElement: null };
  const focusWindow = {};
  const focusContext = vm.createContext({
    window: focusWindow,
    document: focusDocument,
    requestAnimationFrame(callback) { callback(); },
    console
  });
  vm.runInContext(fs.readFileSync(path.join(root, "js", "ui.js"), "utf8"), focusContext, { filename: "ui.js" });
  const first = { focus() { focusDocument.activeElement = first; } };
  const last = { focus() { focusDocument.activeElement = last; } };
  const returnTarget = { focused: false, focus() { this.focused = true; } };
  const container = { contains(element) { return element === first || element === last; } };
  const instance = {
    activeDialog: null,
    dialogReturnFocus: null,
    elements: { shoppingPanel: {} },
    focusableElements() { return [first, last]; }
  };
  focusDocument.activeElement = returnTarget;
  focusWindow.BenUI.prototype.activateDialog.call(instance, container, first);
  assert.equal(focusDocument.activeElement, first);
  assert.equal(instance.dialogReturnFocus, returnTarget);
  focusDocument.activeElement = last;
  let prevented = false;
  focusWindow.BenUI.prototype.trapDialogFocus.call(instance, {
    key: "Tab",
    shiftKey: false,
    preventDefault() { prevented = true; }
  });
  assert.equal(prevented, true);
  assert.equal(focusDocument.activeElement, first);
  focusWindow.BenUI.prototype.releaseDialog.call(instance, container, true);
  assert.equal(returnTarget.focused, true);
  assert.equal(instance.activeDialog, null);
});

await test("52. CSS cobre coarse pointers, orientações, safe areas e movimento reduzido", () => {
  const css = fs.readFileSync(path.join(root, "style.css"), "utf8");
  assert.match(css, /any-pointer:\s*coarse/);
  assert.match(css, /orientation:\s*portrait/);
  assert.match(css, /orientation:\s*landscape/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /safe-area-inset-top/);
  assert.match(css, /safe-area-inset-right/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /safe-area-inset-left/);
});

await test("53. painel de investigação tem rolagem interna e alvos mínimos", () => {
  const css = fs.readFileSync(path.join(root, "style.css"), "utf8");
  assert.match(css, /100dvh/);
  assert.match(css, /overscroll-behavior:\s*contain/);
  assert.match(css, /scroll-padding-bottom/);
  assert.match(css, /\.answer-option\s*\{[^}]*min-height:\s*48px/s);
  assert.match(css, /\.modal-close\s*\{[^}]*height:\s*48px/s);
  assert.match(css, /\.decision-actions\s*\{[^}]*position:\s*sticky/s);
});

await test("54. fórmulas moleculares usam elementos sub sem perder descrição acessível", () => {
  const { instance } = createUIRenderingHarness();
  for (const product of [
    { formula: "C₂H₆O", formulaAccessible: "C dois H seis O", expected: ["2", "6"] },
    { formula: "C₃H₆O", formulaAccessible: "C três H seis O", expected: ["3", "6"] },
    { formula: "C₂H₄O₂", formulaAccessible: "C dois H quatro O dois", expected: ["2", "4", "2"] }
  ]) {
    const target = new FakeElement("formula");
    instance.renderMolecularFormula(target, product);
    const visual = target.children[0];
    const subscripts = visual.children.filter((node) => node.tagName === "SUB").map(fakeNodeText);
    assert.deepEqual(subscripts, product.expected);
    assert.equal(visual["aria-hidden"], "true");
    assert.match(target["aria-label"], new RegExp(product.formulaAccessible));
  }
});

await test("55. grupos funcionais configuram os símbolos científicos solicitados", () => {
  const { data } = createHarness();
  const expected = {
    "alcohol-gel": "–OH",
    perfume: "–OH",
    antiseptic: "–OH",
    acetone: "C=O",
    vinegar: "–COOH",
    oil: "–COO–"
  };
  for (const [id, symbol] of Object.entries(expected)) {
    assert.equal(data.products.find((product) => product.id === id).functionalGroupSymbol, symbol, id);
  }
  assert.equal(data.products.find((product) => product.id === "acetone").structure, "CH₃–C(=O)–CH₃");
});

await test("56. natureza comercial e escopo da representação estão explícitos após a resposta", () => {
  const { data } = createHarness();
  for (const product of data.products) {
    assert.ok(product.commercialNature.length > 25, product.id);
    assert.ok(product.representationScope.length > 25, product.id);
  }
  for (const id of ["alcohol-gel", "perfume", "vinegar", "antiseptic", "acetone", "oil", "soda"]) {
    assert.match(data.products.find((product) => product.id === id).commercialNature, /mistura/i, id);
  }
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(html, /id="feedback-product-nature"/);
  assert.match(html, /id="feedback-representation-scope"/);
});

await test("57. painel anterior à resposta não revela função ou grupo funcional", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const uiSource = fs.readFileSync(path.join(root, "js", "ui.js"), "utf8");
  const analysisHtml = html.slice(html.indexOf('id="analysis-modal"'), html.indexOf('id="feedback-modal"'));
  const analysisRenderer = uiSource.slice(uiSource.indexOf("showAnalysis(product"), uiSource.indexOf("showHint(text"));
  assert.doesNotMatch(analysisHtml, /Grupo funcional identificado|feedback-group/);
  assert.doesNotMatch(analysisRenderer, /functionalGroup|organicFunction|commercialNature/);
  assert.match(analysisHtml, /Fórmula molecular/);
  assert.match(analysisHtml, /Estrutura condensada/);
});

await test("58. destaque não depende somente da cor e expõe rótulo textual", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const css = fs.readFileSync(path.join(root, "style.css"), "utf8");
  assert.match(html, /Grupo funcional identificado/);
  assert.match(css, /\.functional-group-symbol\s*\{[^}]*border:\s*2px[^}]*text-decoration:\s*underline/s);
  assert.match(css, /\.chemical-structure mark\s*\{[^}]*border:\s*2px[^}]*background:[^}]*text-decoration:\s*underline/s);
});

await test("59. produtos pertencem a estandes flat 3D dos quatro setores", () => {
  const { game, data } = createHarness();
  assert.deepEqual(
    Array.from(game.stands, (stand) => stand.label),
    ["HIGIENE E BELEZA", "CUIDADOS PESSOAIS", "MERCEARIA", "BEBIDAS"]
  );
  for (const product of data.products) {
    const stand = game.standsById.get(product.standId);
    const display = game.productDisplays.get(product.id);
    assert.ok(stand, `${product.id} sem estande`);
    assert.ok(display, `${product.id} sem posição visual`);
    assert.ok(display.x > stand.x && display.x < stand.x + stand.w, product.id);
    assert.ok(display.y > stand.y && display.y < stand.y + stand.h, product.id);
  }
  assert.equal(game.checkoutStand.label, "CAIXA");
});

await test("60. colisões preservam estandes e todos os destinos continuam navegáveis", () => {
  const { game, data } = createHarness();
  for (const stand of game.stands) {
    assert.equal(game.canMoveTo(stand.x + stand.w / 2, stand.y + stand.h / 2, "right"), false, stand.id);
  }
  const points = reachableNavigationPoints(game);
  assert.ok(points.length > 1000, "malha navegável excessivamente pequena");
  for (const product of data.products) {
    assert.ok(
      points.some((point) => Math.hypot(point.x - product.interactionX, point.y - product.interactionY) <= product.interactionRadius),
      `produto inacessível: ${product.id}`
    );
  }
  assert.ok(
    points.some((point) => Math.hypot(point.x - game.checkout.x, point.y - game.checkout.y) < game.checkout.radius),
    "caixa inacessível"
  );
});

await test("61. cada estande permite investigar ao menos um produto", () => {
  const { game, data, uiCalls } = createHarness();
  for (const stand of game.stands) {
    const product = data.products.find((item) => item.standId === stand.id);
    game.start();
    game.debugSetPosition(product.interactionX, product.interactionY);
    assert.equal(game.interact(), true, stand.id);
    assert.equal(uiCalls.analysis.at(-1), product.id, stand.id);
  }
});

await test("62. chegada ao caixa encerra o loop e apresenta o resultado", () => {
  const { game, data, uiCalls } = createHarness();
  game.start();
  game.state.found = data.products.filter((product) => product.correct).slice(0, data.mission.required).map((product) => product.id);
  game.debugSetPosition(game.checkout.x, game.checkout.y);
  assert.equal(game.checkoutNearby, true);
  assert.equal(game.interact(), true);
  assert.equal(game.running, false);
  assert.equal(game.raf, null);
  assert.equal(uiCalls.results.length, 1);
});

await test("63. Canvas limita devicePixelRatio a 2 e reutiliza cenário estático", () => {
  const { game } = createHarness({ devicePixelRatio: 3, innerWidth: 390, innerHeight: 844 });
  assert.equal(game.renderDpr, 2);
  assert.equal(game.logicalCanvasWidth, 600);
  assert.equal(game.logicalCanvasHeight, 800);
  assert.equal(game.canvas.width, 1200);
  assert.equal(game.canvas.height, 1600);
  const builds = game.staticSceneBuilds;
  game.draw();
  game.draw();
  assert.equal(game.staticSceneBuilds, builds);
});

await test("64. animação é interrompida em análise, lista, pausa e resultado", () => {
  const { game, data, rafStats } = createHarness();
  game.start();
  assert.notEqual(game.raf, null);
  assert.equal(game.canvas.dataset.animationActive, "true");
  nearAndAnalyze(game, data.products[0]);
  assert.equal(game.raf, null);
  assert.equal(game.canvas.dataset.animationActive, "false");
  game.cancelAnalysis();
  assert.notEqual(game.raf, null);
  assert.equal(game.canvas.dataset.animationActive, "true");
  game.setListOpen(true);
  assert.equal(game.raf, null);
  assert.equal(game.canvas.dataset.animationActive, "false");
  game.setListOpen(false);
  assert.notEqual(game.raf, null);
  game.togglePause();
  assert.equal(game.raf, null);
  assert.equal(game.canvas.dataset.animationActive, "false");
  game.togglePause();
  assert.notEqual(game.raf, null);
  game.state.found = data.products.filter((product) => product.correct).slice(0, data.mission.required).map((product) => product.id);
  game.finish();
  assert.equal(game.raf, null);
  assert.equal(game.canvas.dataset.animationActive, "false");
  assert.ok(rafStats().cancelled.length >= 4);
});

await test("65. acerto ativa celebração e coloca produtos corretos no carrinho", () => {
  const { game, data } = createHarness();
  const product = data.products.find((item) => item.correct);
  game.start();
  nearAndAnalyze(game, product);
  const result = game.submitAnswer(product.quiz.correctOptionId);
  assert.equal(result.collected, true);
  assert.ok(game.state.celebrationTime > 0);
  assert.ok(game.state.found.includes(product.id));
  assert.equal(game.productsById.get(product.id), product);
  const source = fs.readFileSync(path.join(root, "js", "game.js"), "utf8");
  assert.match(source, /this\.drawProductIcon\(ctx, product, 0, 0\)/);
});

await test("66. renderização por frame evita gradientes e ordenações pesadas", () => {
  const source = fs.readFileSync(path.join(root, "js", "game.js"), "utf8");
  const drawSection = source.slice(source.indexOf("    draw()"), source.indexOf("    drawFloor(ctx)"));
  const productSection = source.slice(source.indexOf("    drawProduct(ctx"), source.indexOf("    drawProductIcon(ctx"));
  assert.doesNotMatch(drawSection, /createLinearGradient|sort\(/);
  assert.doesNotMatch(productSection, /performance\.now|\.\.\.product/);
  assert.match(source, /prepareStaticScene\(\)/);
  assert.match(source, /productsByDepth/);
  assert.match(source, /Math\.min\(2, Math\.max\(1, window\.devicePixelRatio/);
});

await test("67. WebP lossless do Ben preserva PNG como fallback", () => {
  const pngPath = path.join(root, "assets", "ben.png");
  const webpPath = path.join(root, "assets", "ben.webp");
  const webp = fs.readFileSync(webpPath);
  assert.equal(webp.subarray(0, 4).toString("ascii"), "RIFF");
  assert.equal(webp.subarray(8, 12).toString("ascii"), "WEBP");
  assert.ok(fs.statSync(webpPath).size < fs.statSync(pngPath).size);
  assert.ok(fs.existsSync(pngPath));
});

await test("68. imagens HTML usam dimensões intrínsecas e fallback sem download antecipado", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const pictures = html.match(/<picture>[\s\S]*?<\/picture>/g) || [];
  assert.equal(pictures.length, 4);
  pictures.forEach((picture) => {
    assert.match(picture, /srcset="assets\/ben\.webp" type="image\/webp"/);
    assert.match(picture, /src="assets\/ben\.png"/);
    assert.match(picture, /width="1024"/);
    assert.match(picture, /height="1024"/);
  });
  assert.equal((html.match(/fetchpriority="high"/g) || []).length, 1);
  assert.equal((html.match(/loading="lazy"/g) || []).length, 3);
});

await test("69. Canvas reutiliza a imagem HTML do Ben", () => {
  const source = fs.readFileSync(path.join(root, "js", "game.js"), "utf8");
  assert.match(source, /document\.getElementById\("ben-asset"\)/);
  assert.match(source, /sharedBenImage\?\.tagName === "IMG" \? sharedBenImage : new Image\(\)/);
  assert.match(source, /this\.image !== sharedBenImage/);
  assert.match(source, /this\.image\.src = "assets\/ben\.webp"/);
  assert.match(source, /this\.image\.src = "assets\/ben\.png"/);
});

await test("70. posição inicial permite entrar no corredor imediatamente", () => {
  const { game, key } = createHarness();
  game.start();
  const initialY = game.state.ben.y;
  key("w", "KeyW");
  assert.ok(game.state.ben.y < initialY);
});

await test("71. dados científicos essenciais permanecem consistentes", () => {
  const { data } = createHarness();
  const expected = {
    "alcohol-gel": ["C₂H₆O", "Álcool", true],
    perfume: ["C₂H₆O", "Álcool", true],
    vinegar: ["C₂H₄O₂", "Ácido carboxílico", false],
    antiseptic: ["C₂H₆O ou C₃H₈O", "Álcool", true],
    acetone: ["C₃H₆O", "Cetona", false],
    oil: ["Sem fórmula molecular única", "Éster", false],
    salt: ["NaCl", "Composto iônico", false],
    soda: ["Sem fórmula molecular única", "Mistura; sem função orgânica única", false]
  };
  for (const product of data.products) {
    assert.deepEqual(
      [product.formula, product.organicFunction, product.correct],
      expected[product.id],
      product.id
    );
  }
});

await test("72. investigação preserva o acionador antes de ocultar o prompt", () => {
  const source = fs.readFileSync(path.join(root, "js", "game.js"), "utf8");
  const section = source.slice(source.indexOf("    analyzeProduct(product)"), source.indexOf("    cancelAnalysis()"));
  assert.ok(section.indexOf("this.ui.showAnalysis") < section.indexOf("this.ui.setPrompt(false)"));
});

await test("73. todos os produtos têm posição visual, interação, estande e slot explícitos", () => {
  const { game, data } = createHarness();
  for (const product of data.products) {
    for (const key of ["displayX", "displayY", "interactionX", "interactionY"]) {
      assert.equal(Number.isFinite(product[key]), true, `${product.id}.${key}`);
    }
    assert.equal(Number.isInteger(product.slot), true, `${product.id}.slot`);
    const stand = game.standsById.get(product.standId);
    assert.ok(stand, `${product.id} sem estande`);
    assert.ok(product.displayX > stand.x && product.displayX < stand.x + stand.w, product.id);
    assert.ok(product.displayY > stand.y && product.displayY < stand.y + stand.h, product.id);
  }
});

await test("74. cada posição de interação identifica somente o produto correspondente", () => {
  const { game, data } = createHarness();
  const expected = {
    perfume: "Perfume",
    acetone: "Removedor à base de acetona",
    "alcohol-gel": "Álcool em gel",
    antiseptic: "Antisséptico alcoólico",
    vinegar: "Vinagre",
    oil: "Óleo vegetal",
    salt: "Sal de cozinha",
    soda: "Refrigerante"
  };
  game.start();
  for (const product of data.products) {
    game.debugSetPosition(product.interactionX, product.interactionY);
    assert.equal(game.nearby?.id, product.id, product.id);
    assert.equal(game.nearby?.name, expected[product.id], product.id);
    assert.equal(game.debugSnapshot().nearbyStand, product.standId, product.id);
  }
});

await test("75. zonas de interação não se sobrepõem entre produtos", () => {
  const { data } = createHarness();
  for (let left = 0; left < data.products.length; left += 1) {
    for (let right = left + 1; right < data.products.length; right += 1) {
      const a = data.products[left];
      const b = data.products[right];
      const distance = Math.hypot(a.interactionX - b.interactionX, a.interactionY - b.interactionY);
      assert.ok(distance > a.interactionRadius + b.interactionRadius, `${a.id} × ${b.id}`);
    }
  }
});

await test("76. marcador e detecção usam as mesmas coordenadas de interação", () => {
  const source = fs.readFileSync(path.join(root, "js", "game.js"), "utf8");
  const nearbySection = source.slice(source.indexOf("    updateNearby()"), source.indexOf("    interact()"));
  const productSection = source.slice(source.indexOf("    drawProduct(ctx"), source.indexOf("    drawProductIcon(ctx"));
  assert.match(nearbySection, /product\.interactionX/);
  assert.match(nearbySection, /product\.interactionY/);
  assert.match(productSection, /product\.interactionX/);
  assert.match(productSection, /product\.interactionY/);
  assert.doesNotMatch(source, /product\.[xy]\b/);
});

await test("77. cartão de proximidade evita Ben e o produto ativo", () => {
  const { game, data } = createHarness();
  game.start();
  for (const product of data.products) {
    game.debugSetPosition(product.interactionX, product.interactionY);
    const cardW = product.id === "antiseptic" ? 270 : 235;
    const cardH = 118;
    const position = game.getProximityCardPosition(product, cardW, cardH);
    const card = { x: position.x, y: position.y, w: cardW, h: cardH };
    const productBox = { x: product.displayX - 45, y: product.displayY - 43, w: 90, h: 86 };
    assert.equal(game.overlapArea(card, productBox), 0, `produto ${product.id}`);
    assert.equal(game.overlapArea(card, game.getUnitVisualBounds()), 0, `Ben ${product.id}`);
  }
});

await test("78. composição remove pernas artificiais e preserva ordem integrada", () => {
  const source = fs.readFileSync(path.join(root, "js", "game.js"), "utf8");
  assert.doesNotMatch(source, /drawLeg\b/);
  const section = source.slice(source.indexOf("    drawBenAndCart(ctx)"), source.indexOf("    drawCelebration(ctx"));
  const rearWheel = section.indexOf("cart.wheels[0]");
  const ben = section.indexOf("this.drawBen(ctx)");
  const basket = section.indexOf("this.drawCartBasket(ctx, cart)");
  const frontWheel = section.indexOf("cart.wheels[1]");
  const products = section.indexOf("this.drawCartProducts(ctx, cart)");
  assert.ok(rearWheel < ben && ben < basket && basket < frontWheel && frontWheel < products);
  assert.match(source, /ctx\.drawImage\(source, -75, -78, 150,/);
});

await test("79. movimento nas quatro direções continua funcional sem atravessar estandes", () => {
  const moves = {
    up: [0, -1],
    down: [0, 1],
    left: [-1, 0],
    right: [1, 0]
  };
  for (const [direction, [dx, dy]] of Object.entries(moves)) {
    const { game } = createHarness();
    game.start();
    game.debugSetPosition(630, 350);
    const before = { x: game.state.ben.x, y: game.state.ben.y };
    const distance = game.moveBen(dx * 10, dy * 10, direction);
    game.advanceMotion(distance, dx, dy, 0.05);
    assert.ok(game.state.ben.x !== before.x || game.state.ben.y !== before.y, direction);
    for (const stand of game.stands) {
      assert.equal(game.rectanglesOverlap(game.getBenHitbox(), stand), false, `${direction}: Ben`);
      assert.equal(game.rectanglesOverlap(game.getCartHitbox(), stand), false, `${direction}: carrinho`);
    }
  }
});

await test("80. fluxo de proximidade e desenho não gera erros no console", () => {
  const errors = [];
  const silentConsole = {
    log() {},
    info() {},
    warn() {},
    error(...args) { errors.push(args); }
  };
  const { game, data } = createHarness({ console: silentConsole });
  game.start();
  for (const product of data.products) {
    game.debugSetPosition(product.interactionX, product.interactionY);
    game.draw();
  }
  for (const [direction, dx, dy] of [["up", 0, -8], ["down", 0, 8], ["left", -8, 0], ["right", 8, 0]]) {
    game.debugSetPosition(630, 350);
    game.moveBen(dx, dy, direction);
    game.draw();
  }
  assert.deepEqual(errors, []);
});

await test("81. maxTouchPoints identifica toque e adiciona a classe touch-device", () => {
  const { rootElement, mobileWindow } = createMobileEnvironmentHarness({ maxTouchPoints: 5, visualHeight: 790 });
  assert.equal(rootElement.classList.contains("touch-device"), true);
  assert.equal(rootElement.style["--app-viewport-height"], "790px");
  assert.equal(mobileWindow.BenMobileEnvironment.touchDevice, true);
});

await test("82. ontouchstart funciona como fallback de detecção de toque", () => {
  const { rootElement } = createMobileEnvironmentHarness({ touchFallback: true });
  assert.equal(rootElement.classList.contains("touch-device"), true);
});

await test("83. pointerdown mantém movimento contínuo e pointerup para imediatamente", () => {
  const { game, directions } = createHarness({ pointerEvents: true });
  const right = directions.find((button) => button.dataset.direction === "right");
  game.start();
  game.debugSetPosition(630, 350);
  right.dispatch("pointerdown", { pointerId: 3 });
  const afterDown = game.state.ben.x;
  game.update(0.1);
  assert.ok(game.state.ben.x > afterDown);
  right.dispatch("pointerup", { pointerId: 3 });
  const afterUp = game.state.ben.x;
  game.update(0.1);
  assert.equal(game.state.ben.x, afterUp);
  assert.equal(game.state.ben.isMoving, false);
});

await test("84. pointercancel e finalização na janela não deixam direção presa", () => {
  const { game, directions, dispatchWindow } = createHarness({ pointerEvents: true });
  const right = directions.find((button) => button.dataset.direction === "right");
  game.start();
  right.dispatch("pointerdown", { pointerId: 7 });
  right.dispatch("pointercancel", { pointerId: 7 });
  assert.equal(game.touchDirections.size, 0);
  right.dispatch("pointerdown", { pointerId: 8 });
  dispatchWindow("pointerup", { pointerId: 8 });
  assert.equal(game.touchDirections.size, 0);
});

await test("85. touchstart mantém movimento e touchend encerra no fallback", () => {
  const { game, directions } = createHarness();
  const up = directions.find((button) => button.dataset.direction === "up");
  game.start();
  game.debugSetPosition(630, 350);
  up.dispatch("touchstart", { changedTouches: [{ identifier: 10 }] });
  const afterStart = game.state.ben.y;
  game.update(0.1);
  assert.ok(game.state.ben.y < afterStart);
  up.dispatch("touchend", { changedTouches: [{ identifier: 10 }] });
  const afterEnd = game.state.ben.y;
  game.update(0.1);
  assert.equal(game.state.ben.y, afterEnd);
});

await test("86. touchcancel limpa o movimento no fallback", () => {
  const { game, directions } = createHarness();
  const left = directions.find((button) => button.dataset.direction === "left");
  game.start();
  left.dispatch("touchstart", { changedTouches: [{ identifier: 11 }] });
  assert.equal(game.touchDirections.has("left"), true);
  left.dispatch("touchcancel", { changedTouches: [{ identifier: 11 }] });
  assert.equal(game.touchDirections.size, 0);
});

await test("87. dois ponteiros são finalizados separadamente sem estado preso", () => {
  const { game, directions } = createHarness({ pointerEvents: true });
  const left = directions.find((button) => button.dataset.direction === "left");
  const up = directions.find((button) => button.dataset.direction === "up");
  game.start();
  left.dispatch("pointerdown", { pointerId: 21 });
  up.dispatch("pointerdown", { pointerId: 22 });
  assert.deepEqual([...game.touchDirections].sort(), ["left", "up"]);
  left.dispatch("pointerup", { pointerId: 21 });
  assert.deepEqual([...game.touchDirections], ["up"]);
  up.dispatch("pointerup", { pointerId: 22 });
  assert.equal(game.touchDirections.size, 0);
});

await test("88. blur, resize e orientationchange limpam controles ativos", () => {
  const { game, directions, dispatchWindow } = createHarness({ pointerEvents: true });
  const down = directions.find((button) => button.dataset.direction === "down");
  game.start();
  down.dispatch("pointerdown", { pointerId: 31 });
  dispatchWindow("blur");
  assert.equal(game.touchDirections.size, 0);
  down.dispatch("pointerdown", { pointerId: 32 });
  dispatchWindow("orientationchange");
  assert.equal(game.touchDirections.size, 0);
  down.dispatch("pointerdown", { pointerId: 33 });
  dispatchWindow("resize");
  assert.equal(game.touchDirections.size, 0);
});

await test("89. visibilitychange limpa controles e pausa a animação", () => {
  const { game, directions, fakeDocument, dispatchDocument } = createHarness({ pointerEvents: true });
  game.start();
  directions[0].dispatch("pointerdown", { pointerId: 41 });
  fakeDocument.hidden = true;
  dispatchDocument("visibilitychange");
  assert.equal(game.touchDirections.size, 0);
  assert.equal(game.manualPaused, true);
  assert.equal(game.canvas.dataset.animationActive, "false");
});

await test("90. Analisar evita disparo duplicado de touchend seguido por click", () => {
  const { game, data, element, uiCalls } = createHarness();
  const product = data.products.find((item) => item.id === "perfume");
  game.start();
  game.debugSetPosition(product.interactionX, product.interactionY);
  const analyze = element("touch-interact-button");
  analyze.dispatch("touchend", { changedTouches: [{ identifier: 50 }] });
  analyze.dispatch("click");
  assert.deepEqual(uiCalls.analysis, ["perfume"]);
});

await test("91. Analisar não abre painel fora da zona correta", () => {
  const { game, element, uiCalls } = createHarness({ pointerEvents: true });
  game.start();
  game.debugSetPosition(630, 350);
  element("touch-interact-button").dispatch("pointerup", { pointerId: 51 });
  assert.deepEqual(uiCalls.analysis, []);
});

await test("92. eventos de toque usam listeners não passivos e não dependem de pointerleave", () => {
  const source = fs.readFileSync(path.join(root, "js", "game.js"), "utf8");
  assert.match(source, /touchstart", beginTouch, \{ passive: false \}/);
  assert.match(source, /touchend", endTouch, \{ passive: false \}/);
  assert.match(source, /touchcancel", endTouch, \{ passive: false \}/);
  assert.doesNotMatch(source, /addEventListener\("pointerleave"/);
});

await test("93. CSS mostra controles pela classe e bloqueia gestos concorrentes", () => {
  const css = fs.readFileSync(path.join(root, "style.css"), "utf8");
  assert.match(css, /html\.touch-device \.touch-controls\s*\{\s*display:\s*flex/s);
  assert.match(css, /\.touch-controls\s*\{[^}]*touch-action:\s*none[^}]*user-select:\s*none[^}]*-webkit-user-select:\s*none[^}]*-webkit-touch-callout:\s*none[^}]*overscroll-behavior:\s*none/s);
  assert.match(css, /\.touch-action\s*\{[^}]*pointer-events:\s*auto[^}]*touch-action:\s*none/s);
  assert.match(css, /\.d-pad button\s*\{[^}]*pointer-events:\s*auto[^}]*touch-action:\s*none/s);
});

await test("94. altura visual acompanha barras móveis, rotação e visualViewport", () => {
  const harness = createMobileEnvironmentHarness({ maxTouchPoints: 1, innerHeight: 844, visualHeight: 790 });
  assert.equal(harness.rootElement.style["--app-viewport-height"], "790px");
  harness.mobileWindow.visualViewport.height = 720;
  harness.dispatchVisual("resize");
  assert.equal(harness.rootElement.style["--app-viewport-height"], "720px");
  harness.mobileWindow.visualViewport.height = 390;
  harness.dispatchWindow("orientationchange");
  assert.equal(harness.rootElement.style["--app-viewport-height"], "390px");
});

await test("95. viewport dinâmico tem fallback svh/dvh e safe areas nos quatro lados", () => {
  const css = fs.readFileSync(path.join(root, "style.css"), "utf8");
  const mobileSource = fs.readFileSync(path.join(root, "js", "mobile.js"), "utf8");
  assert.match(css, /@supports \(height: 100svh\)/);
  assert.match(css, /@supports \(height: 100dvh\)/);
  assert.match(css, /--app-viewport-height/);
  for (const side of ["top", "right", "bottom", "left"]) assert.match(css, new RegExp(`safe-area-inset-${side}`));
  assert.match(mobileSource, /visualViewport\?\.height \|\| window\.innerHeight/);
  assert.match(mobileSource, /visualViewport\?\.addEventListener\("resize"/);
});

await test("96. Canvas cabe nos sete viewports móveis solicitados", () => {
  const viewports = [[390, 844], [430, 932], [844, 390], [932, 430], [412, 915], [915, 412], [768, 1024]];
  for (const [width, height] of viewports) {
    const wrapWidth = width;
    const wrapHeight = Math.max(1, height - 76);
    const { game } = createHarness({
      innerWidth: width,
      innerHeight: height,
      visualViewportHeight: height,
      wrapWidth,
      wrapHeight
    });
    const renderedWidth = Number.parseFloat(game.canvas.style.width);
    const renderedHeight = Number.parseFloat(game.canvas.style.height);
    assert.ok(renderedWidth > 0 && renderedWidth <= wrapWidth, `${width}x${height}: largura`);
    assert.ok(renderedHeight > 0 && renderedHeight <= wrapHeight, `${width}x${height}: altura`);
    assert.ok(game.renderDpr >= 1 && game.renderDpr <= 2, `${width}x${height}: DPR`);
  }
});

for (const result of results) {
  console.log(`${result.status.padEnd(6)} ${result.name}${result.message ? ` — ${result.message}` : ""}`);
}
const failures = results.filter((result) => result.status === "FALHOU");
console.log(`\n${results.length - failures.length}/${results.length} verificações aprovadas.`);
if (failures.length) process.exitCode = 1;
