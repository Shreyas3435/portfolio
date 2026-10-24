import type { District, Place } from "./places";
import {
  type Ctx,
  type Pt,
  type Rand,
  C,
  circleShadow,
  clouds,
  darken,
  displayFont,
  grain,
  lighten,
  polyPath,
  range,
  rectShadow,
  rgba,
  shade,
  texture,
} from "./paint";

// Realistic aerial view: everything is seen from almost straight above, lit
// from the upper left, with soft cast shadows whose length follows height.
// Sprites are centred on the object's footprint centre.

export interface SpriteBox {
  w: number;
  h: number;
  ax: number;
  ay: number;
}

/** A night-time light: [dx, dy, radius, colour] relative to an anchor. */
export type Light = [number, number, number, string];

const WARM = "#ffcf8a";

// ---------------------------------------------------------------------------
// Roof building blocks
// ---------------------------------------------------------------------------

function roofSlab(ctx: Ctx, x0: number, y0: number, w: number, h: number, color: string, parapet = 5) {
  ctx.beginPath();
  ctx.rect(x0, y0, w, h);
  ctx.fillStyle = darken(color, 0.25);
  ctx.fill();
  ctx.beginPath();
  ctx.rect(x0 + parapet, y0 + parapet, w - parapet * 2, h - parapet * 2);
  shade(ctx, x0, y0, x0 + w, y0 + h, lighten(color, 0.08), color, darken(color, 0.08));
  texture(ctx, grain(), 0.35, "overlay");
  texture(ctx, clouds(), 0.25, "multiply");
  // Parapet highlight on the lit edges.
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.fillRect(x0, y0, w, 2);
  ctx.fillRect(x0, y0, 2, h);
}

function hvac(ctx: Ctx, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = "rgba(10, 18, 26, 0.35)";
  ctx.fillRect(x + 3, y + 4, w, h);
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  shade(ctx, x, y, x + w, y + h, "#e6e8ea", "#b9bec4", "#8b9299");
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  const r = Math.min(w, h) * 0.32;
  ctx.beginPath();
  ctx.arc(x + w / 2, y + h / 2, r, 0, Math.PI * 2);
  ctx.fillStyle = "#4a5056";
  ctx.fill();
  ctx.strokeStyle = "#9aa1a8";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + w / 2 - r, y + h / 2);
  ctx.lineTo(x + w / 2 + r, y + h / 2);
  ctx.moveTo(x + w / 2, y + h / 2 - r);
  ctx.lineTo(x + w / 2, y + h / 2 + r);
  ctx.stroke();
}

function skylight(ctx: Ctx, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = "#3e4a52";
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  shade(ctx, x, y, x + w, y + h, "#c8e2ee", "#6f95a8", "#3f5f70");
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.moveTo(x, y + h * 0.6);
  ctx.lineTo(x + w * 0.5, y);
  ctx.lineTo(x + w * 0.7, y);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fill();
}

function solarArray(ctx: Ctx, x: number, y: number, cols: number, rows: number) {
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++) {
      const px = x + i * 15;
      const py = y + j * 23;
      ctx.fillStyle = "rgba(10,18,26,0.3)";
      ctx.fillRect(px + 2, py + 3, 13, 21);
      ctx.beginPath();
      ctx.rect(px, py, 13, 21);
      shade(ctx, px, py, px + 13, py + 21, "#4a6fa0", "#22385c", "#152238");
      ctx.strokeStyle = "rgba(160, 190, 230, 0.35)";
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(px + 6.5, py);
      ctx.lineTo(px + 6.5, py + 21);
      ctx.moveTo(px, py + 10.5);
      ctx.lineTo(px + 13, py + 10.5);
      ctx.stroke();
    }
}

function vent(ctx: Ctx, x: number, y: number, rad: number) {
  ctx.fillStyle = "rgba(10,18,26,0.3)";
  ctx.beginPath();
  ctx.arc(x + 2, y + 3, rad, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, rad, 0, Math.PI * 2);
  shade(ctx, x - rad, y - rad, x + rad, y + rad, "#e6e8ea", "#a9afb5", "#6f767d");
}

/** Pitched roof seen from above: two planes split by a ridge, with tile rows. */
function pitchedRoof(ctx: Ctx, w: number, h: number, color: string) {
  const x0 = -w / 2;
  const y0 = -h / 2;
  {
    // North plane catches the light, south plane is in shade.
    ctx.beginPath();
    ctx.rect(x0, y0, w, h / 2);
    shade(ctx, x0, y0, x0 + w, 0, lighten(color, 0.22), lighten(color, 0.1), color);
    texture(ctx, grain(), 0.4, "overlay");
    ctx.beginPath();
    ctx.rect(x0, 0, w, h / 2);
    shade(ctx, x0, 0, x0 + w, h / 2, darken(color, 0.1), darken(color, 0.22), darken(color, 0.32));
    texture(ctx, grain(), 0.4, "overlay");
    ctx.strokeStyle = rgba("#000000", 0.18);
    ctx.lineWidth = 1;
    for (let y = y0 + 7; y < h / 2; y += 7) {
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x0 + w, y);
      ctx.stroke();
    }
    ctx.fillStyle = lighten(color, 0.35);
    ctx.fillRect(x0, -1.5, w, 3);
  }
  ctx.strokeStyle = darken(color, 0.45);
  ctx.lineWidth = 2;
  ctx.strokeRect(x0, y0, w, h);
}

