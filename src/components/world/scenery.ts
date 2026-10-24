import type { Foliage, PropKind } from "./art";
import { COURT, DECOR, EDGE, NAME, PLAZA, PONDS, TAGLINE, TRACK_Y, WORLD_H, WORLD_W, districts, places, roads } from "./places";
import { type Ctx, type Pt, C, blobPath, dab, mulberry32, pick, range, rgba, text } from "./paint";

export const TILE = 512;
const ROAD_W = 56;
const GRID = 160;

export interface Standing {
  kind: Foliage;
  x: number;
  y: number;
  s: number;
  variant: number;
}

export interface Prop {
  kind: PropKind;
  x: number;
  y: number;
  variant: number;
  colliders: number[];
  /** World time it broke, or -1 while standing. */
  brokenAt: number;
  /** World time it started growing back, or -1. */
  regrowAt: number;
}

export type ColliderRef =
  | { type: "tree"; i: number }
  | { type: "prop"; i: number }
  | { type: "place"; i: number }
  | { type: "solid" };

export interface Collider {
  x: number;
  y: number;
  r: number;
  ref: ColliderRef;
}

interface Flat {
  kind: "flowers" | "tuft" | "blotch";
  x: number;
  y: number;
  s: number;
  seed: number;
  color: string;
}

export interface Pole {
  x: number;
  y: number;
  road: number;
  transformer: boolean;
}

export interface WorldData {
  poles: Pole[];
  standing: Standing[];
  props: Prop[];
  flats: Map<string, Flat[]>;
  roadPts: Pt[][];
  colliders: Collider[];
  grid: Map<string, number[]>;
}

function bezier(p: [number, number][], t: number): Pt {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [a * p[0][0] + b * p[1][0] + c * p[2][0] + d * p[3][0], a * p[0][1] + b * p[1][1] + c * p[2][1] + d * p[3][1]];
}

const inEllipse = (x: number, y: number, cx: number, cy: number, rx: number, ry: number) =>
  ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1;

