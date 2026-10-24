import { LANTERNS } from "./art";
import type { DecorKind, Place } from "./places";
import { type Ctx, C, glow, rgba, shade } from "./paint";

// Per-frame animation drawn on top of cached sprites. These use plain shapes
// only, so they stay cheap. `t` is world time in seconds; `near` is true when
// the player is parked at the place.

export interface OverlaySprites {
  gear: HTMLCanvasElement;
  magnifier: HTMLCanvasElement;
}

function puff(ctx: Ctx, x: number, y: number, s: number, a: number) {
  ctx.globalAlpha = a;
  ctx.fillStyle = "#fbf6ee";
  ctx.beginPath();
  ctx.arc(x, y, s, 0, Math.PI * 2);
  ctx.arc(x + s * 0.6, y + s * 0.2, s * 0.7, 0, Math.PI * 2);
  ctx.arc(x - s * 0.6, y + s * 0.25, s * 0.65, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function smoke(ctx: Ctx, x: number, y: number, t: number, n = 4) {
  for (let k = 0; k < n; k++) {
    const ph = (t * 0.22 + k / n) % 1;
    puff(ctx, x + ph * 46 + Math.sin(t + k) * 6, y - ph * 130, 8 + ph * 16, (1 - ph) * 0.75);
  }
}

export function drawPlaceOverlay(ctx: Ctx, p: Place, t: number, s: OverlaySprites, near: boolean) {
  const { x, y } = p;
  switch (p.id) {
    case "shadowpath": {
      const lx = x;
      const ly = y - 342;
      const a = t * 0.8;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.scale(1, 0.45);
      const g = ctx.createRadialGradient(0, 0, 8, 0, 0, 340);
      g.addColorStop(0, "rgba(255, 226, 150, 0.55)");
      g.addColorStop(1, "rgba(255, 226, 150, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 340, a - 0.2, a + 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      for (let k = 0; k < 2; k++) {
        const ph = (t * 0.4 + k * 0.5) % 1;
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = (1 - ph) * 0.5;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(x, y + 4, 70 + ph * 150, (70 + ph * 150) * 0.32, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case "industrial-product-search": {
      ctx.save();
      ctx.translate(x + 160, y - 112);
      ctx.rotate(t * 0.7);
      ctx.drawImage(s.gear, -60, -60, 120, 120);
      ctx.restore();
      smoke(ctx, x + 51, y - 276, t);
      break;
    }
    case "trek-saathi": {
      const fx = x - 176;
      const fy = y - 40;
      ctx.strokeStyle = "#5e3f29";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx, fy - 54);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(fx, fy - 54);
      for (let i = 0; i <= 8; i++) {
        const u = i / 8;
        ctx.lineTo(fx + u * 40, fy - 54 + Math.sin(t * 5 - u * 4) * 3.5 * u);
      }
      for (let i = 8; i >= 0; i--) {
        const u = i / 8;
        ctx.lineTo(fx + u * 40, fy - 30 + Math.sin(t * 5 - u * 4) * 3.5 * u);
      }
      ctx.closePath();
      ctx.fillStyle = p.color;
      ctx.fill();
      // Birds over the peaks.
      ctx.strokeStyle = "#2c3a36";
      ctx.lineWidth = 1.8;
      for (let k = 0; k < 3; k++) {
        const a = t * 0.45 + k * 2.1;
        const bx = x + Math.cos(a) * 160;
        const by = y - 330 + Math.sin(a) * 24;
        const flap = Math.sin(t * 8 + k) * 5;
        ctx.beginPath();
        ctx.moveTo(bx - 10, by - flap);
        ctx.quadraticCurveTo(bx - 4, by - 4, bx, by);
        ctx.quadraticCurveTo(bx + 4, by - 4, bx + 10, by - flap);
        ctx.stroke();
      }
      break;
    }
    case "website-content-search": {
      for (let k = 0; k < 3; k++) {
        const ph = (t * 0.25 + k / 3) % 1;
        const cx = x - 300 + ph * 250;
        const cy = y - 170 - k * 36 + Math.sin(t * 2 + k) * 8;
        ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.95;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(Math.sin(t + k) * 0.2);
        ctx.fillStyle = "rgba(20,40,60,0.18)";
        ctx.fillRect(-17, -11, 38, 26);
        ctx.fillStyle = "#fffaf0";
        ctx.fillRect(-19, -13, 38, 26);
        ctx.fillStyle = rgba(p.color, 0.6);
        for (let l = 0; l < 3; l++) ctx.fillRect(-13, -6 + l * 7, 24 - l * 5, 2.5);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      const a = t * 0.6;
      ctx.save();
      ctx.translate(x + 130 + Math.cos(a) * 26, y - 300 + Math.sin(a * 1.3) * 14);
      ctx.rotate(Math.sin(t * 0.8) * 0.2);
      ctx.drawImage(s.magnifier, -50, -50, 100, 100);
      ctx.restore();
      break;
    }
    case "workshop": {
      ctx.save();
      ctx.translate(x - 70, y - 152);
      ctx.rotate(Math.sin(t * 1.6) * 0.22);
      ctx.strokeStyle = "#2c3a36";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 24);
      ctx.stroke();
      glow(ctx, 0, 32, 40, C.warmLight, 0.65);
      ctx.fillStyle = "#fff0b3";
      ctx.beginPath();
      ctx.arc(0, 32, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      break;
    }
    case "about":
      smoke(ctx, x + 63, y - 218, t, 3);
      break;
    case "skills":
      for (let i = 0; i < LANTERNS.length; i++) {
        const [lx, ly, c] = LANTERNS[i];
        const pulse = 0.55 + Math.sin(t * 2.2 + i * 1.3) * 0.25 + (near ? 0.25 : 0);
        const sway = Math.sin(t * 1.4 + i) * 2;
        glow(ctx, x + lx + sway, y + ly, 26 + pulse * 10, c, pulse * 0.7);
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.ellipse(x + lx + sway, y + ly, 6, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.beginPath();
        ctx.arc(x + lx + sway - 2, y + ly - 3, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case "github": {
      const flick = Math.sin(t * 13) > 0.92 ? 0.15 : 0.45;
      glow(ctx, x, y - 104, 60, "#4ade80", flick);
      break;
    }
    case "email": {
      const ex = x + Math.sin(t * 1.2) * 30;
      const ey = y - 200 + Math.sin(t * 2.3) * 8;
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(Math.sin(t * 1.7) * 0.2);
      ctx.fillStyle = "rgba(20,40,60,0.18)";
      ctx.fillRect(-14, -8, 32, 20);
      ctx.fillStyle = "#fffaf0";
      ctx.fillRect(-16, -10, 32, 20);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-16, -10);
      ctx.lineTo(0, 2);
      ctx.lineTo(16, -10);
      ctx.stroke();
      ctx.restore();
      break;
    }
  }
  if (near) {
    const [fx, fy] = p.front;
    const s2 = 1 + Math.sin(t * 4) * 0.05;
    glow(ctx, fx, fy, 70, p.color, 0.25);
    ctx.strokeStyle = rgba(p.color, 0.85);
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 10]);
    ctx.lineDashOffset = -t * 30;
    ctx.beginPath();
    ctx.ellipse(fx, fy, 56 * s2, 22 * s2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

export function drawDecorOverlay(ctx: Ctx, kind: DecorKind, x: number, y: number, t: number) {
  if (kind === "fountain") {
    // Arcing jets from the top bowl.
    ctx.strokeStyle = "rgba(220, 245, 255, 0.85)";
    ctx.lineWidth = 2.5;
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + t * 0.3;
      const dx = Math.cos(a) * 58;
      const dy = Math.sin(a) * 22;
      ctx.beginPath();
      ctx.moveTo(x, y - 74);
      ctx.quadraticCurveTo(x + dx * 0.5, y - 104, x + dx, y - 6 + dy);
      ctx.stroke();
    }
    for (let k = 0; k < 3; k++) {
      const ph = (t * 0.6 + k / 3) % 1;
      ctx.strokeStyle = `rgba(255,255,255,${(1 - ph) * 0.6})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(x, y - 4, 20 + ph * 50, (20 + ph * 50) * 0.38, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (kind === "campfire") {
    const flick = (k: number) => 0.85 + Math.sin(t * 11 + k * 1.7) * 0.1 + Math.sin(t * 17 + k) * 0.06;
    glow(ctx, x, y - 20, 90, "#ffb347", 0.3 + Math.sin(t * 9) * 0.04);
    const flames: [string, number, number][] = [["#ff6a2a", 22, 0], ["#ffa53a", 15, 1], ["#ffe08a", 9, 2]];
    for (const [c, h, k] of flames) {
      const fh = h * 2.2 * flick(k);
      const fx = x + Math.sin(t * 6 + k) * 2;
      const fy = y - 8;
      ctx.beginPath();
      ctx.moveTo(fx - h * 0.7, fy);
      ctx.quadraticCurveTo(fx - h * 0.8, fy - fh * 0.6, fx, fy - fh);
      ctx.quadraticCurveTo(fx + h * 0.8, fy - fh * 0.6, fx + h * 0.7, fy);
      ctx.closePath();
      shade(ctx, fx, fy - fh, fx, fy, "#fff4c2", c, c);
    }
  }
}

export function makeOverlaySprites(scale: number): OverlaySprites {
  const mk = (size: number, draw: (c: Ctx) => void) => {
    const c = document.createElement("canvas");
    c.width = c.height = Math.ceil(size * scale);
    const g = c.getContext("2d")!;
    g.scale(scale, scale);
    g.translate(size / 2, size / 2);
    draw(g);
    return c;
  };
  const gear = mk(120, (g) => {
    const teeth = 10;
    g.beginPath();
    for (let i = 0; i < teeth * 2; i++) {
      const a0 = (i / (teeth * 2)) * Math.PI * 2;
      const a1 = ((i + 1) / (teeth * 2)) * Math.PI * 2;
      const rad = i % 2 === 0 ? 56 : 44;
      g.lineTo(Math.cos(a0) * rad, Math.sin(a0) * rad);
      g.lineTo(Math.cos(a1) * rad, Math.sin(a1) * rad);
    }
    g.closePath();
    shade(g, -56, -56, 56, 56, "#ffd37a", "#e09a28", "#9a5f0e");
    g.fillStyle = "#5b6b69";
    g.beginPath();
    g.arc(0, 0, 14, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "rgba(90,50,10,0.5)";
    g.lineWidth = 5;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      g.beginPath();
      g.moveTo(Math.cos(a) * 18, Math.sin(a) * 18);
      g.lineTo(Math.cos(a) * 38, Math.sin(a) * 38);
      g.stroke();
    }
  });
  const magnifier = mk(100, (g) => {
    g.strokeStyle = "#7a5233";
    g.lineWidth = 9;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(20, 20);
    g.lineTo(42, 42);
    g.stroke();
    const lens = g.createRadialGradient(-14, -14, 2, -6, -6, 32);
    lens.addColorStop(0, "rgba(255,255,255,0.85)");
    lens.addColorStop(1, "rgba(160,215,255,0.45)");
    g.fillStyle = lens;
    g.beginPath();
    g.arc(-6, -6, 30, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#d9a441";
    g.lineWidth = 6;
    g.stroke();
  });
  return { gear, magnifier };
}
