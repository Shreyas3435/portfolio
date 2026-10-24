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
  lighten,
  outline,
  polyPath,
  range,
  rgba,
  shade,
  softShadow,
  text,
} from "./paint";

// Everything here paints into a cached sprite with the anchor (0, 0) at the
// middle of the object's ground line. Light comes from the upper left; shading
// is cel-style (hard bands) with thin darker outlines to keep shapes crisp.

export interface SpriteBox {
  w: number;
  h: number;
  ax: number;
  ay: number;
}

/** A night-time light: [dx, dy, radius, colour] relative to an anchor. */
export type Light = [number, number, number, string];

// ---------------------------------------------------------------------------
// Nature + city filler
// ---------------------------------------------------------------------------

export type Foliage = "ginkgo" | "poplar" | "spirit" | "hedge" | "rock" | "block";

const TONES = {
  ginkgo: ["#a86a00", "#e8a600", "#ffd23f", "#fff2a8"],
  spirit: ["#0b4f5c", "#11808a", "#2fc4c0", "#b8fff4"],
  hedge: ["#1e5a34", "#2f8a45", "#5cbf5c", "#bdf0a0"],
  poplar: ["#173f2c", "#22603c", "#3a8f50", "#9fdc8a"],
} as const;

export const FOLIAGE_BOX: Record<Foliage, SpriteBox> = {
  ginkgo: { w: 130, h: 150, ax: 65, ay: 134 },
  poplar: { w: 80, h: 180, ax: 40, ay: 166 },
  spirit: { w: 140, h: 160, ax: 70, ay: 144 },
  hedge: { w: 80, h: 56, ax: 40, ay: 44 },
  rock: { w: 70, h: 52, ax: 35, ay: 38 },
  block: { w: 190, h: 280, ax: 95, ay: 262 },
};

function trunk(ctx: Ctx, h: number, w: number, color = "#6b4a33") {
  ctx.beginPath();
  ctx.moveTo(-w, 0);
  ctx.quadraticCurveTo(-w * 0.5, -h * 0.5, -w * 0.45, -h);
  ctx.lineTo(w * 0.45, -h);
  ctx.quadraticCurveTo(w * 0.5, -h * 0.5, w, 0);
  ctx.closePath();
  shade(ctx, -w, 0, w, 0, lighten(color, 0.3), color, darken(color, 0.4));
}

/** Spirit-tree seed pods — they glow after dark. */
export const SPIRIT_PODS: [number, number][] = [[-30, -96], [26, -104], [-6, -78], [36, -74], [-38, -66]];

/** Apartment block colours (walls, roof trim). */
const BLOCK_STYLES: [string, string][] = [
  ["#dfe6ee", "#5c7a99"],
  ["#f1e8d8", "#a86b4a"],
  ["#cfe0e3", "#3f7f86"],
  ["#e9e4dc", "#6a6f78"],
  ["#d8dde8", "#455a8a"],
];

function apartmentBlock(ctx: Ctx, r: Rand, variant: number) {
  const [wallC, trim] = BLOCK_STYLES[variant % BLOCK_STYLES.length];
  const floors = 4 + (variant % 3);
  const w = 130;
  const fh = 38;
  const h = floors * fh;
  softShadow(ctx, 20, 6, 96, 18, 0.32);
  ctx.beginPath();
  ctx.rect(-w / 2, -h, w, h);
  shade(ctx, -w / 2, -h, w / 2, 0, lighten(wallC, 0.3), wallC, darken(wallC, 0.12));
  outline(ctx, wallC);
  polyPath(ctx, [[w / 2, -h], [w / 2 + 22, -h - 10], [w / 2 + 22, -10], [w / 2, 0]]);
  ctx.fillStyle = darken(wallC, 0.28);
  ctx.fill();
  outline(ctx, wallC);
  for (let f = 0; f < floors; f++) {
    const y = -h + f * fh;
    for (let k = 0; k < 3; k++) {
      const x = -w / 2 + 12 + k * 40;
      ctx.beginPath();
      ctx.rect(x, y + 8, 26, 18);
      shade(ctx, x, y + 8, x + 26, y + 26, "#d8f4ff", "#7cc4e8", "#3f7fa8");
      outline(ctx, "#7cc4e8", 1);
      if (r() < 0.4) {
        ctx.fillStyle = r() < 0.5 ? "#f4f4f4" : "#9fc4e0";
        ctx.fillRect(x + 2, y + 9, 10, 16);
      }
    }
    // Balcony rail.
    ctx.fillStyle = trim;
    ctx.fillRect(-w / 2, y + fh - 6, w, 4);
  }
  // Rooftop: water tank and an AC unit.
  ctx.fillStyle = trim;
  ctx.fillRect(-w / 2 - 2, -h - 6, w + 4, 6);
  ctx.beginPath();
  ctx.roundRect(-40, -h - 30, 26, 24, 4);
  shade(ctx, -40, -h - 30, -14, -h - 6, "#f0f0f0", "#c9d0d8", "#8f98a3");
  outline(ctx, "#c9d0d8");
  ctx.beginPath();
  ctx.rect(14, -h - 18, 30, 12);
  shade(ctx, 14, -h - 18, 44, -h - 6, "#e3e7ec", "#aab3bd", "#78828d");
  outline(ctx, "#aab3bd");
}

