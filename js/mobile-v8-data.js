(() => {
  "use strict";
  const productCatalog = {
    perfume: {
      id: "perfume", name: "Perfume", emoji: "🧴", kind: "Produto comercial: mistura de componentes",
      compound: "Etanol", formula: "C₂H₆O", condensed: "CH₃CH₂OH", answer: "Álcool",
      options: ["Álcool", "Cetona", "Éster", "Fenol"],
      hint: "Procure o grupo hidroxila ligado a um carbono saturado.",
      explanation: "O etanol é um álcool e atua como solvente comum em perfumes. A fórmula apresentada é do composto representativo, não do produto comercial inteiro.",
      mixture: true, mission: true, model: "ethanol"
    },
    removedor: {
      id: "removedor", name: "Removedor", emoji: "🧴", kind: "Produto comercial: composição variável",
      compound: "Acetona", formula: "C₃H₆O", condensed: "CH₃COCH₃", answer: "Cetona",
      options: ["Álcool", "Cetona", "Aldeído", "Éter"],
      hint: "Observe o grupo carbonila C=O entre dois carbonos.",
      explanation: "A acetona é uma cetona. O removedor pode conter outros componentes; aqui a acetona é o composto representativo.",
      mixture: true, mission: false, model: "acetone"
    },
    gel: {
      id: "gel", name: "Álcool em gel", emoji: "🧴", kind: "Produto comercial: mistura de componentes",
      compound: "Etanol", formula: "C₂H₆O", condensed: "CH₃CH₂OH", answer: "Álcool",
      options: ["Álcool", "Ácido carboxílico", "Cetona", "Amina"],
      hint: "O grupo –OH é a pista principal.",
      explanation: "O etanol pertence à função álcool. O gel também contém água, espessantes e outros componentes.",
      mixture: true, mission: true, model: "ethanol"
    },
    antiseptico: {
      id: "antiseptico", name: "Antisséptico", emoji: "🧴", kind: "Produto comercial: mistura de componentes",
      compound: "Isopropanol", formula: "C₃H₈O", condensed: "(CH₃)₂CHOH", answer: "Álcool",
      options: ["Fenol", "Álcool", "Cetona", "Amida"],
      hint: "A hidroxila está ligada ao carbono central.",
      explanation: "O isopropanol é um álcool secundário e pode estar presente em formulações antissépticas.",
      mixture: true, mission: true, model: "isopropanol"
    },
    vinagre: {
      id: "vinagre", name: "Vinagre", emoji: "🍶", kind: "Produto comercial: solução aquosa",
      compound: "Ácido acético", formula: "C₂H₄O₂", condensed: "CH₃COOH", answer: "Ácido carboxílico",
      options: ["Álcool", "Ácido carboxílico", "Éster", "Cetona"],
      hint: "Procure o grupo –COOH.",
      explanation: "O ácido acético é um ácido carboxílico. O vinagre é uma solução aquosa e não possui uma única fórmula como produto.",
      mixture: true, mission: false, model: "acetic"
    },
    oleo: {
      id: "oleo", name: "Óleo vegetal", emoji: "🫗", kind: "Produto comercial: mistura de triacilgliceróis",
      compound: "Classe representativa: triacilgliceróis", formula: "", condensed: "", answer: "Éster",
      options: ["Álcool", "Éster", "Aldeído", "Amina"],
      hint: "Os triacilgliceróis apresentam ligações éster.",
      explanation: "Óleos vegetais são misturas. Sua classe estrutural predominante contém grupos éster, mas não existe uma fórmula molecular única para o produto.",
      mixture: true, mission: false, model: null
    }
  };

  const stops = [
    { sign: "ENTRADA", left: null, right: null, tip: "Toque em ▲ para avançar pelo corredor." },
    { sign: "HIGIENE E BELEZA", left: "perfume", right: "removedor", tip: "Há dois produtos próximos. Escolha um lado e toque em Analisar." },
    { sign: "CUIDADOS PESSOAIS", left: "gel", right: "antiseptico", tip: "Observe os produtos de cuidados pessoais." },
    { sign: "MERCEARIA", left: "vinagre", right: "oleo", tip: "Nem todo produto comercial possui uma fórmula única." },
    { sign: "CAIXA", left: null, right: null, tip: "Carrinho completo: finalize a missão no caixa." }
  ];

  const models = {
    ethanol: `9
ethanol
C -0.748 0.015 0.024
C 0.748 -0.015 -0.024
O 1.396 1.195 0.016
H -1.129 -0.608 0.842
H -1.129 -0.439 -0.906
H -1.103 1.048 0.132
H 1.109 -0.601 0.837
H 1.109 -0.468 -0.908
H 2.344 1.071 -0.003`,
    isopropanol: `12
isopropanol
C 0.000 0.000 0.000
C -1.445 -0.220 0.020
C 1.445 -0.220 -0.020
O 0.000 1.430 0.000
H 0.000 -0.420 1.030
H -1.890 0.770 0.050
H -1.820 -0.760 0.900
H -1.820 -0.790 -0.840
H 1.890 0.770 -0.050
H 1.820 -0.790 0.840
H 1.820 -0.760 -0.900
H 0.000 1.830 0.850`,
    acetone: `10
acetone
C 0.000 0.000 0.000
O 0.000 1.220 0.000
C -1.420 -0.720 0.000
C 1.420 -0.720 0.000
H -1.770 -1.180 0.930
H -2.160 0.020 -0.220
H -1.360 -1.520 -0.750
H 1.770 -1.180 -0.930
H 2.160 0.020 0.220
H 1.360 -1.520 0.750`,
    acetic: `8
acetic acid
C 0.000 0.000 0.000
O 0.000 1.220 0.000
O 1.180 -0.760 0.000
C -1.420 -0.720 0.000
H -1.760 -1.200 0.930
H -2.180 0.020 -0.180
H -1.360 -1.510 -0.760
H 1.970 -0.210 0.000`
  };
  window.V8_DATA = { productCatalog, stops, models };
})();