/** Hip roof: four planes meeting at a short ridge. */
function hipRoof(ctx: Ctx, w: number, h: number, color: string) {
  const x0 = -w / 2;
  const y0 = -h / 2;
  const inset = h / 2;
  const ridge: [Pt, Pt] = [[x0 + inset, 0], [x0 + w - inset, 0]];
  const planes: [Pt[], string][] = [
    [[[x0, y0], [x0 + w, y0], ridge[1], ridge[0]], lighten(color, 0.2)],
    [[[x0, y0], ridge[0], [x0, y0 + h]], lighten(color, 0.08)],
    [[[x0 + w, y0], [x0 + w, y0 + h], ridge[1]], darken(color, 0.15)],
    [[[x0, y0 + h], ridge[0], ridge[1], [x0 + w, y0 + h]], darken(color, 0.25)],
  ];
  for (const [pts, c] of planes) {
    polyPath(ctx, pts);
    ctx.fillStyle = c;
    ctx.fill();
    texture(ctx, grain(), 0.45, "overlay");
  }
  ctx.save();
  polyPath(ctx, [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]]);
  ctx.clip();
  ctx.strokeStyle = "rgba(0,0,0,0.16)";
  ctx.lineWidth = 1;
  for (let y = y0 + 6; y < y0 + h; y += 6) {
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x0 + w, y);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = lighten(color, 0.4);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(ridge[0][0], 0);
  ctx.lineTo(ridge[1][0], 0);
  ctx.lineTo(x0 + w, y0);
  ctx.moveTo(x0, y0 + h);
  ctx.lineTo(ridge[0][0], 0);
  ctx.moveTo(x0 + w, y0 + h);
  ctx.lineTo(ridge[1][0], 0);
  ctx.stroke();
  ctx.strokeStyle = darken(color, 0.45);
  ctx.strokeRect(x0, y0, w, h);
}

