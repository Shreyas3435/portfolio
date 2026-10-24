// Hand-drawn drawing primitives for the sketch world. Everything is drawn
// with a seeded RNG so the same object always wobbles the same way — that is
// what lets the world be cached in tiles without visible seams.

export type Rand = () => number;
export type Pt = [number, number];
export type Ctx = CanvasRenderingContext2D;

export const PAPER = "#f6f1e7";
export const INK = "#33333a";
export const INK_SOFT = "rgba(51, 51, 58, 0.42)";
export const INK_FAINT = "rgba(51, 51, 58, 0.2)";

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
const jit = (r: Rand, amount: number) => (r() - 0.5) * 2 * amount;

let handFamily = "cursive";
export function setHandFamily(family: string) {
  handFamily = family;
}
export const handFont = (size: number, weight = 700) => `${weight} ${size}px ${handFamily}`;

interface StrokeOpts {
  color?: string;
  width?: number;
  jitter?: number;
  passes?: number;
}

/** A single pencil edge from a to b: slightly bowed, overshooting the ends. */
export function edge(ctx: Ctx, a: Pt, b: Pt, r: Rand, o: StrokeOpts = {}) {
  const { color = INK, width = 1.6, jitter = 1.4, passes = 2 } = o;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  for (let p = 0; p < passes; p++) {
    const over = range(r, 0.5, 3.5);
    const bow = jit(r, Math.min(len * 0.025, 4));
    const ax = a[0] - ux * over + jit(r, jitter);
    const ay = a[1] - uy * over + jit(r, jitter);
    const bx = b[0] + ux * over + jit(r, jitter);
    const by = b[1] + uy * over + jit(r, jitter);
    ctx.lineWidth = p === 0 ? width : width * 0.6;
    ctx.globalAlpha = p === 0 ? 0.92 : 0.5;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo((ax + bx) / 2 - uy * bow, (ay + by) / 2 + ux * bow, bx, by);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** Polygon drawn edge by edge, so corners cross like a quick sketch. */
export function sketchPoly(ctx: Ctx, pts: Pt[], r: Rand, o: StrokeOpts & { closed?: boolean } = {}) {
  const n = pts.length;
  const last = o.closed === false ? n - 1 : n;
  for (let i = 0; i < last; i++) edge(ctx, pts[i], pts[(i + 1) % n], r, o);
}

/** Smooth hand-drawn curve through points (used for circles and blobs). */
export function scribble(ctx: Ctx, pts: Pt[], r: Rand, o: StrokeOpts & { closed?: boolean } = {}) {
  const { color = INK, width = 1.6, jitter = 1.2, passes = 2, closed = true } = o;
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let p = 0; p < passes; p++) {
    const j: Pt[] = pts.map(([x, y]) => [x + jit(r, jitter), y + jit(r, jitter)]);
    if (closed) {
      j.push(j[0]);
      const k = range(r, 0.2, 0.6);
      j.push([j[1][0] * k + j[0][0] * (1 - k), j[1][1] * k + j[0][1] * (1 - k)]);
    }
    ctx.lineWidth = p === 0 ? width : width * 0.6;
    ctx.globalAlpha = p === 0 ? 0.92 : 0.5;
    ctx.beginPath();
    ctx.moveTo(j[0][0], j[0][1]);
    for (let i = 1; i < j.length - 1; i++) {
      ctx.quadraticCurveTo(j[i][0], j[i][1], (j[i][0] + j[i + 1][0]) / 2, (j[i][1] + j[i + 1][1]) / 2);
    }
    const end = j[j.length - 1];
    ctx.lineTo(end[0], end[1]);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

export function ellipsePts(cx: number, cy: number, rx: number, ry: number, r: Rand, noise = 0.08): Pt[] {
  const n = Math.max(9, Math.round(Math.max(rx, ry) / 5));
  const start = r() * Math.PI * 2;
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = start + (i / n) * Math.PI * 2;
    const k = 1 + jit(r, noise);
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return pts;
}

export function rectPts(x: number, y: number, w: number, h: number): Pt[] {
  return [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];
}

export function tracePath(ctx: Ctx, pts: Pt[]) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}

/** Opaque paper fill — hides lines behind a shape. */
export function fillPaper(ctx: Ctx, pts: Pt[], color = PAPER) {
  ctx.fillStyle = color;
  tracePath(ctx, pts);
  ctx.fill();
}

/** Watercolour wash: a few offset, multiplied layers that bleed past the lines. */
export function wash(ctx: Ctx, pts: Pt[], color: string, r: Rand, o: { alpha?: number; spread?: number; layers?: number } = {}) {
  const { alpha = 0.55, spread = 3, layers = 2 } = o;
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = color;
  for (let l = 0; l < layers; l++) {
    const ox = jit(r, spread);
    const oy = jit(r, spread);
    ctx.globalAlpha = alpha / layers + 0.08;
    ctx.beginPath();
    pts.forEach(([x, y], i) => {
      const px = x + ox + jit(r, spread * 0.6);
      const py = y + oy + jit(r, spread * 0.6);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Parallel pencil hatching clipped to a shape. */
export function hatch(
  ctx: Ctx,
  pts: Pt[],
  r: Rand,
  o: { angle?: number; gap?: number; color?: string; width?: number } = {},
) {
  const { angle = -0.9, gap = 6, color = INK_SOFT, width = 1 } = o;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const reach = Math.hypot(maxX - minX, maxY - minY) / 2 + 4;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  ctx.save();
  tracePath(ctx, pts);
  ctx.clip();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let d = -reach; d <= reach; d += gap) {
    const off = d + jit(r, gap * 0.15);
    const x0 = cx + -sin * off - cos * reach;
    const y0 = cy + cos * off - sin * reach;
    const x1 = cx + -sin * off + cos * reach;
    const y1 = cy + cos * off + sin * reach;
    ctx.moveTo(x0 + jit(r, 1), y0 + jit(r, 1));
    ctx.lineTo(x1 + jit(r, 1), y1 + jit(r, 1));
  }
  ctx.stroke();
  ctx.restore();
}

export function handText(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  size: number,
  color = INK,
  o: { rot?: number; align?: CanvasTextAlign; weight?: number; alpha?: number } = {},
) {
  const { rot = 0, align = "center", weight = 700, alpha = 1 } = o;
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  ctx.font = handFont(size, weight);
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/** A loose underline / highlighter scribble under text. */
export function underline(ctx: Ctx, x0: number, x1: number, y: number, color: string, r: Rand, width = 5) {
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x0, y + jit(r, 2));
  ctx.bezierCurveTo(x0 + (x1 - x0) * 0.3, y + jit(r, 5), x0 + (x1 - x0) * 0.7, y + jit(r, 5), x1, y + jit(r, 2));
  ctx.stroke();
  ctx.restore();
}

/** Paper grain: a small noise canvas reused as a repeating pattern. */
export function makeGrain(size = 160): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const r = mulberry32(7);
  for (let i = 0; i < size * size * 0.06; i++) {
    g.fillStyle = `rgba(90, 80, 60, ${range(r, 0.03, 0.09)})`;
    g.fillRect(r() * size, r() * size, range(r, 0.6, 1.6), range(r, 0.6, 1.6));
  }
  for (let i = 0; i < 6; i++) {
    g.strokeStyle = "rgba(90, 80, 60, 0.035)";
    g.lineWidth = 0.8;
    g.beginPath();
    const y = r() * size;
    g.moveTo(0, y);
    g.lineTo(size, y + jit(r, 8));
    g.stroke();
  }
  return c;
}