export function buildWorld(): WorldData {
  const r = mulberry32(2024);
  const roadPts = roads.map((rd) => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 80; i++) pts.push(bezier(rd, i / 80));
    return pts;
  });
  const allRoad = roadPts.flat();
  const nameHalf = (NAME.text.length * NAME.advance) / 2 + 60;

  const blocked = (x: number, y: number, pad: number) => {
    if (x < EDGE + 20 || y < EDGE + 40 || x > WORLD_W - EDGE - 20 || y > WORLD_H - EDGE - 10) return true;
    if (Math.abs(y - TRACK_Y) < 90 + pad) return true;
    if (Math.hypot(x - PLAZA.x, y - PLAZA.y) < PLAZA.r + 50 + pad) return true;
    if (Math.abs(x - NAME.x) < nameHalf + pad && y > NAME.y - 90 - pad && y < TAGLINE.y + 50 + pad) return true;
    for (const p of PONDS) if (inEllipse(x, y, p.x, p.y, p.rx + 40 + pad, p.ry + 34 + pad)) return true;
    for (const d of DECOR) if (Math.hypot(x - d.x, y - d.y) < 150 + pad) return true;
    for (const d of districts) {
      if (inEllipse(x, y, d.court.x, d.court.y, d.court.rx + 60 + pad, d.court.ry + 70 + pad)) return true;
      if (Math.abs(x - d.gate.x) < 330 + pad && Math.abs(y - d.gate.y) < 70 + pad) return true;
    }
    for (const p of places) {
      if (x > p.x - p.box.ax - pad && x < p.x - p.box.ax + p.box.w + pad && y > p.y - 60 - pad && y < p.y + 80 + pad) return true;
    }
    for (const [rx, ry] of allRoad) if (Math.abs(rx - x) < 80 + pad && Math.abs(ry - y) < 80 + pad && Math.hypot(rx - x, ry - y) < 64 + pad) return true;
    return false;
  };

  const standing: Standing[] = [];
  const crowded = (x: number, y: number, d: number) => standing.some((s) => Math.abs(s.x - x) < d && Math.abs(s.y - y) < d * 0.8);
  const scatter = (
    kind: Foliage,
    count: number,
    opts: { pad?: number; spacing?: number; where?: (x: number, y: number) => boolean; sMin?: number; sMax?: number },
  ) => {
    const { pad = 10, spacing = 0, where, sMin = 0.85, sMax = 1.25 } = opts;
    let placed = 0;
    for (let tries = 0; placed < count && tries < count * 40; tries++) {
      const x = range(r, 0, WORLD_W);
      const y = range(r, 0, WORLD_H);
      if (where && !where(x, y)) continue;
      if (blocked(x, y, pad)) continue;
      if (spacing && crowded(x, y, spacing)) continue;
      standing.push({ kind, x, y, s: kind === "block" ? 1 : range(r, sMin, sMax), variant: Math.floor(r() * 5) });
      placed++;
    }
  };
  const nearEdge = (x: number, y: number) => Math.min(x, y, WORLD_W - x, WORLD_H - y) < 300;
  const nearDistrict = (x: number, y: number) =>
    districts.some((d) => inEllipse(x, y, d.court.x, d.court.y, d.court.rx + 360, d.court.ry + 300));
  // A skyline of apartment blocks around the north, west and east edges.
  const edgeBand = (x: number, y: number) => y < 330 || x < 300 || x > WORLD_W - 300;
  scatter("block", 26, { spacing: 190, pad: 40, where: (x, y) => edgeBand(x, y) && y < TRACK_Y - 200 });
  // Kept deliberately sparse so there's lots of open ground to drive on.
  scatter("ginkgo", 30, { spacing: 120, pad: 30 });
  scatter("poplar", 34, { spacing: 90, where: nearEdge });
  scatter("spirit", 12, { spacing: 160, pad: 40, where: nearDistrict });
  scatter("rock", 10, { spacing: 140, pad: 30, sMin: 0.7, sMax: 1.2 });
  scatter("hedge", 60, { pad: 0, sMin: 0.8, sMax: 1.2 });
  standing.sort((a, b) => a.y - b.y);

  const colliders: Collider[] = [];
  standing.forEach((s, i) => {
    if (s.kind === "ginkgo" || s.kind === "spirit") colliders.push({ x: s.x, y: s.y - 6 * s.s, r: 12 * s.s, ref: { type: "tree", i } });
    else if (s.kind === "poplar") colliders.push({ x: s.x, y: s.y - 4, r: 8 * s.s, ref: { type: "tree", i } });
    else if (s.kind === "rock") colliders.push({ x: s.x, y: s.y - 10 * s.s, r: 15 * s.s, ref: { type: "solid" } });
    else if (s.kind === "block") for (const dx of [-36, 36]) colliders.push({ x: s.x + dx, y: s.y - 18, r: 38, ref: { type: "solid" } });
  });

  // Breakable props.
  const props: Prop[] = [];
  const addProp = (kind: PropKind, x: number, y: number, circles: [number, number, number][]) => {
    const i = props.length;
    const ids: number[] = [];
    for (const [dx, dy, cr] of circles) {
      ids.push(colliders.length);
      colliders.push({ x: x + dx, y: y + dy, r: cr, ref: { type: "prop", i } });
    }
    props.push({ kind, x, y, variant: Math.floor(r() * 3), colliders: ids, brokenAt: -1, regrowAt: -1 });
  };
  // Lamps along the roads, alternating sides.
  roadPts.forEach((pts) => {
    let side = 1;
    for (let i = 10; i < pts.length - 6; i += 18) {
      const [x, y] = pts[i];
      const [x2, y2] = pts[i + 1];
      const len = Math.hypot(x2 - x, y2 - y) || 1;
      const lx = x - ((y2 - y) / len) * 50 * side;
      const ly = y + ((x2 - x) / len) * 50 * side;
      side = -side;
      if (Math.hypot(lx - PLAZA.x, ly - PLAZA.y) < PLAZA.r + 30) continue;
      if (districts.some((d) => Math.hypot(lx - d.gate.x, ly - d.gate.y) < 160)) continue;
      if (Math.abs(lx - NAME.x) < nameHalf && ly > NAME.y - 70 && ly < TAGLINE.y + 30) continue;
      addProp("lamp", lx, ly, [[0, -4, 7]]);
    }
  });
  // Power poles along one side of each road; wires are strung at runtime.
  const poles: Pole[] = [];
  roadPts.forEach((pts, road) => {
    for (let i = 6; i < pts.length - 4; i += 14) {
      const [x, y] = pts[i];
      const [x2, y2] = pts[i + 1];
      const len = Math.hypot(x2 - x, y2 - y) || 1;
      const px = x + ((y2 - y) / len) * 66;
      const py = y - ((x2 - x) / len) * 66;
      if (Math.hypot(px - PLAZA.x, py - PLAZA.y) < PLAZA.r + 40) continue;
      if (districts.some((d) => Math.hypot(px - d.gate.x, py - d.gate.y) < 170)) continue;
      if (Math.abs(px - NAME.x) < nameHalf && py > NAME.y - 80 && py < TAGLINE.y + 30) continue;
      poles.push({ x: px, y: py, road, transformer: poles.length % 3 === 1 });
      colliders.push({ x: px, y: py - 3, r: 6, ref: { type: "solid" } });
    }
  });

  // Guard rails flanking every gate.
  for (const d of districts)
    for (const dir of [-1, 1])
      for (let k = 0; k < 4; k++) addProp("fence", d.gate.x + dir * (170 + k * 50), d.gate.y - 6, [[-17, -6, 8], [17, -6, 8]]);
  // Planters beside buildings.
  for (const p of places) {
    const half = p.kind === "social" ? 112 : p.box.w / 2 - 30;
    addProp("planter", p.x - half, p.y + 18, [[0, -8, 14]]);
    addProp("planter", p.x + half, p.y + 18, [[0, -8, 14]]);
  }
  // Vending machines — they glow at night.
  for (const [x, y] of [[1876, 1272], [1906, 1274], [2380, 1400], [1300, 1880], [1330, 1882], [560, 1400], [2140, 760]]) addProp("vending", x, y, [[0, -10, 16]]);

  places.forEach((p, i) => {
    for (const [dx, dy, cr] of p.colliders) colliders.push({ x: p.x + dx, y: p.y + dy, r: cr, ref: { type: "place", i } });
  });
  for (const d of districts) for (const s of [-1, 1]) colliders.push({ x: d.gate.x + s * 122, y: d.gate.y - 6, r: 16, ref: { type: "solid" } });
  for (const d of DECOR) colliders.push({ x: d.x, y: d.y - 4, r: d.kind === "fountain" ? 84 : d.r, ref: { type: "solid" } });
  const fire = DECOR.find((d) => d.kind === "campfire")!;
  for (const s of [-1, 1]) colliders.push({ x: fire.x + s * 100, y: fire.y - 8, r: 22, ref: { type: "solid" } });

  const grid = new Map<string, number[]>();
  colliders.forEach((c, i) => {
    for (let gx = Math.floor((c.x - c.r) / GRID); gx <= Math.floor((c.x + c.r) / GRID); gx++)
      for (let gy = Math.floor((c.y - c.r) / GRID); gy <= Math.floor((c.y + c.r) / GRID); gy++) {
        const k = `${gx},${gy}`;
        if (!grid.has(k)) grid.set(k, []);
        grid.get(k)!.push(i);
      }
  });

  // Flat ground detail, bucketed into the tiles it touches.
  const flats = new Map<string, Flat[]>();
  const addFlat = (f: Flat, ext: number) => {
    for (let tx = Math.floor((f.x - ext) / TILE); tx <= Math.floor((f.x + ext) / TILE); tx++)
      for (let ty = Math.floor((f.y - ext) / TILE); ty <= Math.floor((f.y + ext) / TILE); ty++) {
        const k = `${tx},${ty}`;
        if (!flats.has(k)) flats.set(k, []);
        flats.get(k)!.push(f);
      }
  };
  const blotchColors = [C.grassLight, C.grassDark, "#9ccb6f", "#6fa35a", "#c3dc8c", "#4f8a4c"];
  for (let i = 0; i < 520; i++) {
    const s = range(r, 90, 260);
    addFlat({ kind: "blotch", x: range(r, 0, WORLD_W), y: range(r, 0, WORLD_H), s, seed: 0, color: pick(r, blotchColors) }, s);
  }
  const flowerColors = ["#ffffff", "#ffd23f", "#8fe0ff", "#ffffff", "#ffab00", "#b8fff4"];
  for (let placed = 0, tries = 0; placed < 300 && tries < 6000; tries++) {
    const x = range(r, 0, WORLD_W);
    const y = range(r, 0, WORLD_H);
    if (blocked(x, y, -30)) continue;
    addFlat({ kind: "flowers", x, y, s: range(r, 0.8, 1.4), seed: Math.floor(r() * 1e9), color: pick(r, flowerColors) }, 30);
    placed++;
  }
  for (let placed = 0, tries = 0; placed < 700 && tries < 9000; tries++) {
    const x = range(r, 0, WORLD_W);
    const y = range(r, 0, WORLD_H);
    if (blocked(x, y, -40)) continue;
    addFlat({ kind: "tuft", x, y, s: range(r, 0.8, 1.3), seed: Math.floor(r() * 1e9), color: "" }, 20);
    placed++;
  }

  return { poles, standing, props, flats, roadPts, colliders, grid };
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
// Ground tiles
// ---------------------------------------------------------------------------

