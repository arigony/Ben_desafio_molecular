(function () {
  "use strict";

  const THREE_DMOL_URL = "https://cdn.jsdelivr.net/npm/3dmol@2.5.5/build/3Dmol-min.js";
  const THREE_DMOL_TIMEOUT_MS = 5000;
  const FALLBACK_MESSAGE = "Visualização 3D indisponível neste dispositivo.";

  class ThreeDMolLoader {
    constructor({ url = THREE_DMOL_URL, timeoutMs = THREE_DMOL_TIMEOUT_MS } = {}) {
      this.url = url;
      this.timeoutMs = Math.min(THREE_DMOL_TIMEOUT_MS, Math.max(1, timeoutMs));
      this.promise = null;
    }

    load() {
      if (window.$3Dmol) return Promise.resolve(true);
      if (this.promise) return this.promise;

      this.promise = new Promise((resolve) => {
        let settled = false;
        let script = document.querySelector('script[data-ben-3dmol="true"]');
        let shouldAppend = false;
        const finish = (available) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timeoutId);
          resolve(Boolean(available && window.$3Dmol));
        };
        const timeoutId = window.setTimeout(() => finish(false), this.timeoutMs);

        if (!script) {
          script = document.createElement("script");
          script.src = this.url;
          script.async = true;
          script.dataset.ben3dmol = "true";
          shouldAppend = true;
        }

        script.addEventListener("load", () => finish(true), { once: true });
        script.addEventListener("error", () => finish(false), { once: true });
        if (shouldAppend) document.head.append(script);
      }).catch(() => false);

      return this.promise;
    }
  }

  class MoleculeViewer {
    constructor({ container, fallback, selector, selectorLabel, note, models, loader }) {
      this.container = container;
      this.fallback = fallback;
      this.selector = selector;
      this.selectorLabel = selectorLabel;
      this.note = note;
      this.models = models;
      this.loader = loader || new ThreeDMolLoader();
      this.viewer = null;
      this.currentProduct = null;
      this.renderGeneration = 0;
      this.available = false;
      this.selector?.addEventListener("change", () => this.renderModel(this.selector.value));
    }

    supportsWebGL() {
      try {
        const canvas = document.createElement("canvas");
        return Boolean(
          window.WebGLRenderingContext &&
            (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
        );
      } catch (_error) {
        return false;
      }
    }

    ensureViewer() {
      this.available = this.supportsWebGL() && Boolean(window.$3Dmol);
      if (!this.available || this.viewer) return this.viewer;
      try {
        this.viewer = window.$3Dmol.createViewer(this.container, {
          backgroundColor: "rgba(248,252,250,0)",
          antialias: true
        });
      } catch (_error) {
        this.available = false;
        this.viewer = null;
      }
      return this.viewer;
    }

    async show(product) {
      const generation = ++this.renderGeneration;
      this.currentProduct = product;
      const modelKeys = product.modelKeys || [];
      this.note.hidden = !product.viewerNote;
      this.note.textContent = product.viewerNote || "";
      this.selector.innerHTML = "";
      modelKeys.forEach((key, index) => {
        const option = document.createElement("option");
        option.value = key;
        option.textContent = product.modelLabels?.[index] || this.modelName(key);
        this.selector.append(option);
      });
      this.selectorLabel.hidden = modelKeys.length < 2;

      if (!modelKeys.length) {
        this.note.hidden = true;
        this.hide3D(product.viewerNote || "Não há um modelo molecular único para este produto.");
        return false;
      }
      if (!this.supportsWebGL()) {
        this.hide3D(FALLBACK_MESSAGE);
        return false;
      }

      this.container.hidden = true;
      this.fallback.hidden = false;
      this.fallback.textContent = "Carregando visualização 3D…";

      const loaded = await this.loader.load().catch(() => false);
      if (generation !== this.renderGeneration || this.currentProduct !== product) return false;
      if (!loaded || !this.ensureViewer()) {
        this.hide3D(FALLBACK_MESSAGE);
        return false;
      }

      this.container.hidden = false;
      this.fallback.hidden = true;
      this.renderModel(modelKeys[0]);
      return true;
    }

    renderModel(key) {
      if (!this.viewer || !this.models[key] || !this.currentProduct) return;
      try {
        this.viewer.removeAllModels();
        this.viewer.addModel(this.models[key], "xyz");
        this.viewer.setStyle(
          {},
          {
            stick: { radius: 0.16, colorscheme: "Jmol" },
            sphere: { scale: 0.3, colorscheme: "Jmol" }
          }
        );
        this.viewer.zoomTo();
        this.viewer.render();
        requestAnimationFrame(() => {
          try {
            this.viewer.resize();
            this.viewer.render();
          } catch (_error) {
            this.hide3D(FALLBACK_MESSAGE);
          }
        });
      } catch (_error) {
        this.hide3D(FALLBACK_MESSAGE);
      }
    }

    hide3D(message) {
      this.container.hidden = true;
      this.fallback.hidden = false;
      this.fallback.textContent = message;
    }

    clear() {
      this.renderGeneration += 1;
      this.currentProduct = null;
      if (!this.viewer) return;
      try {
        this.viewer.removeAllModels();
        this.viewer.render();
      } catch (_error) {
        this.available = false;
      }
    }

    resize() {
      if (!this.viewer || this.container.hidden) return;
      try {
        this.viewer.resize();
        this.viewer.render();
      } catch (_error) {
        this.hide3D(FALLBACK_MESSAGE);
      }
    }

    modelName(key) {
      const labels = {
        ethanol: "Etanol",
        isopropanol: "Isopropanol",
        aceticAcid: "Ácido acético",
        acetone: "Acetona",
        sodiumChloride: "Cloreto de sódio",
        esterFragment: "Fragmento de éster"
      };
      return labels[key] || key;
    }
  }

  window.ThreeDMolLoader = ThreeDMolLoader;
  window.MoleculeViewer = MoleculeViewer;
})();
