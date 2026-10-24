import type { PropKind, TreeKind } from "./art";
import { COURT, DECOR, EDGE, NAME, PARKING, PLAZA, PONDS, TAGLINE, TRACK_Y, WORLD_H, WORLD_W, districts, places, roads } from "./places";
import { type Ctx, type Pt, C, blobPath, clouds, displayFont, grain, mulberry32, pick, range, rgba, text, texture } from "./paint";

export const TILE = 512;
const ROAD_W = 56;
const GRID = 160;

export type StandingKind = TreeKind | "roof";

export interface Standing {
  kind: StandingKind;
  x: number;
  y: number;
  s: number;
  variant: number;
  /** Rooftops only: footprint and height. */
  w: number;
  h: number;
  height: number;
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

/** A circle (r) or, when hw/hh are set, an axis-aligned box centred on x, y. */
export interface Collider {
  x: number;
  y: number;
  r: number;
  hw?: number;
  hh?: number;
  ref: ColliderRef;
}

interface Flat {
  kind: "blotch" | "flowers";
  x: number;
  y: number;
  s: number;
  seed: number;
  color: string;
}

export interface WorldData {
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
    if (x < EDGE + 20 || y < EDGE + 30 || x > WORLD_W - EDGE - 20 || y > WORLD_H - EDGE - 10) return true;
    if (Math.abs(y - TRACK_Y) < 80 + pad) return true;
    if (Math.hypot(x - PLAZA.x, y - PLAZA.y) < PLAZA.r + 50 + pad) return true;
    if (Math.abs(x - NAME.x) < nameHalf + pad && y > NAME.y - 90 - pad && y < TAGLINE.y + 40 + pad) return true;
    for (const p of PONDS) if (inEllipse(x, y, p.x, p.y, p.rx + 30 + pad, p.ry + 26 + pad)) return true;
    for (const d of DECOR) if (Math.hypot(x - d.x, y - d.y) < 140 + pad) return true;
    for (const d of districts) {
      if (inEllipse(x, y, d.court.x, d.court.y, d.court.rx + 50 + pad, d.court.ry + 60 + pad)) return true;
      if (Math.abs(x - d.gate.x) < 200 + pad && Math.abs(y - d.gate.y) < 60 + pad) return true;
    }
    for (const p of places) {
      if (Math.abs(x - p.x) < p.w / 2 + 40 + pad && Math.abs(y - p.y) < p.h / 2 + 90 + pad) return true;
    }
    for (const [rx, ry] of allRoad) if (Math.abs(rx - x) < 90 + pad && Math.abs(ry - y) < 90 + pad && Math.hypot(rx - x, ry - y) < 70 + pad) return true;
    return false;
  };

  const standing: Standing[] = [];
  const roofOverlaps = (x: number, y: number, w: number, h: number) =>
    standing.some((s) => s.kind === "roof" && Math.abs(s.x - x) < (s.w + w) / 2 + 36 && Math.abs(s.y - y) < (s.h + h) / 2 + 36);

  // City blocks around the north, west and east edges.
  for (let placed = 0, tries = 0; placed < 30 && tries < 3000; tries++) {
    const w = Math.round(range(r, 130, 210));
    const h = Math.round(range(r, 100, 170));
    const x = range(r, EDGE + w / 2 + 10, WORLD_W - EDGE - w / 2 - 10);
    const y = range(r, EDGE + h / 2 + 10, TRACK_Y - 220);
    const inBand = y < 330 || x < 320 || x > WORLD_W - 320;
    if (!inBand) continue;
    const corners: Pt[] = [[x - w / 2, y - h / 2], [x + w / 2, y - h / 2], [x - w / 2, y + h / 2], [x + w / 2, y + h / 2], [x, y]];
    if (corners.some(([cx, cy]) => blocked(cx, cy, 10))) continue;
    if (roofOverlaps(x, y, w, h)) continue;
    standing.push({ kind: "roof", x, y, s: 1, variant: Math.floor(r() * 30), w, h, height: Math.round(range(r, 50, 210)) });
    placed++;
  }