const intersects = (b: [number, number, number, number], x0: number, y0: number, x1: number, y1: number) =>
  b[0] < x1 && b[2] > x0 && b[1] < y1 && b[3] > y0;

/** Grass brush strokes for one tile cell, deterministic from its coordinates. */
function strokesFor(tx: number, ty: number, out: [number, number, number, number, number][]) {
  const r = mulberry32((tx * 73856093) ^ (ty * 19349663));
  for (let i = 0; i < 420; i++) {
    out.push([tx * TILE + r() * TILE, ty * TILE + r() * TILE, range(r, 5, 12), -Math.PI / 2 + range(r, -0.6, 0.6), Math.floor(r() * 3)]);
  }
}

function paintRoad(ctx: Ctx, pts: Pt[]) {
  const line = () => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  };
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // Sidewalk, curb, asphalt.
  for (const [color, width] of [
    [C.curb, ROAD_W + 34],
    [C.sidewalk, ROAD_W + 28],
    [C.curb, ROAD_W + 6],
    [C.asphalt, ROAD_W],
  ] as const) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    line();
    ctx.stroke();
  }
  // Sidewalk paving joints.
  ctx.strokeStyle = rgba("#9aa3ad", 0.5);
  ctx.lineWidth = 1;
  for (let i = 0; i < pts.length - 1; i += 2) {
    const [x, y] = pts[i];
    const [x2, y2] = pts[i + 1];
    const len = Math.hypot(x2 - x, y2 - y) || 1;
    const nx = -(y2 - y) / len;
    const ny = (x2 - x) / len;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + nx * s * (ROAD_W / 2 + 4), y + ny * s * (ROAD_W / 2 + 4));
      ctx.lineTo(x + nx * s * (ROAD_W / 2 + 16), y + ny * s * (ROAD_W / 2 + 16));
      ctx.stroke();
    }
  }
  // Centre line.
  ctx.strokeStyle = "#ffd23f";
  ctx.lineWidth = 2.5;
  ctx.setLineDash([18, 14]);
  line();
  ctx.stroke();
  ctx.setLineDash([]);
  // Zebra crossings near both ends.
  for (const idx of [4, pts.length - 5]) {
    const [x, y] = pts[idx];
    const [x2, y2] = pts[idx + 1];
    const a = Math.atan2(y2 - y, x2 - x);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    for (let k = -3; k <= 3; k++) ctx.fillRect(-9, k * 8 - 3, 18, 5);
    ctx.restore();
  }
}

