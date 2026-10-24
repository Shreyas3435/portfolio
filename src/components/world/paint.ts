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

// Natural, slightly desaturated palette for a realistic aerial look.
export const C = {
  grass: "#6b8d3d",
  grassLight: "#88a94e",
  grassDark: "#4f7130",
  grassDeep: "#3a5826",
  asphalt: "#3a3e43",
  asphaltDark: "#2b2e32",
  sidewalk: "#c8c4bb",
  curb: "#a29e95",
  stone: "#cdc8bc",
  stoneDark: "#a59f92",
  water: "#2e6c8a",
  waterDeep: "#1b4a63",
  waterLight: "#6aaac4",
  ink: "#1d232b",
  cream: "#fdfbf6",
  wood: "#8a5a36",
  woodDark: "#5c3a22",
  warmLight: "#ffd08a",
  neonCyan: "#7ad7ff",
  neonAmber: "#ffb84d",
} as const;

let displayFamily = "sans-serif";
export function setDisplayFamily(family: string) {
  displayFamily = family;
}
export const displayFont = (size: number, weight = 700) => `${weight} ${size}px ${displayFamily}`;

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

/** Fill the current path with a smooth light-to-dark gradient. */
export function shade(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, light: string, base: string, dark: string) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, light);
  g.addColorStop(0.5, base);
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
  g.addColorStop(0, `rgba(16, 36, 60, ${alpha})`);
  g.addColorStop(0.7, `rgba(16, 36, 60, ${alpha * 0.8})`);
  g.addColorStop(1, "rgba(16, 36, 60, 0)");
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
  const { weight = 700, align = "center", alpha = 1, rot = 0, shadow } = o;
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  ctx.font = displayFont(size, weight);
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

/** Backlit LED-style sign: dark panel, bright coloured frame and text. */
export function board(ctx: Ctx, x: number, y: number, label: string, color: string, size = 22, textColor: string = C.cream) {
  ctx.font = displayFont(size, 700);
  const w = ctx.measureText(label).width + size * 1.3;
  const h = size * 1.6;
  const x0 = x - w / 2;
  const y0 = y - h / 2;
  ctx.fillStyle = "rgba(10, 16, 30, 0.35)";
  ctx.beginPath();
  ctx.roundRect(x0 + 3, y0 + 5, w, h, 5);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(x0, y0, w, h, 5);
  shade(ctx, x0, y0, x0 + w * 0.4, y0 + h, "#3a4656", "#232b36", "#171d25");
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(x0 + 2, y0 + 2, w - 4, h - 4, 4);
  ctx.stroke();
  text(ctx, label, x, y + 1, size, textColor === C.cream ? lighten(color, 0.55) : textColor);
}

/** Thin darker outline around the current path — keeps shapes crisp. */
export function outline(ctx: Ctx, base: string, width = 1.4) {
  ctx.strokeStyle = darken(base, 0.55);
  ctx.lineWidth = width;
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// Realism helpers: procedural noise textures and soft cast shadows.
// ---------------------------------------------------------------------------

let grainCanvas: HTMLCanvasElement | null = null;
let cloudCanvas: HTMLCanvasElement | null = null;

/** Tileable value noise, `octaves` layers, as a grey canvas centred on mid-grey. */
function makeNoise(size: number, cell: number, octaves: number, seed: number) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const img = g.createImageData(size, size);
  const r = mulberry32(seed);
  const layers: { n: number; grid: Float32Array; amp: number }[] = [];
  let amp = 1;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    const n = Math.max(2, Math.round(size / (cell / 2 ** o)));
    const grid = new Float32Array(n * n);
    for (let i = 0; i < grid.length; i++) grid[i] = r();
    layers.push({ n, grid, amp });
    total += amp;
    amp *= 0.5;
  }
  const smooth = (t: number) => t * t * (3 - 2 * t);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let v = 0;
      for (const { n, grid, amp: a } of layers) {
        const fx = (x / size) * n;
        const fy = (y / size) * n;
        const x0 = Math.floor(fx) % n;
        const y0 = Math.floor(fy) % n;
        const x1 = (x0 + 1) % n;
        const y1 = (y0 + 1) % n;
        const tx = smooth(fx - Math.floor(fx));
        const ty = smooth(fy - Math.floor(fy));
        const top = grid[y0 * n + x0] * (1 - tx) + grid[y0 * n + x1] * tx;
        const bot = grid[y1 * n + x0] * (1 - tx) + grid[y1 * n + x1] * tx;
        v += (top * (1 - ty) + bot * ty) * a;
      }
      const k = Math.round((v / total) * 255);
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = k;
      img.data[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  return c;
}

/** Fine per-pixel grain (asphalt, concrete, roofs). */
export function grain() {
  if (!grainCanvas) grainCanvas = makeNoise(128, 2, 2, 11);
  return grainCanvas;
}

/** Soft cloudy variation (grass, water, large surfaces). */
export function clouds() {
  if (!cloudCanvas) cloudCanvas = makeNoise(256, 96, 4, 23);
  return cloudCanvas;
}

/** Blend a noise texture into the current path. */
export function texture(ctx: Ctx, noise: HTMLCanvasElement, alpha: number, op: GlobalCompositeOperation = "overlay") {
  ctx.save();
  ctx.clip();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = op;
  ctx.fillStyle = ctx.createPattern(noise, "repeat")!;
  ctx.fill();
  ctx.restore();
}

const SHADOW_SUN = { x: 0.62, y: 0.78 };

/** Soft cast shadow of a rectangle extruded along the sun direction. */
export function rectShadow(ctx: Ctx, x0: number, y0: number, w: number, h: number, height: number, alpha = 0.32) {
  for (const [k, a] of [[1.08, 0.35], [1, 0.5], [0.9, 0.6]] as const) {
    const len = height * 0.7 * k;
    const dx = SHADOW_SUN.x * len;
    const dy = SHADOW_SUN.y * len;
    polyPath(ctx, [[x0, y0], [x0 + w, y0], [x0 + w + dx, y0 + dy], [x0 + w + dx, y0 + h + dy], [x0 + dx, y0 + h + dy], [x0, y0 + h]]);
    ctx.fillStyle = `rgba(14, 22, 30, ${alpha * a})`;
    ctx.fill();
  }
}

/** Soft cast shadow of a circle (towers, tree canopies). */
export function circleShadow(ctx: Ctx, x: number, y: number, rad: number, height: number, alpha = 0.32) {
  for (const [k, a, grow] of [[1.08, 0.35, 1.12], [1, 0.5, 1.04], [0.9, 0.6, 0.98]] as const) {
    const len = height * 0.7 * k;
    const dx = SHADOW_SUN.x * len;
    const dy = SHADOW_SUN.y * len;
    const rr = rad * grow;
    const ang = Math.atan2(dy, dx);
    ctx.beginPath();
    ctx.arc(x, y, rr, ang + Math.PI / 2, ang - Math.PI / 2);
    ctx.arc(x + dx, y + dy, rr, ang - Math.PI / 2, ang + Math.PI / 2);
    ctx.closePath();
    ctx.fillStyle = `rgba(14, 22, 30, ${alpha * a})`;
    ctx.fill();
  }
}