  const crowded = (x: number, y: number, d: number) =>
    standing.some((s) => (s.kind === "roof" ? Math.abs(s.x - x) < s.w / 2 + d / 2 && Math.abs(s.y - y) < s.h / 2 + d / 2 : Math.hypot(s.x - x, s.y - y) < d));
  const scatter = (kind: TreeKind, count: number, opts: { pad?: number; spacing?: number; where?: (x: number, y: number) => boolean }) => {
    const { pad = 10, spacing = 0, where } = opts;
    let placed = 0;
    for (let tries = 0; placed < count && tries < count * 40; tries++) {
      const x = range(r, 0, WORLD_W);
      const y = range(r, 0, WORLD_H);
      if (where && !where(x, y)) continue;
      if (blocked(x, y, pad)) continue;
      if (spacing && crowded(x, y, spacing)) continue;
      standing.push({ kind, x, y, s: range(r, 0.85, 1.25), variant: Math.floor(r() * 6), w: 0, h: 0, height: 0 });
      placed++;
    }
  };
  const nearEdge = (x: number, y: number) => Math.min(x, y, WORLD_W - x, WORLD_H - y) < 420;
  // Kept deliberately sparse so there's lots of open ground to drive on.
  scatter("broadleaf", 70, { spacing: 90, pad: 20 });
  scatter("conifer", 40, { spacing: 70, where: nearEdge });
  scatter("conifer", 14, { spacing: 60, where: (x, y) => Math.hypot(x - 2320, y - 470) < 360 });
  scatter("shrub", 70, { pad: 0, spacing: 30 });
  // Trees draw on top of the car, so order doesn't matter much; roofs last.
  standing.sort((a, b) => (a.kind === "roof" ? 1 : 0) - (b.kind === "roof" ? 1 : 0));

  const colliders: Collider[] = [];
  standing.forEach((s, i) => {
    if (s.kind === "roof") colliders.push({ x: s.x, y: s.y, r: Math.hypot(s.w, s.h) / 2, hw: s.w / 2, hh: s.h / 2, ref: { type: "solid" } });
    else if (s.kind !== "shrub") colliders.push({ x: s.x, y: s.y, r: (s.kind === "broadleaf" ? 10 : 8) * s.s, ref: { type: "tree", i } });
  });

  // Breakable street furniture.
  const props: Prop[] = [];
  const addProp = (kind: PropKind, x: number, y: number, circles: [number, number, number][]) => {
    const i = props.length;
    const ids: number[] = [];
    for (const [dx, dy, cr] of circles) {
      ids.push(colliders.length);
      colliders.push({ x: x + dx, y: y + dy, r: cr, ref: { type: "prop", i } });
    }
    props.push({ kind, x, y, variant: Math.floor(r() * 6), colliders: ids, brokenAt: -1, regrowAt: -1 });
  };
  roadPts.forEach((pts) => {
    let side = 1;
    for (let i = 8; i < pts.length - 6; i += 12) {
      const [x, y] = pts[i];
      const [x2, y2] = pts[i + 1];
      const len = Math.hypot(x2 - x, y2 - y) || 1;
      const lx = x - ((y2 - y) / len) * 44 * side;
      const ly = y + ((x2 - x) / len) * 44 * side;
      side = -side;
      if (Math.hypot(lx - PLAZA.x, ly - PLAZA.y) < PLAZA.r + 30) continue;
      if (districts.some((d) => Math.hypot(lx - d.gate.x, ly - d.gate.y) < 150)) continue;
      if (Math.abs(lx - NAME.x) < nameHalf && ly > NAME.y - 70 && ly < TAGLINE.y + 30) continue;
      addProp("lamp", lx, ly, [[0, 0, 6]]);
    }
  });
  for (const d of districts)
    for (const s of [-1, 1]) for (let k = 0; k < 2; k++) addProp("barrier", d.gate.x + s * (170 + k * 58), d.gate.y + 14, [[-12, 0, 8], [12, 0, 8]]);
  for (const p of places) {
    if (p.kind === "skills") continue;
    const yy = p.y + p.h / 2 + 24;
    addProp("planter", p.x - p.w / 2 + 6, yy, [[0, 0, 15]]);
    addProp("planter", p.x + p.w / 2 - 6, yy, [[0, 0, 15]]);
  }
  for (const [x, y] of [[1590, 1200], [1810, 1200], [690, 1360], [880, 1360], [2700, 1460], [2920, 1460]]) addProp("bench", x, y, [[0, 0, 14]]);

