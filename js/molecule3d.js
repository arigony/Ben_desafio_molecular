(function () {
  "use strict";

  class MoleculeViewer {
    constructor({ container, fallback, selector, selectorLabel, note, models }) {
      this.container = container;
      this.fallback = fallback;
      this.selector = selector;
      this.selectorLabel = selectorLabel;
      this.note = note;
      this.models = models;
      this.viewer = null;
      this.currentProduct = null;
      this.available = this.supportsWebGL() && Boolean(window.$3Dmol);
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

    show(product) {
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
        return;
      }
      if (!this.ensureViewer()) {
        this.hide3D("Visualização 3D indisponível neste dispositivo.");
        return;
      }
      this.container.hidden = false;
      this.fallback.hidden = true;
      this.renderModel(modelKeys[0]);
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
            this.hide3D("Visualização 3D indisponível neste dispositivo.");
          }
        });
      } catch (_error) {
        this.hide3D("Visualização 3D indisponível neste dispositivo.");
      }
    }

    hide3D(message) {
      this.container.hidden = true;
      this.fallback.hidden = false;
      this.fallback.textContent = message;
    }

    clear() {
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
        this.hide3D("Visualização 3D indisponível neste dispositivo.");
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

  window.MoleculeViewer = MoleculeViewer;
})();
