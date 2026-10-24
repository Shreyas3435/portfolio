import type { Place } from "./places";
import {
  type Ctx,
  type Pt,
  type Rand,
  INK,
  INK_SOFT,
  INK_FAINT,
  edge,
  ellipsePts,
  fillPaper,
  handText,
  hatch,
  range,
  rectPts,
  scribble,
  sketchPoly,
  underline,
  wash,
} from "./sketch";

// Landmarks are drawn "front-facing" like an illustrated map, with the anchor
// (0, 0) at the middle of the ground line. Static parts go into a cached
// sprite; anything that moves is drawn per frame by the matching overlay.

type Drawer = (ctx: Ctx, r: Rand, p: Place) => void;

function groundShadow(ctx: Ctx, r: Rand, rx: number, ry: number, oy = 6) {
  const pts = ellipsePts(10, oy, rx, ry, r, 0.05);
  hatch(ctx, pts, r, { gap: 5, angle: -0.5, color: INK_FAINT });
}

function label(ctx: Ctx, r: Rand, p: Place, y: number, size: number) {
  handText(ctx, p.title, 0, y, size, p.ink);
  const w = Math.min(p.title.length * size * 0.42, 440);
  underline(ctx, -w / 2, w / 2, y + size * 0.42, p.color, r, 6);
  handText(ctx, p.subtitle, 0, y + size * 0.42 + 22, 23, INK, { weight: 500 });
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const watchtower: Drawer = (ctx, r, p) => {
  const island = ellipsePts(0, 4, 225, 70, r, 0.1);
  wash(ctx, island, "#cfd6dc", r, { alpha: 0.5 });
  scribble(ctx, island, r, { width: 1.4 });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + range(r, -0.2, 0.2);
    const rock = ellipsePts(Math.cos(a) * 170, 6 + Math.sin(a) * 48, range(r, 14, 24), range(r, 9, 14), r, 0.25);
    fillPaper(ctx, rock);
    hatch(ctx, rock, r, { gap: 4 });
    scribble(ctx, rock, r, { width: 1.2 });
  }
  groundShadow(ctx, r, 70, 16);

  // Tower: a tapered column with alternating red bands.
  const bands = 5;
  const botW = 48;
  const topW = 30;
  const top = -232;
  for (let i = 0; i < bands; i++) {
    const y0 = lerp(0, top, i / bands);
    const y1 = lerp(0, top, (i + 1) / bands);
    const w0 = lerp(botW, topW, i / bands);
    const w1 = lerp(botW, topW, (i + 1) / bands);
    const band: Pt[] = [[-w0, y0], [w0, y0], [w1, y1], [-w1, y1]];
    fillPaper(ctx, band);
    if (i % 2 === 0) wash(ctx, band, p.color, r, { alpha: 0.75 });
  }
  hatch(ctx, [[18, 0], [botW, 0], [topW, top], [10, top]], r, { gap: 5, angle: -1.2 });
  sketchPoly(ctx, [[-botW, 0], [botW, 0], [topW, top], [-topW, top]], r, { width: 2 });
  // Door.
  sketchPoly(ctx, [[-12, 0], [-12, -30], [12, -30], [12, 0]], r, { closed: false });
  // Gallery + railing.
  const gal = rectPts(-46, top - 12, 92, 12);
  fillPaper(ctx, gal);
  wash(ctx, gal, p.accent, r, { alpha: 0.5 });
  sketchPoly(ctx, gal, r);
  for (let x = -40; x <= 40; x += 10) edge(ctx, [x, top - 12], [x, top - 30], r, { width: 1, passes: 1 });
  edge(ctx, [-46, top - 30], [46, top - 30], r, { width: 1.2 });
  // Lamp room.
  const lamp = rectPts(-28, top - 56, 56, 44);
  fillPaper(ctx, lamp);
  wash(ctx, lamp, "#ffd166", r, { alpha: 0.85 });
  sketchPoly(ctx, lamp, r, { width: 1.8 });
  edge(ctx, [-9, top - 56], [-9, top - 12], r, { width: 1, passes: 1 });
  edge(ctx, [9, top - 56], [9, top - 12], r, { width: 1, passes: 1 });
  // Roof.
  const roof: Pt[] = [[-38, top - 56], [0, top - 96], [38, top - 56]];
  fillPaper(ctx, roof);
  wash(ctx, roof, p.color, r, { alpha: 0.9 });
  sketchPoly(ctx, roof, r, { width: 2 });
  scribble(ctx, ellipsePts(0, top - 102, 6, 6, r), r, { width: 1.4 });
  label(ctx, r, p, 80, 56);
};

