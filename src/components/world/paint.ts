// Painterly drawing primitives. Everything takes a seeded RNG so a given
// object always paints the same way, which is what lets the world be cached
// in tiles and sprites without visible seams.

export type Rand = () => number;
export type Pt = [number, number];
export type Ctx = CanvasRenderingContext2D;

export function mulberry32(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const range = (r: Rand, min: number, max: number) => min + (max - min) * r();
export const pick = <T,>(r: Rand, list: readonly T[]) => list[Math.floor(r() * list.length)];

// Late-afternoon palette.
export const C = {
  grass: "#86b866",
  grassLight: "#b5d987",
  grassDark: "#5b9150",
  grassDeep: "#3f7348",
  path: "#e6cc9c",
  pathDark: "#c9a673",
  pathLight: "#f3e2bd",
  stone: "#d9d2c3",
  stoneDark: "#b3a995",
  water: "#4fa8c7",
  waterDeep: "#2f7fa5",
  waterLight: "#9fdcec",
  shadow: "rgba(28, 52, 48, 0.32)",
  ink: "#2c3a36",
  cream: "#fff8ea",
  wood: "#a8744a",
  woodDark: "#7a5233",
  warmLight: "#ffd88a",
} as const;

let displayFamily = "serif";
export function setDisplayFamily(family: string) {
  displayFamily = family;
}
export const displayFont = (size: number, weight = 700, italic = false) =>
  `${italic ? "italic " : ""}${weight} ${size}px ${displayFamily}`;

/** Mix two hex colours; t = 0 gives a, t = 1 gives b. */
export function mix(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
}
export const lighten = (c: string, t: number) => mix(c, "#fffbea", t);
export const darken = (c: string, t: number) => mix(c, "#1f2d33", t);

export function rgba(hex: string, a: number) {
  const p = parseInt(hex.slice(1), 16);
  return `rgba(${(p >> 16) & 255}, ${(p >> 8) & 255}, ${p & 255}, ${a})`;
}

/** Smooth closed blob with a slightly irregular outline. */
export function blobPath(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, r: Rand, noise = 0.12) {
  const n = 10;
  const start = r() * Math.PI * 2;
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = start + (i / n) * Math.PI * 2;
    const k = 1 + (r() - 0.5) * 2 * noise;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  ctx.beginPath();
  const mid = (i: number): Pt => {
    const a = pts[i % n];
    const b = pts[(i + 1) % n];
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  };
  const m0 = mid(0);
  ctx.moveTo(m0[0], m0[1]);
  for (let i = 1; i <= n; i++) {
    const p = pts[i % n];
    const m = mid(i);
    ctx.quadraticCurveTo(p[0], p[1], m[0], m[1]);
  }
  ctx.closePath();
}

export function polyPath(ctx: Ctx, pts: Pt[]) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}

/** Fill the current path with a light-from-top-left gradient. */
export function shade(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, light: string, base: string, dark: string) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, light);
  g.addColorStop(0.45, base);
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.fill();
}

/** Soft elliptical contact shadow. */
export function softShadow(ctx: Ctx, x: number, y: number, rx: number, ry: number, alpha = 0.35) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, rx * 0.1, 0, 0, rx);
  g.addColorStop(0, `rgba(24, 48, 44, ${alpha})`);
  g.addColorStop(0.6, `rgba(24, 48, 44, ${alpha * 0.55})`);
  g.addColorStop(1, "rgba(24, 48, 44, 0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function glow(ctx: Ctx, x: number, y: number, radius: number, color: string, alpha: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

/** A painted foliage clump: dark core, mid body, light crown and a few dabs. */
export function clump(ctx: Ctx, x: number, y: number, rad: number, r: Rand, tones: readonly [string, string, string, string]) {
  const [deep, mid, light, hi] = tones;
  ctx.fillStyle = deep;
  blobPath(ctx, x + rad * 0.12, y + rad * 0.14, rad, rad * 0.92, r, 0.14);
  ctx.fill();
  ctx.fillStyle = mid;
  blobPath(ctx, x - rad * 0.04, y - rad * 0.02, rad * 0.86, rad * 0.8, r, 0.16);
  ctx.fill();
  ctx.fillStyle = light;
  blobPath(ctx, x - rad * 0.22, y - rad * 0.26, rad * 0.52, rad * 0.44, r, 0.2);
  ctx.fill();
  ctx.fillStyle = hi;
  for (let i = 0; i < 4; i++) {
    const a = range(r, Math.PI * 1.05, Math.PI * 1.6);
    const d = range(r, 0.35, 0.7) * rad;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d, range(r, 2, 4.5), range(r, 1.5, 3), a, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Short curved brush stroke; used for grass texture and painted detail. */
export function dab(ctx: Ctx, x: number, y: number, len: number, angle: number, bend: number) {
  const ex = x + Math.cos(angle) * len;
  const ey = y + Math.sin(angle) * len;
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo((x + ex) / 2 - Math.sin(angle) * bend, (y + ey) / 2 + Math.cos(angle) * bend, ex, ey);
}

export function text(
  ctx: Ctx,
  str: string,
  x: number,
  y: number,
  size: number,
  color: string,
  o: { weight?: number; italic?: boolean; align?: CanvasTextAlign; alpha?: number; rot?: number; shadow?: string } = {},
) {
  const { weight = 700, italic = false, align = "center", alpha = 1, rot = 0, shadow } = o;
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  ctx.font = displayFont(size, weight, italic);
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.globalAlpha = alpha;
  if (shadow) {
    ctx.fillStyle = shadow;
    ctx.fillText(str, size * 0.04, size * 0.06);
  }
  ctx.fillStyle = color;
  ctx.fillText(str, 0, 0);
  ctx.restore();
}

/** Ribbon banner with a title, used under buildings and on gates. */
export function ribbon(ctx: Ctx, x: number, y: number, label: string, color: string, size = 26) {
  ctx.font = displayFont(size, 700);
  const w = ctx.measureText(label).width + size * 1.4;
  const h = size * 1.45;
  const x0 = x - w / 2;
  const y0 = y - h / 2;
  // Tails.
  ctx.fillStyle = darken(color, 0.35);
  for (const s of [-1, 1]) {
    const tx = s < 0 ? x0 + 6 : x0 + w - 6;
    ctx.beginPath();
    ctx.moveTo(tx, y0 + 8);
    ctx.lineTo(tx + s * h * 0.75, y0 + 8);
    ctx.lineTo(tx + s * h * 0.5, y0 + 8 + h / 2);
    ctx.lineTo(tx + s * h * 0.75, y0 + 8 + h);
    ctx.lineTo(tx, y0 + 8 + h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  ctx.roundRect(x0, y0, w, h, 6);
  shade(ctx, x0, y0, x0, y0 + h, lighten(color, 0.25), color, darken(color, 0.18));
  ctx.strokeStyle = lighten(color, 0.55);
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x0 + 4, y0 + 4, w - 8, h - 8, 4);
  ctx.stroke();
  ctx.globalAlpha = 1;
  text(ctx, label, x, y + 1, size, C.cream, { shadow: "rgba(0,0,0,0.25)" });
}
