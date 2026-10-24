import type { District, Place } from "./places";
import {
  type Ctx,
  type Pt,
  type Rand,
  C,
  blobPath,
  clump,
  darken,
  displayFont,
  glow,
  lighten,
  polyPath,
  range,
  rgba,
  plank,
  shade,
  softShadow,
  text,
} from "./paint";

// Everything here paints into a cached sprite with the anchor (0, 0) at the
// middle of the object's ground line. Light comes from the upper left.

export interface SpriteBox {
  w: number;
  h: number;
  ax: number;
  ay: number;
}

// ---------------------------------------------------------------------------
// Nature
// ---------------------------------------------------------------------------

export type Foliage = "tree" | "tree2" | "maple" | "pine" | "bush" | "rock";

const TONES = {
  tree: ["#244c39", "#3f7a48", "#77ad55", "#c6e08e"],
  tree2: ["#33532e", "#5a8a3d", "#94bd5a", "#dbe9a0"],
  maple: ["#7a3418", "#c4561f", "#e8892f", "#ffd08a"],
  pine: ["#1d4639", "#2f6a4c", "#4f8f5a", "#a3cf7e"],
} as const;

export const FOLIAGE_BOX: Record<Foliage, SpriteBox> = {
  tree: { w: 120, h: 140, ax: 60, ay: 122 },
  tree2: { w: 120, h: 140, ax: 60, ay: 122 },
  maple: { w: 124, h: 140, ax: 62, ay: 122 },
  pine: { w: 90, h: 150, ax: 45, ay: 136 },
  bush: { w: 76, h: 56, ax: 38, ay: 44 },
  rock: { w: 64, h: 48, ax: 32, ay: 36 },
};

function trunk(ctx: Ctx, h: number, w: number) {
  ctx.beginPath();
  ctx.moveTo(-w, 0);
  ctx.quadraticCurveTo(-w * 0.5, -h * 0.5, -w * 0.45, -h);
  ctx.lineTo(w * 0.45, -h);
  ctx.quadraticCurveTo(w * 0.5, -h * 0.5, w, 0);
  ctx.closePath();
  shade(ctx, -w, 0, w, 0, "#a77b52", "#7a5436", "#4e3524");
}