/** Rooftop lettering, as painted on real flat roofs. */
function roofText(ctx: Ctx, label: string, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.font = displayFont(size, 700);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = color;
  ctx.fillText(label, x, y);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Trees
// ---------------------------------------------------------------------------

export type TreeKind = "broadleaf" | "conifer" | "shrub";

export const TREE_R: Record<TreeKind, number> = { broadleaf: 34, conifer: 22, shrub: 14 };
const TREE_H: Record<TreeKind, number> = { broadleaf: 70, conifer: 80, shrub: 18 };

export function treeBox(kind: TreeKind): SpriteBox {
  const R = TREE_R[kind];
  const sh = TREE_H[kind] * 0.75;
  return { w: R * 2 + 24 + sh, h: R * 2 + 24 + sh, ax: R + 12, ay: R + 12 };
}

const LEAF: [string, string, string, string][] = [
  ["#2c4a1f", "#3f6a2a", "#5b8a38", "#86b056"],
  ["#30481c", "#486d26", "#6a9133", "#9bbd5a"],
  ["#283f22", "#3a5e2f", "#557f3c", "#7fa65c"],
];

/** A canopy built from many small leaf clusters, lit from the upper left. */
function canopy(ctx: Ctx, R: number, r: Rand, tones: [string, string, string, string]) {
  const [deep, dark, mid, light] = tones;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.fillStyle = deep;
  ctx.fill();
  const n = Math.round(R * 1.4);
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * R * 0.82;
    const x = Math.cos(a) * d;
    const y = Math.sin(a) * d;
    const s = range(r, R * 0.16, R * 0.3);
    // Clusters on the lit side are brighter.
    const lit = (-x - y) / (R * 1.4) + 0.5;
    ctx.fillStyle = lit > 0.62 ? light : lit > 0.4 ? mid : dark;
    ctx.beginPath();
    ctx.arc(x, y, s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  texture(ctx, grain(), 0.5, "overlay");
  // Inner shade on the far side.
  const g = ctx.createRadialGradient(-R * 0.35, -R * 0.35, R * 0.2, 0, 0, R * 1.05);
  g.addColorStop(0, "rgba(255,255,220,0.12)");
  g.addColorStop(0.6, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,10,0,0.35)");
  ctx.fillStyle = g;
  ctx.fill();
}

export function paintTree(ctx: Ctx, kind: TreeKind, r: Rand, variant: number) {
  const R = TREE_R[kind];
  circleShadow(ctx, 0, 0, R * 0.92, TREE_H[kind], 0.4);
  if (kind === "conifer") {
    const spikes = 14;
    for (let layer = 0; layer < 3; layer++) {
      const rad = R * (1 - layer * 0.28);
      ctx.beginPath();
      for (let i = 0; i < spikes * 2; i++) {
        const a = (i / (spikes * 2)) * Math.PI * 2 + layer * 0.2;
        const d = i % 2 ? rad * 0.62 : rad;
        ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d);
      }
      ctx.closePath();
      const c = ["#1f3a24", "#2b4d2d", "#3d6a3a"][layer];
      shade(ctx, -rad, -rad, rad, rad, lighten(c, 0.15), c, darken(c, 0.2));
    }
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    texture(ctx, grain(), 0.35, "overlay");
    return;
  }
  canopy(ctx, R, r, LEAF[variant % LEAF.length]);
  if (kind === "shrub" && variant % 2) {
    ctx.fillStyle = variant % 4 === 1 ? "#f1f0ea" : "#e4c24a";
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(range(r, -R * 0.6, R * 0.6), range(r, -R * 0.6, R * 0.6), 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ---------------------------------------------------------------------------
// City filler: rooftops around the edges
// ---------------------------------------------------------------------------

export function rooftopBox(w: number, h: number, height: number): SpriteBox {
  const sh = height * 0.75;
  return { w: w + 40 + sh * 0.62, h: h + 40 + sh * 0.78, ax: w / 2 + 20, ay: h / 2 + 20 };
}

const ROOF_COLORS = ["#8f8a80", "#a39d91", "#7d8389", "#9a948a", "#6f747a", "#b3aca0"];

export function paintRooftop(ctx: Ctx, r: Rand, variant: number, w: number, h: number, height: number) {
  rectShadow(ctx, -w / 2, -h / 2, w, h, height, 0.42);
  if (variant % 5 === 4) {
    pitchedRoof(ctx, w, h, ["#8a4b3a", "#5f6a72", "#7a5a44"][variant % 3]);
    return;
  }
  roofSlab(ctx, -w / 2, -h / 2, w, h, ROOF_COLORS[variant % ROOF_COLORS.length]);
  const x0 = -w / 2 + 14;
  const y0 = -h / 2 + 14;
  if (variant % 3 === 0) solarArray(ctx, x0, y0, Math.floor((w - 60) / 15), Math.max(1, Math.floor((h - 50) / 23)));
  else if (variant % 3 === 1) {
    // Rooftop garden.
    ctx.beginPath();
    ctx.rect(x0, y0, w * 0.45, h * 0.5);
    ctx.fillStyle = "#5a7a34";
    ctx.fill();
    texture(ctx, clouds(), 0.6, "multiply");
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.translate(x0 + range(r, 10, w * 0.4), y0 + range(r, 10, h * 0.45));
      canopy(ctx, 9, r, LEAF[i % 3]);
      ctx.restore();
    }
  } else {
    skylight(ctx, x0, y0, 30, 20);
    skylight(ctx, x0 + 40, y0, 30, 20);
  }
  hvac(ctx, w / 2 - 44, h / 2 - 40, 26, 22);
  vent(ctx, w / 2 - 60, -h / 2 + 22, 5);
  vent(ctx, -w / 2 + 24, h / 2 - 22, 4);
  // Stairwell box.
  ctx.fillStyle = "rgba(10,18,26,0.3)";
  ctx.fillRect(-w / 2 + 18 + 4, h / 2 - 46 + 5, 30, 26);
  ctx.beginPath();
  ctx.rect(-w / 2 + 18, h / 2 - 46, 30, 26);
  shade(ctx, -w / 2 + 18, h / 2 - 46, -w / 2 + 48, h / 2 - 20, "#d5d2ca", "#aeaaa1", "#85817a");
}

/** Light spilling out of windows onto the street around a footprint. */
export function perimeterLights(w: number, h: number, color = WARM, step = 34): Light[] {
  const out: Light[] = [];
  for (let x = -w / 2 + step / 2; x < w / 2; x += step) {
    out.push([x, -h / 2 - 6, 40, color], [x, h / 2 + 6, 46, color]);
  }
  for (let y = -h / 2 + step / 2; y < h / 2; y += step) {
    out.push([-w / 2 - 6, y, 40, color], [w / 2 + 6, y, 40, color]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Street furniture (breakable)
// ---------------------------------------------------------------------------

export type PropKind = "lamp" | "barrier" | "planter" | "bench";

export const PROP_BOX: Record<PropKind, SpriteBox> = {
  lamp: { w: 120, h: 110, ax: 20, ay: 20 },
  barrier: { w: 80, h: 50, ax: 30, ay: 14 },
  planter: { w: 60, h: 60, ax: 20, ay: 20 },
  bench: { w: 64, h: 40, ax: 26, ay: 14 },
};

export const PROP_DEBRIS: Record<PropKind, string[]> = {
  lamp: ["#6b7178", "#d9dde1", "#3c4146"],
  barrier: ["#e5e5e0", "#c0392b", "#a7a8a4"],
  planter: ["#b7b2a7", "#4f7130", "#6b8d3d"],
  bench: ["#8a5a36", "#5c3a22", "#3c4146"],
};

export const PROP_LIGHTS: Record<PropKind, Light[]> = {
  lamp: [[24, 0, 26, "#fff1d0"]],
  barrier: [],
  planter: [],
  bench: [],
};

export function paintProp(ctx: Ctx, kind: PropKind, variant = 0) {
  switch (kind) {
    case "lamp": {
      // Long thin pole shadow, then the pole cap, arm and lamp head.
      ctx.strokeStyle = "rgba(14,22,30,0.35)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0.62 * 70, 0.78 * 70);
      ctx.stroke();
      ctx.fillStyle = "rgba(14,22,30,0.3)";
      ctx.beginPath();
      ctx.ellipse(24 + 0.62 * 64, 0.78 * 64, 8, 4, 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#4a5056";
      ctx.fill();
      ctx.strokeStyle = "#6b7178";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(20, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(24, 0, 8, 4.5, 0, 0, Math.PI * 2);
      shade(ctx, 16, -4, 32, 4, "#9aa1a8", "#5f666d", "#3c4146");
      ctx.fillStyle = "#f4f1e6";
      ctx.fillRect(19, -1, 10, 2);
      break;
    }
    case "barrier": {
      ctx.fillStyle = "rgba(14,22,30,0.32)";
      ctx.fillRect(-22, -2, 52, 16);
      ctx.beginPath();
      ctx.rect(-26, -6, 52, 12);
      shade(ctx, -26, -6, 26, 6, "#f4f3ee", "#d8d8d2", "#a7a8a4");
      ctx.save();
      ctx.clip();
      ctx.fillStyle = "#c0392b";
      for (let x = -26; x < 26; x += 14) {
        ctx.beginPath();
        ctx.moveTo(x, -6);
        ctx.lineTo(x + 7, -6);
        ctx.lineTo(x + 1, 6);
        ctx.lineTo(x - 6, 6);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      break;
    }
    case "planter": {
      rectShadow(ctx, -14, -14, 28, 28, 18, 0.45);
      ctx.beginPath();
      ctx.rect(-14, -14, 28, 28);
      shade(ctx, -14, -14, 14, 14, "#d9d5cb", "#b7b2a7", "#8f8a80");
      texture(ctx, grain(), 0.4, "overlay");
      ctx.save();
      ctx.beginPath();
      ctx.rect(-10, -10, 20, 20);
      ctx.fillStyle = "#4a3a28";
      ctx.fill();
      ctx.restore();
      canopy(ctx, 10, mulberrySeed(variant), LEAF[variant % 3]);
      break;
    }
    case "bench": {
      ctx.fillStyle = "rgba(14,22,30,0.32)";
      ctx.fillRect(-16, -1, 40, 14);
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.rect(-20, -6 + i * 3.4, 40, 2.6);
        shade(ctx, -20, 0, 20, 0, "#b98a5e", C.wood, C.woodDark);
      }
      ctx.fillStyle = "#3c4146";
      ctx.fillRect(-17, -7, 3, 14);
      ctx.fillRect(14, -7, 3, 14);
      break;
    }
  }
}

function mulberrySeed(n: number): Rand {
  let a = (n * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Gates (overhead gantries) + decor
// ---------------------------------------------------------------------------

export function gateBox(): SpriteBox {
  return { w: 380, h: 200, ax: 160, ay: 40 };
}

export function paintGate(ctx: Ctx, d: District) {
  // Shadow of the beam and pillars cast across the road.
  rectShadow(ctx, -136, -9, 272, 18, 120, 0.4);
  for (const x of [-122, 122]) rectShadow(ctx, x - 12, -12, 24, 24, 120, 0.4);
  for (const x of [-122, 122]) {
    ctx.beginPath();
    ctx.rect(x - 12, -12, 24, 24);
    shade(ctx, x - 12, -12, x + 12, 12, "#9aa1a8", "#5f666d", "#3c4146");
  }
  ctx.beginPath();
  ctx.rect(-136, -9, 272, 18);
  shade(ctx, -136, -9, 136, 9, "#7d848b", "#4a5056", "#2f3439");
  texture(ctx, grain(), 0.3, "overlay");
  ctx.fillStyle = d.color;
  ctx.fillRect(-136, -9, 272, 3);
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.fillRect(-136, -9, 272, 1);
}

export const GATE_LIGHTS = (d: District): Light[] => [
  [-122, 0, 50, WARM],
  [122, 0, 50, WARM],
  [0, 14, 90, lighten(d.color, 0.3)],
];

export const DECOR_BOX = {
  fountain: { w: 260, h: 260, ax: 110, ay: 110 },
  campfire: { w: 300, h: 200, ax: 140, ay: 90 },
} satisfies Record<string, SpriteBox>;

export const DECOR_LIGHTS: Record<keyof typeof DECOR_BOX, Light[]> = {
  fountain: [[0, 0, 140, "#9fe3ff"], [0, 0, 50, "#e8fbff"]],
  campfire: [[0, 0, 160, "#ffa040"]],
};

export function paintFountain(ctx: Ctx) {
  circleShadow(ctx, 0, 0, 92, 14, 0.35);
  ctx.beginPath();
  ctx.arc(0, 0, 92, 0, Math.PI * 2);
  shade(ctx, -92, -92, 92, 92, "#ece8df", "#cbc5b8", "#a19a8c");
  texture(ctx, grain(), 0.45, "overlay");
  ctx.beginPath();
  ctx.arc(0, 0, 80, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(-20, -20, 6, 0, 0, 82);
  g.addColorStop(0, "#7fc4dc");
  g.addColorStop(0.6, C.water);
  g.addColorStop(1, C.waterDeep);
  ctx.fillStyle = g;
  ctx.fill();
  texture(ctx, clouds(), 0.35, "overlay");
  ctx.beginPath();
  ctx.arc(0, 0, 24, 0, Math.PI * 2);
  shade(ctx, -24, -24, 24, 24, "#f1ede5", "#cbc5b8", "#a19a8c");
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fillStyle = "#7fc4dc";
  ctx.fill();
}

export function paintCampfire(ctx: Ctx, r: Rand) {
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * 30, Math.sin(a) * 30, 8, 6, a, 0, Math.PI * 2);
    shade(ctx, -8, -8, 8, 8, "#c9c6bf", "#8d8a83", "#5d5a54");
  }
  ctx.beginPath();
  ctx.arc(0, 0, 24, 0, Math.PI * 2);
  ctx.fillStyle = "#2a241f";
  ctx.fill();
  for (const a of [0.3, 1.9, 3.4]) {
    ctx.save();
    ctx.rotate(a);
    ctx.beginPath();
    ctx.roundRect(-18, -4, 36, 8, 4);
    shade(ctx, -18, -4, 18, 4, "#8a6a4a", "#5c4330", "#3a2a1e");
    ctx.restore();
  }
  for (const [x, y, a] of [[-100, -10, 0.2], [100, -10, -0.2], [0, -80, Math.PI / 2]] as const) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.fillStyle = "rgba(14,22,30,0.3)";
    ctx.fillRect(-36, 2, 72, 18);
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.rect(-40, -8 + i * 5, 80, 4);
      shade(ctx, -40, 0, 40, 0, "#b98a5e", C.wood, C.woodDark);
    }
    ctx.restore();
  }
  void r;
}

// ---------------------------------------------------------------------------
// Buildings
// ---------------------------------------------------------------------------

type Painter = (ctx: Ctx, r: Rand, p: Place) => void;

const securityTower: Painter = (ctx, r, p) => {
  // Plaza base, then a tall round tower casting a long shadow.
  ctx.beginPath();
  ctx.rect(-p.w / 2, -p.h / 2, p.w, p.h);
  shade(ctx, -p.w / 2, -p.h / 2, p.w / 2, p.h / 2, "#e3dfd6", "#c9c4b8", "#a9a397");
  texture(ctx, grain(), 0.4, "overlay");
  circleShadow(ctx, 0, 0, 50, p.height, 0.45);
  ctx.beginPath();
  ctx.arc(0, 0, 52, 0, Math.PI * 2);
  shade(ctx, -52, -52, 52, 52, "#eeeeea", "#c8c9c6", "#8d908f");
  texture(ctx, grain(), 0.4, "overlay");
  ctx.beginPath();
  ctx.arc(0, 0, 44, 0, Math.PI * 2);
  shade(ctx, -44, -44, 44, 44, "#5c646b", "#3a4046", "#23282c");
  texture(ctx, grain(), 0.5, "overlay");
  // Red/white aviation band on the parapet.
  for (let i = 0; i < 16; i++) {
    const a0 = (i / 16) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(0, 0, 48, a0, a0 + Math.PI / 8);
    ctx.strokeStyle = i % 2 ? "#f4f3ee" : p.color;
    ctx.lineWidth = 7;
    ctx.stroke();
  }
  hvac(ctx, -30, 14, 18, 14);
  vent(ctx, 26, 20, 5);
  void r;
};

const factory: Painter = (ctx, r, p) => {
  const { w, h } = p;
  rectShadow(ctx, -w / 2, -h / 2, w, h, p.height, 0.42);
  // Saw-tooth roof: alternating metal and north-light glazing strips.
  const strips = 7;
  const sh = h / strips;
  for (let i = 0; i < strips; i++) {
    const y = -h / 2 + i * sh;
    ctx.beginPath();
    ctx.rect(-w / 2, y, w, sh * 0.68);
    shade(ctx, -w / 2, y, w / 2, y + sh, "#c3c7cb", "#9ea4aa", "#7b8288");
    texture(ctx, grain(), 0.35, "overlay");
    ctx.beginPath();
    ctx.rect(-w / 2, y + sh * 0.68, w, sh * 0.32);
    shade(ctx, -w / 2, y, w / 2, y + sh, "#9cc1d3", "#5e8396", "#3c5a69");
  }
  ctx.strokeStyle = "rgba(0,0,0,0.12)";
  ctx.lineWidth = 1;
  for (let x = -w / 2 + 10; x < w / 2; x += 10) {
    ctx.beginPath();
    ctx.moveTo(x, -h / 2);
    ctx.lineTo(x, h / 2);
    ctx.stroke();
  }
  ctx.strokeStyle = "#5b6167";
  ctx.lineWidth = 3;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  // Chimney (smoke is animated) and rooftop extract fans.
  circleShadow(ctx, 110, -46, 13, 120, 0.4);
  ctx.beginPath();
  ctx.arc(110, -46, 13, 0, Math.PI * 2);
  shade(ctx, 97, -59, 123, -33, "#c47a5a", "#9a5638", "#6b3a26");
  ctx.beginPath();
  ctx.arc(110, -46, 8, 0, Math.PI * 2);
  ctx.fillStyle = "#1d1f22";
  ctx.fill();
  for (const x of [-110, -60]) vent(ctx, x, 44, 11);
  // Company lettering.
  ctx.fillStyle = p.color;
  ctx.fillRect(-w / 2, -h / 2, w, 4);
  void r;
};

const garage: Painter = (ctx, r, p) => {
  const { w, h } = p;
  rectShadow(ctx, -w / 2, -h / 2, w, h, p.height, 0.42);
  ctx.beginPath();
  ctx.rect(-w / 2, -h / 2, w, h);
  shade(ctx, -w / 2, -h / 2, w / 2, h / 2, "#d4d8dc", "#aab1b7", "#848b92");
  texture(ctx, grain(), 0.35, "overlay");
  // Corrugated metal ribs.
  ctx.strokeStyle = "rgba(0,0,0,0.16)";
  ctx.lineWidth = 1.2;
  for (let x = -w / 2 + 6; x < w / 2; x += 6) {
    ctx.beginPath();
    ctx.moveTo(x, -h / 2);
    ctx.lineTo(x, h / 2);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  for (let x = -w / 2 + 3; x < w / 2; x += 6) ctx.fillRect(x, -h / 2, 1.2, h);
  skylight(ctx, -60, -20, 120, 16);
  ctx.strokeStyle = "#5b6167";
  ctx.lineWidth = 3;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  // Oil-stained concrete apron in front of the roller door.
  ctx.beginPath();
  ctx.rect(-60, h / 2, 120, 26);
  ctx.fillStyle = "#b5b1a8";
  ctx.fill();
  texture(ctx, clouds(), 0.5, "multiply");
  void r;
};

const library: Painter = (ctx, r, p) => {
  const { w, h } = p;
  rectShadow(ctx, -w / 2, -h / 2, w, h, p.height, 0.42);
  roofSlab(ctx, -w / 2, -h / 2, w, h, "#d6d1c6", 7);
  // Glass atrium.
  const ax = -w / 2 + 24;
  const ay = -h / 2 + 24;
  const aw = 140;
  const ah = h - 48;
  ctx.fillStyle = "#3e4a52";
  ctx.fillRect(ax - 3, ay - 3, aw + 6, ah + 6);
  for (let i = 0; i < 7; i++)
    for (let j = 0; j < 7; j++) {
      const px = ax + (i * aw) / 7;
      const py = ay + (j * ah) / 7;
      ctx.beginPath();
      ctx.rect(px + 1, py + 1, aw / 7 - 2, ah / 7 - 2);
      shade(ctx, ax, ay, ax + aw, ay + ah, "#d8eef6", "#86aec0", "#4b6f80");
    }
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.beginPath();
  ctx.moveTo(ax, ay + ah * 0.7);
  ctx.lineTo(ax + aw * 0.6, ay);
  ctx.lineTo(ax + aw * 0.75, ay);
  ctx.lineTo(ax, ay + ah);
  ctx.closePath();
  ctx.fill();
  // Observatory dome (its slit rotates in the overlay).
  circleShadow(ctx, 80, -10, 48, 50, 0.35);
  ctx.beginPath();
  ctx.arc(80, -10, 48, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(64, -28, 6, 80, -10, 52);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.55, "#d9dcdf");
  g.addColorStop(1, "#8f959b");
  ctx.fillStyle = g;
  ctx.fill();
  hvac(ctx, 40, 50, 24, 18);
  hvac(ctx, 92, 54, 24, 18);
  void r;
};

const lodge: Painter = (ctx, r, p) => {
  const { w, h } = p;
  const roofH = h - 40;
  ctx.save();
  ctx.translate(0, -20);
  rectShadow(ctx, -w / 2, -roofH / 2, w, roofH, p.height, 0.42);
  pitchedRoof(ctx, w, roofH, "#4a3a2e");
  // Stone chimney.
  ctx.beginPath();
  ctx.rect(70, -40, 22, 22);
  shade(ctx, 70, -40, 92, -18, "#b8b2a6", "#8c867a", "#625d54");
  ctx.fillStyle = "#1d1f22";
  ctx.fillRect(75, -35, 12, 12);
  ctx.restore();
  // Timber deck with a hot tub.
  const dy = roofH / 2 - 20;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.rect(-w / 2 + 10, dy + i * 5, w - 20, 4);
    shade(ctx, -w / 2, 0, w / 2, 0, "#c99a6a", "#9a7048", "#6f4d30");
  }
  ctx.beginPath();
  ctx.arc(-w / 2 + 40, dy + 20, 15, 0, Math.PI * 2);
  ctx.fillStyle = "#6a6f73";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-w / 2 + 40, dy + 20, 11, 0, Math.PI * 2);
  ctx.fillStyle = "#6fc3d6";
  ctx.fill();
  void r;
};

const house: Painter = (ctx, r, p) => {
  const { w, h } = p;
  const roofH = h - 44;
  ctx.save();
  ctx.translate(0, -22);
  rectShadow(ctx, -w / 2, -roofH / 2, w, roofH, p.height, 0.42);
  hipRoof(ctx, w, roofH, "#9a4a32");
  ctx.restore();
  // Patio and pool behind the house.
  ctx.beginPath();
  ctx.rect(-w / 2, roofH / 2 - 22, w, 44);
  shade(ctx, -w / 2, 0, w / 2, 0, "#e3ddd0", "#cdc6b6", "#a9a292");
  texture(ctx, grain(), 0.4, "overlay");
  ctx.beginPath();
  ctx.roundRect(-w / 2 + 14, roofH / 2 - 16, 100, 32, 4);
  ctx.fillStyle = "#e9e6de";
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(-w / 2 + 18, roofH / 2 - 12, 92, 24, 3);
  const g = ctx.createLinearGradient(0, roofH / 2 - 12, 0, roofH / 2 + 12);
  g.addColorStop(0, "#9fe2ef");
  g.addColorStop(1, "#3fa9c4");
  ctx.fillStyle = g;
  ctx.fill();
  for (const x of [w / 2 - 50, w / 2 - 28]) {
    ctx.fillStyle = "#f4f1e8";
    ctx.fillRect(x, roofH / 2 - 14, 14, 26);
  }
  void r;
};

/** The skill tree: one huge old tree hung with fairy lights. */
export const FAIRY_LIGHTS: [number, number][] = Array.from({ length: 26 }, (_, i) => {
  const a = (i / 26) * Math.PI * 2;
  const rad = i % 2 ? 80 : 118;
  return [Math.cos(a) * rad, Math.sin(a) * rad] as [number, number];
});

const bigTree: Painter = (ctx, r, p) => {
  circleShadow(ctx, 0, 0, 140, p.height, 0.42);
  canopy(ctx, 148, r, ["#233f1c", "#355f26", "#4f7f33", "#78a650"]);
  ctx.strokeStyle = "rgba(255, 236, 190, 0.45)";
  ctx.lineWidth = 0.8;
  for (const rad of [80, 118]) {
    ctx.beginPath();
    ctx.arc(0, 0, rad, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const [x, y] of FAIRY_LIGHTS) {
    ctx.fillStyle = "#fff3c4";
    ctx.beginPath();
    ctx.arc(x, y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
};

const flatShop =
  (opts: { roof: string; label: string; labelColor: string; solar?: boolean }): Painter =>
  (ctx, r, p) => {
    const { w, h } = p;
    rectShadow(ctx, -w / 2, -h / 2, w, h, p.height, 0.42);
    roofSlab(ctx, -w / 2, -h / 2, w, h, opts.roof);
    if (opts.solar) solarArray(ctx, -w / 2 + 14, -h / 2 + 14, 4, 2);
    roofText(ctx, opts.label, 10, 18, 26, opts.labelColor);
    hvac(ctx, w / 2 - 44, -h / 2 + 14, 26, 22);
    vent(ctx, w / 2 - 20, h / 2 - 18, 5);
    void r;
  };

const officeTower: Painter = (ctx, r, p) => {
  const { w, h } = p;
  rectShadow(ctx, -w / 2, -h / 2, w, h, p.height, 0.45);
  // Glass curtain wall edge, then the roof deck with a helipad.
  ctx.beginPath();
  ctx.rect(-w / 2, -h / 2, w, h);
  shade(ctx, -w / 2, -h / 2, w / 2, h / 2, "#a9c6dc", "#56809e", "#2d4d66");
  ctx.beginPath();
  ctx.rect(-w / 2 + 8, -h / 2 + 8, w - 16, h - 16);
  shade(ctx, -w / 2, -h / 2, w / 2, h / 2, "#8d939a", "#6c7279", "#4f555b");
  texture(ctx, grain(), 0.4, "overlay");
  ctx.beginPath();
  ctx.arc(0, 0, 44, 0, Math.PI * 2);
  ctx.fillStyle = "#3a3f44";
  ctx.fill();
  ctx.strokeStyle = "#f4d03f";
  ctx.lineWidth = 3;
  ctx.stroke();
  roofText(ctx, "H", 0, 2, 40, "#f4f3ee");
  hvac(ctx, -w / 2 + 14, h / 2 - 36, 26, 22);
  void r;
};

const postOffice: Painter = (ctx, r, p) => {
  const { w, h } = p;
  rectShadow(ctx, -w / 2, -h / 2, w, h, p.height, 0.42);
  pitchedRoof(ctx, w, h, "#8e2f25");
  // Delivery van parked along the side.
  ctx.save();
  ctx.translate(w / 2 + 16, 0);
  ctx.rotate(Math.PI / 2);
  paintVan(ctx);
  ctx.restore();
  void r;
};

function paintVan(ctx: Ctx) {
  ctx.fillStyle = "rgba(14,22,30,0.35)";
  ctx.fillRect(-26 + 4, -12 + 5, 52, 24);
  ctx.beginPath();
  ctx.roundRect(-26, -12, 52, 24, 4);
  shade(ctx, -26, -12, 26, 12, "#ffffff", "#e3e2dd", "#b5b4ae");
  ctx.fillStyle = "#c0392b";
  ctx.fillRect(-26, -2, 52, 4);
  ctx.fillStyle = "#2b3a46";
  ctx.fillRect(16, -10, 6, 20);
}

const painters: Record<string, Painter> = {
  shadowpath: securityTower,
  "industrial-product-search": factory,
  workshop: garage,
  "website-content-search": library,
  "trek-saathi": lodge,
  about: house,
  skills: bigTree,
  github: flatShop({ roof: "#7f8a7f", label: "</>", labelColor: "#2ea44f", solar: true }),
  linkedin: officeTower,
  email: postOffice,
  resume: flatShop({ roof: "#a39d91", label: "PRINT", labelColor: "#eab308" }),
};

export function paintPlace(ctx: Ctx, r: Rand, p: Place) {
  painters[p.id]?.(ctx, r, p);
}

/** Night lights for a building: window spill around it plus a few accents. */
export function placeLights(p: Place): Light[] {
  if (p.kind === "skills") return FAIRY_LIGHTS.map(([x, y]) => [x, y, 16, "#ffe6a6"] as Light);
  const out = perimeterLights(p.w, p.h);
  const accent: Record<string, Light[]> = {
    shadowpath: [[0, 0, 90, "#ff5a4f"]],
    "website-content-search": [[-60, 0, 120, "#d9f2ff"]],
    "trek-saathi": [[-85, 50, 50, "#7fe0f0"]],
    about: [[-36, 53, 70, "#58d1ef"]],
    github: [[10, 18, 70, "#3fe07a"]],
    linkedin: [[0, 0, 60, "#f4d03f"]],
    resume: [[10, 18, 60, "#ffe066"]],
  };
  return out.concat(accent[p.id] ?? []);
}

/** Floating map label above each place. */
export const LABEL_BOX: SpriteBox = { w: 300, h: 44, ax: 150, ay: 22 };

export function paintLabel(ctx: Ctx, p: Place) {
  const title = p.title;
  ctx.font = displayFont(16, 700);
  const tw = ctx.measureText(title).width;
  const w = tw + 40;
  const h = 30;
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.roundRect(-w / 2 + 1, -h / 2 + 3, w, h, 15);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, 15);
  ctx.fillStyle = "rgba(17, 22, 29, 0.88)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-w / 2 + 16, 0, 5, 0, Math.PI * 2);
  ctx.fillStyle = p.color;
  ctx.fill();
  ctx.fillStyle = "#f5f7fa";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(title, -w / 2 + 28, 1);
}

// ---------------------------------------------------------------------------
// Vehicles and bodies
// ---------------------------------------------------------------------------

export const CAR_BOX: SpriteBox = { w: 90, h: 64, ax: 45, ay: 32 };
/** Jeep wheels: [x, y, steers]. */
export const CAR_WHEELS: [number, number, boolean][] = [
  [18, -17, true],
  [18, 17, true],
  [-17, -17, false],
  [-17, 17, false],
];

/** Top-down jeep facing +x. */
export function paintCar(ctx: Ctx) {
  ctx.beginPath();
  ctx.moveTo(-28, -16);
  ctx.lineTo(20, -16);
  ctx.quadraticCurveTo(31, -15, 31, 0);
  ctx.quadraticCurveTo(31, 15, 20, 16);
  ctx.lineTo(-28, 16);
  ctx.quadraticCurveTo(-33, 0, -28, -16);
  ctx.closePath();
  shade(ctx, -30, -16, 30, 16, "#d5533f", "#a8321f", "#6f1f13");
  texture(ctx, grain(), 0.25, "overlay");
  // Bonnet sheen.
  const g = ctx.createLinearGradient(8, -16, 30, 16);
  g.addColorStop(0, "rgba(255,255,255,0.45)");
  g.addColorStop(0.4, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(10, -15, 20, 30);
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(14, -12);
  ctx.lineTo(28, -8);
  ctx.moveTo(14, 12);
  ctx.lineTo(28, 8);
  ctx.stroke();
  // Windscreen.
  ctx.beginPath();
  ctx.moveTo(4, -14);
  ctx.lineTo(12, -12);
  ctx.lineTo(12, 12);
  ctx.lineTo(4, 14);
  ctx.closePath();
  shade(ctx, 4, -14, 12, 14, "#b9d3e0", "#4b6878", "#22323b");
  // Soft-top roof.
  ctx.beginPath();
  ctx.roundRect(-24, -14, 28, 28, 3);
  shade(ctx, -24, -14, 4, 14, "#4a4d50", "#2f3235", "#1c1e20");
  texture(ctx, grain(), 0.4, "overlay");
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  for (const x of [-16, -8, 0]) {
    ctx.beginPath();
    ctx.moveTo(x, -14);
    ctx.lineTo(x, 14);
    ctx.stroke();
  }
  // Spare wheel + lights.
  ctx.beginPath();
  ctx.ellipse(-32, 0, 5, 8, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#1a1c1e";
  ctx.fill();
  ctx.fillStyle = "#fff6d8";
  for (const y of [-11, 11]) {
    ctx.beginPath();
    ctx.ellipse(30, y, 1.8, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#b3261e";
  for (const y of [-13, 13]) ctx.fillRect(-30, y - 1.5, 2, 3);
}

export type BodyKind = "crate" | "cone" | "ball" | "brick" | "letter" | "sedan";

export const BODY_SIZE: Record<BodyKind, number> = { crate: 44, cone: 30, ball: 40, brick: 30, letter: 100, sedan: 84 };

const SEDAN_COLORS = ["#e9e9e6", "#2f3338", "#8c1d18", "#1f4e79", "#9aa0a6", "#3d5a3a", "#b8a27a"];

export function paintBody(ctx: Ctx, kind: BodyKind, char = "") {
  switch (kind) {
    case "crate": {
      ctx.beginPath();
      ctx.rect(-16, -16, 32, 32);
      shade(ctx, -16, -16, 16, 16, "#c9a274", "#a07a4e", "#6f5232");
      texture(ctx, grain(), 0.5, "overlay");
      ctx.strokeStyle = "rgba(60,40,20,0.6)";
      ctx.lineWidth = 1;
      for (let y = -12; y < 16; y += 8) {
        ctx.beginPath();
        ctx.moveTo(-16, y);
        ctx.lineTo(16, y);
        ctx.stroke();
      }
      ctx.strokeRect(-16, -16, 32, 32);
      break;
    }
    case "cone": {
      ctx.beginPath();
      ctx.rect(-9, -9, 18, 18);
      ctx.fillStyle = "#c2410c";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
      shade(ctx, -7.5, -7.5, 7.5, 7.5, "#ff9a4d", "#f26a1b", "#b84a0c");
      ctx.strokeStyle = "#f4f3ee";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = "#7a2d07";
      ctx.fill();
      break;
    }
    case "ball": {
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      shade(ctx, -15, -15, 15, 15, "#f39a55", "#d9661f", "#8f3d0c");
      texture(ctx, grain(), 0.4, "overlay");
      ctx.strokeStyle = "#2a160a";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-15, 0);
      ctx.lineTo(15, 0);
      ctx.moveTo(0, -15);
      ctx.lineTo(0, 15);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-15, 0, 10, -1, 1);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(15, 0, 10, Math.PI - 1, Math.PI + 1);
      ctx.stroke();
      break;
    }
    case "brick": {
      ctx.beginPath();
      ctx.rect(-13, -7, 26, 14);
      shade(ctx, -13, -7, 13, 7, "#c9c6bf", "#a3a09a", "#76736d");
      texture(ctx, grain(), 0.5, "overlay");
      break;
    }
    case "sedan": {
      const color = SEDAN_COLORS[(char.charCodeAt(0) || 0) % SEDAN_COLORS.length];
      ctx.beginPath();
      ctx.roundRect(-32, -15, 64, 30, 9);
      shade(ctx, -32, -15, 32, 15, lighten(color, 0.3), color, darken(color, 0.35));
      ctx.beginPath();
      ctx.roundRect(-14, -12, 30, 24, 5);
      shade(ctx, -14, -12, 16, 12, lighten(color, 0.15), darken(color, 0.05), darken(color, 0.25));
      ctx.fillStyle = "#26323b";
      ctx.beginPath();
      ctx.moveTo(16, -12);
      ctx.lineTo(24, -10);
      ctx.lineTo(24, 10);
      ctx.lineTo(16, 12);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-14, -12);
      ctx.lineTo(-20, -10);
      ctx.lineTo(-20, 10);
      ctx.lineTo(-14, 12);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(-10, -11, 22, 3);
      ctx.fillStyle = darken(color, 0.3);
      ctx.fillRect(10, -17, 4, 3);
      ctx.fillRect(10, 14, 4, 3);
      break;
    }
    case "letter": {
      ctx.font = displayFont(84, 700);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // Concrete block letters: cast shadow along the sun, lit top face.
      for (let i = 10; i > 0; i--) {
        ctx.fillStyle = `rgba(14, 22, 30, ${0.05 + (10 - i) * 0.012})`;
        ctx.fillText(char, i * 1.3, i * 1.6);
      }
      for (let i = 4; i > 0; i--) {
        ctx.fillStyle = "#8f8a80";
        ctx.fillText(char, i * 0.5, i * 0.6);
      }
      const g = ctx.createLinearGradient(-30, -34, 30, 34);
      g.addColorStop(0, "#f7f5ef");
      g.addColorStop(1, "#cfcabf");
      ctx.fillStyle = g;
      ctx.fillText(char, 0, 0);
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Train (top-down)
// ---------------------------------------------------------------------------

export const TRAIN_BOX: SpriteBox = { w: 240, h: 90, ax: 105, ay: 25 };
export const TRAIN_CAR_LEN = 200;

export function paintTrainCar(ctx: Ctx, engine: boolean) {
  rectShadow(ctx, -96, -18, 192, 36, 36, 0.4);
  ctx.beginPath();
  if (engine) {
    ctx.moveTo(-96, -18);
    ctx.lineTo(76, -18);
    ctx.quadraticCurveTo(100, -16, 100, 0);
    ctx.quadraticCurveTo(100, 16, 76, 18);
    ctx.lineTo(-96, 18);
  } else ctx.rect(-96, -18, 192, 36);
  ctx.closePath();
  shade(ctx, -96, -18, 96, 18, "#f2f3f1", "#d3d6d6", "#a4a9aa");
  texture(ctx, grain(), 0.35, "overlay");
  ctx.fillStyle = "#0f766e";
  ctx.fillRect(-96, -18, engine ? 176 : 192, 3);
  ctx.fillRect(-96, 15, engine ? 176 : 192, 3);
  for (const x of [-60, 0, 60]) hvac(ctx, x - 12, -9, 24, 18);
  if (engine) {
    ctx.strokeStyle = "#2b2e32";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(40, -12);
    ctx.lineTo(60, 0);
    ctx.lineTo(40, 12);
    ctx.stroke();
    ctx.fillStyle = "#26323b";
    ctx.beginPath();
    ctx.moveTo(84, -15);
    ctx.quadraticCurveTo(98, -10, 98, 0);
    ctx.quadraticCurveTo(98, 10, 84, 15);
    ctx.closePath();
    ctx.fill();
  }
}