export function paintFoliage(ctx: Ctx, kind: Foliage, r: Rand, variant = 0) {
  switch (kind) {
    case "ginkgo": {
      softShadow(ctx, 12, 2, 46, 13, 0.32);
      trunk(ctx, 52, 6);
      // Fan-shaped golden canopy built from layered clumps.
      const clumps: [number, number, number][] = [[0, -104, 26], [-30, -88, 22], [30, -90, 22], [-16, -70, 22], [18, -68, 21], [0, -84, 24]];
      for (const [x, y, s] of clumps) clump(ctx, x + range(r, -3, 3), y + range(r, -3, 3), s * range(r, 0.92, 1.06), r, TONES.ginkgo);
      ctx.fillStyle = "#fff6c0";
      for (let i = 0; i < 8; i++) {
        const fx = range(r, -40, 40);
        const fy = range(r, -118, -60);
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.arc(fx, fy, 3.5, -2.4, -0.7);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case "poplar": {
      softShadow(ctx, 10, 2, 22, 8, 0.32);
      trunk(ctx, 26, 4);
      ctx.beginPath();
      ctx.moveTo(0, -164);
      ctx.bezierCurveTo(26, -140, 22, -40, 0, -22);
      ctx.bezierCurveTo(-22, -40, -26, -140, 0, -164);
      ctx.closePath();
      const [deep, mid, light, hi] = TONES.poplar;
      shade(ctx, -22, -164, 22, -22, light, mid, deep);
      outline(ctx, mid);
      ctx.fillStyle = rgba(hi, 0.6);
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.ellipse(-8 + range(r, -3, 3), -140 + i * 18, 4, 7, 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "spirit": {
      softShadow(ctx, 12, 2, 50, 14, 0.32);
      // A twisting dark trunk.
      ctx.beginPath();
      ctx.moveTo(-9, 0);
      ctx.bezierCurveTo(-16, -20, 6, -36, -4, -60);
      ctx.lineTo(6, -60);
      ctx.bezierCurveTo(14, -36, -4, -20, 9, 0);
      ctx.closePath();
      shade(ctx, -12, 0, 12, 0, "#6a5a7a", "#3f3550", "#241e30");
      const clumps: [number, number, number][] = [[0, -108, 26], [-32, -92, 22], [32, -94, 22], [-14, -74, 22], [18, -72, 21]];
      for (const [x, y, s] of clumps) clump(ctx, x + range(r, -3, 3), y + range(r, -3, 3), s, r, TONES.spirit);
      for (const [x, y] of SPIRIT_PODS) {
        ctx.beginPath();
        ctx.ellipse(x, y, 4, 5.5, 0, 0, Math.PI * 2);
        shade(ctx, x - 4, y - 5, x + 4, y + 5, "#ffffff", "#8ffcff", "#2fc4c0");
      }
      break;
    }
    case "hedge": {
      softShadow(ctx, 6, 2, 36, 10, 0.3);
      ctx.beginPath();
      ctx.roundRect(-32, -30, 64, 30, 12);
      shade(ctx, -32, -30, 32, 0, TONES.hedge[2], TONES.hedge[1], TONES.hedge[0]);
      outline(ctx, TONES.hedge[1]);
      ctx.fillStyle = rgba(TONES.hedge[3], 0.7);
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.ellipse(range(r, -24, 10), range(r, -26, -16), 4, 2.5, -0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      if (r() < 0.5) {
        ctx.fillStyle = r() < 0.5 ? "#ffffff" : "#ffd23f";
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.arc(range(r, -26, 26), range(r, -28, -8), 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case "rock": {
      softShadow(ctx, 6, 2, 30, 9, 0.35);
      blobPath(ctx, 0, -13, 26, 16, r, 0.22);
      shade(ctx, -22, -28, 20, 2, "#eef0f2", "#a9b0b8", "#6a727c");
      outline(ctx, "#a9b0b8");
      break;
    }
    case "block":
      apartmentBlock(ctx, r, variant);
      break;
  }
}

/** Night lights for the apartment blocks (lit windows). */
export function blockLights(variant: number): Light[] {
  const floors = 4 + (variant % 3);
  const out: Light[] = [];
  for (let f = 0; f < floors; f++) {
    for (let k = 0; k < 3; k++) {
      if ((f * 3 + k + variant) % 3 === 0) continue;
      out.push([-65 + 25 + k * 40, -floors * 38 + f * 38 + 17, 18, "#ffcf7a"]);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Street furniture
// ---------------------------------------------------------------------------

export type PropKind = "lamp" | "fence" | "planter" | "vending";

export const PROP_BOX: Record<PropKind, SpriteBox> = {
  lamp: { w: 60, h: 120, ax: 18, ay: 110 },
  fence: { w: 60, h: 40, ax: 30, ay: 30 },
  planter: { w: 54, h: 50, ax: 27, ay: 38 },
  vending: { w: 50, h: 76, ax: 25, ay: 66 },
};

export const PROP_DEBRIS: Record<PropKind, string[]> = {
  lamp: ["#9aa3ad", "#e0f6ff", "#5f6873"],
  fence: ["#e8ecf0", "#b0b8c2", "#ffab00"],
  planter: ["#c4c9cf", "#5cbf5c", "#ffd23f"],
  vending: ["#e53935", "#ffffff", "#2979ff", "#ffd23f"],
};

export const PROP_LIGHTS: Record<PropKind, Light[]> = {
  lamp: [[24, -98, 90, "#ffe2a8"]],
  fence: [],
  planter: [],
  vending: [[0, -34, 46, "#bfe9ff"]],
};

const VENDING = ["#e53935", "#1e88e5", "#f4f4f4"];

export function paintProp(ctx: Ctx, kind: PropKind, variant = 0) {
  switch (kind) {
    case "lamp": {
      softShadow(ctx, 8, 2, 14, 5, 0.35);
      ctx.beginPath();
      ctx.rect(-3, -96, 6, 96);
      shade(ctx, -3, 0, 3, 0, "#d3d9e0", "#9aa3ad", "#5f6873");
      ctx.strokeStyle = "#7d8691";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -94);
      ctx.quadraticCurveTo(4, -104, 24, -102);
      ctx.stroke();
      ctx.beginPath();
      ctx.roundRect(14, -104, 22, 6, 3);
      ctx.fillStyle = "#4a525c";
      ctx.fill();
      ctx.fillStyle = "#f2fbff";
      ctx.fillRect(16, -99, 18, 2.5);
      break;
    }
    case "fence": {
      softShadow(ctx, 4, 2, 30, 5, 0.25);
      for (const y of [-22, -12]) {
        ctx.beginPath();
        ctx.rect(-28, y - 2.5, 56, 5);
        shade(ctx, 0, y - 3, 0, y + 2, "#ffffff", "#d7dde3", "#9aa3ad");
        outline(ctx, "#d7dde3", 1);
      }
      for (const x of [-24, 24]) {
        ctx.beginPath();
        ctx.rect(x - 3, -28, 6, 28);
        shade(ctx, x - 3, 0, x + 3, 0, "#ffffff", "#c3cad2", "#8a939e");
        ctx.fillStyle = "#ffab00";
        ctx.fillRect(x - 3, -28, 6, 5);
      }
      break;
    }
    case "planter": {
      softShadow(ctx, 4, 2, 24, 6, 0.3);
      clump(ctx, -6, -28, 12, () => 0.4, TONES.hedge);
      clump(ctx, 8, -26, 11, () => 0.6, TONES.hedge);
      ctx.fillStyle = variant % 2 ? "#ffd23f" : "#ffffff";
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.arc(-14 + i * 7, -32 + (i % 2) * 5, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.rect(-22, -18, 44, 18);
      shade(ctx, -22, -18, 22, 0, "#eef1f4", "#c4c9cf", "#8a939e");
      outline(ctx, "#c4c9cf");
      break;
    }
    case "vending": {
      const body = VENDING[variant % VENDING.length];
      softShadow(ctx, 6, 2, 24, 6, 0.35);
      ctx.beginPath();
      ctx.roundRect(-20, -62, 40, 62, 3);
      shade(ctx, -20, -62, 20, 0, lighten(body, 0.3), body, darken(body, 0.25));
      outline(ctx, body);
      ctx.beginPath();
      ctx.rect(-15, -56, 30, 30);
      shade(ctx, -15, -56, 15, -26, "#ffffff", "#e3f4ff", "#a8d8f2");
      const cans = ["#e53935", "#ffd23f", "#2979ff", "#00c853", "#ff6d00"];
      for (let row = 0; row < 3; row++)
        for (let k = 0; k < 4; k++) {
          ctx.fillStyle = cans[(row + k) % cans.length];
          ctx.fillRect(-13 + k * 7, -53 + row * 9, 5, 7);
        }
      ctx.fillStyle = "#1d232b";
      ctx.fillRect(-12, -18, 24, 8);
      ctx.fillStyle = "#3df0ff";
      ctx.fillRect(8, -24, 4, 3);
      break;
    }
  }
}

/** Power pole with a crossarm; wires are strung between poles at runtime. */
export const POLE_BOX: SpriteBox = { w: 70, h: 150, ax: 35, ay: 140 };
export const POLE_ARMS: [number, number][] = [[-22, -124], [22, -124]];

export function paintPole(ctx: Ctx, transformer: boolean) {
  softShadow(ctx, 12, 2, 12, 4, 0.35);
  ctx.beginPath();
  ctx.moveTo(-4, 0);
  ctx.lineTo(-3, -132);
  ctx.lineTo(3, -132);
  ctx.lineTo(4, 0);
  ctx.closePath();
  shade(ctx, -4, 0, 4, 0, "#c9ced4", "#9aa1a9", "#646b74");
  ctx.beginPath();
  ctx.rect(-26, -126, 52, 5);
  shade(ctx, 0, -126, 0, -121, "#9aa1a9", "#6f7680", "#4a5058");
  ctx.fillStyle = "#e8f2ff";
  for (const [x, y] of POLE_ARMS) {
    ctx.beginPath();
    ctx.arc(x, y - 3, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }
  if (transformer) {
    ctx.beginPath();
    ctx.roundRect(5, -104, 16, 22, 3);
    shade(ctx, 5, -104, 21, -82, "#c9ced4", "#8f969e", "#5a6068");
    outline(ctx, "#8f969e", 1);
  }
}

// ---------------------------------------------------------------------------
// Gates + decor
// ---------------------------------------------------------------------------

export function gateBox(): SpriteBox {
  return { w: 340, h: 250, ax: 170, ay: 226 };
}

export function paintGate(ctx: Ctx, d: District) {
  for (const x of [-122, 122]) {
    softShadow(ctx, x + 8, 2, 26, 8, 0.35);
    ctx.beginPath();
    ctx.rect(x - 11, -180, 22, 180);
    shade(ctx, x - 11, 0, x + 11, 0, "#5a6676", "#38424f", "#232a33");
    outline(ctx, "#38424f");
    ctx.fillStyle = lighten(d.color, 0.45);
    ctx.fillRect(x - 2, -170, 4, 160);
  }
  ctx.beginPath();
  ctx.rect(-150, -206, 300, 30);
  shade(ctx, -150, -206, 150, -176, "#5a6676", "#38424f", "#232a33");
  outline(ctx, "#38424f");
  ctx.fillStyle = d.color;
  ctx.fillRect(-150, -180, 300, 4);
  board(ctx, 0, -191, d.name.toUpperCase(), d.color, 22);
}

export const GATE_LIGHTS = (d: District): Light[] => [
  [-122, -90, 60, lighten(d.color, 0.4)],
  [122, -90, 60, lighten(d.color, 0.4)],
  [0, -191, 120, d.color],
];

export const DECOR_BOX = {
  fountain: { w: 210, h: 180, ax: 105, ay: 86 },
  campfire: { w: 320, h: 110, ax: 160, ay: 70 },
  signpost: { w: 360, h: 240, ax: 180, ay: 226 },
} satisfies Record<string, SpriteBox>;

export const DECOR_LIGHTS: Record<keyof typeof DECOR_BOX, Light[]> = {
  fountain: [[0, -4, 110, "#7fe0ff"], [0, -70, 40, "#bff4ff"]],
  campfire: [[0, -16, 150, "#ffa040"]],
  signpost: [[0, -200, 50, "#ffe2a8"]],
};

export function paintFountain(ctx: Ctx) {
  softShadow(ctx, 8, 8, 100, 32, 0.3);
  ctx.beginPath();
  ctx.ellipse(0, 0, 92, 40, 0, 0, Math.PI * 2);
  shade(ctx, -92, -40, 92, 40, "#ffffff", "#d3d9e0", "#9aa3ad");
  outline(ctx, "#d3d9e0");
  ctx.beginPath();
  ctx.ellipse(0, -4, 78, 30, 0, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(-10, -10, 4, 0, -4, 80);
  g.addColorStop(0, C.waterLight);
  g.addColorStop(0.6, C.water);
  g.addColorStop(1, C.waterDeep);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(-9, -64, 18, 62, 4);
  shade(ctx, -9, 0, 9, 0, "#ffffff", "#d3d9e0", "#9aa3ad");
  ctx.beginPath();
  ctx.ellipse(0, -66, 32, 10, 0, 0, Math.PI * 2);
  shade(ctx, -32, -76, 32, -56, "#ffffff", "#dde2e8", "#a7b0ba");
  outline(ctx, "#dde2e8");
  ctx.beginPath();
  ctx.ellipse(0, -68, 24, 6, 0, 0, Math.PI * 2);
  ctx.fillStyle = C.waterLight;
  ctx.fill();
}

export function paintCampfire(ctx: Ctx, r: Rand) {
  softShadow(ctx, 4, 4, 130, 20, 0.22);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    blobPath(ctx, Math.cos(a) * 30, -4 + Math.sin(a) * 13, 7, 5, r, 0.2);
    shade(ctx, -6, -6, 6, 6, "#eef0f2", "#a9b0b8", "#6a727c");
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
  for (const x of [-108, 108]) {
    softShadow(ctx, x + 4, 6, 44, 9, 0.3);
    ctx.beginPath();
    ctx.roundRect(x - 40, -20, 80, 14, 4);
    shade(ctx, x - 40, -20, x + 40, -6, "#d9a066", C.wood, C.woodDark);
    outline(ctx, C.wood);
    ctx.fillStyle = "#4a525c";
    ctx.fillRect(x - 34, -6, 6, 10);
    ctx.fillRect(x + 28, -6, 6, 10);
  }
}

export function paintSignpost(ctx: Ctx, districtsList: District[]) {
  softShadow(ctx, 6, 2, 20, 6, 0.35);
  ctx.beginPath();
  ctx.rect(-5, -206, 10, 206);
  shade(ctx, -5, 0, 5, 0, "#d3d9e0", "#9aa3ad", "#5f6873");
  board(ctx, 0, -200, "WELCOME", "#3df0ff", 20);
  const arrows: [string, number, number, string][] = [
    ["projects", -160, 1, "↑"],
    ["connections", -124, 1, "→"],
    ["home", -88, -1, "←"],
    ["playground", -52, -1, "↓"],
  ];
  for (const [id, y, dir, arrow] of arrows) {
    const d = districtsList.find((x) => x.id === id)!;
    const label = `${d.name.toUpperCase()} ${arrow}`;
    ctx.font = displayFont(16, 700);
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
    outline(ctx, d.color);
    text(ctx, label, x0 + w / 2 + (dir > 0 ? -4 : 4), y + 1, 16, "#ffffff");
  }
}

// ---------------------------------------------------------------------------
// Building helpers
// ---------------------------------------------------------------------------

function wall(ctx: Ctx, x0: number, y0: number, w: number, h: number, base: string) {
  ctx.beginPath();
  ctx.rect(x0, y0, w, h);
  shade(ctx, x0, y0, x0 + w * 0.7, y0 + h, lighten(base, 0.25), base, darken(base, 0.1));
  outline(ctx, base);
  ctx.fillStyle = "rgba(15, 25, 45, 0.18)";
  ctx.fillRect(x0, y0 + h - 7, w, 7);
}

function sideWall(ctx: Ctx, x1: number, y0: number, h: number, depth: number, base: string) {
  polyPath(ctx, [[x1, y0], [x1 + depth, y0 - depth * 0.45], [x1 + depth, y0 + h - depth * 0.45], [x1, y0 + h]]);
  ctx.fillStyle = darken(base, 0.3);
  ctx.fill();
  outline(ctx, base);
}

function flatRoof(ctx: Ctx, x0: number, x1: number, y: number, depth: number, color: string) {
  polyPath(ctx, [[x0 - 4, y], [x0 - 4 + depth, y - depth * 0.45], [x1 + 4 + depth, y - depth * 0.45], [x1 + 4, y]]);
  shade(ctx, x0, y - depth, x1, y, lighten(color, 0.2), color, darken(color, 0.2));
  outline(ctx, color);
  ctx.fillStyle = darken(color, 0.3);
  ctx.fillRect(x0 - 4, y - 2, x1 - x0 + 8, 6);
}

function gableRoof(ctx: Ctx, x0: number, x1: number, eaveY: number, h: number, depth: number, color: string) {
  const w = x1 - x0;
  const ridgeL = x0 + w * 0.16;
  const ridgeR = x1 - w * 0.16;
  polyPath(ctx, [[x1 + 12, eaveY], [ridgeR, eaveY - h], [ridgeR + depth, eaveY - h - depth * 0.45], [x1 + 12 + depth, eaveY - depth * 0.45]]);
  ctx.fillStyle = darken(color, 0.35);
  ctx.fill();
  outline(ctx, color);
  const front: Pt[] = [[x0 - 12, eaveY], [ridgeL, eaveY - h], [ridgeR, eaveY - h], [x1 + 12, eaveY]];
  polyPath(ctx, front);
  shade(ctx, x0, eaveY - h, x0 + w * 0.6, eaveY + 6, lighten(color, 0.3), color, darken(color, 0.18));
  outline(ctx, color);
  ctx.save();
  polyPath(ctx, front);
  ctx.clip();
  ctx.strokeStyle = rgba("#0d1b2a", 0.22);
  ctx.lineWidth = 1.4;
  for (let y = eaveY - 8; y > eaveY - h; y -= 10) {
    ctx.beginPath();
    ctx.moveTo(x0 - 12, y);
    ctx.lineTo(x1 + 12, y);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(ridgeL, eaveY - h);
  ctx.lineTo(ridgeR, eaveY - h);
  ctx.stroke();
}

function glass(ctx: Ctx, x: number, y: number, w: number, h: number, frame = "#2f3a48") {
  ctx.fillStyle = frame;
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  shade(ctx, x, y, x + w, y + h, "#e0f8ff", "#74c6ec", "#2f7fb5");
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + 3, y + h * 0.5);
  ctx.lineTo(x + w * 0.4, y + 3);
  ctx.stroke();
}

function door(ctx: Ctx, x: number, y: number, w: number, h: number, color: string) {
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  shade(ctx, x, y, x + w, y + h, lighten(color, 0.25), color, darken(color, 0.3));
  outline(ctx, color);
  ctx.fillStyle = "#ffd23f";
  ctx.fillRect(x + w - 7, y + h * 0.55, 3, 6);
}

function grassFoot(ctx: Ctx, x0: number, x1: number, r: Rand) {
  ctx.lineCap = "round";
  for (let i = 0; i < (x1 - x0) / 7; i++) {
    const x = range(r, x0, x1);
    ctx.strokeStyle = r() < 0.5 ? C.grassDark : "#7ed36a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 2);
    ctx.quadraticCurveTo(x + range(r, -3, 3), -5, x + range(r, -4, 4), range(r, -11, -6));
    ctx.stroke();
  }
}

function nameplate(ctx: Ctx, p: Place, y = 44, size = 22) {
  board(ctx, 0, y, p.title.toUpperCase(), p.color, size);
}

// ---------------------------------------------------------------------------
// Buildings
// ---------------------------------------------------------------------------

type Painter = (ctx: Ctx, r: Rand, p: Place) => void;

const watchtower: Painter = (ctx, r, p) => {
  softShadow(ctx, 30, 6, 120, 28, 0.35);
  ctx.beginPath();
  ctx.rect(-78, -30, 156, 30);
  shade(ctx, -78, -30, 78, 0, "#eef1f4", "#c4cad2", "#8a939e");
  outline(ctx, "#c4cad2");
  // Lattice tower.
  const bands = 6;
  const top = -300;
  for (let i = 0; i < bands; i++) {
    const y0 = -30 + ((top + 30) * i) / bands;
    const y1 = -30 + ((top + 30) * (i + 1)) / bands;
    const w0 = 44 - (20 * i) / bands;
    const w1 = 44 - (20 * (i + 1)) / bands;
    polyPath(ctx, [[-w0, y0], [w0, y0], [w1, y1], [-w1, y1]]);
    const c = i % 2 === 0 ? p.color : "#ffffff";
    shade(ctx, -w0, 0, w0, 0, lighten(c, 0.3), c, darken(c, 0.3));
    outline(ctx, c);
    ctx.strokeStyle = rgba("#1d232b", 0.35);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-w0, y0);
    ctx.lineTo(w1, y1);
    ctx.moveTo(w0, y0);
    ctx.lineTo(-w1, y1);
    ctx.stroke();
  }
  // Control cabin.
  ctx.beginPath();
  ctx.moveTo(-50, top);
  ctx.lineTo(50, top);
  ctx.lineTo(42, top - 40);
  ctx.lineTo(-42, top - 40);
  ctx.closePath();
  shade(ctx, -50, top - 40, 50, top, "#e0f8ff", "#74c6ec", "#2f7fb5");
  outline(ctx, "#74c6ec");
  ctx.strokeStyle = "#2f3a48";
  ctx.lineWidth = 2;
  for (const x of [-26, 0, 26]) {
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x * 0.85, top - 40);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.rect(-54, top - 50, 108, 10);
  shade(ctx, -54, top - 50, 54, top - 40, "#5a6676", "#38424f", "#232a33");
  // Mast.
  ctx.fillStyle = "#9aa3ad";
  ctx.fillRect(-2, top - 104, 4, 56);
  grassFoot(ctx, -100, 100, r);
  nameplate(ctx, p);
};

const factory: Painter = (ctx, r, p) => {
  softShadow(ctx, 20, 6, 200, 32, 0.32);
  const panel = "#e3e7ec";
  wall(ctx, -170, -150, 250, 150, panel);
  sideWall(ctx, 80, -150, 150, 30, panel);
  ctx.fillStyle = p.color;
  ctx.fillRect(-170, -60, 250, 8);
  ctx.strokeStyle = rgba("#1d232b", 0.15);
  ctx.lineWidth = 1;
  for (let x = -160; x < 80; x += 20) {
    ctx.beginPath();
    ctx.moveTo(x, -146);
    ctx.lineTo(x, -4);
    ctx.stroke();
  }
  const tw = 250 / 3;
  for (let i = 0; i < 3; i++) {
    const x = -170 + i * tw;
    polyPath(ctx, [[x, -150], [x, -200], [x + tw, -150]]);
    shade(ctx, x, -200, x + tw, -150, "#8a96a3", "#5f6b78", "#3e4852");
    outline(ctx, "#5f6b78");
    polyPath(ctx, [[x + 4, -154], [x + 4, -192], [x + 26, -178], [x + 26, -154]]);
    shade(ctx, x, -190, x + 26, -154, "#e0f8ff", "#74c6ec", "#2f7fb5");
  }
  ctx.beginPath();
  ctx.rect(36, -270, 30, 120);
  shade(ctx, 36, 0, 66, 0, "#eef1f4", "#c4cad2", "#8a939e");
  outline(ctx, "#c4cad2");
  ctx.fillStyle = p.color;
  ctx.fillRect(36, -262, 30, 8);
  ctx.fillRect(36, -246, 30, 8);
  for (let i = 0; i < 3; i++) glass(ctx, -156 + i * 48, -126, 30, 30);
  ctx.beginPath();
  ctx.rect(-12, -86, 80, 86);
  shade(ctx, -12, -86, 68, 0, "#a3adb8", "#727d89", "#4a535d");
  outline(ctx, "#727d89");
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  for (let y = -80; y < 0; y += 8) {
    ctx.beginPath();
    ctx.moveTo(-12, y);
    ctx.lineTo(68, y);
    ctx.stroke();
  }
  ctx.fillStyle = "#38424f";
  ctx.beginPath();
  ctx.moveTo(140, 0);
  ctx.lineTo(160, -110);
  ctx.lineTo(180, 0);
  ctx.closePath();
  ctx.fill();
  board(ctx, -100, -172, "M14 ≠ M24", p.color, 15);
  grassFoot(ctx, -180, 190, r);
  nameplate(ctx, p);
};

const garage: Painter = (ctx, r, p) => {
  softShadow(ctx, 20, 6, 160, 26, 0.32);
  const body = "#6f8796";
  wall(ctx, -130, -150, 260, 150, body);
  ctx.strokeStyle = rgba("#0f1f2a", 0.25);
  ctx.lineWidth = 1.2;
  for (let x = -124; x < 130; x += 10) {
    ctx.beginPath();
    ctx.moveTo(x, -146);
    ctx.lineTo(x, -2);
    ctx.stroke();
  }
  sideWall(ctx, 130, -150, 150, 24, body);
  flatRoof(ctx, -130, 130, -150, 24, "#4a5560");
  // Half-open roller door showing the workshop inside.
  ctx.beginPath();
  ctx.rect(-80, -112, 160, 112);
  ctx.fillStyle = "#1b222a";
  ctx.fill();
  ctx.beginPath();
  ctx.rect(-80, -112, 160, 48);
  shade(ctx, -80, -112, 80, -64, "#c4ccd4", "#949eaa", "#66707b");
  outline(ctx, "#949eaa");
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  for (let y = -106; y < -64; y += 7) {
    ctx.beginPath();
    ctx.moveTo(-80, y);
    ctx.lineTo(80, y);
    ctx.stroke();
  }
  const notes = ["#ffd23f", "#8fe0ff", "#9be27a", "#ffab70", "#e0e0e0", "#fff176"];
  notes.forEach((c, i) => {
    const x = -66 + (i % 3) * 44;
    const y = -56 + Math.floor(i / 3) * 24;
    ctx.fillStyle = c;
    ctx.fillRect(x, y, 30, 18);
  });
  ctx.fillStyle = "#ff6d00";
  ctx.fillRect(56, -40, 14, 40);
  board(ctx, 0, -132, "WORKSHOP", "#3df0ff", 17);
  ctx.beginPath();
  ctx.arc(152, -22, 20, 0, Math.PI * 2);
  ctx.fillStyle = "#232a33";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(152, -22, 9, 0, Math.PI * 2);
  ctx.fillStyle = "#9aa3ad";
  ctx.fill();
  grassFoot(ctx, -140, 150, r);
  nameplate(ctx, p);
};

const library: Painter = (ctx, r, p) => {
  softShadow(ctx, 20, 6, 200, 30, 0.32);
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.rect(-170 + i * 10, -8 * (i + 1), 340 - i * 20, 8);
    shade(ctx, 0, -8 * (i + 1), 0, -8 * i, "#ffffff", "#dfe3e8", "#aab2bc");
  }
  wall(ctx, -150, -190, 300, 166, "#eef1f4");
  sideWall(ctx, 150, -190, 166, 26, "#eef1f4");
  // Glass curtain wall.
  for (let col = 0; col < 6; col++)
    for (let row = 0; row < 3; row++) glass(ctx, -134 + col * 46, -176 + row * 48, 38, 40);
  ctx.beginPath();
  ctx.rect(-166, -214, 332, 26);
  shade(ctx, -166, -214, 166, -188, "#ffffff", "#dfe3e8", "#aab2bc");
  outline(ctx, "#dfe3e8");
  text(ctx, "I N D E X", 0, -200, 15, darken(p.color, 0.2));
  ctx.beginPath();
  ctx.rect(-84, -256, 168, 44);
  shade(ctx, -84, -256, 84, -212, "#ffffff", "#dfe3e8", "#aab2bc");
  outline(ctx, "#dfe3e8");
  // Observatory dome with an open slit.
  ctx.beginPath();
  ctx.ellipse(0, -254, 80, 70, 0, Math.PI, 0);
  ctx.closePath();
  shade(ctx, -80, -324, 80, -254, "#ffffff", "#e3e7ec", "#a9b2bc");
  outline(ctx, "#e3e7ec");
  ctx.beginPath();
  ctx.moveTo(-10, -322);
  ctx.lineTo(10, -322);
  ctx.lineTo(14, -256);
  ctx.lineTo(-14, -256);
  ctx.closePath();
  ctx.fillStyle = darken(p.color, 0.3);
  ctx.fill();
  door(ctx, -20, -70, 40, 62, p.color);
  const books = ["#2979ff", "#8fe0ff", "#1446b8", "#ffab00", "#ff3b30"];
  books.forEach((c, i) => {
    const w = range(r, 52, 66);
    const x = 190 - w / 2 + range(r, -5, 5);
    ctx.beginPath();
    ctx.rect(x, -14 - i * 13, w, 12);
    shade(ctx, x, 0, x + w, 0, lighten(c, 0.3), c, darken(c, 0.3));
    outline(ctx, c, 1);
  });
  grassFoot(ctx, -190, 190, r);
  nameplate(ctx, p);
};

const lodge: Painter = (ctx, r, p) => {
  // Snow-capped anime mountains behind.
  for (const [cx, h, w, c] of [[-90, 280, 180, "#4f6fa8"], [110, 320, 200, "#3a5690"]] as const) {
    ctx.beginPath();
    ctx.moveTo(cx - w, -60);
    ctx.lineTo(cx, -h);
    ctx.lineTo(cx + w, -60);
    ctx.closePath();
    shade(ctx, cx - w, -h, cx + w, -60, lighten(c, 0.3), c, darken(c, 0.25));
    ctx.beginPath();
    ctx.moveTo(cx, -h);
    ctx.lineTo(cx - w * 0.28, -h + h * 0.24);
    ctx.lineTo(cx - w * 0.1, -h + h * 0.2);
    ctx.lineTo(cx + w * 0.05, -h + h * 0.27);
    ctx.lineTo(cx + w * 0.28, -h + h * 0.22);
    ctx.closePath();
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    const mist = ctx.createLinearGradient(0, -170, 0, -60);
    mist.addColorStop(0, "rgba(235,248,255,0)");
    mist.addColorStop(1, "rgba(235,248,255,0.9)");
    ctx.beginPath();
    ctx.moveTo(cx - w, -60);
    ctx.lineTo(cx, -h);
    ctx.lineTo(cx + w, -60);
    ctx.closePath();
    ctx.fillStyle = mist;
    ctx.fill();
  }
  softShadow(ctx, 20, 6, 180, 28, 0.32);
  const logs = "#b67a46";
  ctx.beginPath();
  ctx.rect(-120, -110, 240, 110);
  shade(ctx, -120, -110, 120, 0, lighten(logs, 0.2), logs, darken(logs, 0.25));
  outline(ctx, logs);
  ctx.strokeStyle = rgba("#3a2410", 0.4);
  for (let y = -100; y < 0; y += 12) {
    ctx.beginPath();
    ctx.moveTo(-120, y);
    ctx.lineTo(120, y);
    ctx.stroke();
  }
  polyPath(ctx, [[-150, -96], [0, -250], [150, -96], [118, -96], [0, -214], [-118, -96]]);
  shade(ctx, -150, -250, 150, -96, lighten(p.color, 0.3), p.color, darken(p.color, 0.3));
  outline(ctx, p.color);
  polyPath(ctx, [[-118, -96], [0, -214], [118, -96]]);
  shade(ctx, -118, -214, 118, -96, lighten(logs, 0.15), logs, darken(logs, 0.2));
  polyPath(ctx, [[-60, -100], [0, -178], [60, -100]]);
  shade(ctx, -60, -178, 60, -100, "#e0f8ff", "#74c6ec", "#2f7fb5");
  outline(ctx, "#74c6ec");
  door(ctx, -18, -64, 36, 64, "#7a4a2c");
  glass(ctx, -96, -80, 28, 30, "#5a3a1e");
  glass(ctx, 68, -80, 28, 30, "#5a3a1e");
  ctx.beginPath();
  ctx.rect(-130, -6, 260, 8);
  shade(ctx, 0, -6, 0, 2, "#c99466", C.wood, C.woodDark);
  polyPath(ctx, [[-210, 10], [-176, -40], [-142, 10]]);
  shade(ctx, -210, -40, -142, 10, "#ffe08a", "#ffab00", "#b97f0e");
  outline(ctx, "#ffab00");
  for (const [x, s] of [[200, 0.75], [-250, 0.7]] as const) {
    ctx.save();
    ctx.translate(x, 10);
    ctx.scale(s, s);
    paintFoliage(ctx, "poplar", r);
    ctx.restore();
  }
  grassFoot(ctx, -200, 200, r);
  nameplate(ctx, p);
};

/** Two-storey anime house with a balcony. */
const animeHouse: Painter = (ctx, r, p) => {
  softShadow(ctx, 18, 6, 130, 22, 0.32);
  const wallC = "#fbf6ec";
  wall(ctx, -100, -200, 200, 200, wallC);
  sideWall(ctx, 100, -200, 200, 26, wallC);
  gableRoof(ctx, -100, 100, -200, 60, 26, "#2f5d8a");
  ctx.beginPath();
  ctx.rect(52, -262, 18, 34);
  shade(ctx, 52, 0, 70, 0, "#d3d9e0", "#9aa3ad", "#5f6873");
  // Balcony across the upper floor.
  glass(ctx, -80, -186, 46, 44);
  glass(ctx, 34, -186, 46, 44);
  ctx.fillStyle = "#4a525c";
  ctx.fillRect(-104, -136, 208, 5);
  for (let x = -100; x <= 100; x += 10) ctx.fillRect(x, -136, 2, 20);
  ctx.fillRect(-104, -118, 208, 3);
  for (const x of [-84, 64]) clump(ctx, x, -142, 9, () => 0.5, TONES.hedge);
  glass(ctx, -82, -88, 40, 40);
  door(ctx, 20, -76, 36, 76, p.color);
  ctx.beginPath();
  ctx.rect(14, -86, 48, 8);
  shade(ctx, 14, -86, 62, -78, lighten(p.color, 0.3), p.color, darken(p.color, 0.3));
  // Bicycle parked outside.
  ctx.strokeStyle = "#1d232b";
  ctx.lineWidth = 2;
  for (const x of [-150, -122]) {
    ctx.beginPath();
    ctx.arc(x, -10, 10, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = p.color;
  ctx.beginPath();
  ctx.moveTo(-150, -10);
  ctx.lineTo(-138, -24);
  ctx.lineTo(-122, -10);
  ctx.moveTo(-138, -24);
  ctx.lineTo(-128, -24);
  ctx.stroke();
  grassFoot(ctx, -110, 120, r);
  nameplate(ctx, p);
};

const spiritTree: Painter = (ctx, r, p) => {
  softShadow(ctx, 20, 4, 170, 36, 0.35);
  ctx.beginPath();
  ctx.moveTo(-46, 0);
  ctx.bezierCurveTo(-10, -50, -40, -110, -20, -175);
  ctx.lineTo(22, -175);
  ctx.bezierCurveTo(40, -110, 10, -50, 50, 0);
  ctx.quadraticCurveTo(0, -14, -46, 0);
  ctx.closePath();
  shade(ctx, -46, 0, 50, 0, "#6a5a7a", "#3f3550", "#241e30");
  outline(ctx, "#3f3550");
  const clumps: [number, number, number][] = [
    [0, -322, 60], [-92, -282, 54], [92, -286, 54], [-140, -214, 46], [140, -218, 46],
    [-60, -222, 56], [60, -226, 56], [0, -238, 58],
  ];
  for (const [x, y, s] of clumps) clump(ctx, x + range(r, -4, 4), y + range(r, -4, 4), s, r, TONES.spirit);
  // A small stone lantern and a swing.
  ctx.beginPath();
  ctx.rect(-130, -46, 22, 46);
  shade(ctx, -130, -46, -108, 0, "#eef0f2", "#a9b0b8", "#6a727c");
  ctx.beginPath();
  ctx.moveTo(-136, -46);
  ctx.lineTo(-119, -60);
  ctx.lineTo(-102, -46);
  ctx.closePath();
  ctx.fillStyle = "#6a727c";
  ctx.fill();
  ctx.strokeStyle = "#3f3550";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(70, -196);
  ctx.lineTo(66, -60);
  ctx.moveTo(100, -190);
  ctx.lineTo(104, -60);
  ctx.stroke();
  ctx.fillStyle = C.woodDark;
  ctx.fillRect(60, -62, 50, 7);
  grassFoot(ctx, -150, 150, r);
  nameplate(ctx, p);
};

/** Where the spirit tree's glowing orbs hang (the overlay pulses them). */
export const LANTERNS: [number, number, string][] = [
  [-110, -250, "#3df0ff"],
  [-40, -300, "#b8fff4"],
  [50, -310, "#3df0ff"],
  [120, -248, "#ffd27a"],
  [-20, -210, "#b8fff4"],
  [80, -200, "#3df0ff"],
];

/** Shopfront with a flat roof, fascia sign and a big lit window. */
const shop =
  (opts: { wallC: string; band: string; sign: string; extra?: (ctx: Ctx, r: Rand, p: Place) => void; awning?: string }): Painter =>
  (ctx, r, p) => {
    softShadow(ctx, 18, 6, 130, 22, 0.32);
    wall(ctx, -100, -140, 200, 140, opts.wallC);
    sideWall(ctx, 100, -140, 140, 26, opts.wallC);
    flatRoof(ctx, -100, 100, -140, 26, "#6f7a86");
    ctx.fillStyle = opts.band;
    ctx.fillRect(-100, -132, 200, 30);
    board(ctx, 0, -117, opts.sign, opts.band, 16);
    glass(ctx, -84, -92, 110, 74);
    door(ctx, 40, -86, 40, 86, darken(opts.band, 0.1));
    if (opts.awning) {
      for (let i = 0; i < 6; i++) {
        const x = -92 + i * 22;
        polyPath(ctx, [[x, -100], [x + 22, -100], [x + 24, -84], [x - 2, -84]]);
        const c = i % 2 ? "#ffffff" : opts.awning;
        shade(ctx, x, -100, x + 22, -84, lighten(c, 0.2), c, darken(c, 0.2));
      }
    }
    opts.extra?.(ctx, r, p);
    grassFoot(ctx, -110, 120, r);
    nameplate(ctx, p, 40, 20);
  };

const codeMart = shop({
  wallC: "#f4f6f8",
  band: "#00c853",
  sign: "CODE MART </>",
  extra: (ctx, r) => {
    // Contribution graph in the window.
    const greens = ["#c6e9cf", "#7bd88f", "#2fb35a", "#11712f"];
    for (let i = 0; i < 9; i++)
      for (let j = 0; j < 4; j++) {
        ctx.fillStyle = greens[Math.floor(r() * 4)];
        ctx.fillRect(-78 + i * 11, -84 + j * 11, 8, 8);
      }
  },
});

const officeTower: Painter = (ctx, r, p) => {
  softShadow(ctx, 18, 6, 130, 22, 0.32);
  ctx.beginPath();
  ctx.rect(-90, -226, 180, 226);
  shade(ctx, -90, -226, 90, 0, "#7ab8e6", "#3f86c4", "#1f4f80");
  outline(ctx, "#3f86c4");
  sideWall(ctx, 90, -226, 226, 26, "#3f86c4");
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1.5;
  for (let y = -214; y < -10; y += 18) {
    ctx.beginPath();
    ctx.moveTo(-90, y);
    ctx.lineTo(90, y);
    ctx.stroke();
  }
  for (let x = -60; x < 90; x += 30) {
    ctx.beginPath();
    ctx.moveTo(x, -226);
    ctx.lineTo(x, 0);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.moveTo(-90, -120);
  ctx.lineTo(-30, -226);
  ctx.lineTo(0, -226);
  ctx.lineTo(-90, -60);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.rect(-30, -60, 60, 60);
  shade(ctx, -30, -60, 30, 0, "#e0f8ff", "#74c6ec", "#2f7fb5");
  outline(ctx, "#74c6ec");
  board(ctx, 0, -240, "in", p.color, 20);
  grassFoot(ctx, -110, 120, r);
  nameplate(ctx, p, 40, 20);
};

const postOffice: Painter = (ctx, r, p) => {
  softShadow(ctx, 18, 6, 130, 22, 0.32);
  wall(ctx, -100, -120, 200, 120, "#fbf6ec");
  sideWall(ctx, 100, -120, 120, 26, "#fbf6ec");
  gableRoof(ctx, -100, 100, -120, 60, 26, p.color);
  glass(ctx, -82, -92, 34, 34);
  glass(ctx, 48, -92, 34, 34);
  door(ctx, -18, -70, 36, 70, darken(p.color, 0.1));
  board(ctx, 0, -104, "POST", p.color, 15);
  softShadow(ctx, 124, 2, 16, 5, 0.35);
  ctx.beginPath();
  ctx.roundRect(110, -48, 28, 48, [6, 6, 2, 2]);
  shade(ctx, 110, -48, 138, 0, lighten(p.color, 0.3), p.color, darken(p.color, 0.3));
  outline(ctx, p.color);
  ctx.fillStyle = "#1d232b";
  ctx.fillRect(116, -36, 16, 3);
  grassFoot(ctx, -110, 120, r);
  nameplate(ctx, p, 40, 20);
};

const printShop = shop({
  wallC: "#f4f1ea",
  band: "#ffc400",
  sign: "PRINT · CV",
  awning: "#ffc400",
  extra: (ctx, r) => {
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.translate(-66 + i * 26, -52);
      ctx.rotate(range(r, -0.2, 0.2));
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-9, -12, 18, 24);
      ctx.fillStyle = "#90a4ae";
      for (let l = 0; l < 4; l++) ctx.fillRect(-6, -8 + l * 5, 12 - (l % 2) * 4, 1.5);
      ctx.restore();
    }
  },
});

const painters: Record<string, Painter> = {
  shadowpath: watchtower,
  "industrial-product-search": factory,
  workshop: garage,
  "website-content-search": library,
  "trek-saathi": lodge,
  about: animeHouse,
  skills: spiritTree,
  github: codeMart,
  linkedin: officeTower,
  email: postOffice,
  resume: printShop,
};

export function paintPlace(ctx: Ctx, r: Rand, p: Place) {
  painters[p.id]?.(ctx, r, p);
}

/** Lit windows, neon and screens per building, for the night pass. */
export const PLACE_LIGHTS: Record<string, Light[]> = {
  shadowpath: [[0, -320, 80, "#8fe0ff"], [0, 44, 60, "#ff6b6b"]],
  "industrial-product-search": [[-141, -111, 40, "#ffd27a"], [-93, -111, 40, "#ffd27a"], [-45, -111, 40, "#ffd27a"], [-100, -172, 50, "#ffab00"]],
  workshop: [[0, -60, 110, "#ffd9a0"], [0, -132, 70, "#3df0ff"]],
  "website-content-search": [[-90, -130, 80, "#ffe2a8"], [0, -130, 90, "#ffe2a8"], [90, -130, 80, "#ffe2a8"], [0, -290, 50, "#8fe0ff"]],
  "trek-saathi": [[0, -130, 100, "#ffd27a"], [-82, -65, 40, "#ffd27a"], [82, -65, 40, "#ffd27a"]],
  about: [[-57, -164, 50, "#ffd27a"], [57, -164, 50, "#ffd27a"], [-62, -68, 50, "#ffd27a"], [38, -40, 40, "#ffcf7a"]],
  skills: [],
  github: [[-29, -55, 90, "#c8ffd6"], [0, -117, 70, "#00e676"]],
  linkedin: [[-45, -150, 60, "#ffe2a8"], [30, -96, 60, "#ffe2a8"], [0, -30, 60, "#e0f6ff"], [0, -240, 50, "#5aa8ff"]],
  email: [[-65, -75, 40, "#ffd27a"], [65, -75, 40, "#ffd27a"], [0, -104, 50, "#ff8a80"]],
  resume: [[-29, -55, 90, "#fff2c0"], [0, -117, 70, "#ffd740"]],
};

// ---------------------------------------------------------------------------
// Moving things
// ---------------------------------------------------------------------------

export const CAR_BOX: SpriteBox = { w: 84, h: 60, ax: 42, ay: 30 };
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
  shade(ctx, -30, -16, 30, 16, "#ff9a6b", "#f2542d", "#a8321a");
  outline(ctx, "#f2542d");
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.ellipse(20, -6, 7, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1d232b";
  ctx.fillRect(18, -2, 10, 4);
  ctx.beginPath();
  ctx.moveTo(4, -13);
  ctx.lineTo(13, -11);
  ctx.lineTo(13, 11);
  ctx.lineTo(4, 13);
  ctx.closePath();
  shade(ctx, 4, -13, 13, 13, "#d6f2ff", "#5f93ab", "#2c5466");
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(6, -8);
  ctx.lineTo(10, -2);
  ctx.stroke();
  ctx.fillStyle = "#2a2f36";
  ctx.beginPath();
  ctx.roundRect(-14, -11, 12, 9, 3);
  ctx.roundRect(-14, 2, 12, 9, 3);
  ctx.fill();
  ctx.strokeStyle = "#1d232b";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-18, -15);
  ctx.lineTo(-18, 15);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(-32, 0, 5, 8, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#1d232b";
  ctx.fill();
  ctx.fillStyle = "#fff4c2";
  for (const y of [-10, 10]) {
    ctx.beginPath();
    ctx.arc(30, y, 2.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

export type BodyKind = "crate" | "cone" | "ball" | "brick" | "letter";

export const BODY_SIZE: Record<BodyKind, number> = { crate: 44, cone: 44, ball: 40, brick: 28, letter: 100 };

export function paintBody(ctx: Ctx, kind: BodyKind, char = "") {
  switch (kind) {
    case "crate": {
      ctx.beginPath();
      ctx.roundRect(-16, -16, 32, 32, 3);
      shade(ctx, -16, -16, 16, 16, "#e6bb85", "#c08f57", "#8a5f33");
      outline(ctx, "#c08f57");
      ctx.strokeStyle = "#6a4420";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(-13, -13, 26, 26);
      ctx.beginPath();
      ctx.moveTo(-13, -13);
      ctx.lineTo(13, 13);
      ctx.stroke();
      break;
    }
    case "cone": {
      ctx.beginPath();
      ctx.roundRect(-10, 10, 20, 6, 2);
      ctx.fillStyle = "#2a2f36";
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-8, 11);
      ctx.lineTo(0, -16);
      ctx.lineTo(8, 11);
      ctx.closePath();
      shade(ctx, -8, -16, 8, 11, "#ffb070", "#ff6d00", "#b34700");
      outline(ctx, "#ff6d00", 1);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(-5, 2);
      ctx.lineTo(-3, -4);
      ctx.lineTo(3, -4);
      ctx.lineTo(5, 2);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "ball": {
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      shade(ctx, -15, -15, 15, 15, "#ffb070", "#ff7a1a", "#b34700");
      outline(ctx, "#ff7a1a");
      ctx.strokeStyle = "#3a1a05";
      ctx.lineWidth = 1.5;
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
      ctx.roundRect(-12, -7, 24, 14, 2);
      shade(ctx, -12, -7, 12, 7, "#c3cad2", "#8f98a3", "#5f6873");
      outline(ctx, "#8f98a3", 1);
      ctx.fillStyle = "#ffab00";
      ctx.fillRect(-12, -2, 24, 3);
      break;
    }
    case "letter": {
      ctx.font = displayFont(84, 700);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // Anime title block letter: deep navy extrusion, cyan rim, ice-white face.
      for (let i = 9; i > 0; i--) {
        ctx.fillStyle = i > 7 ? "rgba(10, 20, 40, 0.3)" : LETTER_SIDE[i - 1];
        ctx.fillText(char, i * 0.6, i * 1.2 + 6);
      }
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#3df0ff";
      ctx.strokeText(char, 0, 6);
      const g = ctx.createLinearGradient(0, -34, 0, 40);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(0.5, "#e6f6ff");
      g.addColorStop(0.52, "#bfe6ff");
      g.addColorStop(1, "#8fc8f0");
      ctx.fillStyle = g;
      ctx.fillText(char, 0, 6);
      break;
    }
  }
}

const LETTER_SIDE = ["#2a3f7a", "#26396f", "#223364", "#1e2d5a", "#1a2750", "#162146", "#121b3c"];

// ---------------------------------------------------------------------------
// Train
// ---------------------------------------------------------------------------

export const TRAIN_BOX: SpriteBox = { w: 210, h: 90, ax: 105, ay: 74 };
export const TRAIN_CAR_LEN = 200;

/** Side view of a commuter train car; the engine has a sloped nose facing +x. */
export function paintTrainCar(ctx: Ctx, engine: boolean) {
  softShadow(ctx, 0, 4, 110, 12, 0.35);
  ctx.beginPath();
  if (engine) {
    ctx.moveTo(-96, -10);
    ctx.lineTo(-96, -64);
    ctx.lineTo(60, -64);
    ctx.quadraticCurveTo(96, -60, 100, -14);
    ctx.lineTo(100, -10);
  } else {
    ctx.roundRect(-96, -64, 192, 54, 6);
  }
  ctx.closePath();
  shade(ctx, -96, -64, 96, -10, "#ffffff", "#e9eef3", "#b5c0cb");
  outline(ctx, "#e9eef3");
  ctx.fillStyle = "#00bfa5";
  ctx.fillRect(-96, -26, engine ? 190 : 192, 6);
  ctx.fillStyle = "#ff6d00";
  ctx.fillRect(-96, -20, engine ? 192 : 192, 3);
  for (let i = 0; i < 6; i++) {
    const x = -86 + i * 28;
    if (engine && x > 50) continue;
    glass(ctx, x, -56, 20, 22, "#2f3a48");
  }
  if (engine) {
    ctx.beginPath();
    ctx.moveTo(66, -58);
    ctx.quadraticCurveTo(88, -54, 92, -34);
    ctx.lineTo(66, -34);
    ctx.closePath();
    shade(ctx, 66, -58, 92, -34, "#e0f8ff", "#74c6ec", "#2f7fb5");
    ctx.fillStyle = "#fff4c2";
    ctx.beginPath();
    ctx.arc(96, -18, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#2a2f36";
  for (const x of [-64, 64]) {
    ctx.beginPath();
    ctx.roundRect(x - 26, -12, 52, 10, 3);
    ctx.fill();
  }
}
