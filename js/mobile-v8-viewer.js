(() => {
  "use strict";
  class MoleculeViewer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.atoms = [];
      this.bonds = [];
      this.rx = -0.35;
      this.ry = 0.55;
      this.zoom = 1;
      this.pointer = null;
      this.resizeObserver = new ResizeObserver(() => this.draw());
      this.resizeObserver.observe(canvas.parentElement);
      canvas.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        this.pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
        canvas.setPointerCapture?.(event.pointerId);
      });
      canvas.addEventListener("pointermove", (event) => {
        if (!this.pointer || this.pointer.id !== event.pointerId) return;
        event.preventDefault();
        this.ry += (event.clientX - this.pointer.x) * 0.012;
        this.rx += (event.clientY - this.pointer.y) * 0.012;
        this.pointer.x = event.clientX;
        this.pointer.y = event.clientY;
        this.draw();
      });
      const release = (event) => {
        if (this.pointer?.id === event.pointerId) this.pointer = null;
      };
      canvas.addEventListener("pointerup", release);
      canvas.addEventListener("pointercancel", release);
    }

    load(xyz) {
      const lines = String(xyz || "").trim().split(/\r?\n/);
      const count = Number(lines[0]) || 0;
      this.atoms = [];
      for (let i = 0; i < count; i += 1) {
        const parts = (lines[i + 2] || "").trim().split(/\s+/);
        if (parts.length >= 4) this.atoms.push({ el: parts[0], x: +parts[1], y: +parts[2], z: +parts[3] });
      }
      const center = this.atoms.reduce((acc, atom) => ({ x: acc.x + atom.x, y: acc.y + atom.y, z: acc.z + atom.z }), { x: 0, y: 0, z: 0 });
      if (this.atoms.length) {
        center.x /= this.atoms.length; center.y /= this.atoms.length; center.z /= this.atoms.length;
        this.atoms.forEach((atom) => { atom.x -= center.x; atom.y -= center.y; atom.z -= center.z; });
      }
      this.bonds = [];
      for (let a = 0; a < this.atoms.length; a += 1) {
        for (let b = a + 1; b < this.atoms.length; b += 1) {
          const A = this.atoms[a], B = this.atoms[b];
          const distance = Math.hypot(A.x - B.x, A.y - B.y, A.z - B.z);
          const limits = { H: 0.36, C: 0.77, O: 0.68, N: 0.72 };
          const limit = ((limits[A.el] || 0.75) + (limits[B.el] || 0.75)) * 1.22;
          if (distance > 0.25 && distance <= limit) {
            const doubleBond = ((A.el === "C" && B.el === "O") || (A.el === "O" && B.el === "C")) && distance < 1.32;
            this.bonds.push({ a, b, order: doubleBond ? 2 : 1 });
          }
        }
      }
      this.reset();
    }

    reset() { this.rx = -0.35; this.ry = 0.55; this.zoom = 1; this.draw(); }
    zoomBy(factor) { this.zoom = Math.max(0.6, Math.min(2.1, this.zoom * factor)); this.draw(); }

    rotate(atom) {
      const cx = Math.cos(this.rx), sx = Math.sin(this.rx), cy = Math.cos(this.ry), sy = Math.sin(this.ry);
      const y = atom.y * cx - atom.z * sx;
      const z1 = atom.y * sx + atom.z * cx;
      return { ...atom, x: atom.x * cy + z1 * sy, y, z: -atom.x * sy + z1 * cy };
    }

    drawBond(A, B, width, colorA, colorB, offset = 0) {
      const ctx = this.ctx;
      const dx = B.px - A.px, dy = B.py - A.py, len = Math.max(1, Math.hypot(dx, dy));
      const ox = -dy / len * offset, oy = dx / len * offset;
      const mx = (A.px + B.px) / 2 + ox, my = (A.py + B.py) / 2 + oy;
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineWidth = width + 3;
      ctx.strokeStyle = "rgba(20,35,42,.25)";
      ctx.beginPath(); ctx.moveTo(A.px + ox, A.py + oy); ctx.lineTo(B.px + ox, B.py + oy); ctx.stroke();
      ctx.lineWidth = width;
      ctx.strokeStyle = colorA;
      ctx.beginPath(); ctx.moveTo(A.px + ox, A.py + oy); ctx.lineTo(mx, my); ctx.stroke();
      ctx.strokeStyle = colorB;
      ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(B.px + ox, B.py + oy); ctx.stroke();
      ctx.restore();
    }

    draw() {
      const canvas = this.canvas, ctx = this.ctx, rect = canvas.parentElement.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const w = rect.width, h = rect.height;
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#f7f9fa"); bg.addColorStop(1, "#e4e9eb");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
      if (!this.atoms.length) return;

      const projected = this.atoms.map((atom) => this.rotate(atom));
      let extent = 1;
      projected.forEach((atom) => { extent = Math.max(extent, Math.abs(atom.x), Math.abs(atom.y), Math.abs(atom.z)); });
      const scale = Math.min(w, h) * 0.38 / extent * this.zoom;
      projected.forEach((atom) => {
        const perspective = 1 + Math.max(-0.2, Math.min(0.2, atom.z / (extent * 5)));
        atom.px = w / 2 + atom.x * scale * perspective;
        atom.py = h / 2 - atom.y * scale * perspective;
        atom.perspective = perspective;
      });

      const colors = {
        H: ["#f5f6f7", "#aab4ba", 0.3],
        C: ["#252a31", "#080a0d", 0.47],
        O: ["#ef3030", "#8c0808", 0.45],
        N: ["#2868d4", "#0b2d75", 0.46]
      };

      this.bonds
        .map((bond) => ({ bond, z: (projected[bond.a].z + projected[bond.b].z) / 2 }))
        .sort((a, b) => a.z - b.z)
        .forEach(({ bond }) => {
          const A = projected[bond.a], B = projected[bond.b];
          const colorA = (colors[A.el] || colors.C)[0], colorB = (colors[B.el] || colors.C)[0];
          const width = Math.max(5, Math.min(12, scale * 0.13));
          if (bond.order === 2) {
            this.drawBond(A, B, width * 0.65, colorA, colorB, 5);
            this.drawBond(A, B, width * 0.65, colorA, colorB, -5);
          } else this.drawBond(A, B, width, colorA, colorB, 0);
        });

      projected.slice().sort((a, b) => a.z - b.z).forEach((atom) => {
        const [base, dark, radius] = colors[atom.el] || colors.C;
        const r = Math.max(8, radius * scale * 0.67 * atom.perspective);
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,.25)"; ctx.shadowBlur = r * 0.28; ctx.shadowOffsetY = r * 0.12;
        const grad = ctx.createRadialGradient(atom.px - r * 0.35, atom.py - r * 0.4, 1, atom.px, atom.py, r);
        grad.addColorStop(0, "#fff"); grad.addColorStop(0.2, base); grad.addColorStop(1, dark);
        ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(atom.px, atom.py, r, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });
    }
  }
  window.MoleculeViewer = MoleculeViewer;
})();