const boltWorks: Drawer = (ctx, r, p) => {
  const pad = rectPts(-250, -18, 500, 56);
  hatch(ctx, pad, r, { gap: 9, angle: 0.3, color: INK_FAINT });
  groundShadow(ctx, r, 220, 18, 4);

  // Saw-tooth factory hall.
  const x0 = -210;
  const x1 = 90;
  const wallTop = -150;
  const body = rectPts(x0, wallTop, x1 - x0, -wallTop);
  fillPaper(ctx, body);
  wash(ctx, body, p.color, r, { alpha: 0.42 });
  sketchPoly(ctx, body, r, { width: 2 });
  const teeth = 3;
  const tw = (x1 - x0) / teeth;
  for (let i = 0; i < teeth; i++) {
    const tx = x0 + i * tw;
    const tooth: Pt[] = [[tx, wallTop], [tx, wallTop - 48], [tx + tw, wallTop]];
    fillPaper(ctx, tooth);
    wash(ctx, tooth, p.color, r, { alpha: 0.7 });
    const glass: Pt[] = [[tx + 4, wallTop - 6], [tx + 4, wallTop - 40], [tx + 24, wallTop - 30], [tx + 24, wallTop - 6]];
    wash(ctx, glass, p.accent, r, { alpha: 0.55, spread: 1 });
    sketchPoly(ctx, tooth, r, { width: 1.8 });
  }
  // Windows.
  for (let i = 0; i < 4; i++) {
    const w = rectPts(x0 + 18 + i * 70, wallTop + 26, 40, 30);
    fillPaper(ctx, w, "#fbf8f1");
    wash(ctx, w, p.accent, r, { alpha: 0.35, spread: 1 });
    sketchPoly(ctx, w, r, { width: 1.2 });
    edge(ctx, [x0 + 38 + i * 70, wallTop + 26], [x0 + 38 + i * 70, wallTop + 56], r, { width: 1, passes: 1 });
  }
  // Roller door.
  const door = rectPts(-60, -78, 80, 78);
  fillPaper(ctx, door, "#efe7d6");
  sketchPoly(ctx, door, r, { width: 1.6 });
  for (let y = -70; y < 0; y += 9) edge(ctx, [-58, y], [18, y], r, { width: 0.9, passes: 1, color: INK_SOFT });
  // Chimney.
  const chim = rectPts(40, -250, 32, 100);
  fillPaper(ctx, chim);
  wash(ctx, chim, "#c9c2b4", r, { alpha: 0.6 });
  for (let y = -240; y < -150; y += 24) wash(ctx, rectPts(40, y, 32, 10), p.color, r, { alpha: 0.7, spread: 1 });
  sketchPoly(ctx, chim, r, { width: 1.8 });
  // Gear stand (the gear itself turns in the overlay).
  sketchPoly(ctx, [[150, 0], [170, -110], [190, 0]], r, { width: 1.8 });
  edge(ctx, [140, 0], [200, 0], r, { width: 2 });

  // A giant bolt lying in front with a paper tag.
  const bx = -170;
  const by = 46;
  const shaft = rectPts(bx, by - 11, 120, 22);
  fillPaper(ctx, shaft);
  wash(ctx, shaft, "#b9b3a6", r, { alpha: 0.6 });
  sketchPoly(ctx, shaft, r);
  for (let x = bx + 30; x < bx + 120; x += 9) edge(ctx, [x, by - 11], [x - 5, by + 11], r, { width: 0.9, passes: 1 });
  const head: Pt[] = [[bx - 32, by - 20], [bx - 18, by - 28], [bx, by - 20], [bx, by + 20], [bx - 18, by + 28], [bx - 32, by + 20]];
  fillPaper(ctx, head);
  wash(ctx, head, p.color, r, { alpha: 0.8 });
  sketchPoly(ctx, head, r, { width: 1.8 });
  edge(ctx, [bx + 60, by - 11], [bx + 74, by - 40], r, { width: 1, passes: 1 });
  const tag: Pt[] = [[bx + 60, by - 66], [bx + 128, by - 72], [bx + 132, by - 40], [bx + 64, by - 34]];
  fillPaper(ctx, tag, "#fffaf0");
  sketchPoly(ctx, tag, r, { width: 1.2 });
  handText(ctx, "M14 ≠ M24", bx + 96, by - 53, 22, p.ink, { rot: -0.07 });

  label(ctx, r, p, 112, 48);
};