function paintCourt(ctx: Ctx, d: (typeof districts)[number]) {
  const { x, y, rx, ry, surface } = d.court;
  const r = mulberry32(x + y);
  if (surface === "meadow") {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 10, 0, 0, rx);
    g.addColorStop(0, rgba("#d6eaa0", 0.85));
    g.addColorStop(1, rgba("#d6eaa0", 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      blobPath(ctx, x + Math.cos(a) * rx * 0.62, y + Math.sin(a) * ry * 0.62, 12, 7, r, 0.2);
      ctx.fillStyle = i % 2 ? C.stone : "#e8e1d2";
      ctx.fill();
    }
    return;
  }
  if (surface === "court") {
    paintBasketballCourt(ctx, d.court);
    return;
  }
  ctx.fillStyle = rgba("#5b6b4f", 0.25);
  ctx.beginPath();
  ctx.ellipse(x, y + 6, rx + 14, ry + 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.stoneDark;
  ctx.beginPath();
  ctx.ellipse(x, y, rx + 8, ry + 8, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(x - rx * 0.3, y - ry * 0.4, 20, x, y, rx);
  g.addColorStop(0, "#f1ece1");
  g.addColorStop(1, C.stone);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = rgba("#8f8471", 0.22);
  ctx.lineWidth = 1.5;
  for (let k = 1; k < 8; k++) {
    ctx.beginPath();
    ctx.ellipse(x, y, (rx * k) / 8, (ry * k) / 8, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let k = 0; k < 48; k++) {
    const a = (k / 48) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * rx * 0.12, y + Math.sin(a) * ry * 0.12);
    ctx.lineTo(x + Math.cos(a) * rx, y + Math.sin(a) * ry);
    ctx.stroke();
  }
  ctx.fillStyle = rgba("#ffffff", 0.12);
  for (let k = 0; k < 120; k++) {
    ctx.beginPath();
    ctx.ellipse(x + range(r, -rx, rx), y + range(r, -ry, ry), range(r, 6, 14), range(r, 3, 6), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function paintBasketballCourt(ctx: Ctx, c: (typeof districts)[number]["court"]) {
  const { x, y, rx, ry } = c;
  ctx.fillStyle = C.curb;
  ctx.beginPath();
  ctx.ellipse(x, y, rx + 10, ry + 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d9dde3";
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  const { x: cx, y: cy, half } = COURT;
  const w = half * 2 + 60;
  const h = 200;
  ctx.fillStyle = "#2f6fbf";
  ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
  ctx.fillStyle = "#e8742a";
  ctx.fillRect(cx - w / 2 + 10, cy - h / 2 + 10, w - 20, h - 20);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.strokeRect(cx - w / 2 + 10, cy - h / 2 + 10, w - 20, h - 20);
  ctx.beginPath();
  ctx.moveTo(cx, cy - h / 2 + 10);
  ctx.lineTo(cx, cy + h / 2 - 10);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 28, 0, Math.PI * 2);
  ctx.stroke();
  for (const s of [-1, 1]) {
    const bx = cx + s * (w / 2 - 10);
    const kx = s > 0 ? bx - 70 : bx;
    ctx.fillStyle = "#2f6fbf";
    ctx.fillRect(kx, cy - 30, 70, 60);
    ctx.strokeRect(kx, cy - 30, 70, 60);
    ctx.beginPath();
    ctx.arc(bx, cy, 92, s > 0 ? Math.PI * 0.6 : -Math.PI * 0.4, s > 0 ? Math.PI * 1.4 : Math.PI * 0.4);
    ctx.stroke();
  }
}

function paintTrack(ctx: Ctx, x0: number, x1: number) {
  ctx.fillStyle = "#8a8f96";
  ctx.fillRect(x0, TRACK_Y - 26, x1 - x0, 52);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  for (let x = Math.floor(x0 / 7) * 7; x < x1; x += 7) ctx.fillRect(x, TRACK_Y - 24 + ((x * 13) % 40), 3, 3);
  ctx.fillStyle = "#6b4a33";
  for (let x = Math.floor(x0 / 22) * 22; x < x1; x += 22) ctx.fillRect(x, TRACK_Y - 18, 10, 36);
  ctx.fillStyle = "#c9d0d8";
  ctx.fillRect(x0, TRACK_Y - 12, x1 - x0, 4);
  ctx.fillRect(x0, TRACK_Y + 8, x1 - x0, 4);
}

function paintPond(ctx: Ctx, p: (typeof PONDS)[number]) {
  const r = mulberry32(p.x * 3 + p.y);
  ctx.fillStyle = "#c4cad2";
  blobPath(ctx, p.x, p.y, p.rx + 16, p.ry + 13, r, 0.06);
  ctx.fill();
  blobPath(ctx, p.x, p.y, p.rx, p.ry, r, 0.06);
  const g = ctx.createRadialGradient(p.x - p.rx * 0.2, p.y - p.ry * 0.3, 10, p.x, p.y, p.rx);
  g.addColorStop(0, C.waterDeep);
  g.addColorStop(0.7, C.water);
  g.addColorStop(1, C.waterLight);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  for (let i = 0; i < 7; i++) {
    const x = p.x + range(r, -p.rx * 0.6, p.rx * 0.6);
    const y = p.y + range(r, -p.ry * 0.6, p.ry * 0.6);
    ctx.beginPath();
    ctx.moveTo(x - 16, y);
    ctx.lineTo(x + 16, y);
    ctx.stroke();
  }
  for (let i = 0; i < 6; i++) {
    const x = p.x + range(r, -p.rx * 0.7, p.rx * 0.7);
    const y = p.y + range(r, -p.ry * 0.6, p.ry * 0.6);
    ctx.fillStyle = i % 2 ? "#5f9c4f" : "#79b55c";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.ellipse(x, y, 11, 6, 0, 0.3, Math.PI * 2 - 0.3);
    ctx.closePath();
    ctx.fill();
    if (i === 2) {
      ctx.fillStyle = "#fff6e0";
      ctx.beginPath();
      ctx.arc(x + 2, y - 3, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.strokeStyle = "#4f7d3e";
  ctx.lineWidth = 2;
  for (let i = 0; i < 18; i++) {
    const a = range(r, Math.PI * 0.1, Math.PI * 0.9) + (i % 2 ? Math.PI : 0);
    const x = p.x + Math.cos(a) * p.rx * 0.98;
    const y = p.y + Math.sin(a) * p.ry * 0.98;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + range(r, -4, 4), y - 10, x + range(r, -6, 6), y - range(r, 14, 22));
    ctx.stroke();
  }
}

function paintPlaza(ctx: Ctx) {
  const { x, y, r: rr } = PLAZA;
  ctx.fillStyle = rgba("#5b6b4f", 0.25);
  ctx.beginPath();
  ctx.ellipse(x, y + 6, rr + 14, rr * 0.82 + 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.stoneDark;
  ctx.beginPath();
  ctx.ellipse(x, y, rr + 8, rr * 0.82 + 8, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(x - 40, y - 40, 10, x, y, rr);
  g.addColorStop(0, "#f6f1e7");
  g.addColorStop(1, C.stone);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, rr, rr * 0.82, 0, 0, Math.PI * 2);
  ctx.fill();
  // Inlaid compass in the district colours.
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 - Math.PI / 2;
    ctx.fillStyle = k % 2 ? "#c4cad2" : districts[(k / 2) % 4].color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a - 0.16) * 34, y + Math.sin(a - 0.16) * 28);
    ctx.lineTo(x + Math.cos(a) * (k % 2 ? 64 : 104), y + Math.sin(a) * (k % 2 ? 52 : 85));
    ctx.lineTo(x + Math.cos(a + 0.16) * 34, y + Math.sin(a + 0.16) * 28);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "#38424f";
  ctx.beginPath();
  ctx.ellipse(x, y, 12, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgba("#8f8471", 0.35);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y, rr - 18, rr * 0.82 - 16, 0, 0, Math.PI * 2);
  ctx.stroke();
}

export function renderTile(w: WorldData, tx: number, ty: number, scale: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = Math.ceil(TILE * scale) + 1;
  const ctx = c.getContext("2d")!;
  ctx.scale(scale, scale);
  const x0 = tx * TILE;
  const y0 = ty * TILE;
  const x1 = x0 + TILE;
  const y1 = y0 + TILE;
  ctx.translate(-x0, -y0);
  ctx.fillStyle = C.grass;
  ctx.fillRect(x0, y0, TILE + 2, TILE + 2);

  const flats = w.flats.get(`${tx},${ty}`) ?? [];
  for (const f of flats) {
    if (f.kind !== "blotch") continue;
    const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.s);
    g.addColorStop(0, rgba(f.color, 0.38));
    g.addColorStop(1, rgba(f.color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(f.x - f.s, f.y - f.s, f.s * 2, f.s * 2);
  }
  // Deeper, lusher grass towards the edge of the world.
  const fade = 340;
  if (x0 < fade || y0 < fade || x1 > WORLD_W - fade || y1 > WORLD_H - fade) {
    const sides: [number, number, number, number][] = [
      [0, 0, fade, 0],
      [WORLD_W, 0, WORLD_W - fade, 0],
      [0, 0, 0, fade],
      [0, WORLD_H, 0, WORLD_H - fade],
    ];
    for (const [ax, ay, bx, by] of sides) {
      const g = ctx.createLinearGradient(ax, ay, bx, by);
      g.addColorStop(0, rgba(C.grassDeep, 0.55));
      g.addColorStop(1, rgba(C.grassDeep, 0));
      ctx.fillStyle = g;
      ctx.fillRect(x0, y0, TILE + 2, TILE + 2);
    }
  }

  // Brush-stroke grass, including neighbouring cells' strokes so the texture
  // runs across tile edges without seams.
  const strokes: [number, number, number, number, number][] = [];
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) strokesFor(tx + dx, ty + dy, strokes);
  const strokeColors = [rgba("#b4f08a", 0.55), rgba("#2c7a3e", 0.4), rgba("#7fd36a", 0.5)];
  ctx.lineCap = "round";
  ctx.lineWidth = 1.8;
  for (let k = 0; k < 3; k++) {
    ctx.strokeStyle = strokeColors[k];
    ctx.beginPath();
    for (const [x, y, len, a, col] of strokes) {
      if (col !== k || x < x0 - 14 || x > x1 + 14 || y < y0 - 14 || y > y1 + 14) continue;
      dab(ctx, x, y, len, a, 2);
    }
    ctx.stroke();
  }

  if (intersects([0, TRACK_Y - 40, WORLD_W, TRACK_Y + 40], x0, y0, x1, y1)) paintTrack(ctx, x0, x1);
  for (const p of PONDS) if (intersects([p.x - p.rx - 40, p.y - p.ry - 40, p.x + p.rx + 40, p.y + p.ry + 40], x0, y0, x1, y1)) paintPond(ctx, p);
  for (const d of districts) {
    const { x, y, rx, ry } = d.court;
    if (intersects([x - rx - 30, y - ry - 30, x + rx + 30, y + ry + 30], x0, y0, x1, y1)) paintCourt(ctx, d);
  }
  for (const pts of w.roadPts) {
    let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
    for (const [x, y] of pts) {
      bx0 = Math.min(bx0, x);
      by0 = Math.min(by0, y);
      bx1 = Math.max(bx1, x);
      by1 = Math.max(by1, y);
    }
    if (intersects([bx0 - 50, by0 - 50, bx1 + 50, by1 + 50], x0, y0, x1, y1)) paintRoad(ctx, pts);
  }
  if (intersects([PLAZA.x - 200, PLAZA.y - 200, PLAZA.x + 200, PLAZA.y + 200], x0, y0, x1, y1)) paintPlaza(ctx);

  for (const f of flats) {
    if (f.kind === "blotch") continue;
    const r = mulberry32(f.seed);
    if (f.kind === "tuft") {
      ctx.strokeStyle = r() < 0.5 ? "#4f8a4c" : "#3f7348";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = -2; i <= 2; i++) dab(ctx, f.x + i * 3 * f.s, f.y, range(r, 8, 14) * f.s, -Math.PI / 2 + i * 0.25, 2);
      ctx.stroke();
      ctx.strokeStyle = "#a9d67b";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      dab(ctx, f.x - 2, f.y, 10 * f.s, -Math.PI / 2 - 0.2, 2);
      ctx.stroke();
    } else {
      for (let i = 0; i < 7; i++) {
        const fx = f.x + range(r, -16, 16) * f.s;
        const fy = f.y + range(r, -9, 9) * f.s;
        ctx.fillStyle = "#4f8a4c";
        ctx.beginPath();
        ctx.ellipse(fx + 3, fy + 3, 3.5, 2, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.arc(fx, fy, range(r, 2.2, 3.4), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,240,180,0.9)";
        ctx.beginPath();
        ctx.arc(fx, fy, 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  if (intersects([TAGLINE.x - 520, TAGLINE.y - 40, TAGLINE.x + 520, TAGLINE.y + 40], x0, y0, x1, y1)) {
    text(ctx, TAGLINE.text, TAGLINE.x, TAGLINE.y, 26, "#ffffff", { shadow: "rgba(10,30,60,0.6)" });
  }
  return c;
}
