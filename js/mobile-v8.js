(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  async function loadStaticAssets() {
    const loadText = async (path) => {
      const response = await fetch(path, { cache: "force-cache" });
      if (!response.ok) throw new Error(`Falha ao carregar ${path}`);
      return (await response.text()).trim();
    };
    try {
      const loadParts = async (paths) => (await Promise.all(paths.map(loadText))).join("");
      const [home, aisle, ben] = await Promise.all([
        loadParts(["assets/v8/home-v8-1.b64","assets/v8/home-v8-2.b64","assets/v8/home-v8-3.b64","assets/v8/home-v8-4.b64","assets/v8/home-v8-5.b64"]),
        loadParts(["assets/v8/supermarket-aisle-1.b64","assets/v8/supermarket-aisle-2.b64","assets/v8/supermarket-aisle-3.b64","assets/v8/supermarket-aisle-4.b64"]),
        loadText("assets/v8/ben-guide.b64")
      ]);
      const homeImage = $("#home-art-image");
      if (homeImage) homeImage.src = `data:image/webp;base64,${home}`;
      document.documentElement.style.setProperty("--aisle-bg", `url("data:image/webp;base64,${aisle}")`);
      document.documentElement.style.setProperty("--ben-avatar", `url("data:image/webp;base64,${ben}")`);
    } catch (error) {
      console.error(error);
      const homeImage = $("#home-art-image");
      if (homeImage) homeImage.alt = "Não foi possível carregar a arte da entrada.";
    }
  }

  loadStaticAssets();

  const screens = new Map($$(".screen").map((el) => [el.dataset.screen, el]));
  const historyStack = ["home"];
  const { productCatalog, stops, models } = window.V8_DATA;

  const state = {
    screen: "home",
    stop: 0,
    side: null,
    points: 0,
    collected: new Set(),
    answered: new Set(),
    elapsed: 0,
    timerId: null,
    paused: false,
    currentProduct: null
  };

  function showScreen(name, push = true) {
    if (!screens.has(name)) return;
    screens.forEach((screen, key) => screen.classList.toggle("active", key === name));
    state.screen = name;
    if (push) {
      historyStack.push(name);
      history.pushState({ screen: name }, "", `#${name}`);
    }
    if (name === "game") startTimer();
    else stopTimer();
  }

  function goBack() {
    if (historyStack.length > 1) history.back();
    else showScreen("home", false);
  }

  function formatTime(seconds) {
    const min = String(Math.floor(seconds / 60)).padStart(2, "0");
    const sec = String(seconds % 60).padStart(2, "0");
    return `${min}:${sec}`;
  }

  function startTimer() {
    if (state.timerId || state.paused) return;
    state.timerId = window.setInterval(() => {
      state.elapsed += 1;
      $("#time-value").textContent = formatTime(state.elapsed);
    }, 1000);
  }

  function stopTimer() {
    if (state.timerId) clearInterval(state.timerId);
    state.timerId = null;
  }

  function updateHud(message) {
    $("#points-value").textContent = String(state.points).padStart(3, "0");
    $("#items-value").textContent = `${state.collected.size}/3`;
    $("#time-value").textContent = formatTime(state.elapsed);
    if (message) $("#ben-hud-message").textContent = message;
  }

  function setTip(text) { $("#ben-tip-text").textContent = text; }

  function productAt(side) {
    const stop = stops[state.stop];
    const id = side === "left" ? stop.left : stop.right;
    return id ? productCatalog[id] : null;
  }

  function renderStop(animate = true) {
    const view = $("#aisle-view");
    if (animate) {
      view.classList.add("moving");
      window.setTimeout(() => view.classList.remove("moving"), 420);
    }
    view.className = `aisle-view stop-${state.stop}${animate ? " moving" : ""}`;
    window.setTimeout(() => view.classList.remove("moving"), 430);

    const stop = stops[state.stop];
    $("#sector-sign").textContent = stop.sign;
    setTip(stop.tip);
    state.side = null;
    renderTarget($("#left-product"), stop.left, "left");
    renderTarget($("#right-product"), stop.right, "right");
    $("#focus-indicator").hidden = true;
    $("#analyze-button").disabled = true;

    if (state.stop === 4) {
      const ready = state.collected.size >= 3;
      setTip(ready ? "Excelente! Toque em Analisar para finalizar no caixa." : "Ainda faltam produtos relacionados a álcoois.");
      $("#analyze-button").disabled = !ready;
      $("#analyze-button").textContent = ready ? "Finalizar no caixa" : "Carrinho incompleto";
      updateHud(ready ? "O carrinho está completo!" : "Continue procurando os três álcoois.");
    } else {
      $("#analyze-button").textContent = "Analisar produto";
      updateHud(state.stop === 0 ? "Vamos começar pela entrada." : "Escolha um produto à esquerda ou à direita.");
    }
  }

  function renderTarget(button, productId, side) {
    button.className = `product-target side-${side}`;
    button.removeAttribute("data-name");
    button.removeAttribute("data-emoji");
    button.disabled = !productId;
    if (!productId) return;
    const product = productCatalog[productId];
    button.classList.add("active");
    if (state.answered.has(productId)) button.classList.add("done");
    button.dataset.name = product.name;
    button.dataset.emoji = product.emoji;
    button.dataset.product = productId;
  }

  function selectSide(side) {
    const product = productAt(side);
    if (!product) {
      setTip(state.stop === 0 ? "Avance pelo corredor para encontrar produtos." : "Não há produto desse lado.");
      return;
    }
    state.side = side;
    $$(".product-target").forEach((target) => target.classList.remove("focused"));
    const target = side === "left" ? $("#left-product") : $("#right-product");
    target.classList.add("focused");
    $("#focus-indicator").hidden = false;
    $("#analyze-button").disabled = false;
    $("#analyze-button").textContent = state.answered.has(product.id) ? "Revisar produto" : "Analisar produto";
    setTip(`${product.name} selecionado. Toque em Analisar.`);
    updateHud(`Produto interessante ${side === "left" ? "à esquerda" : "à direita"}.`);
  }

  function move(delta) {
    const next = Math.max(0, Math.min(4, state.stop + delta));
    if (next === state.stop) {
      setTip(delta > 0 ? "Você chegou ao final do corredor." : "Você está na entrada.");
      return;
    }
    state.stop = next;
    renderStop(true);
  }

  function openAnalysis(product) {
    state.currentProduct = product;
    $("#analysis-title").textContent = product.name;
    $("#analysis-kind").textContent = product.kind;
    $("#analysis-compound").textContent = product.compound || "—";
    $("#analysis-formula").textContent = product.formula || "Não se aplica";
    $("#analysis-condensed").textContent = product.condensed || "Não se aplica";
    $("#formula-box").hidden = !product.formula;
    $("#condensed-box").hidden = !product.condensed;
    $("#mixture-alert").hidden = !product.mixture;
    $("#mixture-alert").innerHTML = product.mixture
      ? `<strong>Atenção:</strong> o produto é uma mistura. A fórmula e a estrutura abaixo pertencem apenas ao composto representativo estudado.`
      : "";
    $("#hint-text").hidden = true;
    $("#hint-text").textContent = product.hint;
    $("#feedback-box").hidden = true;
    $("#feedback-box").className = "feedback-box";
    $("#continue-button").hidden = true;

    const answers = $("#answer-list");
    answers.innerHTML = "";
    product.options.forEach((option) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = option;
      button.addEventListener("click", () => answerProduct(product, option, button));
      answers.appendChild(button);
    });

    const viewerSection = $("#viewer-section");
    viewerSection.hidden = !product.model;
    if (product.model) moleculeViewer.load(models[product.model]);
    $("#analysis-dialog").showModal();
  }

  function answerProduct(product, option, clickedButton) {
    const correct = option === product.answer;
    const feedback = $("#feedback-box");
    $$("#answer-list button").forEach((button) => {
      button.disabled = true;
      if (button.textContent === product.answer) button.classList.add("correct");
    });
    clickedButton.classList.add(correct ? "correct" : "wrong");

    if (correct) {
      if (!state.answered.has(product.id)) {
        state.points += product.mission ? 120 : 70;
        state.answered.add(product.id);
      }
      if (product.mission && !state.collected.has(product.id)) {
        state.collected.add(product.id);
        addCartItem(product);
      }
      feedback.className = "feedback-box correct";
      feedback.innerHTML = `<strong>Muito bem!</strong> ${product.explanation}`;
      updateHud(product.mission ? "Acerto! O produto foi colocado no carrinho." : "Classificação correta. Este produto não pertence à missão dos álcoois.");
      renderCollectedList();
    } else {
      state.points = Math.max(0, state.points - 20);
      feedback.className = "feedback-box wrong";
      feedback.innerHTML = `<strong>Vamos revisar.</strong> ${product.hint}`;
      updateHud("Observe novamente a evidência estrutural.");
    }
    feedback.hidden = false;
    $("#continue-button").hidden = false;
    updateHud();
  }

  function addCartItem(product) {
    const item = document.createElement("span");
    item.textContent = product.emoji;
    item.title = product.name;
    $("#cart-items").appendChild(item);
  }

  function renderCollectedList() {
    const container = $("#collected-list");
    container.innerHTML = "";
    if (!state.collected.size) {
      container.innerHTML = "<p>Nenhum item correto foi coletado ainda.</p>";
      return;
    }
    state.collected.forEach((id) => {
      const product = productCatalog[id];
      const row = document.createElement("div");
      row.textContent = `${product.emoji} ${product.name} — ${product.compound}`;
      container.appendChild(row);
    });
  }

  function finishMission() {
    if (state.collected.size < 3) return;
    stopTimer();
    $("#result-points").textContent = state.points;
    $("#result-time").textContent = formatTime(state.elapsed);
    const products = $("#result-products");
    products.innerHTML = "";
    state.collected.forEach((id) => {
      const product = productCatalog[id];
      const row = document.createElement("div");
      row.innerHTML = `<strong>${product.emoji} ${product.name}</strong><br><small>${product.compound} — função álcool</small>`;
      products.appendChild(row);
    });
    showScreen("results");
  }

  function resetGame() {
    stopTimer();
    state.stop = 0;
    state.side = null;
    state.points = 0;
    state.elapsed = 0;
    state.paused = false;
    state.currentProduct = null;
    state.collected.clear();
    state.answered.clear();
    $("#cart-items").innerHTML = "";
    renderCollectedList();
    updateHud("Vamos começar pela entrada.");
    renderStop(false);
    showScreen("mission");
  }

  function pauseGame() {
    if (state.screen !== "game") return;
    state.paused = true;
    stopTimer();
    $("#pause-dialog").showModal();
  }

  function resumeGame() {
    state.paused = false;
    $("#pause-dialog").close();
    startTimer();
  }

  const moleculeViewer = new window.MoleculeViewer($("#molecule-canvas"));

  $("#home-start").addEventListener("click", () => showScreen("mission"));
  $("#home-how").addEventListener("click", () => showScreen("tutorial"));
  $("[data-go='mission']").addEventListener("click", () => showScreen("mission"));
  $$("[data-go='home']").forEach((button) => button.addEventListener("click", () => {
    $$("#pause-dialog, #list-dialog").forEach((dialog) => { if (dialog.open) dialog.close(); });
    state.paused = false;
    showScreen("home");
  }));
  $$("[data-back]").forEach((button) => button.addEventListener("click", goBack));

  $("#enter-store").addEventListener("click", () => {
    state.stop = 0;
    renderStop(false);
    showScreen("game");
  });

  $("#move-forward").addEventListener("click", () => move(1));
  $("#move-back").addEventListener("click", () => move(-1));
  $("#look-left").addEventListener("click", () => selectSide("left"));
  $("#look-right").addEventListener("click", () => selectSide("right"));
  $("#left-product").addEventListener("click", () => selectSide("left"));
  $("#right-product").addEventListener("click", () => selectSide("right"));

  $("#analyze-button").addEventListener("click", () => {
    if (state.stop === 4) { finishMission(); return; }
    const product = state.side ? productAt(state.side) : null;
    if (product) openAnalysis(product);
  });

  $("#hint-button").addEventListener("click", () => { $("#hint-text").hidden = false; });
  $("#continue-button").addEventListener("click", () => {
    $("#analysis-dialog").close();
    renderStop(false);
    if (state.collected.size >= 3) {
      setTip("Os três itens foram encontrados. Avance até o caixa.");
      updateHud("Carrinho completo! Siga para o caixa.");
    }
  });
  $("#analysis-close").addEventListener("click", () => { state.currentProduct = null; });
  $("#zoom-out").addEventListener("click", () => moleculeViewer.zoomBy(0.85));
  $("#zoom-in").addEventListener("click", () => moleculeViewer.zoomBy(1.18));
  $("#reset-view").addEventListener("click", () => moleculeViewer.reset());

  $("#list-button").addEventListener("click", () => { renderCollectedList(); $("#list-dialog").showModal(); });
  $$("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => $(`#${button.dataset.closeDialog}`).close()));
  $("#pause-button").addEventListener("click", pauseGame);
  $("#resume-button").addEventListener("click", resumeGame);
  $("#restart-button").addEventListener("click", resetGame);

  window.addEventListener("popstate", (event) => {
    if (historyStack.length > 1) historyStack.pop();
    const name = event.state?.screen || historyStack.at(-1) || "home";
    screens.forEach((screen, key) => screen.classList.toggle("active", key === name));
    state.screen = name;
    if (name === "game") startTimer(); else stopTimer();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.screen === "game" && !state.paused) pauseGame();
  });

  history.replaceState({ screen: "home" }, "", "#home");
  renderCollectedList();
  updateHud();
  renderStop(false);
})();