const ghats: Drawer = (ctx, r, p) => {
  groundShadow(ctx, r, 300, 20, 2);
  const mountain = (cx: number, peak: number, half: number, tint: number) => {
    const m: Pt[] = [[cx - half, 0], [cx - half * 0.3, peak * 0.6], [cx, peak], [cx + half * 0.45, peak * 0.55], [cx + half, 0]];
    fillPaper(ctx, m);
    wash(ctx, m, p.color, r, { alpha: tint });
    hatch(ctx, [[cx, peak], [cx + half * 0.45, peak * 0.55], [cx + half, 0], [cx + 6, 0]], r, { gap: 5, angle: -1.1 });
    sketchPoly(ctx, m, r, { width: 2, closed: false });
  };
  mountain(-180, -210, 150, 0.35);
  mountain(185, -235, 150, 0.4);
  mountain(0, -310, 210, 0.6);

  // Trail: a dashed zig-zag up the main peak, like an elevation profile.
  ctx.save();
  ctx.setLineDash([9, 8]);
  ctx.strokeStyle = p.accent;
  ctx.lineWidth = 3.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  const trail: Pt[] = [[70, 0], [-60, -60], [55, -125], [-35, -190], [22, -248], [0, -300]];
  trail.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.restore();
  for (const [x, y] of trail.slice(1, -1)) {
    ctx.fillStyle = p.accent;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Pines.
  const pines: [number, number, number][] = [[-300, 4, 1], [-262, 14, 0.8], [270, 8, 0.9], [305, 18, 0.7], [-120, 20, 0.7], [140, 22, 0.75]];
  for (const [x, y, s] of pines) {
    for (let k = 0; k < 3; k++) {
      const tri: Pt[] = [[x - 22 * s + k * 4 * s, y - k * 22 * s], [x, y - (k + 1.6) * 22 * s], [x + 22 * s - k * 4 * s, y - k * 22 * s]];
      fillPaper(ctx, tri);
      wash(ctx, tri, p.color, r, { alpha: 0.75, spread: 1.5 });
      sketchPoly(ctx, tri, r, { width: 1.3 });
    }
    edge(ctx, [x, y], [x, y + 8 * s], r, { width: 2 });
  }
  // Tents.
  for (const [x, y] of [[-215, 46], [-160, 56]] as Pt[]) {
    const tent: Pt[] = [[x - 26, y], [x, y - 34], [x + 26, y]];
    fillPaper(ctx, tent);
    wash(ctx, tent, p.accent, r, { alpha: 0.85 });
    sketchPoly(ctx, tent, r, { width: 1.6 });
    edge(ctx, [x, y - 34], [x + 4, y], r, { width: 1, passes: 1 });
  }
  // Altitude sign.
  edge(ctx, [215, 60], [215, 22], r, { width: 2 });
  const sign = rectPts(170, 2, 92, 26);
  fillPaper(ctx, sign, "#fffaf0");
  sketchPoly(ctx, sign, r, { width: 1.3 });
  handText(ctx, "1343 m ▲", 216, 15, 19, p.ink);

  label(ctx, r, p, 96, 58);
};

const library: Drawer = (ctx, r, p) => {
  groundShadow(ctx, r, 230, 18);
  // Steps.
  for (let i = 0; i < 3; i++) {
    const s = rectPts(-190 + i * 12, -8 * (i + 1), 380 - i * 24, 8);
    fillPaper(ctx, s);
    wash(ctx, s, p.color, r, { alpha: 0.25, spread: 1 });
    sketchPoly(ctx, s, r, { width: 1.3 });
  }
  const base = -24;
  const colTop = -184;
  const back = rectPts(-160, colTop, 320, colTop * -1 + base);
  fillPaper(ctx, back, "#f0ebe0");
  hatch(ctx, back, r, { gap: 8, angle: 1.4, color: INK_FAINT });
  for (let i = 0; i < 5; i++) {
    const cx = -136 + i * 68;
    const col = rectPts(cx - 13, colTop, 26, colTop * -1 + base);
    fillPaper(ctx, col);
    sketchPoly(ctx, col, r, { width: 1.5 });
    for (let k = -6; k <= 6; k += 6) edge(ctx, [cx + k, colTop + 6], [cx + k, base - 4], r, { width: 0.8, passes: 1, color: INK_SOFT });
  }
  const beam = rectPts(-180, colTop - 26, 360, 26);
  fillPaper(ctx, beam);
  wash(ctx, beam, p.color, r, { alpha: 0.6 });
  sketchPoly(ctx, beam, r, { width: 1.8 });
  handText(ctx, "I N D E X", 0, colTop - 13, 20, INK);
  const ped: Pt[] = [[-196, colTop - 26], [0, colTop - 96], [196, colTop - 26]];
  fillPaper(ctx, ped);
  wash(ctx, ped, p.color, r, { alpha: 0.85 });
  sketchPoly(ctx, ped, r, { width: 2 });
  scribble(ctx, ellipsePts(0, colTop - 54, 15, 15, r), r, { width: 1.4 });
  // Book stack.
  const books = ["#3e8bff", "#8ec5ff", "#1d58b8", "#5aa2ff", "#a7c8ff"];
  books.forEach((c, i) => {
    const w = range(r, 66, 84);
    const x = 215 - w / 2 + range(r, -6, 6);
    const b = rectPts(x, -18 - i * 17, w, 16);
    fillPaper(ctx, b);
    wash(ctx, b, c, r, { alpha: 0.8, spread: 1 });
    sketchPoly(ctx, b, r, { width: 1.2 });
    edge(ctx, [x + 10, -18 - i * 17], [x + 10, -2 - i * 17], r, { width: 0.8, passes: 1 });
  });
  label(ctx, r, p, 76, 46);
};

const campfire: Drawer = (ctx, r, p) => {
  groundShadow(ctx, r, 140, 16, 8);
  const ring = ellipsePts(0, -4, 46, 18, r, 0.05);
  for (let i = 0; i < ring.length; i++) {
    const [x, y] = ring[i];
    const stone = ellipsePts(x, y, 9, 6, r, 0.2);
    fillPaper(ctx, stone);
    hatch(ctx, stone, r, { gap: 3 });
    scribble(ctx, stone, r, { width: 1 });
  }
  // Logs.
  for (const a of [-0.35, 0.35]) {
    ctx.save();
    ctx.translate(0, -6);
    ctx.rotate(a);
    const log = rectPts(-36, -6, 72, 12);
    fillPaper(ctx, log);
    wash(ctx, log, "#9c6b3c", r, { alpha: 0.6, spread: 1 });
    sketchPoly(ctx, log, r, { width: 1.4 });
    ctx.restore();
  }
  // Benches.
  for (const x of [-112, 112]) {
    const bench = rectPts(x - 34, -14, 68, 16);
    fillPaper(ctx, bench);
    wash(ctx, bench, "#9c6b3c", r, { alpha: 0.45, spread: 1 });
    sketchPoly(ctx, bench, r, { width: 1.5 });
    edge(ctx, [x - 24, 2], [x - 24, 12], r);
    edge(ctx, [x + 24, 2], [x + 24, 12], r);
  }
  label(ctx, r, p, 66, 46);
};

const workshop: Drawer = (ctx, r, p) => {
  groundShadow(ctx, r, 190, 18);
  const walls = rectPts(-160, -170, 320, 170);
  fillPaper(ctx, walls);
  for (let x = -150; x < 160; x += 22) edge(ctx, [x, -164], [x, -4], r, { width: 0.8, passes: 1, color: INK_FAINT });
  sketchPoly(ctx, walls, r, { width: 2 });
  const roof: Pt[] = [[-190, -166], [0, -246], [190, -166]];
  fillPaper(ctx, roof);
  wash(ctx, roof, p.color, r, { alpha: 0.75 });
  hatch(ctx, roof, r, { gap: 7, angle: 0.5, color: INK_FAINT });
  sketchPoly(ctx, roof, r, { width: 2 });
  // Pinboard of sticky notes — one per side build.
  const board = rectPts(-128, -150, 256, 104);
  fillPaper(ctx, board);
  wash(ctx, board, "#c79a62", r, { alpha: 0.5 });
  sketchPoly(ctx, board, r, { width: 1.6 });
  const notes = ["#ffd166", "#ff8fc7", "#8ec5ff", "#7fdba6", "#ffab70", "#c6a7ff"];
  notes.forEach((c, i) => {
    const nx = -112 + (i % 3) * 80 + range(r, -4, 4);
    const ny = -140 + Math.floor(i / 3) * 48 + range(r, -3, 3);
    ctx.save();
    ctx.translate(nx + 30, ny + 19);
    ctx.rotate(range(r, -0.12, 0.12));
    const n = rectPts(-30, -19, 60, 38);
    fillPaper(ctx, n);
    wash(ctx, n, c, r, { alpha: 0.95, spread: 1 });
    sketchPoly(ctx, n, r, { width: 1, passes: 1 });
    for (let k = 0; k < 2; k++) edge(ctx, [-20, -6 + k * 10], [range(r, 6, 20), -6 + k * 10], r, { width: 0.9, passes: 1, color: INK_SOFT });
    ctx.fillStyle = "#c2213a";
    ctx.beginPath();
    ctx.arc(0, -15, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
  // Workbench.
  const bench = rectPts(-170, -36, 340, 12);
  fillPaper(ctx, bench);
  wash(ctx, bench, "#9c6b3c", r, { alpha: 0.6, spread: 1 });
  sketchPoly(ctx, bench, r, { width: 1.8 });
  for (const x of [-160, 160]) edge(ctx, [x, -24], [x, 0], r, { width: 2 });
  // Hammer + wrench.
  edge(ctx, [-60, -42], [-10, -46], r, { width: 3 });
  sketchPoly(ctx, rectPts(-66, -54, 12, 18), r, { width: 1.4 });
  scribble(ctx, ellipsePts(52, -44, 8, 6, r), r, { width: 1.6 });
  edge(ctx, [60, -44], [104, -40], r, { width: 3 });
  label(ctx, r, p, 72, 52);
};

const signpost: Drawer = (ctx, r, p) => {
  groundShadow(ctx, r, 30, 7, 2);
  const post = rectPts(-6, -118, 12, 118);
  fillPaper(ctx, post);
  wash(ctx, post, "#9c6b3c", r, { alpha: 0.55, spread: 1 });
  sketchPoly(ctx, post, r, { width: 1.5 });
  const board: Pt[] = [[-58, -182], [58, -178], [61, -116], [-56, -120]];
  fillPaper(ctx, board);
  wash(ctx, board, p.color, r, { alpha: 0.85 });
  sketchPoly(ctx, board, r, { width: 2 });
  handText(ctx, p.title, 0, -149, p.title.length > 6 ? 30 : 34, "#fffaf2");
  // Tufts at the base.
  for (const x of [-18, 14]) {
    edge(ctx, [x, 2], [x - 5, -10], r, { width: 1.1, passes: 1 });
    edge(ctx, [x + 3, 2], [x + 4, -12], r, { width: 1.1, passes: 1 });
  }
};

const drawers: Record<string, Drawer> = {
  shadowpath: watchtower,
  "industrial-product-search": boltWorks,
  "trek-saathi": ghats,
  "website-content-search": library,
  about: campfire,
  workshop,
};

export function drawLandmark(ctx: Ctx, r: Rand, p: Place) {
  (drawers[p.id] ?? signpost)(ctx, r, p);
}

// ---------------------------------------------------------------------------
// Per-frame animated overlays. These deliberately use plain shapes (no
// wobble generation) so they stay cheap.
// ---------------------------------------------------------------------------

export interface OverlaySprites {
  gear: HTMLCanvasElement;
  puff: HTMLCanvasElement;
  magnifier: HTMLCanvasElement;
}

export function drawOverlay(ctx: Ctx, p: Place, t: number, sprites: OverlaySprites, near: boolean) {
  const { x, y } = p;
  switch (p.id) {
    case "shadowpath": {
      const lx = x;
      const ly = y - 266;
      // Sweeping beam, flattened so it reads as sweeping around the tower.
      const a = t * 0.9;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.scale(1, 0.42);
      const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 300);
      g.addColorStop(0, "rgba(255, 200, 80, 0.6)");
      g.addColorStop(1, "rgba(255, 209, 102, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 300, a - 0.22, a + 0.22);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // Scan pulses on the ground.
      for (let k = 0; k < 2; k++) {
        const ph = (t * 0.45 + k * 0.5) % 1;
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = (1 - ph) * 0.55;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(x, y + 4, 60 + ph * 190, (60 + ph * 190) * 0.32, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // Findings blinking on the island.
      const marks: Pt[] = [[-150, -6], [130, 22], [-60, 44]];
      marks.forEach(([mx, my], i) => {
        const blink = 0.4 + 0.6 * Math.max(0, Math.sin(t * 3 + i * 2.1));
        ctx.globalAlpha = blink;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(x + mx, y + my - 14, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "700 16px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("!", x + mx, y + my - 13);
      });
      ctx.globalAlpha = 1;
      break;
    }
    case "industrial-product-search": {
      const gx = x + 170;
      const gy = y - 110;
      ctx.save();
      ctx.translate(gx, gy);
      ctx.rotate(t * 0.6);
      ctx.drawImage(sprites.gear, -74, -74, 148, 148);
      ctx.restore();
      for (let k = 0; k < 4; k++) {
        const ph = (t * 0.22 + k / 4) % 1;
        const s = 26 + ph * 46;
        ctx.globalAlpha = (1 - ph) * 0.8;
        ctx.drawImage(sprites.puff, x + 56 + ph * 60 + Math.sin(t + k) * 8 - s / 2, y - 262 - ph * 170 - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
      break;
    }
    case "trek-saathi": {
      const fx = x;
      const fy = y - 310;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx, fy - 58);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(fx, fy - 58);
      for (let i = 0; i <= 8; i++) {
        const u = i / 8;
        ctx.lineTo(fx + u * 46, fy - 58 + Math.sin(t * 5 - u * 4) * 4 * u);
      }
      for (let i = 8; i >= 0; i--) {
        const u = i / 8;
        ctx.lineTo(fx + u * 46, fy - 30 + Math.sin(t * 5 - u * 4) * 4 * u);
      }
      ctx.closePath();
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.stroke();
      // Two birds circling.
      for (let k = 0; k < 2; k++) {
        const a = t * 0.5 + k * Math.PI;
        const bx = x + Math.cos(a) * 150;
        const by = y - 380 + Math.sin(a) * 30;
        const flap = Math.sin(t * 8 + k) * 5;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(bx - 10, by - flap);
        ctx.quadraticCurveTo(bx - 4, by - 4, bx, by);
        ctx.quadraticCurveTo(bx + 4, by - 4, bx + 10, by - flap);
        ctx.stroke();
      }
      break;
    }
    case "website-content-search": {
      // Content chunks drifting into the index.
      for (let k = 0; k < 3; k++) {
        const ph = (t * 0.25 + k / 3) % 1;
        const cx = x - 300 + ph * 240;
        const cy = y - 150 - k * 40 + Math.sin(t * 2 + k) * 10;
        ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.9;
        ctx.fillStyle = "#fffaf0";
        ctx.strokeStyle = p.ink;
        ctx.lineWidth = 1.4;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(Math.sin(t + k) * 0.2);
        ctx.fillRect(-20, -14, 40, 28);
        ctx.strokeRect(-20, -14, 40, 28);
        ctx.beginPath();
        for (let l = 0; l < 3; l++) {
          ctx.moveTo(-14, -6 + l * 7);
          ctx.lineTo(10 - l * 4, -6 + l * 7);
        }
        ctx.stroke();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      const a = t * 0.6;
      ctx.save();
      ctx.translate(x + Math.cos(a) * 60, y - 300 + Math.sin(a * 1.3) * 16);
      ctx.rotate(Math.sin(t * 0.8) * 0.25);
      ctx.drawImage(sprites.magnifier, -60, -60, 120, 120);
      ctx.restore();
      break;
    }
    case "about": {
      const flick = (k: number) => 0.85 + Math.sin(t * 11 + k * 1.7) * 0.1 + Math.sin(t * 17 + k) * 0.06;
      const flames: [string, number, number][] = [["#ff7a3d", 34, 0], ["#ffb347", 24, 1], ["#ffe08a", 14, 2]];
      ctx.save();
      for (const [c, h, k] of flames) {
        const s = flick(k);
        const fh = h * 1.9 * s;
        const fx = x + Math.sin(t * 6 + k) * 2;
        const fy = y - 8;
        ctx.fillStyle = c;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.moveTo(fx - h * 0.6, fy);
        ctx.quadraticCurveTo(fx - h * 0.7, fy - fh * 0.6, fx, fy - fh);
        ctx.quadraticCurveTo(fx + h * 0.7, fy - fh * 0.6, fx + h * 0.6, fy);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      ctx.globalAlpha = 1;
      break;
    }
    case "workshop": {
      const swing = Math.sin(t * 1.6) * 0.25;
      ctx.save();
      ctx.translate(x, y - 166);
      ctx.rotate(swing);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 30);
      ctx.stroke();
      const glow = ctx.createRadialGradient(0, 40, 2, 0, 40, 46);
      glow.addColorStop(0, "rgba(255, 209, 102, 0.7)");
      glow.addColorStop(1, "rgba(255, 209, 102, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 40, 46, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.arc(0, 40, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      break;
    }
  }
  if (near) {
    // A soft pulsing parking ring in the place's colour.
    const [fx, fy] = p.front;
    const s = 1 + Math.sin(t * 4) * 0.06;
    ctx.strokeStyle = p.color;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 9]);
    ctx.beginPath();
    ctx.ellipse(fx, fy, 52 * s, 22 * s, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
}

export function makeOverlaySprites(scale: number, r: Rand): OverlaySprites {
  const mk = (size: number, draw: (c: Ctx) => void) => {
    const c = document.createElement("canvas");
    c.width = c.height = Math.ceil(size * scale);
    const g = c.getContext("2d")!;
    g.scale(scale, scale);
    g.translate(size / 2, size / 2);
    draw(g);
    return c;
  };
  const gear = mk(148, (g) => {
    const teeth = 10;
    const pts: Pt[] = [];
    for (let i = 0; i < teeth * 2; i++) {
      const a0 = (i / (teeth * 2)) * Math.PI * 2;
      const a1 = ((i + 1) / (teeth * 2)) * Math.PI * 2;
      const rad = i % 2 === 0 ? 68 : 54;
      pts.push([Math.cos(a0) * rad, Math.sin(a0) * rad], [Math.cos(a1) * rad, Math.sin(a1) * rad]);
    }
    fillPaper(g, pts);
    wash(g, pts, "#f5a524", r, { alpha: 0.75, spread: 1.5 });
    sketchPoly(g, pts, r, { width: 1.6, passes: 1 });
    const hole = ellipsePts(0, 0, 18, 18, r, 0.04);
    fillPaper(g, hole, "#efe7d6");
    scribble(g, hole, r, { width: 1.6 });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      edge(g, [Math.cos(a) * 20, Math.sin(a) * 20], [Math.cos(a) * 46, Math.sin(a) * 46], r, { width: 1.4 });
    }
  });
  const puff = mk(64, (g) => {
    const pts = ellipsePts(0, 0, 26, 24, r, 0.15);
    fillPaper(g, pts, "#fbf8f2");
    scribble(g, pts, r, { width: 1.4, color: INK_SOFT });
  });
  const magnifier = mk(120, (g) => {
    edge(g, [24, 24], [52, 52], r, { width: 8, passes: 1, color: "#1d58b8" });
    const lens = ellipsePts(-8, -8, 38, 38, r, 0.03);
    g.save();
    g.globalAlpha = 0.65;
    fillPaper(g, lens, "#eaf3ff");
    g.restore();
    wash(g, lens, "#8ec5ff", r, { alpha: 0.35, spread: 1 });
    scribble(g, lens, r, { width: 4, color: "#3e8bff", passes: 1 });
    scribble(g, lens, r, { width: 1.4 });
    edge(g, [-30, -14], [-18, -32], r, { width: 3, passes: 1, color: "#ffffff" });
  });
  return { gear, puff, magnifier };
}

