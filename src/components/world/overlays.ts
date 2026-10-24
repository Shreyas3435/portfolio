import { FAIRY_LIGHTS } from "./art";
import type { DecorKind, Place } from "./places";
import { type Ctx, glow, rgba } from "./paint";

// Per-frame animation on top of the cached aerial sprites. Plain shapes only,
// so it stays cheap. `t` is world time in seconds.

/** Smoke drifting downwind from a chimney (seen from above). */
function smoke(ctx: Ctx, x: number, y: number, t: number, n = 5) {
  for (let k = 0; k < n; k++) {
    const ph = (((t * 0.18 + k / n) % 1) + 1) % 1;
    const px = x + ph * 120 + Math.sin(t * 0.7 + k) * 6;
    const py = y + ph * 40;
    const s = 8 + ph * 26;
    ctx.globalAlpha = (1 - ph) * 0.45;
    ctx.fillStyle = "#e9ebec";
    ctx.beginPath();
    ctx.arc(px, py, s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function beacon(ctx: Ctx, x: number, y: number, t: number, phase = 0) {
  if (Math.sin(t * 3 + phase) < 0.5) return;
  glow(ctx, x, y, 14, "#ff3b30", 0.9);
  ctx.fillStyle = "#ffd6d2";
  ctx.beginPath();
  ctx.arc(x, y, 2, 0, Math.PI * 2);
  ctx.fill();
}

export function drawPlaceOverlay(ctx: Ctx, p: Place, t: number, near: boolean) {
  const { x, y } = p;
  switch (p.id) {
    case "shadowpath": {
      // Rotating radar dish on the tower roof.
      ctx.save();
      ctx.translate(x - 4, y - 8);
      ctx.rotate(t * 1.4);
      ctx.fillStyle = "rgba(10,18,26,0.35)";
      ctx.fillRect(-15, -3, 34, 10);
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 6, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#e9ebec";
      ctx.fill();
      ctx.strokeStyle = "#7d848b";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = "#5f666d";
      ctx.fillRect(-2, -2, 16, 4);
      ctx.restore();
      beacon(ctx, x + 38, y - 30, t);
      beacon(ctx, x - 38, y + 30, t, 1.6);
      break;
    }
    case "industrial-product-search": {
      for (const fx of [-110, -60]) {
        ctx.save();
        ctx.translate(x + fx, y + 44);
        ctx.rotate(t * 4);
        ctx.fillStyle = "#4a5056";
        for (let i = 0; i < 4; i++) {
          ctx.rotate(Math.PI / 2);
          ctx.fillRect(-1.5, 0, 3, 8);
        }
        ctx.restore();
      }
      smoke(ctx, x + 110, y - 46, t);
      break;
    }
    case "workshop": {
      // Welding sparks at the open door.
      for (let k = 0; k < 6; k++) {
        const ph = (t * 1.8 + k / 6) % 1;
        const a = k * 1.7 + Math.floor(t * 1.8 + k / 6) * 2.3;
        const sx = x + Math.cos(a) * ph * 30;
        const sy = y + p.h / 2 + 12 + Math.sin(a) * ph * 18;
        ctx.globalAlpha = 1 - ph;
        ctx.fillStyle = ph < 0.3 ? "#fff6d0" : "#ffb347";
        ctx.fillRect(sx, sy, 2.2, 2.2);
      }
      ctx.globalAlpha = 1;
      if (Math.sin(t * 23) > 0.3) glow(ctx, x, y + p.h / 2 + 12, 24, "#bfe6ff", 0.4);
      break;
    }
    case "website-content-search": {
      // The observatory dome slowly turns its slit.
      ctx.save();
      ctx.translate(x + 80, y - 10);
      ctx.rotate(t * 0.25);
      ctx.fillStyle = "#2b3238";
      ctx.fillRect(-5, -46, 10, 46);
      ctx.restore();
      break;
    }
    case "trek-saathi":
      smoke(ctx, x + 81, y - 49, t, 4);
      // Hot-tub steam.
      for (let k = 0; k < 3; k++) {
        const ph = (t * 0.4 + k / 3) % 1;
        ctx.globalAlpha = (1 - ph) * 0.3;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(x - p.w / 2 + 40 + ph * 20, y + p.h / 2 - 20 - ph * 16, 6 + ph * 8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    case "about": {
      // Shimmer on the pool.
      const px = x - p.w / 2 + 18;
      const py = y + p.h / 2 - 22 - 12;
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 1.2;
      for (let k = 0; k < 4; k++) {
        const ox = ((t * 12 + k * 23) % 92) + px;
        ctx.beginPath();
        ctx.moveTo(ox, py + 4 + k * 5);
        ctx.quadraticCurveTo(ox + 6, py + 1 + k * 5, ox + 12, py + 4 + k * 5);
        ctx.stroke();
      }
      break;
    }
    case "skills":
      for (let i = 0; i < FAIRY_LIGHTS.length; i++) {
        const [lx, ly] = FAIRY_LIGHTS[i];
        const tw = 0.5 + 0.5 * Math.sin(t * 2.6 + i * 1.7);
        glow(ctx, x + lx, y + ly, 9 + tw * 6, "#ffe6a6", 0.35 + tw * 0.35 + (near ? 0.2 : 0));
      }
      break;
    case "linkedin":
      beacon(ctx, x - 72, y - 72, t);
      beacon(ctx, x + 72, y - 72, t, 0.6);
      beacon(ctx, x - 72, y + 72, t, 1.2);
      beacon(ctx, x + 72, y + 72, t, 1.8);
      break;
  }
  if (near) {
    const [fx, fy] = p.front;
    const s2 = 1 + Math.sin(t * 4) * 0.05;
    glow(ctx, fx, fy, 60, p.color, 0.22);
    ctx.strokeStyle = rgba(p.color, 0.95);
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 10]);
    ctx.lineDashOffset = -t * 30;
    ctx.beginPath();
    ctx.arc(fx, fy, 44 * s2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

export function drawDecorOverlay(ctx: Ctx, kind: DecorKind, x: number, y: number, t: number) {
  if (kind === "fountain") {
    // Spray ring and ripples, seen from above.
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2 + t * 0.4;
      const r1 = 22 + ((t * 40 + k * 7) % 38);
      ctx.globalAlpha = 0.7 - (r1 - 22) / 60;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * r1, y + Math.sin(a) * r1, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let k = 0; k < 3; k++) {
      const ph = (t * 0.5 + k / 3) % 1;
      ctx.globalAlpha = (1 - ph) * 0.5;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, 26 + ph * 52, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (kind === "campfire") {
    const flick = 0.85 + Math.sin(t * 11) * 0.1 + Math.sin(t * 17) * 0.06;
    glow(ctx, x, y, 70 * flick, "#ff9a3c", 0.45);
    glow(ctx, x, y, 26 * flick, "#ffe08a", 0.9);
    for (let k = 0; k < 4; k++) {
      const ph = (t * 0.9 + k / 4) % 1;
      ctx.globalAlpha = 1 - ph;
      ctx.fillStyle = "#ffb347";
      ctx.fillRect(x + Math.sin(t * 3 + k) * 10 + ph * 30, y - ph * 10, 2, 2);
    }
    ctx.globalAlpha = 1;
  }
}
