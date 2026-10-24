import type { District, Place } from "./places";
import {
  type Ctx,
  type Pt,
  type Rand,
  C,
  blobPath,
  board,
  clump,
  darken,
  displayFont,
  glow,
  lighten,
  polyPath,
  range,
  rgba,
  shade,
  softShadow,
  text,
} from "./paint";

// Everything here paints into a cached sprite with the anchor (0, 0) at the
// middle of the object's ground line. Light comes from the upper left and the
// shading is cel-style: hard light / base / shadow bands.

export interface SpriteBox {
  w: number;
  h: number;
  ax: number;
  ay: number;
}

// ---------------------------------------------------------------------------
// Nature
// ---------------------------------------------------------------------------

export type Foliage = "palm" | "areca" | "mango" | "neem" | "bush" | "rock";

const TONES = {
  mango: ["#1d4a2c", "#2f7a3b", "#5fae47", "#b6e27a"],
  neem: ["#2f5f2a", "#4f9a3a", "#8ccf55", "#d9f29a"],
  frond: ["#1f5a2a", "#2f8a36", "#5cbf45", "#a8e070"],
} as const;

export const FOLIAGE_BOX: Record<Foliage, SpriteBox> = {
  palm: { w: 180, h: 210, ax: 76, ay: 196 },
  areca: { w: 120, h: 220, ax: 56, ay: 208 },
  mango: { w: 130, h: 140, ax: 65, ay: 124 },
  neem: { w: 130, h: 150, ax: 65, ay: 134 },
  bush: { w: 76, h: 56, ax: 38, ay: 44 },
  rock: { w: 70, h: 52, ax: 35, ay: 38 },
};

function trunk(ctx: Ctx, h: number, w: number) {
  ctx.beginPath();
  ctx.moveTo(-w, 0);
  ctx.quadraticCurveTo(-w * 0.5, -h * 0.5, -w * 0.45, -h);
  ctx.lineTo(w * 0.45, -h);
  ctx.quadraticCurveTo(w * 0.5, -h * 0.5, w, 0);
  ctx.closePath();
  shade(ctx, -w, 0, w, 0, "#b07a4a", "#7a4e2c", "#4a2e1b");
}

/** A palm frond: a drooping tapered leaf with a midrib and serrated edge. */
function frond(ctx: Ctx, x: number, y: number, ang: number, len: number, droop: number, color: string, edge: string) {
  const ex = x + Math.cos(ang) * len;
  const ey = y + Math.sin(ang) * len * 0.75 + droop;
  const cx = x + Math.cos(ang) * len * 0.55;
  const cy = y + Math.sin(ang) * len * 0.4 - droop * 0.3;
  const nx = -Math.sin(ang);
  const ny = Math.cos(ang);
  const w = len * 0.16;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(cx + nx * w, cy + ny * w, ex, ey);
  ctx.quadraticCurveTo(cx - nx * w, cy - ny * w, x, y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  // Serrated leaflets along both sides.
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = 2; i < 10; i++) {
    const u = i / 10;
    const px = (1 - u) * (1 - u) * x + 2 * (1 - u) * u * cx + u * u * ex;
    const py = (1 - u) * (1 - u) * y + 2 * (1 - u) * u * cy + u * u * ey;
    const l = w * (1.6 - u) * 1.1;
    ctx.moveTo(px, py);
    ctx.lineTo(px + nx * l + Math.cos(ang) * 4, py + ny * l + 6);
    ctx.moveTo(px, py);
    ctx.lineTo(px - nx * l + Math.cos(ang) * 4, py - ny * l + 6);
  }
  ctx.stroke();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(cx, cy, ex, ey);
  ctx.stroke();
}

function palmTop(ctx: Ctx, x: number, y: number, len: number, count: number, r: Rand) {
  const [deep, mid, light, hi] = TONES.frond;
  // Back fronds (darker), then front fronds (lighter).
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + range(r, -0.15, 0.15) + pass * 0.4;
      const front = Math.sin(ang) > 0;
      if ((pass === 0) === front) continue;
      frond(ctx, x, y, ang, len * range(r, 0.85, 1.1), len * 0.35, pass ? (Math.cos(ang) < 0 ? light : mid) : deep, pass ? hi : mid);
    }
  }
}

