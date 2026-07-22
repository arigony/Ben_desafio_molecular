(function () {
  "use strict";

  var root = document.documentElement;
  var navigatorReference = window.navigator || {};
  var touchDevice =
    Number(navigatorReference.maxTouchPoints || 0) > 0 ||
    "ontouchstart" in window;
  var currentScript = document.currentScript;
  var scriptBase = currentScript && currentScript.src
    ? new URL("./", currentScript.src)
    : new URL("js/", window.location.href);
  var buildVersion = window.BEN_BUILD_VERSION || Date.now().toString(36);
  var retryLoads = Object.create(null);
  var lastActivation = Object.create(null);

  if (touchDevice) root.classList.add("touch-device");

  function updateViewportHeight() {
    var viewport = window.visualViewport;
    var height = viewport && viewport.height ? viewport.height : window.innerHeight;
    if (height > 0) root.style.setProperty("--app-viewport-height", Math.round(height) + "px");
    return height;
  }

  function showScreen(id) {
    var screens = document.querySelectorAll(".screen");
    for (var index = 0; index < screens.length; index += 1) {
      var screen = screens[index];
      var active = screen.id === id;
      screen.classList.toggle("active", active);
      screen.setAttribute("aria-hidden", active ? "false" : "true");
    }
    var destination = document.getElementById(id);
    if (destination) {
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
    }
  }

  function activateOnce(key, callback) {
    return function (event) {
      var now = Date.now();
      if (now - (lastActivation[key] || 0) < 350) return;
      lastActivation[key] = now;
      if (event && event.cancelable) event.preventDefault();
      callback(event);
    };
  }

  function bindActivation(element, key, callback) {
    if (!element || element.dataset.benCompatBound === "true") return;
    element.dataset.benCompatBound = "true";
    var handler = activateOnce(key, callback);
    element.addEventListener("click", handler);
    if (window.PointerEvent) element.addEventListener("pointerup", handler);
    else element.addEventListener("touchend", handler, { passive: false });
  }

  function showDiagnostic(message) {
    var notice = document.getElementById("ben-mobile-diagnostic");
    if (!notice) {
      notice = document.createElement("div");
      notice.id = "ben-mobile-diagnostic";
      notice.setAttribute("role", "alert");
      notice.style.cssText = [
        "position:fixed",
        "left:12px",
        "right:12px",
        "bottom:calc(12px + env(safe-area-inset-bottom))",
        "z-index:9999",
        "padding:12px 44px 12px 14px",
        "border:2px solid #9f3a3f",
        "border-radius:14px",
        "color:#4a171a",
        "background:#fff1f1",
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

  function bindFallbackNavigation() {
    bindActivation(document.getElementById("start-button"), "start", function () {
      showScreen("instructions-screen");
    });
    bindActivation(document.getElementById("open-instructions-button"), "instructions", function () {
      showScreen("instructions-screen");
    });
    bindActivation(document.getElementById("instructions-continue-button"), "mission", function () {
      showScreen("mission-screen");
    });

    var backButtons = document.querySelectorAll("[data-back]");
    for (var index = 0; index < backButtons.length; index += 1) {
      (function (button, buttonIndex) {
        bindActivation(button, "back-" + buttonIndex, function () {
          showScreen(button.dataset.back);
        });
      })(backButtons[index], index);
    }

  }

  function bindMissionFallback() {
    if (window.benGame) return;
    bindActivation(document.getElementById("mission-start-button"), "game-start", function () {
      bootGameIfNeeded().then(function (ready) {
        if (ready && window.benGame) {
          window.benGame.start();
          return;
        }
        showDiagnostic("O jogo não conseguiu carregar os módulos. Toque em atualizar a página e tente novamente.");
      });
    });
  }

  updateViewportHeight();
  window.addEventListener("resize", updateViewportHeight, { passive: true });
  window.addEventListener("orientationchange", updateViewportHeight, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", updateViewportHeight, { passive: true });
  }

  window.addEventListener("error", function (event) {
    console.error("Erro global do Ben", event.error || event.message);
  });
  window.addEventListener("unhandledrejection", function (event) {
    console.error("Promise rejeitada no Ben", event.reason);
  });

  document.addEventListener("DOMContentLoaded", function () {
    bindFallbackNavigation();
    window.setTimeout(function () {
      if (!window.benGame) {
        bindMissionFallback();
        bootGameIfNeeded().then(function (ready) {
          if (!ready) showDiagnostic("Falha ao concluir o carregamento do jogo neste celular.");
        });
      }
    }, 600);
  });

  window.BenMobileEnvironment = {
    touchDevice: touchDevice,
    updateViewportHeight: updateViewportHeight,
    showScreen: showScreen,
    bootGameIfNeeded: bootGameIfNeeded
  };
})();