  places.forEach((p, i) => {
    if (p.kind === "skills") colliders.push({ x: p.x, y: p.y, r: 22, ref: { type: "place", i } });
    else if (p.id === "shadowpath") colliders.push({ x: p.x, y: p.y, r: 54, ref: { type: "place", i } });
    else colliders.push({ x: p.x, y: p.y, r: Math.hypot(p.w, p.h) / 2, hw: p.w / 2, hh: p.h / 2, ref: { type: "place", i } });
  });
  for (const d of districts) for (const s of [-1, 1]) colliders.push({ x: d.gate.x + s * 122, y: d.gate.y, r: 17, hw: 12, hh: 12, ref: { type: "solid" } });
  for (const d of DECOR) colliders.push({ x: d.x, y: d.y, r: d.kind === "fountain" ? 92 : 30, ref: { type: "solid" } });

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
  const blotchColors = [C.grassLight, C.grassDark, "#7e9a45", "#5f7f36", "#94a35a", "#4a6a2c"];
  for (let i = 0; i < 520; i++) {
    const s = range(r, 90, 260);
    addFlat({ kind: "blotch", x: range(r, 0, WORLD_W), y: range(r, 0, WORLD_H), s, seed: 0, color: pick(r, blotchColors) }, s);
  }
  for (let placed = 0, tries = 0; placed < 140 && tries < 4000; tries++) {
    const x = range(r, 0, WORLD_W);
    const y = range(r, 0, WORLD_H);
    if (blocked(x, y, -30)) continue;
    addFlat({ kind: "flowers", x, y, s: range(r, 0.8, 1.3), seed: Math.floor(r() * 1e9), color: pick(r, ["#f2f0e6", "#e8d36a", "#d9e2ef"]) }, 26);
    placed++;
  }

  return { standing, props, flats, roadPts, colliders, grid };
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

/**
 * Push a circle out of a collider. Returns the contact normal and depth, or
 * null when there's no overlap.
 */
export function contact(c: Collider, x: number, y: number, rad: number): { nx: number; ny: number; depth: number } | null {
  if (c.hw === undefined || c.hh === undefined) {
    const dx = x - c.x;
    const dy = y - c.y;
    const min = rad + c.r;
    const d2 = dx * dx + dy * dy;
    if (d2 >= min * min) return null;
    const d = Math.sqrt(d2) || 0.01;
    return { nx: dx / d, ny: dy / d, depth: min - d };
  }
  const cx = Math.max(c.x - c.hw, Math.min(x, c.x + c.hw));
  const cy = Math.max(c.y - c.hh, Math.min(y, c.y + c.hh));
  let dx = x - cx;
  let dy = y - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 > 0) {
    if (d2 >= rad * rad) return null;
    const d = Math.sqrt(d2);
    return { nx: dx / d, ny: dy / d, depth: rad - d };
  }
  // Centre is inside the box: push out along the shallowest axis.
  const px = c.hw - Math.abs(x - c.x);
  const py = c.hh - Math.abs(y - c.y);
  if (px < py) {
    dx = Math.sign(x - c.x) || 1;
    return { nx: dx, ny: 0, depth: px + rad };
  }
  dy = Math.sign(y - c.y) || 1;
  return { nx: 0, ny: dy, depth: py + rad };
}

// ---------------------------------------------------------------------------
// Ground tiles
// ---------------------------------------------------------------------------