(() => {
  "use strict";

  function installV8MobileFix() {
    const view = document.querySelector("#aisle-view");
    const cart = document.querySelector(".cart-fp");
    if (!view || !cart || document.querySelector("#v8-mobile-fix")) return;

    const world = document.createElement("div");
    world.className = "aisle-world";
    world.setAttribute("aria-hidden", "true");
    view.prepend(world);
    view.setAttribute("aria-busy", "false");

    const style = document.createElement("style");
    style.id = "v8-mobile-fix";
    style.textContent = `
      .game-screen,.game-stage,.controls,.nav-pad,.ben-tip,.sector-sign,.game-screen button{-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important}
      .aisle-view{background-image:none!important;background:#cfe6df!important;background-size:auto!important;background-position:center!important;transition:none!important;filter:none!important;contain:layout paint;isolation:isolate}
      .aisle-world{position:absolute;inset:-6%;z-index:0;background-image:var(--aisle-bg,linear-gradient(#cfe6df,#edf6f3));background-size:cover;background-position:center 48%;transform:translate3d(0,0,0) scale(1);transform-origin:50% 52%;transition:transform .34s cubic-bezier(.22,.78,.25,1);will-change:transform;backface-visibility:hidden}
      .aisle-view.stop-0 .aisle-world{transform:translate3d(0,0,0) scale(1)}
      .aisle-view.stop-1 .aisle-world{transform:translate3d(-1.5%,1.2%,0) scale(1.10)}
      .aisle-view.stop-2 .aisle-world{transform:translate3d(1.5%,2.1%,0) scale(1.20)}
      .aisle-view.stop-3 .aisle-world{transform:translate3d(-1%,3%,0) scale(1.31)}
      .aisle-view.stop-4 .aisle-world{transform:translate3d(0,4%,0) scale(1.42)}
      .aisle-view.moving .product-target{opacity:0!important;pointer-events:none}
      .aisle-view.v8-moving::before{content:"";position:absolute;inset:0;z-index:2;pointer-events:none;background:radial-gradient(ellipse at center,transparent 32%,#ffffff2b 70%,#12364b35 100%);animation:v8TravelFlash .34s ease both}
      @keyframes v8TravelFlash{0%{opacity:0;transform:scale(.96)}45%{opacity:1}100%{opacity:0;transform:scale(1.06)}}
      .cart-fp{transform:translate3d(-50%,0,0)!important;transform-origin:50% 100%;will-change:transform;backface-visibility:hidden}
      .cart-fp.v8-forward{animation:v8CartForward .36s cubic-bezier(.22,.78,.25,1)}
      .cart-fp.v8-back{animation:v8CartBack .36s cubic-bezier(.22,.78,.25,1)}
      @keyframes v8CartForward{0%{transform:translate3d(-50%,0,0) scale(1)}45%{transform:translate3d(-50%,-14px,0) scale(.96)}100%{transform:translate3d(-50%,0,0) scale(1)}}
      @keyframes v8CartBack{0%{transform:translate3d(-50%,0,0) scale(1)}45%{transform:translate3d(-50%,9px,0) scale(1.025)}100%{transform:translate3d(-50%,0,0) scale(1)}}
      .nav-pad button{touch-action:none!important;-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important}
      .nav-pad button.v8-pressed{transform:translateY(3px) scale(.97)!important;box-shadow:0 2px 0 #071923!important;background:#1b526e!important}
    `;
    document.head.appendChild(style);

    const stopNumber = () => {
      const match = Array.from(view.classList).find((name) => /^stop-\d$/.test(name));
      return match ? Number(match.slice(-1)) : 0;
    };

    let previousStop = stopNumber();
    let animationTimer = 0;
    const updateProgress = () => {
      const sign = document.querySelector("#sector-sign");
      if (!sign) return;
      sign.textContent = `${sign.textContent.replace(/\s*·\s*\d\/4$/, "")} · ${stopNumber()}/4`;
    };
    updateProgress();

    new MutationObserver(() => {
      const nextStop = stopNumber();
      if (nextStop === previousStop) return;
      const forward = nextStop > previousStop;
      previousStop = nextStop;
      window.clearTimeout(animationTimer);
      view.classList.add("v8-moving");
      cart.classList.remove("v8-forward", "v8-back");
      void cart.offsetWidth;
      cart.classList.add(forward ? "v8-forward" : "v8-back");
      view.setAttribute("aria-busy", "true");
      if (navigator.vibrate) navigator.vibrate(18);
      animationTimer = window.setTimeout(() => {
        view.classList.remove("v8-moving");
        cart.classList.remove("v8-forward", "v8-back");
        view.setAttribute("aria-busy", "false");
        updateProgress();
      }, 370);
    }).observe(view, { attributes: true, attributeFilter: ["class"] });

    function bindImmediate(button, repeat) {
      if (!button) return;
      let active = false;
      let delayTimer = 0;
      let repeatTimer = 0;
      let suppressUntil = 0;

      const trigger = () => button.click();
      const clear = () => {
        active = false;
        suppressUntil = Date.now() + 750;
        window.clearTimeout(delayTimer);
        window.clearInterval(repeatTimer);
        button.classList.remove("v8-pressed");
      };

      button.addEventListener("pointerdown", (event) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        if (active) return;
        active = true;
        button.classList.add("v8-pressed");
        button.setPointerCapture?.(event.pointerId);
        trigger();
        if (repeat) {
          delayTimer = window.setTimeout(() => {
            repeatTimer = window.setInterval(trigger, 400);
          }, 500);
        }
      }, { capture: true, passive: false });

      ["pointerup", "pointercancel", "lostpointercapture"].forEach((name) => button.addEventListener(name, clear, true));
      button.addEventListener("click", (event) => {
        if (event.isTrusted && Date.now() < suppressUntil) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      }, true);
      button.addEventListener("contextmenu", (event) => event.preventDefault());
    }

    bindImmediate(document.querySelector("#move-forward"), true);
    bindImmediate(document.querySelector("#move-back"), true);
    bindImmediate(document.querySelector("#look-left"), false);
    bindImmediate(document.querySelector("#look-right"), false);

    document.addEventListener("contextmenu", (event) => {
      if (event.target.closest(".game-stage,.controls")) event.preventDefault();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", installV8MobileFix, { once: true });
  } else {
    queueMicrotask(installV8MobileFix);
  }
})();
