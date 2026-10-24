import { BOWLING, PLAZA, PONDS, WORLD_H, WORLD_W, places, roads } from "./places";
import {
  type Ctx,
  type Pt,
  INK,
  INK_FAINT,
  INK_SOFT,
  PAPER,
  edge,
  ellipsePts,
  fillPaper,
  handText,
  hatch,
  mulberry32,
  range,
  scribble,
  underline,
} from "./sketch";

export const TILE = 512;
export const FENCE = 70;
const ROAD_HALF = 24;

type ItemKind = "tree" | "pine" | "bush" | "rock" | "tuft" | "flower" | "pebbles";

interface Item {
  kind: ItemKind;
  x: number;
  y: number;
  s: number;
  seed: number;
  box: [number, number, number, number];
}

interface Note {
  text: string;
  x: number;
  y: number;
  size: number;
  rot: number;
  color: string;
  weight?: number;
}

export interface Collider {
  x: number;
  y: number;
  r: number;
  leafy?: boolean;
}

interface Road {
  center: Pt[];
  edges: [Pt[], Pt[]][];
  box: [number, number, number, number];
}

export interface WorldData {
  items: Item[];
  buckets: Map<string, Item[]>;
  roads: Road[];
  notes: Note[];
  colliders: Collider[];
  grid: Map<string, number[]>;
  bushes: Collider[];
}

const GRID = 160;

function bezier(p: Pt[], t: number): Pt {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [a * p[0][0] + b * p[1][0] + c * p[2][0] + d * p[3][0], a * p[0][1] + b * p[1][1] + c * p[2][1] + d * p[3][1]];
}

function buildRoad(pts: Pt[], seed: number): Road {
  const r = mulberry32(seed);
  const center: Pt[] = [];
  const steps = 90;
  for (let i = 0; i <= steps; i++) center.push(bezier(pts, i / steps));
  const edges: [Pt[], Pt[]][] = [];
  for (let pass = 0; pass < 2; pass++) {
    const ph = [r() * 9, r() * 9, r() * 9, r() * 9];
    const left: Pt[] = [];
    const right: Pt[] = [];
    center.forEach(([x, y], i) => {
      const [nx0, ny0] = center[Math.max(0, i - 1)];
      const [nx1, ny1] = center[Math.min(center.length - 1, i + 1)];
      const dx = nx1 - nx0;
      const dy = ny1 - ny0;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const wl = ROAD_HALF + Math.sin(i * 0.3 + ph[0]) * 2.4 + Math.sin(i * 0.11 + ph[1]) * 3;
      const wr = ROAD_HALF + Math.sin(i * 0.27 + ph[2]) * 2.4 + Math.sin(i * 0.13 + ph[3]) * 3;
      left.push([x + nx * wl, y + ny * wl]);
      right.push([x - nx * wr, y - ny * wr]);
    });
    edges.push([left, right]);
  }
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of center) {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  return { center, edges, box: [x0 - 40, y0 - 40, x1 + 40, y1 + 40] };
}