const intersects = (b: [number, number, number, number], x0: number, y0: number, x1: number, y1: number) =>
  b[0] < x1 && b[2] > x0 && b[1] < y1 && b[3] > y0;

function strokeLine(ctx: Ctx, pts: Pt[]) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
}

function offsetLine(pts: Pt[], off: number): Pt[] {
  return pts.map(([x, y], i) => {
    const [x2, y2] = pts[Math.min(i + 1, pts.length - 1)];
    const [xp, yp] = pts[Math.max(i - 1, 0)];
    const len = Math.hypot(x2 - xp, y2 - yp) || 1;
    return [x - ((y2 - yp) / len) * off, y + ((x2 - xp) / len) * off];
  });
}

const ROAD_WORDS = ["PROJECTS", "CONNECTIONS", "HOME", "THE COURT"];

function paintRoad(ctx: Ctx, pts: Pt[], idx: number) {
  ctx.lineCap = "butt";
  ctx.lineJoin = "round";
  for (const [color, width] of [
    [C.curb, ROAD_W + 40],
    [C.sidewalk, ROAD_W + 34],
    [C.curb, ROAD_W + 6],
    [C.asphalt, ROAD_W],
  ] as const) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    strokeLine(ctx, pts);
    ctx.stroke();
  }
  // Pavement joints.
  ctx.strokeStyle = rgba("#8a867e", 0.55);
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
      ctx.lineTo(x + nx * s * (ROAD_W / 2 + 17), y + ny * s * (ROAD_W / 2 + 17));
      ctx.stroke();
    }
  }
  // Lane markings: solid edge lines and a dashed centre line.
  ctx.strokeStyle = "rgba(240, 240, 232, 0.85)";
  ctx.lineWidth = 1.6;
  for (const off of [-ROAD_W / 2 + 4, ROAD_W / 2 - 4]) {
    strokeLine(ctx, offsetLine(pts, off));
    ctx.stroke();
  }
  ctx.setLineDash([16, 14]);
  ctx.lineWidth = 2;
  strokeLine(ctx, pts);
  ctx.stroke();
  ctx.setLineDash([]);
  // Zebra crossings near both ends.
  for (const k of [4, pts.length - 5]) {
    const [x, y] = pts[k];
    const [x2, y2] = pts[k + 1];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.atan2(y2 - y, x2 - x));
    ctx.fillStyle = "rgba(240, 240, 232, 0.88)";
    for (let j = -3; j <= 3; j++) ctx.fillRect(-9, j * 7.5 - 2.5, 18, 5);
    ctx.restore();
  }
  // Destination word painted on the approach to each district gate, reading upright.
  const [wx, wy] = pts[64];
  const [wx2, wy2] = pts[65];
  let a = Math.atan2(wy2 - wy, wx2 - wx) + Math.PI / 2;
  if (Math.cos(a) < 0) a += Math.PI;
  ctx.save();
  ctx.translate(wx, wy);
  ctx.rotate(a);
  text(ctx, ROAD_WORDS[idx] ?? "", 0, 0, 13, "rgba(240,240,232,0.85)", { weight: 700 });
  ctx.restore();
}

