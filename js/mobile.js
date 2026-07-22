(function () {
  "use strict";

  var root = document.documentElement;
  var nav = window.navigator || {};
  var touchDevice = Number(nav.maxTouchPoints || 0) > 0 || "ontouchstart" in window;
  var currentScript = document.currentScript;
  var scriptBase = currentScript && currentScript.src
    ? new URL("./", currentScript.src)
    : new URL("js/", window.location.href);
  var buildVersion = window.BEN_BUILD_VERSION || Date.now().toString(36);
  var retryLoads = Object.create(null);
  var lastActivation = Object.create(null);
  var suppressHistory = false;
  var observedScreen = null;
  var observer = null;
  var delegatedHandlersInstalled = false;

  if (touchDevice) root.classList.add("touch-device");

  function updateViewportHeight() {
    var viewport = window.visualViewport;
    var height = viewport && viewport.height ? viewport.height : window.innerHeight;
    if (height > 0) root.style.setProperty("--app-viewport-height", Math.round(height) + "px");
    return height;
  }

  function activeScreenId() {
    var active = document.querySelector(".screen.active");
    return active ? active.id : "start-screen";
  }

  function screenExists(id) {
    return Boolean(id && document.getElementById(id) && document.getElementById(id).classList.contains("screen"));
  }

  function showScreen(id) {
    if (!screenExists(id)) return false;
    var screens = document.querySelectorAll(".screen");
    for (var index = 0; index < screens.length; index += 1) {
      var screen = screens[index];
      var active = screen.id === id;
      screen.classList.toggle("active", active);
      screen.setAttribute("aria-hidden", active ? "false" : "true");
    }
    var destination = document.getElementById(id);
    destination.scrollTop = 0;
    var heading = destination.querySelector("h1, h2");
    if (heading && id !== "game-screen") {
      heading.setAttribute("tabindex", "-1");
      window.requestAnimationFrame(function () {
        try {
          heading.focus({ preventScroll: true });
        } catch (_error) {
          heading.focus();
        }
      });
    }
    return true;
  }

  function recordScreen(id, replace) {
    if (!window.history || !window.history.pushState || !screenExists(id)) return;
    var state = { benApp: true, benScreen: id, benBuild: buildVersion };
    try {
      if (replace) window.history.replaceState(state, "", window.location.href);
      else window.history.pushState(state, "", window.location.href);
    } catch (_error) {
      // Navegação interna continua funcionando mesmo se o histórico for bloqueado.
    }
  }

  function syncHistoryFromDom() {
    var id = activeScreenId();
    if (!observedScreen) {
      observedScreen = id;
      recordScreen(id, true);
      return;
    }
    if (id === observedScreen) return;
    observedScreen = id;
    if (!suppressHistory) recordScreen(id, false);
  }

  function installScreenObserver() {
    if (observer || typeof MutationObserver !== "function") return;
    var app = document.getElementById("app");
    if (!app) return;
    observer = new MutationObserver(function (mutations) {
      for (var index = 0; index < mutations.length; index += 1) {
        if (mutations[index].attributeName === "class") {
          syncHistoryFromDom();
          return;
        }
      }
    });
    observer.observe(app, { subtree: true, attributes: true, attributeFilter: ["class"] });
  }

  function showDiagnostic(message) {
    var notice = document.getElementById("ben-mobile-diagnostic");
    if (!notice) {
      notice = document.createElement("div");
      notice.id = "ben-mobile-diagnostic";
      notice.setAttribute("role", "alert");
      notice.style.cssText = [
        "position:fixed", "left:12px", "right:12px",
        "bottom:calc(12px + env(safe-area-inset-bottom))", "z-index:9999",
        "padding:12px 44px 12px 14px", "border:2px solid #9f3a3f",
        "border-radius:14px", "color:#4a171a", "background:#fff1f1",
        "box-shadow:0 10px 30px rgba(0,0,0,.22)",
        "font:700 14px/1.35 system-ui,sans-serif"
      ].join(";");
      var close = document.createElement("button");
      close.type = "button";
      close.textContent = "×";
      close.setAttribute("aria-label", "Fechar aviso");
      close.style.cssText = "position:absolute;right:8px;top:5px;border:0;background:transparent;font-size:26px;color:#4a171a";
      close.addEventListener("click", function () { notice.remove(); });
      notice.appendChild(close);
      document.body.appendChild(notice);
    }
    var text = notice.querySelector("span");
    if (!text) {
      text = document.createElement("span");
      notice.insertBefore(text, notice.firstChild);
    }
    text.textContent = message;
  }

  function loadScript(path, globalName) {
    if (globalName && window[globalName]) return Promise.resolve(true);
    if (retryLoads[path]) return retryLoads[path];
    retryLoads[path] = new Promise(function (resolve) {
      var script = document.createElement("script");
      var url = new URL(path, scriptBase);
      url.searchParams.set("v", buildVersion);
      url.searchParams.set("retry", Date.now().toString());
      script.src = url.href;
      script.async = false;
      script.onload = function () { resolve(!globalName || Boolean(window[globalName])); };
      script.onerror = function () { resolve(false); };
      document.head.appendChild(script);
    });
    return retryLoads[path];
  }

  function ensureCoreScripts() {
    var sequence = Promise.resolve(true);
    if (!window.BEN_GAME_DATA) sequence = sequence.then(function () { return loadScript("data.js", "BEN_GAME_DATA"); });
    if (!window.MoleculeViewer) sequence = sequence.then(function () { return loadScript("molecule3d.js", "MoleculeViewer"); });
    if (!window.BenUI) sequence = sequence.then(function () { return loadScript("ui.js", "BenUI"); });
    if (!window.BenGame) sequence = sequence.then(function () { return loadScript("game.js", "BenGame"); });
    return sequence;
  }

  function bootGameIfNeeded() {
    if (window.benGame && window.benUI) return Promise.resolve(true);
    return ensureCoreScripts().then(function () {
      if (window.benGame && window.benUI) return true;
      if (!window.BEN_GAME_DATA || !window.BenUI || !window.BenGame) return false;
      try {
        var ui = window.benUI || new window.BenUI();
        var game = window.benGame || new window.BenGame(ui);
        if (!ui.game) ui.attachGame(game);
        window.benUI = ui;
        window.benGame = game;
        return true;
      } catch (error) {
        console.error("Falha ao iniciar Ben no modo compatível", error);
        return false;
      }
    });
  }

  function activationAllowed(key) {
    var now = Date.now();
    if (now - (lastActivation[key] || 0) < 350) return false;
    lastActivation[key] = now;
    return true;
  }

  function findActionTarget(node) {
    while (node && node !== document) {
      if (node.id === "start-button" || node.id === "open-instructions-button" ||
          node.id === "instructions-continue-button" || node.id === "mission-start-button" ||
          node.hasAttribute && node.hasAttribute("data-back")) return node;
      node = node.parentNode;
    }
    return null;
  }

  function handleDelegatedActivation(event) {
    var target = findActionTarget(event.target);
    if (!target) return;
    var key = target.id || ("back:" + target.getAttribute("data-back"));
    if (!activationAllowed(key)) return;
    if (event.cancelable) event.preventDefault();

    if (target.id === "start-button" || target.id === "open-instructions-button") {
      showScreen("instructions-screen");
      return;
    }
    if (target.id === "instructions-continue-button") {
      showScreen("mission-screen");
      return;
    }
    if (target.hasAttribute("data-back")) {
      showScreen(target.getAttribute("data-back"));
      return;
    }
    if (target.id === "mission-start-button") {
      bootGameIfNeeded().then(function (ready) {
        if (ready && window.benGame) window.benGame.start();
        else showDiagnostic("O jogo não conseguiu carregar os módulos. Atualize a página e tente novamente.");
      });
    }
  }

  function installDelegatedHandlers() {
    if (delegatedHandlersInstalled) return;
    delegatedHandlersInstalled = true;
    document.addEventListener("click", handleDelegatedActivation, true);
    if (window.PointerEvent) document.addEventListener("pointerup", handleDelegatedActivation, true);
    else document.addEventListener("touchend", handleDelegatedActivation, { capture: true, passive: false });
  }

  function restoreFromHistory(event) {
    var state = event.state;
    if (!state || !state.benApp || !screenExists(state.benScreen)) return;
    suppressHistory = true;
    observedScreen = state.benScreen;
    showScreen(state.benScreen);
    if (state.benScreen !== "game-screen" && window.benGame && window.benGame.running &&
        !window.benGame.manualPaused && !window.benGame.overlayPaused) {
      try { window.benGame.togglePause(true); } catch (_error) { /* sem ação */ }
    }
    window.setTimeout(function () { suppressHistory = false; }, 0);
  }

  function initializeCompatibility() {
    updateViewportHeight();
    installDelegatedHandlers();
    installScreenObserver();
    if (!observedScreen) syncHistoryFromDom();
    bootGameIfNeeded().then(function (ready) {
      if (!ready) showDiagnostic("Falha ao concluir o carregamento do jogo neste celular.");
    });
  }

  window.addEventListener("resize", updateViewportHeight, { passive: true });
  window.addEventListener("orientationchange", updateViewportHeight, { passive: true });
  if (window.visualViewport) window.visualViewport.addEventListener("resize", updateViewportHeight, { passive: true });
  window.addEventListener("popstate", restoreFromHistory);
  window.addEventListener("pageshow", function () {
    initializeCompatibility();
  });
  window.addEventListener("error", function (event) {
    console.error("Erro global do Ben", event.error || event.message);
  });
  window.addEventListener("unhandledrejection", function (event) {
    console.error("Promise rejeitada no Ben", event.reason);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeCompatibility, { once: true });
  } else {
    initializeCompatibility();
  }

  window.BenMobileEnvironment = {
    touchDevice: touchDevice,
    updateViewportHeight: updateViewportHeight,
    showScreen: showScreen,
    bootGameIfNeeded: bootGameIfNeeded
  };
})();