export function buildWorld(): WorldData {
  const r = mulberry32(1337);
  const builtRoads = roads.map((rd, i) => buildRoad(rd.pts, 100 + i));

  const keepOut: [number, number, number, number][] = places.map((p) => [
    p.x - p.box.ax - 10,
    p.y - p.box.ay - 10,
    p.x - p.box.ax + p.box.w + 10,
    p.y - p.box.ay + p.box.h + 10,
  ]);
  keepOut.push([1220, 790, 1980, 1000], [BOWLING.x - 90, BOWLING.y - 70, BOWLING.x + 140, BOWLING.y + 70]);

  const roadPts = builtRoads.flatMap((rd) => rd.center);
  const blocked = (x: number, y: number, pad: number) => {
    if (x < FENCE + 40 || y < FENCE + 40 || x > WORLD_W - FENCE - 40 || y > WORLD_H - FENCE - 40) return true;
    if (Math.hypot(x - PLAZA.x, y - PLAZA.y) < PLAZA.r + 40 + pad) return true;
    for (const p of PONDS) if (((x - p.x) / (p.rx + 30 + pad)) ** 2 + ((y - p.y) / (p.ry + 24 + pad)) ** 2 < 1) return true;
    for (const [a, b, c, d] of keepOut) if (x > a - pad && x < c + pad && y > b - pad && y < d + pad) return true;
    for (const [rx, ry] of roadPts) if (Math.abs(rx - x) < 60 + pad && Math.abs(ry - y) < 60 + pad && Math.hypot(rx - x, ry - y) < 42 + pad) return true;
    return false;
  };

  const items: Item[] = [];
  const colliders: Collider[] = [];
  const bushes: Collider[] = [];
  const scatter = (kind: ItemKind, count: number, pad: number, sMin: number, sMax: number, spacing: number) => {
    let placed = 0;
    let tries = 0;
    while (placed < count && tries < count * 30) {
      tries++;
      const x = range(r, 0, WORLD_W);
      const y = range(r, 0, WORLD_H);
      if (blocked(x, y, pad)) continue;
      if (spacing && items.some((it) => (it.kind === "tree" || it.kind === "pine" || it.kind === "rock") && Math.abs(it.x - x) < spacing && Math.abs(it.y - y) < spacing)) continue;
      const s = range(r, sMin, sMax);
      const ext = 60 * s;
      items.push({ kind, x, y, s, seed: Math.floor(r() * 1e9), box: [x - ext, y - ext * 1.6, x + ext, y + ext * 0.4] });
      if (kind === "tree") colliders.push({ x, y: y - 20 * s, r: 21 * s, leafy: true });
      if (kind === "pine") colliders.push({ x, y: y - 10 * s, r: 16 * s, leafy: true });
      if (kind === "rock") colliders.push({ x, y, r: 14 * s });
      if (kind === "bush") bushes.push({ x, y: y - 6, r: 24 * s });
      placed++;
    }
  };
  scatter("tree", 150, 30, 0.8, 1.35, 56);
  scatter("pine", 70, 20, 0.8, 1.3, 46);
  scatter("rock", 60, 10, 0.7, 1.6, 40);
  scatter("bush", 90, 10, 0.8, 1.3, 0);
  scatter("tuft", 900, 0, 0.7, 1.3, 0);
  scatter("flower", 220, 0, 0.7, 1.2, 0);
  scatter("pebbles", 160, 0, 0.7, 1.3, 0);

  const flat = new Set<ItemKind>(["tuft", "flower", "pebbles"]);
  items.sort((a, b) => (flat.has(a.kind) === flat.has(b.kind) ? a.y - b.y : flat.has(a.kind) ? -1 : 1));

  for (const p of places) for (const [cx, cy, cr] of p.colliders) colliders.push({ x: p.x + cx, y: p.y + cy, r: cr });

  const grid = new Map<string, number[]>();
  colliders.forEach((c, i) => {
    for (let gx = Math.floor((c.x - c.r) / GRID); gx <= Math.floor((c.x + c.r) / GRID); gx++)
      for (let gy = Math.floor((c.y - c.r) / GRID); gy <= Math.floor((c.y + c.r) / GRID); gy++) {
        const k = `${gx},${gy}`;
        if (!grid.has(k)) grid.set(k, []);
        grid.get(k)!.push(i);
      }
  });

  const buckets = new Map<string, Item[]>();
  for (const it of items) {
    for (let tx = Math.floor(it.box[0] / TILE); tx <= Math.floor(it.box[2] / TILE); tx++)
      for (let ty = Math.floor(it.box[1] / TILE); ty <= Math.floor(it.box[3] / TILE); ty++) {
        const k = `${tx},${ty}`;
        if (!buckets.has(k)) buckets.set(k, []);
        buckets.get(k)!.push(it);
      }
  }

  const notes: Note[] = [
    { text: "TODO: sleep", x: 330, y: 300, size: 30, rot: -0.12, color: INK_SOFT },
    { text: "here be dragons", x: 3080, y: 230, size: 32, rot: 0.08, color: INK_SOFT },
    { text: "ideas pond", x: 1600, y: 690, size: 28, rot: -0.04, color: INK_SOFT },
    { text: "v2: fewer bugs (maybe)", x: 3000, y: 2330, size: 28, rot: -0.06, color: INK_SOFT },
    { text: "you found the edge of the page!", x: 520, y: 2340, size: 28, rot: 0.03, color: INK_SOFT },
    { text: "strike? →", x: BOWLING.x - 130, y: BOWLING.y - 64, size: 28, rot: -0.1, color: INK_SOFT },
    { text: "you are here", x: PLAZA.x + 118, y: PLAZA.y - 96, size: 24, rot: 0.12, color: INK_SOFT },
  ];
  roads.forEach((rd, i) => {
    const place = places.find((p) => p.id === rd.to)!;
    const c = builtRoads[i].center;
    const [x, y] = c[22];
    const [x2, y2] = c[26];
    let rot = Math.atan2(y2 - y, x2 - x);
    if (rot > Math.PI / 2) rot -= Math.PI;
    if (rot < -Math.PI / 2) rot += Math.PI;
    const nx = -Math.sin(rot);
    const ny = Math.cos(rot);
    notes.push({ text: rd.label, x: x - nx * 44, y: y - ny * 44, size: 26, rot, color: place.ink });
  });

  return { items, buckets, roads: builtRoads, notes, colliders, grid, bushes };
}