export function paintFoliage(ctx: Ctx, kind: Foliage, r: Rand) {
  switch (kind) {
    case "palm": {
      softShadow(ctx, 30, 2, 54, 14, 0.32);
      const lean = range(r, 6, 18);
      ctx.beginPath();
      ctx.moveTo(-7, 0);
      ctx.quadraticCurveTo(-4, -80, lean - 4, -158);
      ctx.lineTo(lean + 4, -158);
      ctx.quadraticCurveTo(6, -80, 7, 0);
      ctx.closePath();
      shade(ctx, -7, 0, 7, 0, "#c79a6a", "#9a7048", "#5f4128");
      ctx.strokeStyle = "rgba(60, 35, 15, 0.45)";
      ctx.lineWidth = 1.2;
      for (let y = -10; y > -150; y -= 9) {
        const t = -y / 158;
        const cx = lean * t * t;
        ctx.beginPath();
        ctx.moveTo(cx - 6, y);
        ctx.quadraticCurveTo(cx, y + 2, cx + 6, y);
        ctx.stroke();
      }
      palmTop(ctx, lean, -160, 68, 9, r);
      for (const [dx, dy] of [[-5, -154], [4, -152], [0, -148]]) {
        ctx.beginPath();
        ctx.arc(lean + dx, dy, 5, 0, Math.PI * 2);
        shade(ctx, lean + dx - 5, dy - 5, lean + dx + 5, dy + 5, "#9b7a3a", "#6b5220", "#3f3010");
      }
      break;
    }
    case "areca": {
      softShadow(ctx, 20, 2, 34, 10, 0.3);
      ctx.beginPath();
      ctx.rect(-3.5, -176, 7, 176);
      shade(ctx, -3.5, 0, 3.5, 0, "#d8d0b8", "#a8a088", "#6f6a58");
      ctx.strokeStyle = "rgba(60,60,40,0.35)";
      ctx.lineWidth = 1;
      for (let y = -12; y > -170; y -= 12) {
        ctx.beginPath();
        ctx.moveTo(-3.5, y);
        ctx.lineTo(3.5, y);
        ctx.stroke();
      }
      ctx.fillStyle = "#4f9a3a";
      ctx.fillRect(-4, -186, 8, 14);
      palmTop(ctx, 0, -186, 44, 7, r);
      break;
    }
    case "mango":
    case "neem": {
      softShadow(ctx, 12, 2, 44, 13, 0.32);
      trunk(ctx, 48, 7);
      const tones = TONES[kind];
      const clumps: [number, number, number][] =
        kind === "mango"
          ? [[0, -92, 28], [-28, -76, 24], [28, -78, 24], [-12, -60, 23], [16, -58, 22]]
          : [[0, -100, 20], [-26, -88, 18], [26, -90, 18], [-36, -68, 16], [36, -70, 16], [-12, -66, 19], [14, -64, 18], [0, -80, 20]];
      for (const [x, y, s] of clumps) clump(ctx, x + range(r, -3, 3), y + range(r, -3, 3), s * range(r, 0.92, 1.08), r, tones);
      if (kind === "mango") {
        for (let i = 0; i < 5; i++) {
          const fx = range(r, -32, 32);
          const fy = range(r, -96, -56);
          ctx.beginPath();
          ctx.ellipse(fx, fy, 4, 5.5, 0.3, 0, Math.PI * 2);
          shade(ctx, fx - 4, fy - 5, fx + 4, fy + 5, "#ffe066", "#f9a825", "#c77800");
        }
      }
      break;
    }
    case "bush": {
      softShadow(ctx, 6, 2, 34, 10, 0.3);
      clump(ctx, -14, -14, 15, r, TONES.mango);
      clump(ctx, 14, -14, 14, r, TONES.mango);
      clump(ctx, 0, -22, 16, r, TONES.mango);
      // Hibiscus flowers.
      for (let i = 0; i < 5; i++) {
        const fx = range(r, -22, 22);
        const fy = range(r, -34, -10);
        ctx.fillStyle = "#e53935";
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.ellipse(fx + Math.cos(a) * 2.6, fy + Math.sin(a) * 2.6, 2.6, 1.8, a, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "#ffd54f";
        ctx.beginPath();
        ctx.arc(fx, fy, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "rock": {
      softShadow(ctx, 6, 2, 30, 9, 0.35);
      blobPath(ctx, 0, -13, 26, 16, r, 0.22);
      shade(ctx, -22, -28, 20, 2, "#e8e2d4", "#a8a090", "#6a6458");
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      blobPath(ctx, -9, -20, 8, 4, r, 0.2);
      ctx.fill();
      ctx.fillStyle = rgba("#7d9a3a", 0.8);
      blobPath(ctx, 6, -24, 9, 4, r, 0.3);
      ctx.fill();
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Props (breakable)
// ---------------------------------------------------------------------------

export type PropKind = "lamp" | "fence" | "pot" | "barrel";

export const PROP_BOX: Record<PropKind, SpriteBox> = {
  lamp: { w: 60, h: 110, ax: 18, ay: 100 },
  fence: { w: 60, h: 46, ax: 30, ay: 36 },
  pot: { w: 44, h: 48, ax: 22, ay: 38 },
  barrel: { w: 42, h: 54, ax: 21, ay: 44 },
};

export const PROP_DEBRIS: Record<PropKind, string[]> = {
  lamp: ["#8d939a", "#ffb74d", "#5f666d"],
  fence: ["#c8b06a", "#9a8540", "#e0cc88"],
  pot: ["#b5532a", "#d9773f", "#ffa000", "#ffd54f"],
  barrel: ["#1e6fd9", "#4b95ff", "#0d47a1"],
};

export function paintProp(ctx: Ctx, kind: PropKind) {
  switch (kind) {
    case "lamp": {
      softShadow(ctx, 8, 2, 14, 5, 0.35);
      ctx.beginPath();
      ctx.rect(-3, -84, 6, 84);
      shade(ctx, -3, 0, 3, 0, "#c9ced3", "#8d939a", "#5f666d");
      ctx.strokeStyle = "#7a8087";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -82);
      ctx.quadraticCurveTo(4, -94, 22, -92);
      ctx.stroke();
      glow(ctx, 26, -86, 26, "#ffb74d", 0.5);
      ctx.beginPath();
      ctx.ellipse(26, -90, 10, 4, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#5f666d";
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(26, -88, 7, 2.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#ffe0a0";
      ctx.fill();
      break;
    }
    case "fence": {
      softShadow(ctx, 4, 2, 30, 5, 0.25);
      for (const y of [-24, -11]) {
        ctx.beginPath();
        ctx.rect(-28, y - 2.5, 56, 5);
        shade(ctx, 0, y - 3, 0, y + 2, "#e6d38f", "#c8b06a", "#8f7a3a");
      }
      for (let x = -24; x <= 24; x += 12) {
        ctx.beginPath();
        ctx.rect(x - 2.5, -32, 5, 32);
        shade(ctx, x - 3, 0, x + 3, 0, "#efe0a0", "#c8b06a", "#8f7a3a");
        ctx.fillStyle = "rgba(90,70,20,0.5)";
        ctx.fillRect(x - 2.5, -20, 5, 1.5);
      }
      break;
    }
    case "pot": {
      softShadow(ctx, 4, 2, 16, 5, 0.32);
      ctx.beginPath();
      ctx.ellipse(0, -16, 15, 15, 0, 0, Math.PI * 2);
      shade(ctx, -15, -31, 15, -1, "#e89a68", "#c0602f", "#80391a");
      ctx.beginPath();
      ctx.rect(-7, -34, 14, 6);
      shade(ctx, -7, -34, 7, -28, "#e89a68", "#b5532a", "#80391a");
      ctx.strokeStyle = "#f5e6c8";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, -18, 14, 4, 0, 0, Math.PI);
      ctx.stroke();
      // Marigold garland.
      for (let i = 0; i < 9; i++) {
        const a = Math.PI * (0.1 + (i / 8) * 0.8);
        ctx.fillStyle = i % 2 ? C.marigold : "#ffd54f";
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 14, -24 + Math.sin(a) * 6, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "barrel": {
      // Blue water drum, a fixture of every Indian rooftop and backyard.
      softShadow(ctx, 5, 2, 17, 5, 0.32);
      ctx.beginPath();
      ctx.roundRect(-15, -40, 30, 40, 5);
      shade(ctx, -15, 0, 15, 0, "#6aa8ff", "#1e6fd9", "#0d47a1");
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 2;
      for (const y of [-28, -12]) {
        ctx.beginPath();
        ctx.moveTo(-15, y);
        ctx.lineTo(15, y);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.ellipse(0, -40, 15, 4.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#4b95ff";
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, -41, 6, 2, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#0d47a1";
      ctx.fill();
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Gates
// ---------------------------------------------------------------------------

export function gateBox(d: District): SpriteBox {
  return d.id === "projects" ? { w: 380, h: 470, ax: 190, ay: 440 } : { w: 340, h: 270, ax: 170, ay: 236 };
}

function gopuram(ctx: Ctx, d: District) {
  softShadow(ctx, 30, 4, 200, 30, 0.35);
  // Massive piers either side of the doorway.
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? -158 : 98;
    ctx.beginPath();
    ctx.rect(x0, -160, 60, 160);
    shade(ctx, x0, -160, x0 + 60, 0, "#f3e3c0", "#d9bf8c", "#a88a55");
    ctx.fillStyle = "rgba(90, 60, 20, 0.3)";
    for (let y = -150; y < 0; y += 22) ctx.fillRect(x0 + 6, y, 48, 3);
    ctx.fillStyle = "#8a5a2a";
    ctx.fillRect(x0 + 18, -120, 24, 40);
  }
  // Lintel.
  ctx.beginPath();
  ctx.rect(-170, -186, 340, 28);
  shade(ctx, -170, -186, 170, -158, "#ffd27a", "#e0a43a", "#a8701c");
  // Tiers rising to the barrel-vault crown.
  const tiers = 5;
  const colors = ["#e8601c", "#00897b", "#c62828", "#f9a825", "#1565c0"];
  for (let i = 0; i < tiers; i++) {
    const y0 = -186 - i * 44;
    const y1 = y0 - 44;
    const w0 = 160 - i * 22;
    const w1 = 160 - (i + 1) * 22;
    polyPath(ctx, [[-w0, y0], [w0, y0], [w1, y1], [-w1, y1]]);
    const c = colors[i % colors.length];
    shade(ctx, -w0, y1, w0, y0, lighten(c, 0.3), c, darken(c, 0.3));
    // Niches with tiny figures.
    const n = Math.max(3, 7 - i);
    for (let k = 0; k < n; k++) {
      const nx = -w1 + 14 + (k * (2 * w1 - 28)) / (n - 1);
      ctx.fillStyle = darken(c, 0.5);
      ctx.beginPath();
      ctx.roundRect(nx - 6, y0 - 34, 12, 26, [6, 6, 0, 0]);
      ctx.fill();
      ctx.fillStyle = "#ffe0a0";
      ctx.beginPath();
      ctx.arc(nx, y0 - 24, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#ffd27a";
    ctx.fillRect(-w0, y0 - 4, w0 * 2, 4);
  }
  const topY = -186 - tiers * 44;
  ctx.beginPath();
  ctx.roundRect(-58, topY - 34, 116, 36, [18, 18, 0, 0]);
  shade(ctx, -58, topY - 34, 58, topY, "#ffd27a", "#e0a43a", "#a8701c");
  for (let k = -2; k <= 2; k++) {
    const kx = k * 22;
    ctx.beginPath();
    ctx.moveTo(kx - 5, topY - 34);
    ctx.quadraticCurveTo(kx - 7, topY - 46, kx, topY - 54);
    ctx.quadraticCurveTo(kx + 7, topY - 46, kx + 5, topY - 34);
    ctx.closePath();
    shade(ctx, kx - 7, topY - 54, kx + 7, topY - 34, "#fff2a0", "#ffc107", "#c79100");
  }
  board(ctx, 0, -172, d.name.toUpperCase(), d.color, 24);
}

function toran(ctx: Ctx, d: District) {
  for (const x of [-122, 122]) {
    softShadow(ctx, x + 8, 2, 26, 8, 0.35);
    ctx.beginPath();
    ctx.rect(x - 12, -166, 24, 166);
    shade(ctx, x - 12, 0, x + 12, 0, "#ef6a4a", "#c62828", "#7f1717");
    ctx.fillStyle = "#ffc107";
    for (const y of [-150, -100, -40]) ctx.fillRect(x - 13, y, 26, 6);
    ctx.beginPath();
    ctx.rect(x - 17, -14, 34, 14);
    shade(ctx, x - 17, -14, x + 17, 0, "#e8dcc4", "#bfb197", "#857a62");
  }
  ctx.beginPath();
  ctx.rect(-150, -190, 300, 26);
  shade(ctx, -150, -190, 150, -164, "#ffd27a", "#e0a43a", "#a8701c");
  // Mango-leaf toran and marigold strings.
  for (let i = 0; i < 15; i++) {
    const x = -140 + i * 20;
    ctx.beginPath();
    ctx.moveTo(x - 6, -164);
    ctx.quadraticCurveTo(x - 7, -150, x, -140);
    ctx.quadraticCurveTo(x + 7, -150, x + 6, -164);
    ctx.closePath();
    shade(ctx, x - 7, -164, x + 7, -140, "#8ccf55", "#3f8a3a", "#235a26");
  }
  for (const x of [-110, -55, 55, 110]) {
    for (let k = 0; k < 7; k++) {
      ctx.fillStyle = k % 2 ? C.marigold : "#ffd54f";
      ctx.beginPath();
      ctx.arc(x, -158 + k * 8, 3.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  board(ctx, 0, -210, d.name.toUpperCase(), d.color, 26);
}

export function paintGate(ctx: Ctx, d: District) {
  if (d.id === "projects") gopuram(ctx, d);
  else toran(ctx, d);
}

// ---------------------------------------------------------------------------
// Decor
// ---------------------------------------------------------------------------

export const DECOR_BOX = {
  tank: { w: 240, h: 160, ax: 120, ay: 80 },
  campfire: { w: 320, h: 110, ax: 160, ay: 70 },
  signpost: { w: 360, h: 240, ax: 180, ay: 226 },
} satisfies Record<string, SpriteBox>;

/** A stepped temple tank (kalyani) with lotus pads. */
export function paintTank(ctx: Ctx, r: Rand) {
  softShadow(ctx, 8, 10, 120, 40, 0.25);
  const steps = 5;
  for (let i = 0; i < steps; i++) {
    const w = 110 - i * 13;
    const h = 62 - i * 8;
    ctx.beginPath();
    ctx.rect(-w, -h, w * 2, h * 2);
    ctx.fillStyle = i % 2 ? "#cdbf9f" : "#e4d8bb";
    ctx.fill();
    ctx.fillStyle = "rgba(60, 45, 20, 0.25)";
    ctx.fillRect(-w, h - 4, w * 2, 4);
  }
  const w = 110 - steps * 13;
  const h = 62 - steps * 8;
  ctx.beginPath();
  ctx.rect(-w, -h, w * 2, h * 2);
  const g = ctx.createLinearGradient(0, -h, 0, h);
  g.addColorStop(0, C.waterDeep);
  g.addColorStop(1, C.water);
  ctx.fillStyle = g;
  ctx.fill();
  for (let i = 0; i < 4; i++) {
    const x = range(r, -w + 10, w - 10);
    const y = range(r, -h + 6, h - 6);
    ctx.fillStyle = "#3f9a3a";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.ellipse(x, y, 9, 5, 0, 0.3, Math.PI * 2 - 0.3);
    ctx.closePath();
    ctx.fill();
    if (i % 2 === 0) {
      ctx.fillStyle = "#fff3f5";
      ctx.beginPath();
      ctx.arc(x + 2, y - 3, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Corner lamp pillars.
  for (const [x, y] of [[-110, -62], [110, -62], [-110, 62], [110, 62]] as const) {
    ctx.beginPath();
    ctx.rect(x - 6, y - 26, 12, 26);
    shade(ctx, x - 6, 0, x + 6, 0, "#f3e3c0", "#d9bf8c", "#a88a55");
    glow(ctx, x, y - 30, 14, C.warmLight, 0.6);
  }
}

export function paintCampfire(ctx: Ctx, r: Rand) {
  softShadow(ctx, 4, 4, 130, 20, 0.22);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    blobPath(ctx, Math.cos(a) * 30, -4 + Math.sin(a) * 13, 7, 5, r, 0.2);
    shade(ctx, -6, -6, 6, 6, "#e4e0d6", "#a9a597", "#6f6c63");
  }
  for (const a of [-0.4, 0.4]) {
    ctx.save();
    ctx.translate(0, -6);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.roundRect(-26, -5, 52, 10, 5);
    shade(ctx, 0, -5, 0, 5, "#b98a5e", "#7a5436", "#4e3524");
    ctx.restore();
  }
  // Brass chai kettle warming by the fire.
  ctx.beginPath();
  ctx.ellipse(46, -14, 10, 9, 0, 0, Math.PI * 2);
  shade(ctx, 36, -23, 56, -5, "#ffe08a", "#d4a017", "#8a6400");
  ctx.strokeStyle = "#8a6400";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(55, -16);
  ctx.lineTo(62, -22);
  ctx.stroke();
  // Charpai cots.
  for (const x of [-108, 108]) {
    softShadow(ctx, x + 4, 6, 44, 9, 0.3);
    ctx.beginPath();
    ctx.rect(x - 40, -22, 80, 22);
    shade(ctx, x - 40, -22, x + 40, 0, "#d9a066", C.wood, C.woodDark);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - 35, -18, 70, 14);
    ctx.clip();
    ctx.fillStyle = "#efe0bc";
    ctx.fillRect(x - 35, -18, 70, 14);
    ctx.strokeStyle = "#b89a62";
    ctx.lineWidth = 1.5;
    for (let k = -80; k < 80; k += 6) {
      ctx.beginPath();
      ctx.moveTo(x + k, -18);
      ctx.lineTo(x + k + 14, -4);
      ctx.moveTo(x + k + 14, -18);
      ctx.lineTo(x + k, -4);
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = C.woodDark;
    ctx.fillRect(x - 40, -2, 6, 8);
    ctx.fillRect(x + 34, -2, 6, 8);
  }
}

export function paintSignpost(ctx: Ctx, districtsList: District[]) {
  softShadow(ctx, 6, 2, 20, 6, 0.35);
  ctx.beginPath();
  ctx.rect(-6, -206, 12, 206);
  shade(ctx, -6, 0, 6, 0, "#c99466", C.wood, C.woodDark);
  board(ctx, 0, -200, "स्वागत · WELCOME", C.saffron, 22, "#3a1500");
  const arrows: [string, number, number, string][] = [
    ["projects", -160, 1, "↑"],
    ["connections", -124, 1, "→"],
    ["home", -88, -1, "←"],
    ["playground", -52, -1, "↓"],
  ];
  for (const [id, y, dir, arrow] of arrows) {
    const d = districtsList.find((x) => x.id === id)!;
    const label = `${d.name} ${arrow}`;
    ctx.font = displayFont(19);
    const w = ctx.measureText(label).width + 30;
    const x0 = dir > 0 ? -4 : 4 - w;
    ctx.beginPath();
    if (dir > 0) {
      ctx.moveTo(x0, y - 13);
      ctx.lineTo(x0 + w - 10, y - 13);
      ctx.lineTo(x0 + w, y);
      ctx.lineTo(x0 + w - 10, y + 13);
      ctx.lineTo(x0, y + 13);
    } else {
      ctx.moveTo(x0 + w, y - 13);
      ctx.lineTo(x0 + 10, y - 13);
      ctx.lineTo(x0, y);
      ctx.lineTo(x0 + 10, y + 13);
      ctx.lineTo(x0 + w, y + 13);
    }
    ctx.closePath();
    shade(ctx, 0, y - 13, 0, y + 13, lighten(d.color, 0.25), d.color, darken(d.color, 0.25));
    text(ctx, label, x0 + w / 2 + (dir > 0 ? -4 : 4), y + 1, 19, C.cream, { shadow: "rgba(0,0,0,0.3)" });
  }
}

// ---------------------------------------------------------------------------
// Building helpers
// ---------------------------------------------------------------------------

function wall(ctx: Ctx, x0: number, y0: number, w: number, h: number, base: string) {
  ctx.beginPath();
  ctx.rect(x0, y0, w, h);
  shade(ctx, x0, y0, x0 + w * 0.7, y0 + h, lighten(base, 0.2), base, darken(base, 0.12));
  ctx.fillStyle = "rgba(20,30,40,0.22)";
  ctx.fillRect(x0, y0 + h - 8, w, 8);
  ctx.fillStyle = "rgba(20,30,40,0.3)";
  ctx.fillRect(x0, y0, w, 10);
}

function sideWall(ctx: Ctx, x1: number, y0: number, h: number, depth: number, base: string) {
  polyPath(ctx, [[x1, y0], [x1 + depth, y0 - depth * 0.45], [x1 + depth, y0 + h - depth * 0.45], [x1, y0 + h]]);
  ctx.fillStyle = darken(base, 0.3);
  ctx.fill();
}

type RoofStyle = "tiles" | "sheet" | "plain";

/** Roof seen at a three-quarter angle: a front plane plus a darker side plane. */
function roof(ctx: Ctx, x0: number, x1: number, eaveY: number, h: number, depth: number, color: string, style: RoofStyle = "tiles", inset = 0.18) {
  const w = x1 - x0;
  const ridgeL = x0 + w * inset;
  const ridgeR = x1 - w * inset;
  const front: Pt[] = [[x0 - 14, eaveY], [ridgeL, eaveY - h], [ridgeR, eaveY - h], [x1 + 14, eaveY]];
  polyPath(ctx, [[x1 + 14, eaveY], [ridgeR, eaveY - h], [ridgeR + depth, eaveY - h - depth * 0.45], [x1 + 14 + depth, eaveY - depth * 0.45]]);
  ctx.fillStyle = darken(color, 0.35);
  ctx.fill();
  polyPath(ctx, front);
  shade(ctx, x0, eaveY - h, x0 + w * 0.6, eaveY + 6, lighten(color, 0.25), color, darken(color, 0.18));
  ctx.save();
  polyPath(ctx, front);
  ctx.clip();
  if (style === "tiles") {
    // Mangalore tiles: rows of scalloped arcs.
    ctx.strokeStyle = rgba("#3a1405", 0.35);
    ctx.lineWidth = 1.4;
    for (let y = eaveY - 2; y > eaveY - h; y -= 9) {
      ctx.beginPath();
      for (let x = x0 - 14; x < x1 + 14; x += 12) {
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + 6, y + 5, x + 12, y);
      }
      ctx.stroke();
    }
  } else if (style === "sheet") {
    ctx.strokeStyle = rgba("#ffffff", 0.3);
    ctx.lineWidth = 2;
    for (let x = x0 - 14; x < x1 + 14; x += 9) {
      ctx.beginPath();
      ctx.moveTo(x, eaveY);
      ctx.lineTo(x + (x - (x0 + x1) / 2) * 0.12, eaveY - h);
      ctx.stroke();
    }
  }
  ctx.restore();
  ctx.strokeStyle = rgba("#fff6d8", 0.9);
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(ridgeL, eaveY - h);
  ctx.lineTo(ridgeR, eaveY - h);
  ctx.stroke();
  ctx.fillStyle = darken(color, 0.45);
  ctx.fillRect(x0 - 14, eaveY - 1, w + 28, 5);
}

function windowPane(ctx: Ctx, x: number, y: number, w: number, h: number, lit: boolean, r: Rand, arch = false) {
  ctx.fillStyle = "#5a3a1e";
  ctx.beginPath();
  if (arch) ctx.roundRect(x - 3, y - 3, w + 6, h + 6, [w / 2 + 3, w / 2 + 3, 2, 2]);
  else ctx.rect(x - 3, y - 3, w + 6, h + 6);
  ctx.fill();
  ctx.beginPath();
  if (arch) ctx.roundRect(x, y, w, h, [w / 2, w / 2, 0, 0]);
  else ctx.rect(x, y, w, h);
  if (lit) shade(ctx, x, y, x, y + h, "#fff2c2", "#ffc95a", "#f08a2a");
  else shade(ctx, x, y, x + w, y + h, "#c9f0ff", "#5fb4dc", "#2a6f96");
  ctx.strokeStyle = "#5a3a1e";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y + (arch ? w / 3 : 0));
  ctx.lineTo(x + w / 2, y + h);
  ctx.moveTo(x, y + h * 0.55);
  ctx.lineTo(x + w, y + h * 0.55);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.65)";
  ctx.beginPath();
  ctx.moveTo(x + 3, y + h * 0.4);
  ctx.lineTo(x + w * 0.35, y + 3);
  ctx.stroke();
  if (r() < 0.5) {
    ctx.fillStyle = C.woodDark;
    ctx.fillRect(x - 4, y + h + 3, w + 8, 5);
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i % 2 ? "#3f8a3a" : i % 4 ? C.marigold : "#e53935";
      ctx.beginPath();
      ctx.arc(x - 2 + (i * (w + 4)) / 4, y + h + 2, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function door(ctx: Ctx, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = darken(color, 0.5);
  ctx.beginPath();
  ctx.roundRect(x - 3, y - 3, w + 6, h + 3, [w / 2 + 3, w / 2 + 3, 0, 0]);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, [w / 2, w / 2, 0, 0]);
  shade(ctx, x, y, x + w, y + h, lighten(color, 0.25), color, darken(color, 0.3));
  ctx.fillStyle = "#ffd54f";
  ctx.beginPath();
  ctx.arc(x + w * 0.78, y + h * 0.6, 2.2, 0, Math.PI * 2);
  ctx.fill();
}

function grassFoot(ctx: Ctx, x0: number, x1: number, r: Rand) {
  ctx.lineCap = "round";
  for (let i = 0; i < (x1 - x0) / 6; i++) {
    const x = range(r, x0, x1);
    ctx.strokeStyle = r() < 0.5 ? "#3f8a3a" : "#7cc04b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 2);
    ctx.quadraticCurveTo(x + range(r, -3, 3), -5, x + range(r, -4, 4), range(r, -12, -6));
    ctx.stroke();
  }
}

/** Name plate under every building. */
function nameplate(ctx: Ctx, p: Place, y = 44, size = 24) {
  board(ctx, 0, y, p.title, p.color, size);
}

// ---------------------------------------------------------------------------
// Buildings
// ---------------------------------------------------------------------------

type Painter = (ctx: Ctx, r: Rand, p: Place) => void;

const lighthouse: Painter = (ctx, r, p) => {
  softShadow(ctx, 30, 6, 130, 30, 0.35);
  for (let i = 0; i < 7; i++) {
    const x = range(r, -110, 110);
    blobPath(ctx, x, range(r, -6, 8), range(r, 22, 34), range(r, 13, 18), r, 0.25);
    shade(ctx, x - 30, -20, x + 30, 16, "#ece6d8", "#a8a090", "#6a6458");
  }
  const bands = 6;
  const top = -290;
  for (let i = 0; i < bands; i++) {
    const y0 = (top * i) / bands;
    const y1 = (top * (i + 1)) / bands;
    const w0 = 50 - (18 * i) / bands;
    const w1 = 50 - (18 * (i + 1)) / bands;
    polyPath(ctx, [[-w0, y0], [w0, y0], [w1, y1], [-w1, y1]]);
    const c = i % 2 === 0 ? p.color : "#fbf7ee";
    shade(ctx, -w0, 0, w0, 0, lighten(c, 0.3), c, darken(c, 0.35));
  }
  door(ctx, -12, -40, 24, 40, "#5a3b28");
  windowPane(ctx, -7, -150, 14, 20, true, () => 0.9, true);
  ctx.beginPath();
  ctx.rect(-48, top - 10, 96, 12);
  shade(ctx, -48, 0, 48, 0, "#6b7d86", "#37474f", "#1f2a30");
  ctx.strokeStyle = "#263238";
  ctx.lineWidth = 2;
  for (let x = -42; x <= 42; x += 12) {
    ctx.beginPath();
    ctx.moveTo(x, top - 10);
    ctx.lineTo(x, top - 30);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(-46, top - 30);
  ctx.lineTo(46, top - 30);
  ctx.stroke();
  glow(ctx, 0, top - 52, 70, C.warmLight, 0.55);
  ctx.beginPath();
  ctx.rect(-26, top - 72, 52, 44);
  shade(ctx, -26, top - 72, 26, top - 28, "#fff6d0", "#ffcf6a", "#f08a2a");
  ctx.lineWidth = 2.5;
  for (const x of [-26, -9, 9, 26]) {
    ctx.beginPath();
    ctx.moveTo(x, top - 72);
    ctx.lineTo(x, top - 28);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(-36, top - 72);
  ctx.quadraticCurveTo(0, top - 122, 36, top - 72);
  ctx.closePath();
  shade(ctx, -36, top - 120, 36, top - 72, lighten(p.color, 0.3), p.color, darken(p.color, 0.35));
  ctx.fillStyle = "#263238";
  ctx.beginPath();
  ctx.arc(0, top - 104, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(-118, 10);
  ctx.scale(0.7, 0.7);
  paintFoliage(ctx, "palm", r);
  ctx.restore();
  grassFoot(ctx, -110, 110, r);
  nameplate(ctx, p);
};

const factory: Painter = (ctx, r, p) => {
  softShadow(ctx, 20, 6, 200, 32, 0.32);
  const brick = "#c8693c";
  wall(ctx, -170, -150, 250, 150, brick);
  sideWall(ctx, 80, -150, 150, 30, brick);
  ctx.strokeStyle = rgba("#6a2a12", 0.28);
  ctx.lineWidth = 1;
  for (let y = -140; y < 0; y += 11) {
    ctx.beginPath();
    ctx.moveTo(-170, y);
    ctx.lineTo(80, y);
    ctx.stroke();
  }
  const teeth = 3;
  const tw = 250 / teeth;
  for (let i = 0; i < teeth; i++) {
    const x = -170 + i * tw;
    polyPath(ctx, [[x, -150], [x, -200], [x + tw, -150]]);
    shade(ctx, x, -200, x + tw, -150, "#b8c4cc", "#7d8c96", "#4f5b63");
    polyPath(ctx, [[x + 4, -154], [x + 4, -192], [x + 26, -178], [x + 26, -154]]);
    shade(ctx, x, -190, x + 26, -154, "#d9f6ff", "#6cc6e6", "#2f8fb5");
  }
  polyPath(ctx, [[80, -150], [110, -164], [110, -214], [80, -200]]);
  ctx.fillStyle = "#3e4a52";
  ctx.fill();
  ctx.beginPath();
  ctx.rect(36, -270, 30, 120);
  shade(ctx, 36, 0, 66, 0, lighten(brick, 0.2), brick, darken(brick, 0.3));
  ctx.fillStyle = p.color;
  ctx.fillRect(34, -262, 34, 9);
  for (let i = 0; i < 3; i++) windowPane(ctx, -156 + i * 48, -116, 30, 34, i === 1, r);
  ctx.beginPath();
  ctx.rect(-12, -86, 80, 86);
  shade(ctx, -12, -86, 68, 0, "#9aa8b0", "#66757e", "#3c474e");
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  for (let y = -80; y < 0; y += 8) {
    ctx.beginPath();
    ctx.moveTo(-12, y);
    ctx.lineTo(68, y);
    ctx.stroke();
  }
  ctx.fillStyle = "#37474f";
  ctx.beginPath();
  ctx.moveTo(140, 0);
  ctx.lineTo(160, -110);
  ctx.lineTo(180, 0);
  ctx.closePath();
  ctx.fill();
  board(ctx, -100, -170, "M14 ≠ M24", "#00897b", 16);
  grassFoot(ctx, -180, 190, r);
  nameplate(ctx, p);
};

const workshopShed: Painter = (ctx, r, p) => {
  softShadow(ctx, 20, 6, 160, 26, 0.32);
  const paint = "#4f8a9a";
  wall(ctx, -130, -150, 260, 150, paint);
  ctx.strokeStyle = rgba("#0f2f38", 0.3);
  ctx.lineWidth = 1.2;
  for (let x = -120; x < 130; x += 14) {
    ctx.beginPath();
    ctx.moveTo(x, -146);
    ctx.lineTo(x, -2);
    ctx.stroke();
  }
  sideWall(ctx, 130, -150, 150, 24, paint);
  roof(ctx, -130, 130, -150, 58, 24, "#8a98a2", "sheet", 0.1);
  ctx.beginPath();
  ctx.rect(-104, -128, 208, 96);
  shade(ctx, -104, -128, 104, -32, "#c8a06c", "#a87e4a", "#7a5530");
  const notes = ["#ffd54f", "#90caf9", "#a5d6a7", "#ffab70", "#e0e0e0", "#fff176"];
  notes.forEach((c, i) => {
    const x = -92 + (i % 3) * 66 + range(r, -3, 3);
    const y = -120 + Math.floor(i / 3) * 44 + range(r, -2, 2);
    ctx.save();
    ctx.translate(x + 26, y + 17);
    ctx.rotate(range(r, -0.1, 0.1));
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(-24, -14, 52, 34);
    ctx.fillStyle = c;
    ctx.fillRect(-26, -17, 52, 34);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(-18, -6, 30, 2);
    ctx.fillRect(-18, 1, 22, 2);
    ctx.fillStyle = "#c62828";
    ctx.beginPath();
    ctx.arc(0, -13, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
  ctx.beginPath();
  ctx.rect(-120, -30, 240, 10);
  shade(ctx, 0, -30, 0, -20, "#c99466", C.wood, C.woodDark);
  ctx.fillStyle = C.woodDark;
  ctx.fillRect(-114, -20, 8, 20);
  ctx.fillRect(106, -20, 8, 20);
  // Tyre leaning on the wall.
  ctx.beginPath();
  ctx.arc(150, -22, 20, 0, Math.PI * 2);
  ctx.fillStyle = "#263238";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(150, -22, 9, 0, Math.PI * 2);
  ctx.fillStyle = "#90a4ae";
  ctx.fill();
  grassFoot(ctx, -140, 150, r);
  nameplate(ctx, p);
};

function onionDome(ctx: Ctx, x: number, base: number, w: number, h: number, color: string) {
  ctx.beginPath();
  ctx.moveTo(x - w, base);
  ctx.bezierCurveTo(x - w * 1.25, base - h * 0.45, x - w * 0.3, base - h * 0.7, x, base - h);
  ctx.bezierCurveTo(x + w * 0.3, base - h * 0.7, x + w * 1.25, base - h * 0.45, x + w, base);
  ctx.closePath();
  shade(ctx, x - w, base - h, x + w, base, lighten(color, 0.4), color, darken(color, 0.35));
  ctx.strokeStyle = "#c79100";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, base - h);
  ctx.lineTo(x, base - h - w * 0.35);
  ctx.stroke();
  ctx.fillStyle = "#ffc107";
  ctx.beginPath();
  ctx.arc(x, base - h - w * 0.35, Math.max(2.5, w * 0.08), 0, Math.PI * 2);
  ctx.fill();
}

const library: Painter = (ctx, r, p) => {
  softShadow(ctx, 20, 6, 200, 30, 0.32);
  const sand = "#f1dfb8";
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.rect(-170 + i * 10, -8 * (i + 1), 340 - i * 20, 8);
    shade(ctx, 0, -8 * (i + 1), 0, -8 * i, "#fbf1dc", "#e0cfaa", "#b8a37a");
  }
  wall(ctx, -150, -190, 300, 166, sand);
  sideWall(ctx, 150, -190, 166, 26, sand);
  // Scalloped arches instead of columns.
  for (let i = 0; i < 5; i++) {
    const cx = -120 + i * 60;
    ctx.beginPath();
    ctx.roundRect(cx - 18, -150, 36, 126, [18, 18, 0, 0]);
    ctx.fillStyle = i === 2 ? darken(p.color, 0.1) : "#7a5a32";
    ctx.fill();
    if (i !== 2) {
      ctx.beginPath();
      ctx.roundRect(cx - 12, -142, 24, 60, [12, 12, 0, 0]);
      shade(ctx, cx - 12, -142, cx + 12, -82, "#c9f0ff", "#5fb4dc", "#2a6f96");
    }
  }
  ctx.beginPath();
  ctx.rect(-166, -214, 332, 26);
  shade(ctx, -166, -214, 166, -188, "#fff4dc", "#e6d2a8", "#b8a37a");
  text(ctx, "ज्ञान · INDEX", 0, -200, 16, darken(p.color, 0.35));
  ctx.beginPath();
  ctx.rect(-84, -256, 168, 44);
  shade(ctx, -84, -256, 84, -212, "#fff4dc", "#e6d2a8", "#b8a37a");
  onionDome(ctx, 0, -254, 70, 96, p.color);
  // Corner chhatris.
  for (const s of [-1, 1]) {
    const cx = s * 128;
    for (const dx of [-16, 16]) {
      ctx.fillStyle = "#d9c08c";
      ctx.fillRect(cx + dx - 2, -246, 4, 32);
    }
    ctx.fillStyle = "#e6d2a8";
    ctx.fillRect(cx - 22, -250, 44, 6);
    onionDome(ctx, cx, -250, 20, 30, p.color);
  }
  const books = ["#1565c0", "#90caf9", "#0d47a1", "#f9a825", "#c62828"];
  books.forEach((c, i) => {
    const w = range(r, 52, 66);
    const x = 190 - w / 2 + range(r, -5, 5);
    ctx.beginPath();
    ctx.rect(x, -14 - i * 13, w, 12);
    shade(ctx, x, 0, x + w, 0, lighten(c, 0.3), c, darken(c, 0.3));
  });
  grassFoot(ctx, -190, 190, r);
  nameplate(ctx, p);
};

const lodge: Painter = (ctx, r, p) => {
  // Western Ghats behind, banded in mist.
  for (const [cx, h, w, c] of [[-90, 280, 180, "#2f8a6a"], [110, 310, 200, "#1f6f5a"]] as const) {
    ctx.beginPath();
    ctx.moveTo(cx - w, -60);
    ctx.quadraticCurveTo(cx - w * 0.35, -h * 0.6, cx, -h);
    ctx.quadraticCurveTo(cx + w * 0.4, -h * 0.55, cx + w, -60);
    ctx.closePath();
    shade(ctx, cx - w, -h, cx + w, -60, lighten(c, 0.3), c, darken(c, 0.25));
    const mist = ctx.createLinearGradient(0, -170, 0, -60);
    mist.addColorStop(0, "rgba(240,250,255,0)");
    mist.addColorStop(1, "rgba(240,250,255,0.9)");
    ctx.fillStyle = mist;
    ctx.fill();
  }
  softShadow(ctx, 20, 6, 180, 28, 0.32);
  const logs = "#c0844f";
  ctx.beginPath();
  ctx.rect(-120, -110, 240, 110);
  shade(ctx, -120, -110, 120, 0, lighten(logs, 0.2), logs, darken(logs, 0.25));
  ctx.strokeStyle = rgba("#4a2a10", 0.4);
  for (let y = -100; y < 0; y += 12) {
    ctx.beginPath();
    ctx.moveTo(-120, y);
    ctx.lineTo(120, y);
    ctx.stroke();
  }
  polyPath(ctx, [[-150, -96], [0, -250], [150, -96], [118, -96], [0, -214], [-118, -96]]);
  shade(ctx, -150, -250, 150, -96, lighten(p.color, 0.25), p.color, darken(p.color, 0.3));
  polyPath(ctx, [[-118, -96], [0, -214], [118, -96]]);
  shade(ctx, -118, -214, 118, -96, lighten(logs, 0.15), logs, darken(logs, 0.2));
  glow(ctx, 0, -130, 70, C.warmLight, 0.4);
  polyPath(ctx, [[-60, -100], [0, -178], [60, -100]]);
  shade(ctx, -60, -178, 60, -100, "#fff2c2", "#ffc95a", "#f08a2a");
  ctx.strokeStyle = "#5a3a1e";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, -178);
  ctx.lineTo(0, -100);
  ctx.moveTo(-34, -130);
  ctx.lineTo(34, -130);
  ctx.stroke();
  door(ctx, -18, -64, 36, 64, "#7a4a2c");
  windowPane(ctx, -96, -78, 28, 30, true, r);
  windowPane(ctx, 68, -78, 28, 30, false, r);
  ctx.beginPath();
  ctx.rect(-130, -6, 260, 8);
  shade(ctx, 0, -6, 0, 2, "#c99466", C.wood, C.woodDark);
  polyPath(ctx, [[-210, 10], [-176, -40], [-142, 10]]);
  shade(ctx, -210, -40, -142, 10, "#ffe08a", "#f0b429", "#b97f0e");
  for (const [x, s] of [[190, 0.6], [-240, 0.55]] as const) {
    ctx.save();
    ctx.translate(x, 10);
    ctx.scale(s, s);
    paintFoliage(ctx, "areca", r);
    ctx.restore();
  }
  grassFoot(ctx, -200, 200, r);
  nameplate(ctx, p);
};

const house =
  (opts: { wallColor: string; roofStyle?: RoofStyle; roofColor?: string; extra?: (ctx: Ctx, r: Rand, p: Place) => void; sign?: [string, string, string?] }): Painter =>
  (ctx, r, p) => {
    softShadow(ctx, 18, 6, 130, 22, 0.32);
    wall(ctx, -100, -120, 200, 120, opts.wallColor);
    sideWall(ctx, 100, -120, 120, 26, opts.wallColor);
    roof(ctx, -100, 100, -120, 68, 26, opts.roofColor ?? p.color, opts.roofStyle ?? "tiles");
    windowPane(ctx, -82, -92, 30, 34, true, r);
    windowPane(ctx, 52, -92, 30, 34, r() < 0.5, r);
    door(ctx, -18, -66, 36, 66, darken(p.color, 0.1));
    if (opts.sign) board(ctx, 0, -104, opts.sign[0], opts.sign[1], 15, opts.sign[2]);
    opts.extra?.(ctx, r, p);
    grassFoot(ctx, -110, 120, r);
    nameplate(ctx, p, 40, 22);
  };

const postOffice = house({
  wallColor: "#fbf1dc",
  roofColor: "#b71c1c",
  sign: ["INDIA POST", "#d32f2f", "#ffd54f"],
  extra: (ctx) => {
    // Red pillar post box.
    softShadow(ctx, 124, 2, 16, 5, 0.35);
    ctx.beginPath();
    ctx.roundRect(108, -50, 30, 50, [15, 15, 2, 2]);
    shade(ctx, 108, -50, 138, 0, "#ff6f60", "#d32f2f", "#8e1414");
    ctx.fillStyle = "#3a0a0a";
    ctx.fillRect(114, -34, 18, 3);
    ctx.fillStyle = "#ffd54f";
    ctx.fillRect(108, -12, 30, 3);
    for (const [x, y, w] of [[-150, -22, 26], [-128, -22, 22], [-142, -40, 22]] as const) {
      ctx.beginPath();
      ctx.rect(x, y, w, y === -40 ? 18 : 22);
      shade(ctx, x, y, x + w, y + 22, "#e8c08a", "#c99a5e", "#9a6f3c");
    }
  },
});

const cyberCafe = house({
  wallColor: "#46525a",
  roofColor: "#263238",
  roofStyle: "sheet",
  extra: (ctx, r) => {
    board(ctx, 0, -146, "CYBER CAFÉ", "#00897b", 15);
    glow(ctx, 0, -104, 46, "#4ade80", 0.45);
    text(ctx, "</>", 0, -104, 24, "#e7ffef", { shadow: "rgba(34,197,94,0.9)" });
    const greens = ["#123d24", "#1f6b3a", "#2ea44f", "#6ee08a"];
    for (let i = 0; i < 7; i++)
      for (let j = 0; j < 3; j++) {
        ctx.fillStyle = greens[Math.floor(r() * 4)];
        ctx.fillRect(-36 + i * 10.5, -42 + j * 10.5, 8, 8);
      }
  },
});

const office: Painter = (ctx, r, p) => {
  softShadow(ctx, 18, 6, 130, 22, 0.32);
  wall(ctx, -96, -210, 192, 210, "#eef3f7");
  sideWall(ctx, 96, -210, 210, 26, "#eef3f7");
  ctx.fillStyle = darken(p.color, 0.2);
  ctx.fillRect(-100, -218, 200, 10);
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 4; col++) {
      const x = -80 + col * 42;
      const y = -196 + row * 40;
      if (row === 3 && (col === 1 || col === 2)) continue;
      ctx.beginPath();
      ctx.rect(x, y, 30, 28);
      shade(ctx, x, y, x + 30, y + 28, "#d6f0ff", "#4f9fd6", "#1d5f96");
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + 4, y + 22);
      ctx.lineTo(x + 14, y + 4);
      ctx.stroke();
    }
  ctx.beginPath();
  ctx.rect(-28, -70, 56, 70);
  shade(ctx, -28, -70, 28, 0, "#d6f0ff", "#4f9fd6", "#1d5f96");
  ctx.fillStyle = "#cfd8dc";
  ctx.fillRect(-1, -70, 2, 70);
  board(ctx, 0, -236, "in", p.color, 22);
  grassFoot(ctx, -110, 120, r);
  nameplate(ctx, p, 40, 22);
};

const xeroxShop: Painter = (ctx, r, p) => {
  softShadow(ctx, 14, 6, 120, 20, 0.32);
  ctx.beginPath();
  ctx.rect(-96, -110, 192, 110);
  shade(ctx, -96, -110, 96, 0, "#fff6e2", "#f1e2c0", "#c9b48a");
  ctx.beginPath();
  ctx.rect(-80, -64, 160, 64);
  shade(ctx, -80, -64, 80, 0, "#d8a678", C.wood, C.woodDark);
  for (let i = 0; i < 8; i++) {
    const x = -110 + i * 27.5;
    polyPath(ctx, [[x, -150], [x + 27.5, -150], [x + 31, -112], [x - 3, -112]]);
    const c = i % 2 ? C.cream : C.saffron;
    shade(ctx, x, -150, x + 27, -112, lighten(c, 0.2), c, darken(c, 0.2));
  }
  board(ctx, 0, -176, "XEROX · PRINT · CV", "#ffd600", 17, "#b71c1c");
  for (let i = 0; i < 5; i++) {
    const x = -66 + i * 32;
    ctx.save();
    ctx.translate(x, -72);
    ctx.rotate(range(r, -0.25, 0.25));
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(-10, -12, 22, 26);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-12, -14, 22, 26);
    ctx.fillStyle = "#90a4ae";
    for (let l = 0; l < 4; l++) ctx.fillRect(-9, -9 + l * 5, 14 - (l % 2) * 4, 1.5);
    ctx.restore();
  }
  grassFoot(ctx, -110, 110, r);
  nameplate(ctx, p, 40, 22);
};

const mangaloreHouse = house({
  wallColor: "#fbf6ea",
  extra: (ctx) => {
    // Wooden veranda pillars and a tulsi katte in front.
    for (const x of [-92, -40, 40, 92]) {
      ctx.beginPath();
      ctx.rect(x - 4, -118, 8, 118);
      shade(ctx, x - 4, 0, x + 4, 0, "#c99466", C.wood, C.woodDark);
    }
    ctx.beginPath();
    ctx.rect(52, -214, 22, 46);
    shade(ctx, 52, 0, 74, 0, "#d9a07a", "#b9764f", "#8a4f2f");
    softShadow(ctx, -150, 2, 22, 6, 0.3);
    ctx.beginPath();
    ctx.rect(-166, -34, 32, 34);
    shade(ctx, -166, -34, -134, 0, "#fff6e2", "#e6d2a8", "#b8a37a");
    ctx.fillStyle = C.saffron;
    ctx.fillRect(-166, -22, 32, 4);
    clump(ctx, -150, -44, 12, () => 0.5, ["#1d4a2c", "#2f7a3b", "#5fae47", "#b6e27a"]);
  },
});

const banyan: Painter = (ctx, r, p) => {
  softShadow(ctx, 20, 4, 170, 36, 0.35);
  ctx.beginPath();
  ctx.moveTo(-44, 0);
  ctx.quadraticCurveTo(-20, -60, -24, -170);
  ctx.lineTo(24, -170);
  ctx.quadraticCurveTo(20, -60, 48, 0);
  ctx.quadraticCurveTo(0, -14, -44, 0);
  ctx.closePath();
  shade(ctx, -44, 0, 48, 0, "#a77b52", "#6e4a2c", "#3f2a18");
  const tones = ["#1b4428", "#2f7a3b", "#5fae47", "#c2ea86"] as const;
  const clumps: [number, number, number][] = [
    [0, -322, 60], [-92, -282, 54], [92, -286, 54], [-140, -214, 46], [140, -218, 46],
    [-60, -222, 56], [60, -226, 56], [0, -238, 58],
  ];
  for (const [x, y, s] of clumps) clump(ctx, x + range(r, -4, 4), y + range(r, -4, 4), s, r, tones);
  // Aerial roots hanging from the canopy.
  ctx.strokeStyle = "#7a5233";
  ctx.lineCap = "round";
  for (let i = 0; i < 16; i++) {
    const x = range(r, -150, 150);
    if (Math.abs(x) < 30) continue;
    const y0 = -190 + Math.abs(x) * 0.18;
    ctx.lineWidth = range(r, 1.5, 3.5);
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.quadraticCurveTo(x + range(r, -6, 6), y0 / 2, x + range(r, -4, 4), range(r, -40, 0));
    ctx.stroke();
  }
  ctx.strokeStyle = "#5a3a1e";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-90, -190);
  ctx.lineTo(-96, -60);
  ctx.moveTo(-60, -196);
  ctx.lineTo(-56, -60);
  ctx.stroke();
  ctx.fillStyle = C.woodDark;
  ctx.fillRect(-102, -62, 52, 7);
  grassFoot(ctx, -150, 150, r);
  nameplate(ctx, p);
};

/** Where the banyan's diyas hang (the overlay flickers them). */
export const LANTERNS: [number, number, string][] = [
  [-110, -250, "#ffb300"],
  [-40, -300, "#ffd54f"],
  [50, -310, "#ff8f00"],
  [120, -248, "#ffb300"],
  [-20, -210, "#ffd54f"],
  [80, -200, "#ff8f00"],
];

const painters: Record<string, Painter> = {
  shadowpath: lighthouse,
  "industrial-product-search": factory,
  workshop: workshopShed,
  "website-content-search": library,
  "trek-saathi": lodge,
  about: mangaloreHouse,
  skills: banyan,
  github: cyberCafe,
  linkedin: office,
  email: postOffice,
  resume: xeroxShop,
};

export function paintPlace(ctx: Ctx, r: Rand, p: Place) {
  painters[p.id]?.(ctx, r, p);
}

// ---------------------------------------------------------------------------
// Moving things
// ---------------------------------------------------------------------------

export const CAR_BOX: SpriteBox = { w: 84, h: 60, ax: 42, ay: 30 };
/** Auto-rickshaw wheels: [x, y, steers]. */
export const AUTO_WHEELS: [number, number, boolean][] = [
  [24, 0, true],
  [-18, -18, false],
  [-18, 18, false],
];

/** Top-down auto-rickshaw facing +x: green body, yellow canopy. */
export function paintCar(ctx: Ctx) {
  ctx.beginPath();
  ctx.moveTo(-28, -17);
  ctx.lineTo(10, -17);
  ctx.quadraticCurveTo(32, -12, 33, 0);
  ctx.quadraticCurveTo(32, 12, 10, 17);
  ctx.lineTo(-28, 17);
  ctx.quadraticCurveTo(-31, 0, -28, -17);
  ctx.closePath();
  shade(ctx, -30, -17, 32, 17, "#5ccf5c", "#2e9e3a", "#16651f");
  // Canopy.
  ctx.beginPath();
  ctx.roundRect(-27, -15, 36, 30, [8, 4, 4, 8]);
  shade(ctx, -27, -15, 9, 15, "#fff07a", "#ffd000", "#c79a00");
  ctx.strokeStyle = "#1b1b1b";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-27, -15, 36, 30, [8, 4, 4, 8]);
  ctx.stroke();
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(-20, -15, 2, 30);
  ctx.fillRect(-8, -15, 2, 30);
  // Windscreen and headlight.
  ctx.beginPath();
  ctx.moveTo(10, -12);
  ctx.lineTo(16, -9);
  ctx.lineTo(16, 9);
  ctx.lineTo(10, 12);
  ctx.closePath();
  shade(ctx, 10, -12, 16, 12, "#d6f2ff", "#5f93ab", "#2c5466");
  ctx.fillStyle = "#fff8d0";
  ctx.beginPath();
  ctx.arc(31, 0, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1b1b1b";
  ctx.fillRect(18, -2, 9, 4);
}

export type BodyKind = "crate" | "stump" | "ball" | "brick" | "letter";

export const BODY_SIZE: Record<BodyKind, number> = { crate: 44, stump: 48, ball: 34, brick: 28, letter: 100 };

export function paintBody(ctx: Ctx, kind: BodyKind, char = "") {
  switch (kind) {
    case "crate": {
      ctx.beginPath();
      ctx.roundRect(-16, -16, 32, 32, 3);
      shade(ctx, -16, -16, 16, 16, "#e6bb85", "#c08f57", "#8a5f33");
      ctx.strokeStyle = "#6a4420";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(-13, -13, 26, 26);
      ctx.beginPath();
      ctx.moveTo(-13, -13);
      ctx.lineTo(13, 13);
      ctx.stroke();
      break;
    }
    case "stump": {
      // A single wicket stump standing up; it tips over as the body rotates.
      ctx.beginPath();
      ctx.roundRect(-3, -21, 6, 42, 2);
      shade(ctx, -3, 0, 3, 0, "#fff8e6", "#ecd9b0", "#b8a070");
      ctx.fillStyle = "#c62828";
      ctx.fillRect(-3, -17, 6, 4);
      ctx.fillStyle = "#d4a017";
      ctx.fillRect(-5, -23, 10, 3);
      break;
    }
    case "ball": {
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      shade(ctx, -13, -13, 13, 13, "#ff6f60", "#c62828", "#7f1010");
      ctx.strokeStyle = "#fff3e0";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 9, -1.1, 1.1);
      ctx.stroke();
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.arc(0, 0, 11, -1.1, 1.1);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.ellipse(-5, -5, 4, 2.5, -0.7, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "brick": {
      ctx.beginPath();
      ctx.roundRect(-12, -7, 24, 14, 2);
      shade(ctx, -12, -7, 12, 7, "#ef8a62", "#c4502c", "#7f2a14");
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.fillRect(-10, -5, 20, 2);
      break;
    }
    case "letter": {
      ctx.font = displayFont(86);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // Truck-art block letter: deep indigo extrusion, saffron-to-gold face.
      for (let i = 9; i > 0; i--) {
        ctx.fillStyle = i > 7 ? "rgba(16, 30, 50, 0.3)" : LETTER_SIDE[i - 1];
        ctx.fillText(char, i * 0.6, i * 1.2 + 6);
      }
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#ffffff";
      ctx.strokeText(char, 0, 6);
      const g = ctx.createLinearGradient(0, -34, 0, 40);
      g.addColorStop(0, "#ffe066");
      g.addColorStop(0.5, "#ffb300");
      g.addColorStop(0.52, "#ff8f00");
      g.addColorStop(1, "#e8601c");
      ctx.fillStyle = g;
      ctx.fillText(char, 0, 6);
      break;
    }
  }
}

const LETTER_SIDE = ["#3949ab", "#3343a0", "#2d3c94", "#283593", "#233086", "#1e2a7a", "#1a237e"];

// ---------------------------------------------------------------------------
// Cows
// ---------------------------------------------------------------------------

export const COW_BOX: SpriteBox = { w: 100, h: 70, ax: 50, ay: 35 };

/** Top-down cow facing +x. */
export function paintCow(ctx: Ctx, r: Rand) {
  ctx.beginPath();
  ctx.ellipse(-4, 0, 30, 17, 0, 0, Math.PI * 2);
  shade(ctx, -34, -17, 26, 17, "#ffffff", "#f1ede4", "#bdb6a6");
  ctx.fillStyle = "#4e4a44";
  for (let i = 0; i < 3; i++) {
    blobPath(ctx, range(r, -24, 12), range(r, -9, 9), range(r, 5, 9), range(r, 4, 7), r, 0.3);
    ctx.fill();
  }
  ctx.strokeStyle = "#8a8070";
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-33, 0);
  ctx.quadraticCurveTo(-42, 4, -44, 10);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(32, 0, 10, 8, 0, 0, Math.PI * 2);
  shade(ctx, 22, -8, 42, 8, "#ffffff", "#ece6da", "#b5ad9c");
  ctx.fillStyle = "#e8b7a0";
  ctx.beginPath();
  ctx.ellipse(40, 0, 4, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#d9c49a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(28, -6);
  ctx.quadraticCurveTo(26, -14, 31, -17);
  ctx.moveTo(28, 6);
  ctx.quadraticCurveTo(26, 14, 31, 17);
  ctx.stroke();
}