function paintCourt(ctx: Ctx, d: (typeof districts)[number]) {
  const { x, y, rx, ry, surface } = d.court;
  const r = mulberry32(x + y);
  if (surface === "meadow") {
    // Manicured lawn with mowing stripes and a gravel path ring.
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.clip();
    for (let sx = x - rx; sx < x + rx; sx += 40) {
      ctx.fillStyle = Math.floor((sx - x) / 40) % 2 ? "rgba(255,255,230,0.07)" : "rgba(0,30,0,0.06)";
      ctx.fillRect(sx, y - ry, 40, ry * 2);
    }
    ctx.restore();
    ctx.strokeStyle = "#cbbf9f";
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.ellipse(x, y, rx * 0.66, ry * 0.66, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.ellipse(x, y, rx * 0.66, ry * 0.66, 0, 0, Math.PI * 2);
    texture(ctx, grain(), 0.4, "overlay");
    return;
  }
  if (surface === "court") {
    paintBasketballCourt(ctx, d.court);
    return;
  }
  // Granite paving: an edge band, then pavers with varied tone and joints.
  ctx.fillStyle = C.stoneDark;
  ctx.beginPath();
  ctx.ellipse(x, y, rx + 8, ry + 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.clip();
  const size = 34;
  for (let px = x - rx; px < x + rx; px += size)
    for (let py = y - ry; py < y + ry; py += size) {
      const v = r();
      ctx.fillStyle = v < 0.33 ? "#d3cec2" : v < 0.66 ? "#c8c2b5" : "#ddd8cc";
      ctx.fillRect(px, py, size, size);
    }
  ctx.strokeStyle = "rgba(90, 84, 74, 0.35)";
  ctx.lineWidth = 1;
  for (let px = x - rx; px < x + rx; px += size) {
    ctx.beginPath();
    ctx.moveTo(px, y - ry);
    ctx.lineTo(px, y + ry);
    ctx.stroke();
  }
  for (let py = y - ry; py < y + ry; py += size) {
    ctx.beginPath();
    ctx.moveTo(x - rx, py);
    ctx.lineTo(x + rx, py);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.rect(x - rx, y - ry, rx * 2, ry * 2);
  texture(ctx, grain(), 0.35, "overlay");
  texture(ctx, clouds(), 0.25, "multiply");
  ctx.restore();
}

function paintBasketballCourt(ctx: Ctx, c: (typeof districts)[number]["court"]) {
  const { x, y, rx, ry } = c;
  ctx.fillStyle = C.curb;
  ctx.beginPath();
  ctx.ellipse(x, y, rx + 10, ry + 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#c2bdb2";
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  texture(ctx, grain(), 0.4, "overlay");
  const { x: cx, y: cy, half } = COURT;
  const w = half * 2 + 60;
  const h = 200;
  ctx.beginPath();
  ctx.rect(cx - w / 2, cy - h / 2, w, h);
  ctx.fillStyle = "#3f6f57";
  ctx.fill();
  ctx.beginPath();
  ctx.rect(cx - w / 2 + 12, cy - h / 2 + 12, w - 24, h - 24);
  ctx.fillStyle = "#8a4b37";
  ctx.fill();
  texture(ctx, grain(), 0.3, "overlay");
  ctx.strokeStyle = "rgba(245,245,238,0.9)";
  ctx.lineWidth = 2.5;
  ctx.strokeRect(cx - w / 2 + 12, cy - h / 2 + 12, w - 24, h - 24);
  ctx.beginPath();
  ctx.moveTo(cx, cy - h / 2 + 12);
  ctx.lineTo(cx, cy + h / 2 - 12);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 28, 0, Math.PI * 2);
  ctx.stroke();
  for (const s of [-1, 1]) {
    const bx = cx + s * (w / 2 - 12);
    const kx = s > 0 ? bx - 70 : bx;
    ctx.fillStyle = "#3f6f57";
    ctx.fillRect(kx, cy - 30, 70, 60);
    ctx.strokeRect(kx, cy - 30, 70, 60);
    ctx.beginPath();
    ctx.arc(bx, cy, 92, s > 0 ? Math.PI * 0.6 : -Math.PI * 0.4, s > 0 ? Math.PI * 1.4 : Math.PI * 0.4);
    ctx.stroke();
    // Hoop + backboard.
    const hx = cx + s * (half + 20);
    ctx.fillStyle = "#f4f3ee";
    ctx.fillRect(hx + s * 14 - 2, cy - 14, 4, 28);
    ctx.strokeStyle = "#e0662a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(hx, cy, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(245,245,238,0.9)";
    ctx.lineWidth = 2.5;
  }
}

function paintTrack(ctx: Ctx, x0: number, x1: number) {
  ctx.beginPath();
  ctx.rect(x0, TRACK_Y - 30, x1 - x0, 60);
  ctx.fillStyle = "#8b8780";
  ctx.fill();
  texture(ctx, grain(), 0.8, "overlay");
  texture(ctx, clouds(), 0.3, "multiply");
  for (let x = Math.floor(x0 / 20) * 20; x < x1; x += 20) {
    ctx.fillStyle = "rgba(14,22,30,0.25)";
    ctx.fillRect(x + 2, TRACK_Y - 20, 9, 42);
    ctx.fillStyle = "#b8b3a8";
    ctx.fillRect(x, TRACK_Y - 22, 9, 42);
  }
  for (const off of [-11, 9]) {
    ctx.fillStyle = "rgba(14,22,30,0.35)";
    ctx.fillRect(x0, TRACK_Y + off + 2, x1 - x0, 3);
    ctx.fillStyle = "#c9ced3";
    ctx.fillRect(x0, TRACK_Y + off, x1 - x0, 3);
    ctx.fillStyle = "#6f757b";
    ctx.fillRect(x0, TRACK_Y + off + 2, x1 - x0, 1);
  }
}

function paintPond(ctx: Ctx, p: (typeof PONDS)[number]) {
  const r = mulberry32(p.x * 3 + p.y);
  blobPath(ctx, p.x, p.y, p.rx + 14, p.ry + 12, r, 0.06);
  ctx.fillStyle = "#7a6a4a";
  ctx.fill();
  texture(ctx, grain(), 0.5, "overlay");
  blobPath(ctx, p.x, p.y, p.rx, p.ry, r, 0.06);
  const g = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, p.rx);
  g.addColorStop(0, C.waterDeep);
  g.addColorStop(0.75, C.water);
  g.addColorStop(1, "#5b8a7a");
  ctx.fillStyle = g;
  ctx.fill();
  texture(ctx, clouds(), 0.35, "overlay");
  for (let i = 0; i < 7; i++) {
    const x = p.x + range(r, -p.rx * 0.7, p.rx * 0.7);
    const y = p.y + range(r, -p.ry * 0.6, p.ry * 0.6);
    ctx.fillStyle = i % 2 ? "#4f7a3a" : "#5f8a44";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.ellipse(x, y, 8, 7, 0, 0.3, Math.PI * 2 - 0.3);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "#3e5a2a";
  for (let i = 0; i < 40; i++) {
    const a = range(r, 0, Math.PI * 2);
    ctx.beginPath();
    ctx.arc(p.x + Math.cos(a) * p.rx * 0.97, p.y + Math.sin(a) * p.ry * 0.97, range(r, 2, 4), 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintPlaza(ctx: Ctx) {
  const { x, y, r: rr } = PLAZA;
  ctx.fillStyle = C.stoneDark;
  ctx.beginPath();
  ctx.ellipse(x, y, rr + 8, rr * 0.82 + 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, rr, rr * 0.82, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#d6d1c5";
  ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  // Radial pavers.
  ctx.strokeStyle = "rgba(90,84,74,0.35)";
  ctx.lineWidth = 1;
  for (let k = 1; k < 7; k++) {
    ctx.beginPath();
    ctx.ellipse(x, y, (rr * k) / 7, (rr * 0.82 * k) / 7, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let k = 0; k < 32; k++) {
    const a = (k / 32) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * rr * 0.14, y + Math.sin(a) * rr * 0.12);
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.82);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.rect(x - rr, y - rr, rr * 2, rr * 2);
  texture(ctx, grain(), 0.35, "overlay");
  texture(ctx, clouds(), 0.2, "multiply");
  ctx.restore();
  // Brass compass inlay.
  ctx.strokeStyle = "#a88a4a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y, 40, 33, 0, 0, Math.PI * 2);
  ctx.stroke();
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 - Math.PI / 2;
    ctx.fillStyle = districts[k].color;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * 62, y + Math.sin(a) * 51);
    ctx.lineTo(x + Math.cos(a + 0.18) * 16, y + Math.sin(a + 0.18) * 13);
    ctx.lineTo(x + Math.cos(a - 0.18) * 16, y + Math.sin(a - 0.18) * 13);
    ctx.closePath();
    ctx.fill();
  }
}

function paintParking(ctx: Ctx) {
  ctx.strokeStyle = "rgba(245,245,238,0.8)";
  ctx.lineWidth = 2;
  for (const s of PARKING) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.a);
    ctx.beginPath();
    ctx.moveTo(-36, -24);
    ctx.lineTo(36, -24);
    ctx.moveTo(-36, 24);
    ctx.lineTo(36, 24);
    ctx.moveTo(-36, -24);
    ctx.lineTo(-36, 24);
    ctx.stroke();
    ctx.restore();
  }
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
  ctx.beginPath();
  ctx.rect(x0, y0, TILE + 2, TILE + 2);
  ctx.fillStyle = C.grass;
  ctx.fill();

  const flats = w.flats.get(`${tx},${ty}`) ?? [];
  for (const f of flats) {
    if (f.kind !== "blotch") continue;
    const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.s);
    g.addColorStop(0, rgba(f.color, 0.4));
    g.addColorStop(1, rgba(f.color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(f.x - f.s, f.y - f.s, f.s * 2, f.s * 2);
  }
  ctx.beginPath();
  ctx.rect(x0, y0, TILE + 2, TILE + 2);
  texture(ctx, clouds(), 0.4, "multiply");
  texture(ctx, grain(), 0.35, "overlay");

  if (intersects([0, TRACK_Y - 40, WORLD_W, TRACK_Y + 40], x0, y0, x1, y1)) paintTrack(ctx, x0, x1 + 2);
  for (const p of PONDS) if (intersects([p.x - p.rx - 40, p.y - p.ry - 40, p.x + p.rx + 40, p.y + p.ry + 40], x0, y0, x1, y1)) paintPond(ctx, p);
  for (const d of districts) {
    const { x, y, rx, ry } = d.court;
    if (intersects([x - rx - 30, y - ry - 30, x + rx + 30, y + ry + 30], x0, y0, x1, y1)) paintCourt(ctx, d);
  }
  w.roadPts.forEach((pts, i) => {
    let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
    for (const [x, y] of pts) {
      bx0 = Math.min(bx0, x);
      by0 = Math.min(by0, y);
      bx1 = Math.max(bx1, x);
      by1 = Math.max(by1, y);
    }
    if (intersects([bx0 - 60, by0 - 60, bx1 + 60, by1 + 60], x0, y0, x1, y1)) paintRoad(ctx, pts, i);
  });
  if (intersects([PLAZA.x - 200, PLAZA.y - 200, PLAZA.x + 200, PLAZA.y + 200], x0, y0, x1, y1)) paintPlaza(ctx);
  paintParking(ctx);

  for (const f of flats) {
    if (f.kind !== "flowers") continue;
    const r = mulberry32(f.seed);
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.arc(f.x + range(r, -14, 14) * f.s, f.y + range(r, -9, 9) * f.s, range(r, 1, 1.8), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (intersects([TAGLINE.x - 560, TAGLINE.y - 40, TAGLINE.x + 560, TAGLINE.y + 40], x0, y0, x1, y1)) {
    // Dark stone plaque set into the ground so the line reads on any surface.
    ctx.font = displayFont(22, 700);
    const tw = ctx.measureText(TAGLINE.text).width;
    const pw = tw + 56;
    const ph = 42;
    const px = TAGLINE.x - pw / 2;
    const py = TAGLINE.y - ph / 2;
    ctx.fillStyle = "rgba(10, 16, 24, 0.35)";
    ctx.beginPath();
    ctx.roundRect(px + 3, py + 4, pw, ph, 8);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 8);
    ctx.fillStyle = "#1b2330";
    ctx.fill();
    texture(ctx, grain(), 0.25, "overlay");
    ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(px + 4, py + 4, pw - 8, ph - 8, 5);
    ctx.stroke();
    text(ctx, TAGLINE.text, TAGLINE.x, TAGLINE.y + 1, 22, "#f8fafc", { weight: 700 });
  }
  return c;
}