export function queryColliders(w: WorldData, x: number, y: number, out: Set<number>) {
  out.clear();
  for (let gx = Math.floor(x / GRID) - 1; gx <= Math.floor(x / GRID) + 1; gx++)
    for (let gy = Math.floor(y / GRID) - 1; gy <= Math.floor(y / GRID) + 1; gy++) {
      const list = w.grid.get(`${gx},${gy}`);
      if (list) for (const i of list) out.add(i);
    }
  return out;
}

// ---------------------------------------------------------------------------
// Tile rendering
// ---------------------------------------------------------------------------

function drawItem(ctx: Ctx, it: Item) {
  const r = mulberry32(it.seed);
  const { x, y, s } = it;
  switch (it.kind) {
    case "tree": {
      hatch(ctx, ellipsePts(x + 10 * s, y + 2, 26 * s, 8 * s, r, 0.05), r, { gap: 4, color: INK_FAINT, angle: -0.5 });
      edge(ctx, [x - 3 * s, y], [x - 2 * s, y - 26 * s], r, { width: 1.4 });
      edge(ctx, [x + 4 * s, y], [x + 3 * s, y - 26 * s], r, { width: 1.4 });
      const blobs: Pt[] = [
        [x - 12 * s, y - 38 * s],
        [x + 12 * s, y - 40 * s],
        [x, y - 56 * s],
      ];
      const shapes = blobs.map(([bx, by]) => ellipsePts(bx, by, range(r, 17, 22) * s, range(r, 15, 19) * s, r, 0.12));
      for (const sh of shapes) fillPaper(ctx, sh);
      for (const sh of shapes) scribble(ctx, sh, r, { width: 1.4, jitter: 1.3 });
      hatch(ctx, shapes[1], r, { gap: 4.5, angle: -0.8 });
      break;
    }
    case "pine": {
      for (let k = 0; k < 3; k++) {
        const w = (20 - k * 4) * s;
        const tri: Pt[] = [[x - w, y - 8 * s - k * 18 * s], [x, y - 8 * s - (k + 1.7) * 18 * s], [x + w, y - 8 * s - k * 18 * s]];
        fillPaper(ctx, tri);
        hatch(ctx, [tri[1], tri[2], [x, tri[2][1]]], r, { gap: 4, angle: -1.2 });
        edge(ctx, tri[0], tri[1], r, { width: 1.3 });
        edge(ctx, tri[1], tri[2], r, { width: 1.3 });
        edge(ctx, tri[0], tri[2], r, { width: 1.1, passes: 1 });
      }
      edge(ctx, [x, y - 8 * s], [x, y], r, { width: 2 });
      break;
    }
    case "bush": {
      const b: Pt[][] = [
        ellipsePts(x - 12 * s, y - 8 * s, 14 * s, 11 * s, r, 0.15),
        ellipsePts(x + 10 * s, y - 9 * s, 13 * s, 10 * s, r, 0.15),
        ellipsePts(x, y - 16 * s, 13 * s, 11 * s, r, 0.15),
      ];
      for (const sh of b) fillPaper(ctx, sh);
      for (const sh of b) scribble(ctx, sh, r, { width: 1.2 });
      for (let i = 0; i < 3; i++) {
        const dx = range(r, -14, 14) * s;
        const dy = range(r, -18, -4) * s;
        edge(ctx, [x + dx, y + dy], [x + dx + 3, y + dy - 3], r, { width: 1, passes: 1, color: INK_SOFT });
      }
      break;
    }
    case "rock": {
      const pts = ellipsePts(x, y - 6 * s, 16 * s, 11 * s, r, 0.28);
      fillPaper(ctx, pts);
      hatch(ctx, pts.filter(([, py]) => py > y - 10 * s).concat([[x + 16 * s, y - 6 * s]]), r, { gap: 3.5 });
      scribble(ctx, pts, r, { width: 1.3, jitter: 0.8 });
      break;
    }
    case "tuft": {
      ctx.globalAlpha = 0.7;
      for (let i = -1; i <= 1; i++) edge(ctx, [x + i * 3 * s, y], [x + i * 5 * s + range(r, -1, 1), y - range(r, 7, 11) * s], r, { width: 1, passes: 1, color: INK_SOFT });
      ctx.globalAlpha = 1;
      break;
    }
    case "flower": {
      edge(ctx, [x, y], [x + 1, y - 10 * s], r, { width: 1, passes: 1, color: INK_SOFT });
      scribble(ctx, ellipsePts(x + 1, y - 13 * s, 3.4 * s, 3.4 * s, r, 0.1), r, { width: 1, passes: 1, color: INK_SOFT });
      break;
    }
    case "pebbles": {
      for (let i = 0; i < 3; i++) {
        scribble(ctx, ellipsePts(x + range(r, -10, 10) * s, y + range(r, -5, 5) * s, range(r, 2, 4) * s, range(r, 1.5, 3) * s, r, 0.2), r, {
          width: 0.9,
          passes: 1,
          color: INK_SOFT,
        });
      }
      break;
    }
  }
}