export function paintFoliage(ctx: Ctx, kind: Foliage, r: Rand) {
  if (kind === "bush") {
    softShadow(ctx, 6, 2, 34, 10, 0.3);
    const t = r() < 0.5 ? TONES.tree : TONES.tree2;
    clump(ctx, -14, -14, 15, r, t);
    clump(ctx, 14, -14, 14, r, t);
    clump(ctx, 0, -22, 16, r, t);
    if (r() < 0.5) {
      const c = ["#ffe08a", "#fff6e0", "#ff9a3d", "#ffd34d"][Math.floor(r() * 4)];
      ctx.fillStyle = c;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.arc(range(r, -24, 24), range(r, -34, -8), 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return;
  }
  if (kind === "rock") {
    softShadow(ctx, 6, 2, 28, 9, 0.35);
    blobPath(ctx, 0, -12, 24, 15, r, 0.22);
    shade(ctx, -20, -26, 18, 2, "#e4e0d6", "#a9a597", "#6f6c63");
    ctx.fillStyle = rgba("#6b9a4a", 0.85);
    blobPath(ctx, -6, -22, 13, 6, r, 0.3);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    blobPath(ctx, -10, -18, 6, 3, r, 0.2);
    ctx.fill();
    return;
  }
  if (kind === "pine") {
    softShadow(ctx, 8, 2, 30, 10, 0.32);
    trunk(ctx, 22, 5);
    const [deep, mid, light, hi] = TONES.pine;
    for (let k = 0; k < 4; k++) {
      const w = 34 - k * 7;
      const yb = -14 - k * 24;
      const yt = yb - 44;
      const tier: Pt[] = [[-w, yb], [range(r, -3, 3), yt], [w, yb]];
      ctx.beginPath();
      ctx.moveTo(-w, yb);
      ctx.quadraticCurveTo(-w * 0.3, yb - 14, tier[1][0], yt);
      ctx.quadraticCurveTo(w * 0.3, yb - 14, w, yb);
      ctx.quadraticCurveTo(0, yb + 7, -w, yb);
      ctx.closePath();
      shade(ctx, -w, yt, w, yb, light, mid, deep);
      ctx.fillStyle = rgba(hi, 0.55);
      ctx.beginPath();
      ctx.ellipse(-w * 0.35, yb - 10, w * 0.22, 3, -0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  const tones = TONES[kind];
  softShadow(ctx, 10, 2, 40, 12, 0.32);
  trunk(ctx, 46, 6);
  // Two little branches into the canopy.
  ctx.strokeStyle = "#5e3f29";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-1, -30);
  ctx.quadraticCurveTo(-12, -40, -20, -48);
  ctx.moveTo(1, -36);
  ctx.quadraticCurveTo(10, -44, 18, -54);
  ctx.stroke();
  const clumps: [number, number, number][] = [
    [0, -86, 24],
    [-24, -72, 22],
    [24, -74, 22],
    [-12, -58, 21],
    [14, -56, 20],
  ];
  for (const [x, y, s] of clumps) clump(ctx, x + range(r, -3, 3), y + range(r, -3, 3), s * range(r, 0.92, 1.08), r, tones);
  if (kind === "maple") {
    ctx.fillStyle = "#ffcf6e";
    for (let i = 0; i < 10; i++) {
      ctx.beginPath();
      ctx.ellipse(range(r, -38, 38), range(r, -104, -44), 2.6, 1.6, range(r, 0, 3), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ---------------------------------------------------------------------------
// Props (breakable)
// ---------------------------------------------------------------------------

export type PropKind = "lamp" | "fence" | "pot" | "barrel";

export const PROP_BOX: Record<PropKind, SpriteBox> = {
  lamp: { w: 40, h: 96, ax: 20, ay: 88 },
  fence: { w: 60, h: 44, ax: 30, ay: 34 },
  pot: { w: 40, h: 46, ax: 20, ay: 36 },
  barrel: { w: 40, h: 50, ax: 20, ay: 40 },
};

export const PROP_DEBRIS: Record<PropKind, string[]> = {
  lamp: ["#2f4a46", "#ffd88a", "#3d5c57"],
  fence: ["#b07c50", "#8a5d3a", "#cf9d6c"],
  pot: ["#c8653f", "#e08657", "#6aa84f", "#ffd34d"],
  barrel: ["#9a6a40", "#6e4a2c", "#4a4a4a"],
};

export function paintProp(ctx: Ctx, kind: PropKind, r: Rand) {
  switch (kind) {
    case "lamp": {
      softShadow(ctx, 6, 2, 14, 5, 0.35);
      ctx.fillStyle = "#2c4441";
      ctx.fillRect(-6, -6, 12, 6);
      ctx.beginPath();
      ctx.rect(-2.5, -66, 5, 62);
      shade(ctx, -3, 0, 3, 0, "#557a74", "#34504c", "#1f3331");
      glow(ctx, 0, -74, 22, C.warmLight, 0.55);
      ctx.beginPath();
      ctx.moveTo(-9, -66);
      ctx.lineTo(9, -66);
      ctx.lineTo(7, -82);
      ctx.lineTo(-7, -82);
      ctx.closePath();
      shade(ctx, -8, -82, 8, -66, "#fff3c4", "#ffd88a", "#f0a94a");
      ctx.fillStyle = "#2c4441";
      ctx.beginPath();
      ctx.moveTo(-11, -82);
      ctx.lineTo(0, -90);
      ctx.lineTo(11, -82);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(-10, -67, 20, 2.5);
      break;
    }
    case "fence": {
      softShadow(ctx, 4, 2, 30, 5, 0.25);
      for (const y of [-22, -10]) {
        ctx.beginPath();
        ctx.rect(-27, y - 3, 54, 5);
        shade(ctx, 0, y - 3, 0, y + 2, "#d8a678", "#b07c50", "#80572f");
      }
      for (const x of [-22, 22]) {
        ctx.beginPath();
        ctx.moveTo(x - 4, 0);
        ctx.lineTo(x - 4, -26);
        ctx.lineTo(x, -31);
        ctx.lineTo(x + 4, -26);
        ctx.lineTo(x + 4, 0);
        ctx.closePath();
        shade(ctx, x - 4, 0, x + 4, 0, "#d8a678", "#a8744a", "#6e4a2c");
      }
      break;
    }
    case "pot": {
      softShadow(ctx, 4, 2, 15, 5, 0.3);
      const flower = ["#ffd34d", "#ff8a3d", "#fff6e0", "#e8552a", "#ffe08a"][Math.floor(r() * 5)];
      clump(ctx, 0, -26, 11, r, TONES.tree2);
      ctx.fillStyle = flower;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.arc(range(r, -10, 10), range(r, -36, -20), 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.moveTo(-12, -16);
      ctx.lineTo(12, -16);
      ctx.lineTo(9, 0);
      ctx.lineTo(-9, 0);
      ctx.closePath();
      shade(ctx, -12, -16, 12, 0, "#f0a27a", "#cf6a43", "#9a4426");
      ctx.fillStyle = "#e58a5f";
      ctx.fillRect(-14, -19, 28, 5);
      break;
    }
    case "barrel": {
      softShadow(ctx, 5, 2, 16, 5, 0.32);
      ctx.beginPath();
      ctx.ellipse(0, -18, 14, 18, 0, 0, Math.PI * 2);
      shade(ctx, -14, 0, 14, 0, "#c6915f", "#9a6a40", "#5e3d22");
      ctx.strokeStyle = "#3f3f44";
      ctx.lineWidth = 2.5;
      for (const y of [-30, -6]) {
        ctx.beginPath();
        ctx.ellipse(0, y, 13.5, 3, 0, 0, Math.PI);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.ellipse(0, -36, 11, 3.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = "#7a5233";
      ctx.fill();
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Decor + gates
// ---------------------------------------------------------------------------

export const GATE_BOX: SpriteBox = { w: 340, h: 240, ax: 170, ay: 206 };

export function paintGate(ctx: Ctx, d: District) {
  for (const x of [-122, 122]) {
    softShadow(ctx, x + 8, 2, 26, 8, 0.35);
    ctx.beginPath();
    ctx.roundRect(x - 13, -150, 26, 150, 3);
    shade(ctx, x - 13, 0, x + 13, 0, "#efe6d4", "#cfc3aa", "#94886f");
    ctx.beginPath();
    ctx.roundRect(x - 17, -14, 34, 14, 2);
    shade(ctx, x - 17, -14, x + 17, 0, "#e3d8c2", "#bfb197", "#857a62");
    glow(ctx, x, -160, 24, C.warmLight, 0.6);
    ctx.fillStyle = "#ffe7a6";
    ctx.beginPath();
    ctx.arc(x, -160, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  // Curved wooden beam.
  ctx.beginPath();
  ctx.moveTo(-150, -150);
  ctx.quadraticCurveTo(0, -196, 150, -150);
  ctx.lineTo(150, -136);
  ctx.quadraticCurveTo(0, -180, -150, -136);
  ctx.closePath();
  shade(ctx, 0, -196, 0, -136, "#c99466", C.wood, C.woodDark);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#5e3f29";
  for (const x of [-60, 60]) {
    ctx.beginPath();
    ctx.moveTo(x, -164);
    ctx.lineTo(x, -136);
    ctx.stroke();
  }
  plank(ctx, 0, -118, d.name, d.color, 30);
}

export const DECOR_BOX = {
  fountain: { w: 200, h: 170, ax: 100, ay: 80 },
  campfire: { w: 300, h: 110, ax: 150, ay: 70 },
  signpost: { w: 360, h: 210, ax: 180, ay: 196 },
} satisfies Record<string, SpriteBox>;

export function paintFountain(ctx: Ctx) {
  softShadow(ctx, 8, 8, 96, 30, 0.3);
  ctx.beginPath();
  ctx.ellipse(0, 0, 90, 38, 0, 0, Math.PI * 2);
  shade(ctx, -90, -38, 90, 38, "#f2ece0", "#cfc5b1", "#9b917d");
  ctx.beginPath();
  ctx.ellipse(0, -4, 76, 29, 0, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(-10, -10, 4, 0, -4, 80);
  g.addColorStop(0, C.waterLight);
  g.addColorStop(0.6, C.water);
  g.addColorStop(1, C.waterDeep);
  ctx.fillStyle = g;
  ctx.fill();
  // Pillar + top bowl.
  ctx.beginPath();
  ctx.roundRect(-9, -64, 18, 62, 4);
  shade(ctx, -9, 0, 9, 0, "#f2ece0", "#cfc5b1", "#9b917d");
  ctx.beginPath();
  ctx.ellipse(0, -66, 32, 10, 0, 0, Math.PI * 2);
  shade(ctx, -32, -76, 32, -56, "#f7f2e8", "#d8cfbd", "#a39983");
  ctx.beginPath();
  ctx.ellipse(0, -68, 24, 6, 0, 0, Math.PI * 2);
  ctx.fillStyle = C.waterLight;
  ctx.fill();
}

export function paintCampfire(ctx: Ctx, r: Rand) {
  softShadow(ctx, 4, 4, 120, 20, 0.22);
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
  for (const x of [-100, 100]) {
    softShadow(ctx, x + 4, 6, 40, 8, 0.3);
    ctx.beginPath();
    ctx.roundRect(x - 36, -16, 72, 14, 7);
    shade(ctx, x, -16, x, -2, "#c99466", C.wood, C.woodDark);
    ctx.fillStyle = C.woodDark;
    ctx.fillRect(x - 28, -3, 6, 9);
    ctx.fillRect(x + 22, -3, 6, 9);
  }
}

export function paintSignpost(ctx: Ctx, districtsList: District[]) {
  softShadow(ctx, 6, 2, 20, 6, 0.35);
  ctx.beginPath();
  ctx.rect(-6, -176, 12, 176);
  shade(ctx, -6, 0, 6, 0, "#c99466", C.wood, C.woodDark);
  const arrows: [string, number, number, string][] = [
    ["projects", -160, 1, "↑"],
    ["connections", -124, 1, "→"],
    ["home", -88, -1, "←"],
    ["playground", -52, -1, "↓"],
  ];
  for (const [id, y, dir, arrow] of arrows) {
    const d = districtsList.find((x) => x.id === id)!;
    const label = `${d.name} ${arrow}`;
    ctx.font = displayFont(19, 700);
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
    shade(ctx, 0, y - 13, 0, y + 13, lighten(d.color, 0.2), d.color, darken(d.color, 0.2));
    text(ctx, label, x0 + w / 2 + (dir > 0 ? -4 : 4), y + 1, 19, C.cream, { shadow: "rgba(0,0,0,0.25)" });
  }
}

// ---------------------------------------------------------------------------
// Building helpers
// ---------------------------------------------------------------------------

function wall(ctx: Ctx, x0: number, y0: number, w: number, h: number, base: string) {
  ctx.beginPath();
  ctx.rect(x0, y0, w, h);
  shade(ctx, x0, y0, x0 + w * 0.6, y0 + h, lighten(base, 0.18), base, darken(base, 0.12));
  // Contact shadow at the foot of the wall and under the eaves.
  let g = ctx.createLinearGradient(0, y0 + h - 16, 0, y0 + h);
  g.addColorStop(0, "rgba(30,40,40,0)");
  g.addColorStop(1, "rgba(30,40,40,0.28)");
  ctx.fillStyle = g;
  ctx.fillRect(x0, y0 + h - 16, w, 16);
  g = ctx.createLinearGradient(0, y0, 0, y0 + 18);
  g.addColorStop(0, "rgba(30,40,40,0.3)");
  g.addColorStop(1, "rgba(30,40,40,0)");
  ctx.fillStyle = g;
  ctx.fillRect(x0, y0, w, 18);
}

function sideWall(ctx: Ctx, x1: number, y0: number, h: number, depth: number, base: string) {
  polyPath(ctx, [[x1, y0], [x1 + depth, y0 - depth * 0.45], [x1 + depth, y0 + h - depth * 0.45], [x1, y0 + h]]);
  shade(ctx, x1, y0, x1 + depth, y0 + h, darken(base, 0.18), darken(base, 0.26), darken(base, 0.36));
}

/** Roof seen at a three-quarter angle: a front plane plus a darker side plane. */
function roof(ctx: Ctx, x0: number, x1: number, eaveY: number, h: number, depth: number, color: string, r: Rand, inset = 0.18) {
  const w = x1 - x0;
  const ridgeL = x0 + w * inset;
  const ridgeR = x1 - w * inset;
  const front: Pt[] = [[x0 - 12, eaveY], [ridgeL, eaveY - h], [ridgeR, eaveY - h], [x1 + 12, eaveY]];
  // Side plane going back.
  polyPath(ctx, [[x1 + 12, eaveY], [ridgeR, eaveY - h], [ridgeR + depth, eaveY - h - depth * 0.45], [x1 + 12 + depth, eaveY - depth * 0.45]]);
  shade(ctx, x1, eaveY - h, x1 + depth, eaveY, darken(color, 0.2), darken(color, 0.3), darken(color, 0.42));
  polyPath(ctx, front);
  shade(ctx, x0, eaveY - h, x0 + w * 0.4, eaveY + 6, lighten(color, 0.28), color, darken(color, 0.2));
  // Tile rows.
  ctx.save();
  polyPath(ctx, front);
  ctx.clip();
  ctx.strokeStyle = rgba("#1f2d33", 0.16);
  ctx.lineWidth = 1.4;
  for (let y = eaveY - 9; y > eaveY - h; y -= 10) {
    ctx.beginPath();
    ctx.moveTo(x0 - 12, y + range(r, -0.6, 0.6));
    ctx.lineTo(x1 + 12, y + range(r, -0.6, 0.6));
    ctx.stroke();
  }
  ctx.strokeStyle = rgba("#ffffff", 0.18);
  for (let i = 0; i < 18; i++) {
    const x = range(r, x0, x1);
    const y = range(r, eaveY - h, eaveY);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 8, y);
    ctx.stroke();
  }
  ctx.restore();
  // Rim light along the ridge, dark eave edge.
  ctx.strokeStyle = rgba("#fff6d8", 0.75);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ridgeL, eaveY - h);
  ctx.lineTo(ridgeR, eaveY - h);
  ctx.stroke();
  ctx.fillStyle = darken(color, 0.4);
  ctx.fillRect(x0 - 12, eaveY - 1, w + 24, 4);
}

function windowPane(ctx: Ctx, x: number, y: number, w: number, h: number, lit: boolean, r: Rand, arch = false) {
  ctx.fillStyle = C.cream;
  ctx.beginPath();
  if (arch) ctx.roundRect(x - 3, y - 3, w + 6, h + 6, [w / 2 + 3, w / 2 + 3, 2, 2]);
  else ctx.rect(x - 3, y - 3, w + 6, h + 6);
  ctx.fill();
  ctx.beginPath();
  if (arch) ctx.roundRect(x, y, w, h, [w / 2, w / 2, 0, 0]);
  else ctx.rect(x, y, w, h);
  if (lit) shade(ctx, x, y, x, y + h, "#fff2c2", "#ffd27a", "#f09a45");
  else shade(ctx, x, y, x + w, y + h, "#d4ecf5", "#8fbdd1", "#56829a");
  ctx.strokeStyle = C.cream;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y + (arch ? w / 3 : 0));
  ctx.lineTo(x + w / 2, y + h);
  ctx.moveTo(x, y + h * 0.55);
  ctx.lineTo(x + w, y + h * 0.55);
  ctx.stroke();
  // Reflection streak.
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.moveTo(x + 3, y + h * 0.4);
  ctx.lineTo(x + w * 0.35, y + 3);
  ctx.stroke();
  // Flower box.
  if (r() < 0.6) {
    ctx.fillStyle = C.woodDark;
    ctx.fillRect(x - 4, y + h + 3, w + 8, 6);
    const c = ["#ffd34d", "#ff8a3d", "#fff6e0", "#e8552a"][Math.floor(r() * 4)];
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i % 2 ? "#5b9150" : c;
      ctx.beginPath();
      ctx.arc(x - 2 + (i * (w + 4)) / 4, y + h + 2, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function door(ctx: Ctx, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = darken(color, 0.45);
  ctx.beginPath();
  ctx.roundRect(x - 3, y - 3, w + 6, h + 3, [w / 2 + 3, w / 2 + 3, 0, 0]);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, [w / 2, w / 2, 0, 0]);
  shade(ctx, x, y, x + w, y + h, lighten(color, 0.2), color, darken(color, 0.25));
  ctx.fillStyle = "#ffd88a";
  ctx.beginPath();
  ctx.arc(x + w * 0.78, y + h * 0.6, 2.2, 0, Math.PI * 2);
  ctx.fill();
}

function grassFoot(ctx: Ctx, x0: number, x1: number, r: Rand) {
  ctx.lineCap = "round";
  for (let i = 0; i < (x1 - x0) / 6; i++) {
    const x = range(r, x0, x1);
    ctx.strokeStyle = r() < 0.5 ? "#5b9150" : "#8cc265";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 2);
    ctx.quadraticCurveTo(x + range(r, -3, 3), -5, x + range(r, -4, 4), range(r, -12, -6));
    ctx.stroke();
  }
}

function signBoard(ctx: Ctx, x: number, y: number, label: string, color: string, size = 18) {
  ctx.font = displayFont(size, 700);
  const w = ctx.measureText(label).width + 20;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - size * 0.75, w, size * 1.5, 4);
  shade(ctx, x - w / 2, y - size, x + w / 2, y + size, lighten(color, 0.2), color, darken(color, 0.25));
  text(ctx, label, x, y + 1, size, C.cream);
}

// ---------------------------------------------------------------------------
// Buildings
// ---------------------------------------------------------------------------

type Painter = (ctx: Ctx, r: Rand, p: Place) => void;

const lighthouse: Painter = (ctx, r, p) => {
  softShadow(ctx, 30, 6, 130, 30, 0.35);
  // Rocky base.
  for (let i = 0; i < 7; i++) {
    const x = range(r, -110, 110);
    blobPath(ctx, x, range(r, -6, 8), range(r, 22, 34), range(r, 13, 18), r, 0.25);
    shade(ctx, x - 30, -20, x + 30, 16, "#e4e0d6", "#a9a597", "#6f6c63");
  }
  ctx.fillStyle = rgba("#6b9a4a", 0.9);
  blobPath(ctx, -40, -10, 30, 7, r, 0.3);
  ctx.fill();
  const bands = 6;
  const top = -290;
  for (let i = 0; i < bands; i++) {
    const y0 = (top * i) / bands;
    const y1 = (top * (i + 1)) / bands;
    const w0 = 50 - (18 * i) / bands;
    const w1 = 50 - (18 * (i + 1)) / bands;
    polyPath(ctx, [[-w0, y0], [w0, y0], [w1, y1], [-w1, y1]]);
    const c = i % 2 === 0 ? p.color : "#f7f1e6";
    shade(ctx, -w0, 0, w0, 0, lighten(c, 0.3), c, darken(c, 0.35));
  }
  door(ctx, -12, -40, 24, 40, "#5a3b28");
  windowPane(ctx, -7, -150, 14, 20, true, () => 0.9, true);
  // Gallery.
  ctx.beginPath();
  ctx.roundRect(-48, top - 10, 96, 12, 3);
  shade(ctx, -48, 0, 48, 0, "#557a74", "#34504c", "#1f3331");
  ctx.strokeStyle = "#2a403d";
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
  // Lamp room.
  glow(ctx, 0, top - 52, 70, C.warmLight, 0.55);
  ctx.beginPath();
  ctx.rect(-26, top - 72, 52, 44);
  shade(ctx, -26, top - 72, 26, top - 28, "#fff6d0", "#ffd88a", "#f0a94a");
  ctx.strokeStyle = "#2a403d";
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
  ctx.fillStyle = "#2a403d";
  ctx.beginPath();
  ctx.arc(0, top - 104, 5, 0, Math.PI * 2);
  ctx.fill();
  grassFoot(ctx, -110, 110, r);
  plank(ctx, 0, 44, p.title, p.color, 26);
};

const factory: Painter = (ctx, r, p) => {
  softShadow(ctx, 20, 6, 200, 32, 0.32);
  const brick = "#cf8a5c";
  wall(ctx, -170, -150, 250, 150, brick);
  sideWall(ctx, 80, -150, 150, 30, brick);
  // Brick texture.
  ctx.strokeStyle = rgba("#7a3f22", 0.22);
  ctx.lineWidth = 1;
  for (let y = -140; y < 0; y += 11) {
    ctx.beginPath();
    ctx.moveTo(-170, y);
    ctx.lineTo(80, y);
    ctx.stroke();
  }
  // Saw-tooth roof.
  const teeth = 3;
  const tw = 250 / teeth;
  for (let i = 0; i < teeth; i++) {
    const x = -170 + i * tw;
    polyPath(ctx, [[x, -150], [x, -200], [x + tw, -150]]);
    shade(ctx, x, -200, x + tw, -150, lighten(p.color, 0.25), p.color, darken(p.color, 0.25));
    polyPath(ctx, [[x + 4, -154], [x + 4, -192], [x + 26, -178], [x + 26, -154]]);
    shade(ctx, x, -190, x + 26, -154, "#d9f3ef", "#7fc7bd", "#3f8f86");
  }
  polyPath(ctx, [[80, -150], [80 + 30, -164], [80 + 30, -214], [80, -200]]);
  shade(ctx, 80, -200, 110, -150, darken(p.color, 0.25), darken(p.color, 0.35), darken(p.color, 0.45));
  // Chimney.
  ctx.beginPath();
  ctx.rect(36, -270, 30, 120);
  shade(ctx, 36, 0, 66, 0, lighten(brick, 0.2), brick, darken(brick, 0.3));
  ctx.fillStyle = darken(p.color, 0.1);
  ctx.fillRect(34, -262, 34, 9);
  // Windows + big door.
  for (let i = 0; i < 3; i++) windowPane(ctx, -156 + i * 48, -116, 30, 34, i === 1, r);
  ctx.beginPath();
  ctx.rect(-12, -86, 80, 86);
  shade(ctx, -12, -86, 68, 0, "#7a8c8a", "#5b6b69", "#3c4746");
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  for (let y = -80; y < 0; y += 8) {
    ctx.beginPath();
    ctx.moveTo(-12, y);
    ctx.lineTo(68, y);
    ctx.stroke();
  }
  // Gear stand (gear itself turns in the overlay) and a hanging spec sign.
  ctx.fillStyle = "#3c4746";
  ctx.beginPath();
  ctx.moveTo(140, 0);
  ctx.lineTo(160, -110);
  ctx.lineTo(180, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#3c4746";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-120, -150);
  ctx.lineTo(-120, -168);
  ctx.stroke();
  signBoard(ctx, -120, -54, "M14 ≠ M24", "#3f8f86", 16);
  grassFoot(ctx, -180, 190, r);
  plank(ctx, 0, 44, p.title, p.color, 26);
};

const workshopShed: Painter = (ctx, r, p) => {
  softShadow(ctx, 20, 6, 160, 26, 0.32);
  const boards = "#e2c9a2";
  wall(ctx, -130, -150, 260, 150, boards);
  ctx.strokeStyle = rgba("#7a5233", 0.25);
  ctx.lineWidth = 1.2;
  for (let x = -120; x < 130; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, -146);
    ctx.lineTo(x, -2);
    ctx.stroke();
  }
  sideWall(ctx, 130, -150, 150, 24, boards);
  roof(ctx, -130, 130, -150, 64, 24, p.color, r, 0.12);
  // Open front with a pinboard of sticky notes.
  ctx.beginPath();
  ctx.rect(-104, -128, 208, 96);
  shade(ctx, -104, -128, 104, -32, "#c8a06c", "#b08654", "#8a6238");
  const notes = ["#ffd166", "#9fc4e8", "#a7d9b5", "#ffb06b", "#d9d4c7", "#f2e08c"];
  notes.forEach((c, i) => {
    const x = -92 + (i % 3) * 66 + range(r, -3, 3);
    const y = -120 + Math.floor(i / 3) * 44 + range(r, -2, 2);
    ctx.save();
    ctx.translate(x + 26, y + 17);
    ctx.rotate(range(r, -0.1, 0.1));
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(-24, -14, 52, 34);
    ctx.fillStyle = c;
    ctx.fillRect(-26, -17, 52, 34);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(-18, -6, 30, 2);
    ctx.fillRect(-18, 1, 22, 2);
    ctx.fillStyle = "#c2213a";
    ctx.beginPath();
    ctx.arc(0, -13, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
  // Workbench.
  ctx.beginPath();
  ctx.rect(-120, -30, 240, 10);
  shade(ctx, 0, -30, 0, -20, "#c99466", C.wood, C.woodDark);
  ctx.fillStyle = C.woodDark;
  ctx.fillRect(-114, -20, 8, 20);
  ctx.fillRect(106, -20, 8, 20);
  grassFoot(ctx, -140, 150, r);
  plank(ctx, 0, 44, p.title, p.color, 26);
};

const library: Painter = (ctx, r, p) => {
  softShadow(ctx, 20, 6, 200, 30, 0.32);
  const stone = "#efe6d4";
  // Steps.
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.rect(-170 + i * 10, -8 * (i + 1), 340 - i * 20, 8);
    shade(ctx, 0, -8 * (i + 1), 0, -8 * i, "#f6f0e4", "#d8cfbd", "#b3a995");
  }
  wall(ctx, -150, -190, 300, 166, stone);
  sideWall(ctx, 150, -190, 166, 26, stone);
  // Drum + dome.
  ctx.beginPath();
  ctx.rect(-84, -256, 168, 44);
  shade(ctx, -84, -256, 84, -212, "#fbf6ec", "#e2d8c4", "#b8ad97");
  for (let x = -66; x <= 66; x += 22) {
    ctx.fillStyle = rgba("#3e8bff", 0.35);
    ctx.beginPath();
    ctx.roundRect(x - 5, -248, 10, 26, [5, 5, 0, 0]);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(0, -254, 92, 76, 0, Math.PI, 0);
  ctx.closePath();
  const dg = ctx.createRadialGradient(-30, -294, 6, 0, -254, 110);
  dg.addColorStop(0, lighten(p.color, 0.55));
  dg.addColorStop(0.5, p.color);
  dg.addColorStop(1, darken(p.color, 0.4));
  ctx.fillStyle = dg;
  ctx.fill();
  ctx.fillStyle = darken(p.color, 0.3);
  ctx.fillRect(-96, -258, 192, 8);
  ctx.fillStyle = "#ffd88a";
  ctx.beginPath();
  ctx.arc(0, -334, 6, 0, Math.PI * 2);
  ctx.fill();
  // Entablature + pediment.
  ctx.beginPath();
  ctx.rect(-166, -214, 332, 26);
  shade(ctx, -166, -214, 166, -188, "#fbf6ec", "#e2d8c4", "#b8ad97");
  text(ctx, "I N D E X", 0, -200, 16, darken(p.color, 0.3));
  for (let i = 0; i < 5; i++) {
    const cx = -120 + i * 60;
    ctx.beginPath();
    ctx.rect(cx - 12, -188, 24, 164);
    shade(ctx, cx - 12, 0, cx + 12, 0, "#ffffff", "#e8e0cf", "#a59a83");
  }
  door(ctx, -20, -86, 40, 62, p.color);
  // Book stack.
  const books = ["#3e8bff", "#8ec5ff", "#1d58b8", "#f0a020", "#a7c8ff"];
  books.forEach((c, i) => {
    const w = range(r, 52, 66);
    const x = 190 - w / 2 + range(r, -5, 5);
    ctx.beginPath();
    ctx.rect(x, -14 - i * 13, w, 12);
    shade(ctx, x, 0, x + w, 0, lighten(c, 0.25), c, darken(c, 0.3));
  });
  grassFoot(ctx, -190, 190, r);
  plank(ctx, 0, 44, p.title, p.color, 26);
};

const lodge: Painter = (ctx, r, p) => {
  // Misty peaks behind, fading into haze at their feet.
  const mist = ctx.createLinearGradient(0, -170, 0, -60);
  mist.addColorStop(0, "rgba(255,250,235,0)");
  mist.addColorStop(1, "rgba(255,250,235,0.9)");
  for (const [cx, h, w, t] of [[-90, 270, 170, 0.15], [100, 300, 190, 0.05]] as const) {
    ctx.beginPath();
    ctx.moveTo(cx - w, -60);
    ctx.quadraticCurveTo(cx - w * 0.35, -h * 0.6, cx, -h);
    ctx.quadraticCurveTo(cx + w * 0.4, -h * 0.55, cx + w, -60);
    ctx.closePath();
    shade(ctx, cx - w, -h, cx + w, -60, lighten("#6aa58c", 0.3 + t), "#5d9a85", "#3f7769");
    ctx.fillStyle = mist;
    ctx.fill();
  }
  softShadow(ctx, 20, 6, 180, 28, 0.32);
  // A-frame cabin.
  const logs = "#c8955f";
  ctx.beginPath();
  ctx.rect(-120, -110, 240, 110);
  shade(ctx, -120, -110, 120, 0, lighten(logs, 0.2), logs, darken(logs, 0.25));
  ctx.strokeStyle = rgba("#5e3f29", 0.4);
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
  shade(ctx, -60, -178, 60, -100, "#fff2c2", "#ffd27a", "#f09a45");
  ctx.strokeStyle = C.cream;
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
  // Porch.
  ctx.beginPath();
  ctx.rect(-130, -6, 260, 8);
  shade(ctx, 0, -6, 0, 2, "#c99466", C.wood, C.woodDark);
  // Tent and little pines.
  polyPath(ctx, [[-210, 10], [-176, -40], [-142, 10]]);
  shade(ctx, -210, -40, -142, 10, "#ffe08a", "#f0b429", "#b97f0e");
  for (const [x, s] of [[180, 1], [210, 0.8], [-230, 0.85]] as const) {
    ctx.save();
    ctx.translate(x, 8);
    ctx.scale(s, s);
    paintFoliage(ctx, "pine", r);
    ctx.restore();
  }
  grassFoot(ctx, -200, 200, r);
  plank(ctx, 0, 44, p.title, p.color, 26);
};

const house = (opts: { wallColor: string; extra?: (ctx: Ctx, r: Rand, p: Place) => void; signLabel?: string }): Painter => (ctx, r, p) => {
  softShadow(ctx, 18, 6, 130, 22, 0.32);
  wall(ctx, -100, -120, 200, 120, opts.wallColor);
  sideWall(ctx, 100, -120, 120, 26, opts.wallColor);
  roof(ctx, -100, 100, -120, 68, 26, p.color, r);
  windowPane(ctx, -82, -92, 30, 34, true, r);
  windowPane(ctx, 52, -92, 30, 34, r() < 0.5, r);
  door(ctx, -18, -66, 36, 66, darken(p.color, 0.1));
  if (opts.signLabel) signBoard(ctx, 0, -104, opts.signLabel, darken(p.color, 0.15), 17);
  opts.extra?.(ctx, r, p);
  grassFoot(ctx, -110, 120, r);
  plank(ctx, 0, 40, p.title, p.color, 24);
};

const postOffice = house({
  wallColor: "#f4ead7",
  signLabel: "POST",
  extra: (ctx) => {
    // Mailbox.
    ctx.fillStyle = "#3f3f44";
    ctx.fillRect(116, -36, 5, 36);
    ctx.beginPath();
    ctx.roundRect(104, -56, 30, 22, [11, 11, 2, 2]);
    shade(ctx, 104, -56, 134, -34, "#ff8a8d", "#e5484d", "#a82a2f");
    // Parcels.
    for (const [x, y, w] of [[-150, -22, 26], [-128, -22, 22], [-142, -40, 22]] as const) {
      ctx.beginPath();
      ctx.rect(x, y, w, y === -40 ? 18 : 22);
      shade(ctx, x, y, x + w, y + 22, "#e8c08a", "#c99a5e", "#9a6f3c");
    }
  },
});

const forge = house({
  wallColor: "#4a5058",
  extra: (ctx, r) => {
    // Terminal-green "</>" sign.
    glow(ctx, 0, -104, 46, "#4ade80", 0.45);
    text(ctx, "</>", 0, -104, 26, "#e7ffef", { shadow: "rgba(34,197,94,0.9)" });
    // Contribution graph banner.
    const greens = ["#1b3a2a", "#2f6a3f", "#3fa35a", "#69d07f"];
    for (let i = 0; i < 7; i++)
      for (let j = 0; j < 3; j++) {
        ctx.fillStyle = greens[Math.floor(r() * 4)];
        ctx.fillRect(-36 + i * 10.5, -32 + j * 10.5 - 10, 8, 8);
      }
  },
});

const guildHall = house({ wallColor: "#eef3f8", signLabel: "in" });

const kiosk: Painter = (ctx, r, p) => {
  softShadow(ctx, 14, 6, 120, 20, 0.32);
  ctx.beginPath();
  ctx.rect(-90, -64, 180, 64);
  shade(ctx, -90, -64, 90, 0, "#d8a678", C.wood, C.woodDark);
  // Striped awning.
  for (let i = 0; i < 8; i++) {
    const x = -110 + i * 27.5;
    polyPath(ctx, [[x, -150], [x + 27.5, -150], [x + 31, -112], [x - 3, -112]]);
    const c = i % 2 ? C.cream : p.color;
    shade(ctx, x, -150, x + 27, -112, lighten(c, 0.2), c, darken(c, 0.2));
  }
  ctx.fillStyle = C.woodDark;
  ctx.fillRect(-92, -112, 6, 50);
  ctx.fillRect(86, -112, 6, 50);
  // Scrolls on the counter.
  for (let i = 0; i < 5; i++) {
    const x = -70 + i * 32;
    ctx.save();
    ctx.translate(x, -72);
    ctx.rotate(range(r, -0.3, 0.3));
    ctx.beginPath();
    ctx.roundRect(-12, -5, 24, 10, 5);
    shade(ctx, 0, -5, 0, 5, "#fffaf0", "#efe2c4", "#c9b48a");
    ctx.restore();
  }
  signBoard(ctx, 0, -32, "CV · PDF", darken(p.color, 0.2), 16);
  grassFoot(ctx, -110, 110, r);
  plank(ctx, 0, 40, p.title, p.color, 24);
};

const cottage = house({
  wallColor: "#f7ecd6",
  extra: (ctx) => {
    // Chimney (smoke in overlay) + round attic window + garden.
    ctx.beginPath();
    ctx.rect(52, -214, 22, 46);
    shade(ctx, 52, 0, 74, 0, "#d9a07a", "#b9764f", "#8a4f2f");
    windowPane(ctx, -12, -170, 24, 24, true, () => 0.9, true);
    for (let i = 0; i < 9; i++) {
      const c = ["#ffd34d", "#ff8a3d", "#fff6e0", "#e8552a", "#ffe08a"][i % 5];
      ctx.fillStyle = "#5b9150";
      ctx.beginPath();
      ctx.arc(-160 + i * 8, -6 + (i % 2) * 4, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(-160 + i * 8, -10 + (i % 2) * 4, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  },
});

const skillTree: Painter = (ctx, r, p) => {
  softShadow(ctx, 20, 4, 160, 34, 0.35);
  // Thick trunk with roots.
  ctx.beginPath();
  ctx.moveTo(-40, 0);
  ctx.quadraticCurveTo(-18, -60, -22, -170);
  ctx.lineTo(22, -170);
  ctx.quadraticCurveTo(18, -60, 44, 0);
  ctx.quadraticCurveTo(0, -12, -40, 0);
  ctx.closePath();
  shade(ctx, -40, 0, 44, 0, "#b48a60", "#7a5436", "#46301f");
  const tones = ["#1f4d4a", "#2f6f6a", "#56a098", "#bfe6dc"] as const;
  const clumps: [number, number, number][] = [
    [0, -320, 60], [-90, -280, 54], [90, -284, 54], [-130, -210, 46], [130, -214, 46],
    [-60, -220, 56], [60, -224, 56], [0, -236, 58],
  ];
  for (const [x, y, s] of clumps) clump(ctx, x + range(r, -4, 4), y + range(r, -4, 4), s, r, tones);
  // Swing.
  ctx.strokeStyle = "#6e4a2c";
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
  plank(ctx, 0, 44, p.title, p.color, 26);
};

/** Where the skill tree's lanterns hang (overlay pulses them). */
export const LANTERNS: [number, number, string][] = [
  [-110, -250, "#ffb347"],
  [-40, -300, "#ffd34d"],
  [50, -310, "#7fe0d0"],
  [120, -248, "#ffb347"],
  [-20, -210, "#8ed8ff"],
  [80, -200, "#ffd34d"],
];

const painters: Record<string, Painter> = {
  shadowpath: lighthouse,
  "industrial-product-search": factory,
  workshop: workshopShed,
  "website-content-search": library,
  "trek-saathi": lodge,
  about: cottage,
  skills: skillTree,
  github: forge,
  linkedin: guildHall,
  email: postOffice,
  resume: kiosk,
};

export function paintPlace(ctx: Ctx, r: Rand, p: Place) {
  painters[p.id]?.(ctx, r, p);
}

// ---------------------------------------------------------------------------
// Moving things
// ---------------------------------------------------------------------------

export const CAR_BOX: SpriteBox = { w: 84, h: 60, ax: 42, ay: 30 };

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
  shade(ctx, -30, -16, 30, 16, "#ffb08f", "#f26b4a", "#b73c25");
  // Bonnet highlight.
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.ellipse(20, -6, 7, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  // Windscreen.
  ctx.beginPath();
  ctx.moveTo(4, -13);
  ctx.lineTo(13, -11);
  ctx.lineTo(13, 11);
  ctx.lineTo(4, 13);
  ctx.closePath();
  shade(ctx, 4, -13, 13, 13, "#cdeaf5", "#5f93ab", "#2c5466");
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(6, -8);
  ctx.lineTo(10, -2);
  ctx.stroke();
  // Seats + roll bar.
  ctx.fillStyle = "#4a2f24";
  ctx.beginPath();
  ctx.roundRect(-14, -11, 12, 9, 3);
  ctx.roundRect(-14, 2, 12, 9, 3);
  ctx.fill();
  ctx.strokeStyle = "#2f2f35";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-18, -15);
  ctx.lineTo(-18, 15);
  ctx.stroke();
  // Spare wheel.
  ctx.beginPath();
  ctx.ellipse(-32, 0, 5, 8, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#2f2f35";
  ctx.fill();
  ctx.fillStyle = "#ffe7a6";
  for (const y of [-10, 10]) {
    ctx.beginPath();
    ctx.arc(30, y, 2.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

export type BodyKind = "crate" | "pin" | "ball" | "brick" | "letter";

export const BODY_SIZE: Record<BodyKind, number> = { crate: 44, pin: 26, ball: 60, brick: 28, letter: 96 };

export function paintBody(ctx: Ctx, kind: BodyKind, char = "") {
  switch (kind) {
    case "crate": {
      ctx.beginPath();
      ctx.roundRect(-16, -16, 32, 32, 3);
      shade(ctx, -16, -16, 16, 16, "#e6bb85", "#c08f57", "#8a5f33");
      ctx.strokeStyle = "#7a5233";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(-13, -13, 26, 26);
      ctx.beginPath();
      ctx.moveTo(-13, -13);
      ctx.lineTo(13, 13);
      ctx.stroke();
      break;
    }
    case "pin": {
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      shade(ctx, -9, -9, 9, 9, "#ffffff", "#f1ece4", "#b9b2a6");
      ctx.strokeStyle = "#e5484d";
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(0, 0, 5.5, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case "ball": {
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      shade(ctx, -24, -24, 24, 24, "#ffffff", "#eeeeea", "#a9a9a4");
      ctx.fillStyle = "#26292c";
      const patch = (cx: number, cy: number, rad: number) => {
        ctx.beginPath();
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
          ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
        }
        ctx.closePath();
        ctx.fill();
      };
      patch(0, 0, 8);
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 + Math.PI / 2;
        patch(Math.cos(a) * 19, Math.sin(a) * 19, 5);
      }
      ctx.strokeStyle = "#26292c";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, 23.5, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case "brick": {
      ctx.beginPath();
      ctx.roundRect(-12, -7, 24, 14, 2);
      shade(ctx, -12, -7, 12, 7, "#e68a6a", "#c4573a", "#8a3420");
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillRect(-10, -5, 20, 2);
      break;
    }
    case "letter": {
      ctx.font = displayFont(84, 800);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // Extruded block letter: a stack of darker copies, then the face.
      for (let i = 9; i > 0; i--) {
        ctx.fillStyle = i > 7 ? "rgba(30,50,45,0.25)" : mixDepth(i);
        ctx.fillText(char, i * 0.6, i * 1.1 + 4);
      }
      const g = ctx.createLinearGradient(0, -34, 0, 34);
      g.addColorStop(0, "#fbf8f0");
      g.addColorStop(0.55, "#e9e2d2");
      g.addColorStop(1, "#e08a4a");
      ctx.fillStyle = g;
      ctx.fillText(char, 0, 4);
      break;
    }
  }
}

const LETTER_SIDE = ["#6b7b85", "#63737d", "#5b6b75", "#53636d", "#4b5b65", "#43535d", "#3b4b55"];
const mixDepth = (i: number) => LETTER_SIDE[i - 1] ?? "#3b4b55";