function drawRoad(ctx: Ctx, rd: Road) {
  const [l0, r0] = rd.edges[0];
  ctx.fillStyle = "#ece4d3";
  ctx.beginPath();
  l0.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  for (let i = r0.length - 1; i >= 0; i--) ctx.lineTo(r0[i][0], r0[i][1]);
  ctx.closePath();
  ctx.fill();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  rd.edges.forEach(([left, right], pass) => {
    ctx.strokeStyle = INK;
    ctx.lineWidth = pass ? 0.9 : 1.5;
    ctx.globalAlpha = pass ? 0.4 : 0.75;
    for (const side of [left, right]) {
      ctx.beginPath();
      side.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    }
  });
  ctx.globalAlpha = 0.35;
  ctx.setLineDash([10, 16]);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  rd.center.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

const intersects = (b: [number, number, number, number], x0: number, y0: number, x1: number, y1: number) =>
  b[0] < x1 && b[2] > x0 && b[1] < y1 && b[3] > y0;

export function renderTile(w: WorldData, tx: number, ty: number, scale: number, grain: CanvasPattern | null): HTMLCanvasElement {
  const px = Math.ceil(TILE * scale) + 1;
  const c = document.createElement("canvas");
  c.width = c.height = px;
  const ctx = c.getContext("2d")!;
  ctx.scale(scale, scale);
  const x0 = tx * TILE;
  const y0 = ty * TILE;
  const x1 = x0 + TILE;
  const y1 = y0 + TILE;
  ctx.translate(-x0, -y0);
  ctx.fillStyle = PAPER;
  ctx.fillRect(x0, y0, TILE + 2, TILE + 2);
  if (grain) {
    ctx.fillStyle = grain;
    ctx.fillRect(x0, y0, TILE + 2, TILE + 2);
  }

  // Coffee ring — the sketchbook has been used.
  if (intersects([2800, 2000, 3100, 2300], x0, y0, x1, y1)) {
    const r = mulberry32(9);
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = `rgba(160, 120, 70, ${0.12 + i * 0.04})`;
      ctx.lineWidth = 6 - i * 2;
      ctx.beginPath();
      ctx.ellipse(2950 + range(r, -3, 3), 2150 + range(r, -3, 3), 120 - i * 3, 112 - i * 2, 0.2, 0, Math.PI * 1.85);
      ctx.stroke();
    }
    ctx.restore();
  }

  for (const p of PONDS) {
    if (!intersects([p.x - p.rx - 20, p.y - p.ry - 20, p.x + p.rx + 20, p.y + p.ry + 20], x0, y0, x1, y1)) continue;
    const r = mulberry32(p.x + p.y);
    const pts = ellipsePts(p.x, p.y, p.rx, p.ry, r, 0.06);
    fillPaper(ctx, pts, "#eef0ee");
    hatch(ctx, pts, r, { gap: 7, angle: 0.05, color: INK_FAINT });
    scribble(ctx, pts, r, { width: 1.6 });
    for (let i = 0; i < 4; i++) {
      const wx = p.x + range(r, -p.rx * 0.5, p.rx * 0.5);
      const wy = p.y + range(r, -p.ry * 0.5, p.ry * 0.5);
      ctx.strokeStyle = INK_SOFT;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(wx - 12, wy);
      ctx.quadraticCurveTo(wx - 6, wy - 4, wx, wy);
      ctx.quadraticCurveTo(wx + 6, wy + 4, wx + 12, wy);
      ctx.stroke();
    }
  }

  for (const rd of w.roads) if (intersects(rd.box, x0, y0, x1, y1)) drawRoad(ctx, rd);

  if (intersects([PLAZA.x - 260, PLAZA.y - 260, PLAZA.x + 260, PLAZA.y + 260], x0, y0, x1, y1)) {
    const r = mulberry32(42);
    const ring = ellipsePts(PLAZA.x, PLAZA.y, PLAZA.r, PLAZA.r * 0.8, r, 0.03);
    fillPaper(ctx, ring, "#ece4d3");
    scribble(ctx, ring, r, { width: 1.8 });
    scribble(ctx, ellipsePts(PLAZA.x, PLAZA.y, PLAZA.r - 14, PLAZA.r * 0.8 - 12, r, 0.03), r, { width: 1, passes: 1, color: INK_SOFT });
    // Compass rose.
    const cx = PLAZA.x;
    const cy = PLAZA.y;
    for (const [dx, dy, t] of [[0, -1, "N"], [1, 0, "E"], [0, 1, "S"], [-1, 0, "W"]] as const) {
      edge(ctx, [cx + dx * 18, cy + dy * 14], [cx + dx * 70, cy + dy * 56], r, { width: 1.2, color: INK_SOFT });
      handText(ctx, t, cx + dx * 92, cy + dy * 74, 22, INK_SOFT);
    }
    edge(ctx, [cx - 12, cy - 12], [cx + 12, cy + 12], r, { width: 2.4, color: "#ff6b4a" });
    edge(ctx, [cx + 12, cy - 12], [cx - 12, cy + 12], r, { width: 2.4, color: "#ff6b4a" });
  }

  // Bowling lane.
  if (intersects([BOWLING.x - 90, BOWLING.y - 70, BOWLING.x + 160, BOWLING.y + 70], x0, y0, x1, y1)) {
    const r = mulberry32(77);
    const lane: Pt[] = [[BOWLING.x - 70, BOWLING.y - 46], [BOWLING.x + 130, BOWLING.y - 46], [BOWLING.x + 130, BOWLING.y + 46], [BOWLING.x - 70, BOWLING.y + 46]];
    hatch(ctx, lane, r, { gap: 10, angle: 0, color: INK_FAINT });
    for (let i = 0; i < 4; i++) edge(ctx, lane[i], lane[(i + 1) % 4], r, { width: 1.1, passes: 1, color: INK_SOFT });
  }

  const bucket = w.buckets.get(`${tx},${ty}`);
  if (bucket) for (const it of bucket) drawItem(ctx, it);

  for (const n of w.notes) {
    const half = n.text.length * n.size * 0.3;
    const reach = half + n.size;
    if (!intersects([n.x - reach, n.y - reach, n.x + reach, n.y + reach], x0, y0, x1, y1)) continue;
    handText(ctx, n.text, n.x, n.y, n.size, n.color, { rot: n.rot, weight: n.weight ?? 600 });
  }

  // Name lettering.
  if (intersects([1180, 760, 2020, 1010], x0, y0, x1, y1)) {
    const r = mulberry32(5);
    handText(ctx, "Shreyas Alva", 1600, 860, 128, INK);
    underline(ctx, 1330, 1870, 920, "#ff6b4a", r, 9);
    handText(ctx, "Full-Stack × AI Engineer", 1600, 966, 44, INK, { weight: 600 });
  }

  // Fence around the page.
  const r = mulberry32(tx * 31 + ty * 17);
  const fence = (ax: number, ay: number, bx: number, by: number) => {
    if (!intersects([Math.min(ax, bx) - 30, Math.min(ay, by) - 30, Math.max(ax, bx) + 30, Math.max(ay, by) + 30], x0, y0, x1, y1)) return;
    const len = Math.hypot(bx - ax, by - ay);
    const n = Math.round(len / 70);
    for (let i = 0; i <= n; i++) {
      const x = ax + ((bx - ax) * i) / n;
      const y = ay + ((by - ay) * i) / n;
      if (x < x0 - 20 || x > x1 + 20 || y < y0 - 40 || y > y1 + 20) continue;
      edge(ctx, [x, y + 6], [x, y - 26], r, { width: 2 });
      if (i < n) {
        const nx = ax + ((bx - ax) * (i + 1)) / n;
        const ny = ay + ((by - ay) * (i + 1)) / n;
        edge(ctx, [x, y - 18], [nx, ny - 18], r, { width: 1.2, passes: 1 });
        edge(ctx, [x, y - 6], [nx, ny - 6], r, { width: 1.2, passes: 1 });
      }
    }
  };
  fence(FENCE, FENCE, WORLD_W - FENCE, FENCE);
  fence(FENCE, WORLD_H - FENCE, WORLD_W - FENCE, WORLD_H - FENCE);
  fence(FENCE, FENCE, FENCE, WORLD_H - FENCE);
  fence(WORLD_W - FENCE, FENCE, WORLD_W - FENCE, WORLD_H - FENCE);

  return c;
}
