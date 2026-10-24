import { drawLandmark, drawOverlay, makeOverlaySprites, type OverlaySprites } from "./landmarks";
import { BOWLING, PONDS, SPAWN, WORLD_H, WORLD_W, places, type Place } from "./places";
import { FENCE, TILE, buildWorld, queryColliders, renderTile, type WorldData } from "./scenery";
import {
  type Ctx,
  INK,
  INK_SOFT,
  PAPER,
  edge,
  ellipsePts,
  fillPaper,
  handFont,
  handText,
  makeGrain,
  mulberry32,
  rectPts,
  scribble,
  setHandFamily,
  sketchPoly,
  wash,
} from "./sketch";

export interface EngineCallbacks {
  onNear: (id: string | null) => void;
  onOpen: (id: string) => void;
  onReady: () => void;
  onMoved: () => void;
}

type BodyKind = "crate" | "pin" | "ball";

interface Body {
  kind: BodyKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  a: number;
  va: number;
  r: number;
  m: number;
  hx: number;
  hy: number;
}

type ParticleKind = "dust" | "leaf" | "confetti" | "text" | "ripple";

interface Particle {
  kind: ParticleKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  rot: number;
  vr: number;
  color: string;
  text?: string;
}

const CAR_R = 22;
const CAR_M = 4;
const MAX_SPEED = 560;
const TRACK_N = 260;
const TRACK_LIFE = 7;
const CAR_COLOR = "#ff6b4a";
const CONFETTI = ["#e5484d", "#f5a524", "#30a46c", "#3e8bff", "#d6409f", "#7c4dff"];

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export class SketchEngine {
  private ctx: Ctx;
  private world: WorldData | null = null;
  private raf = 0;
  private last = 0;
  private t = 0;
  private alive = true;
  private ready = false;

  private cssW = 1;
  private cssH = 1;
  private dpr = 1;
  private zoom = 1;
  private S = 1;
  private low: boolean;
  /** 0 = full, 1 = low (dpr 1, no boil), 2 = potato (render below native resolution). */
  private quality = 0;
  private reduced: boolean;
  private variants: number;
  private maxParticles: number;
  private frameSamples = 0;
  private frameTotal = 0;

  private tiles = new Map<string, HTMLCanvasElement>();
  private sprites = new Map<string, HTMLCanvasElement[]>();
  private carSprites: HTMLCanvasElement[] = [];
  private bodySprites = new Map<BodyKind, HTMLCanvasElement>();
  private overlay: OverlaySprites | null = null;
  private grainCanvas: HTMLCanvasElement | null = null;
  private grain: CanvasPattern | null = null;

  car = { x: SPAWN.x, y: SPAWN.y, a: SPAWN.angle, vx: 0, vy: 0, steer: 0 };
  private cam = { x: SPAWN.x, y: SPAWN.y - 120 };
  private shake = 0;
  private keys = new Set<string>();
  private pointer = { active: false, id: -1, x: 0, y: 0, downT: 0, downX: 0, downY: 0, moved: false };
  private enabled = true;
  private hasMoved = false;
  private near: string | null = null;

  private tracks = new Float32Array(TRACK_N * 6);
  private trackHead = 0;
  private trackCount = 0;
  private lastTrack = { x: SPAWN.x, y: SPAWN.y };
  private particles: Particle[] = [];
  private bodies: Body[] = [];
  private lastBonk = 0;
  private strike = { firstKnock: 0, done: false };
  private colliderScratch = new Set<number>();

  private resizeObserver: ResizeObserver;

  constructor(
    private canvas: HTMLCanvasElement,
    private cb: EngineCallbacks,
    opts: { reducedMotion: boolean },
  ) {
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    this.reduced = opts.reducedMotion;
    const nav = navigator as Navigator & { deviceMemory?: number };
    this.low = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;
    if (this.low) this.quality = 1;
    this.variants = this.reduced || this.low ? 1 : 2;
    this.maxParticles = this.low ? 50 : 120;

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);
    document.addEventListener("visibilitychange", this.onVisibility);
    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerUp);
    this.init();
  }

  private async init() {
    const fam = getComputedStyle(document.documentElement).getPropertyValue("--font-caveat").trim();
    setHandFamily(fam ? `${fam}, cursive` : "cursive");
    try {
      await Promise.race([
        Promise.all([document.fonts.load(handFont(40, 700)), document.fonts.load(handFont(40, 500)), document.fonts.load(handFont(40, 600))]),
        new Promise((res) => setTimeout(res, 2500)),
      ]);
    } catch {
      // Fall back to whatever font is available.
    }
    if (!this.alive) return;
    this.world = buildWorld();
    this.spawnBodies();
    this.resize();
    // Draw everything that's on screen before revealing the world.
    this.ensureTiles(Infinity);
    this.render();
    this.ready = true;
    this.cb.onReady();
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  destroy() {
    this.alive = false;
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerUp);
    this.tiles.clear();
    this.sprites.clear();
  }

  // -------------------------------------------------------------------------
  // Public controls
  // -------------------------------------------------------------------------

  setEnabled(on: boolean) {
    this.enabled = on;
    if (!on) {
      this.keys.clear();
      this.pointer.active = false;
    }
  }

  travelTo(id: string) {
    const p = places.find((pl) => pl.id === id);
    if (!p) return;
    this.puff(this.car.x, this.car.y, 10);
    this.car.x = p.front[0];
    this.car.y = p.front[1] + (p.kind === "social" ? 30 : 10);
    this.car.a = -Math.PI / 2;
    this.car.vx = this.car.vy = 0;
    this.breakTracks();
    this.puff(this.car.x, this.car.y, 14);
    if (this.reduced) this.cam = { x: this.car.x, y: this.car.y - 120 };
  }

  resetCar() {
    this.puff(this.car.x, this.car.y, 10);
    this.car = { x: SPAWN.x, y: SPAWN.y, a: SPAWN.angle, vx: 0, vy: 0, steer: 0 };
    this.breakTracks();
  }

  /** Car position as a 0..1 fraction of the world, for the map overlay. */
  carOnMap() {
    return { x: this.car.x / WORLD_W, y: this.car.y / WORLD_H, a: this.car.a };
  }

  // -------------------------------------------------------------------------
  // Sizing & caches
  // -------------------------------------------------------------------------

  private resize() {
    const w = Math.max(1, this.canvas.clientWidth);
    const h = Math.max(1, this.canvas.clientHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, [1.5, 1, 0.75][this.quality]);
    const zoom = clamp(Math.min(w, h * 1.4) / 1100, 0.55, 1);
    this.cssW = w;
    this.cssH = h;
    this.dpr = dpr;
    this.zoom = zoom;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    const S = zoom * dpr;
    if (Math.abs(S - this.S) > 0.01 || !this.overlay) {
      this.S = S;
      this.flushCaches();
    }
    if (this.ready && !this.raf) this.render();
  }

  private flushCaches() {
    this.tiles.clear();
    this.sprites.clear();
    this.bodySprites.clear();
    this.carSprites = [];
    this.overlay = makeOverlaySprites(this.S, mulberry32(3));
    if (!this.grainCanvas) this.grainCanvas = makeGrain();
    this.grain = this.ctx.createPattern(this.grainCanvas, "repeat");
  }

  private stepDownQuality() {
    this.quality++;
    this.low = true;
    this.variants = 1;
    this.maxParticles = 50;
    this.resize();
  }

  private view() {
    const vw = this.cssW / this.zoom;
    const vh = this.cssH / this.zoom;
    return { left: this.cam.x - vw / 2, top: this.cam.y - vh / 2, vw, vh };
  }

  private ensureTiles(budget: number) {
    if (!this.world) return;
    const { left, top, vw, vh } = this.view();
    const maxTiles = this.low ? 24 : 40;
    let made = 0;
    const want: [number, number][] = [];
    for (let tx = Math.floor((left - 64) / TILE); tx <= Math.floor((left + vw + 64) / TILE); tx++)
      for (let ty = Math.floor((top - 64) / TILE); ty <= Math.floor((top + vh + 64) / TILE); ty++) want.push([tx, ty]);
    for (const [tx, ty] of want) {
      const k = `${tx},${ty}`;
      const tile = this.tiles.get(k);
      if (tile) {
        this.tiles.delete(k);
        this.tiles.set(k, tile);
        continue;
      }
      if (made >= budget) continue;
      this.tiles.set(k, renderTile(this.world, tx, ty, this.S, this.grain));
      made++;
    }
    while (this.tiles.size > maxTiles) this.tiles.delete(this.tiles.keys().next().value!);
  }

  private spriteFor(p: Place, variant: number) {
    let list = this.sprites.get(p.id);
    if (!list) {
      list = [];
      this.sprites.set(p.id, list);
    }
    if (!list[variant]) {
      const c = document.createElement("canvas");
      c.width = Math.ceil(p.box.w * this.S);
      c.height = Math.ceil(p.box.h * this.S);
      const g = c.getContext("2d")!;
      g.scale(this.S, this.S);
      g.translate(p.box.ax, p.box.ay);
      drawLandmark(g, mulberry32(p.x * 7 + p.y * 13 + variant * 991), p);
      list[variant] = c;
    }
    return list[variant];
  }

  private carSprite(variant: number) {
    if (!this.carSprites[variant]) {
      const c = document.createElement("canvas");
      const W = 76;
      const H = 52;
      c.width = Math.ceil(W * this.S);
      c.height = Math.ceil(H * this.S);
      const g = c.getContext("2d")!;
      g.scale(this.S, this.S);
      g.translate(W / 2, H / 2);
      const r = mulberry32(21 + variant * 57);
      // Little jeep, top-down, facing +x.
      const body: [number, number][] = [[-27, -15], [22, -15], [29, -9], [29, 9], [22, 15], [-27, 15]];
      fillPaper(g, body);
      wash(g, body, CAR_COLOR, r, { alpha: 0.9, spread: 1.2 });
      sketchPoly(g, body, r, { width: 1.8 });
      const glass: [number, number][] = [[4, -12], [12, -10], [12, 10], [4, 12]];
      fillPaper(g, glass, "#e8f1f8");
      sketchPoly(g, glass, r, { width: 1.3 });
      const roll = rectPts(-16, -13, 16, 26);
      sketchPoly(g, roll, r, { width: 1.6 });
      edge(g, [-8, -13], [-8, 13], r, { width: 1.2, passes: 1 });
      edge(g, [16, -14], [16, 14], r, { width: 1, passes: 1 });
      const spare = ellipsePts(-31, 0, 6, 8, r, 0.05);
      fillPaper(g, spare, "#4a4a50");
      scribble(g, spare, r, { width: 1.2 });
      g.fillStyle = "#ffd166";
      for (const y of [-9, 9]) {
        g.beginPath();
        g.arc(28, y, 3, 0, Math.PI * 2);
        g.fill();
      }
      this.carSprites[variant] = c;
    }
    return this.carSprites[variant];
  }

  private bodySprite(kind: BodyKind) {
    let c = this.bodySprites.get(kind);
    if (c) return c;
    const size = kind === "ball" ? 60 : kind === "crate" ? 40 : 24;
    c = document.createElement("canvas");
    c.width = c.height = Math.ceil(size * this.S);
    const g = c.getContext("2d")!;
    g.scale(this.S, this.S);
    g.translate(size / 2, size / 2);
    const r = mulberry32(kind.length * 101);
    if (kind === "crate") {
      const box = rectPts(-15, -15, 30, 30);
      fillPaper(g, box);
      wash(g, box, "#c79a62", r, { alpha: 0.55, spread: 1 });
      sketchPoly(g, box, r, { width: 1.6 });
      edge(g, [-15, -15], [15, 15], r, { width: 1.1, passes: 1 });
      edge(g, [15, -15], [-15, 15], r, { width: 1.1, passes: 1 });
    } else if (kind === "pin") {
      const pin = ellipsePts(0, 0, 8.5, 8.5, r, 0.04);
      fillPaper(g, pin, "#fffdf8");
      scribble(g, pin, r, { width: 1.3 });
      g.strokeStyle = "#e5484d";
      g.lineWidth = 2.5;
      g.beginPath();
      g.arc(0, 0, 5, 0, Math.PI * 2);
      g.stroke();
    } else {
      for (let i = 0; i < 6; i++) {
        g.fillStyle = CONFETTI[i];
        g.globalAlpha = 0.8;
        g.beginPath();
        g.moveTo(0, 0);
        g.arc(0, 0, 24, (i / 6) * Math.PI * 2, ((i + 1) / 6) * Math.PI * 2);
        g.closePath();
        g.fill();
      }
      g.globalAlpha = 1;
      scribble(g, ellipsePts(0, 0, 24, 24, r, 0.03), r, { width: 1.8 });
      fillPaper(g, ellipsePts(0, 0, 6, 6, r, 0.05), "#fffdf8");
    }
    this.bodySprites.set(kind, c);
    return c;
  }

  // -------------------------------------------------------------------------
  // World objects
  // -------------------------------------------------------------------------

  private spawnBodies() {
    const add = (kind: BodyKind, x: number, y: number) => {
      const r = kind === "ball" ? 22 : kind === "crate" ? 15 : 8;
      const m = kind === "ball" ? 0.9 : kind === "crate" ? 1.3 : 0.35;
      this.bodies.push({ kind, x, y, vx: 0, vy: 0, a: Math.random() * 0.4, va: 0, r, m, hx: x, hy: y });
    };
    for (let row = 0; row < 4; row++)
      for (let i = 0; i <= row; i++) add("pin", BOWLING.x + row * 22, BOWLING.y + (i - row / 2) * 22);
    const crates: [number, number][] = [
      [2010, 1450], [2042, 1462], [2022, 1488],
      [1330, 1080], [1300, 1104],
      [1160, 1560], [2060, 820], [2560, 1500], [700, 1060], [2650, 980],
    ];
    for (const [x, y] of crates) add("crate", x, y);
    add("ball", 1470, 1330);
  }

  private resetPins() {
    for (const b of this.bodies) {
      if (b.kind !== "pin") continue;
      this.puff(b.x, b.y, 1);
      b.x = b.hx;
      b.y = b.hy;
      b.vx = b.vy = b.va = 0;
      b.a = 0;
    }
    this.strike = { firstKnock: 0, done: false };
  }

  private spawn(p: Omit<Particle, "rot" | "vr"> & Partial<Pick<Particle, "rot" | "vr">>) {
    if (this.particles.length >= this.maxParticles) return;
    this.particles.push({ rot: 0, vr: 0, ...p });
  }

  private puff(x: number, y: number, n: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 40 + Math.random() * 120;
      this.spawn({ kind: "dust", x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6, life: 0, max: 0.6 + Math.random() * 0.4, size: 5 + Math.random() * 6, color: INK_SOFT });
    }
  }

  private say(text: string, x: number, y: number, color = INK, size = 30) {
    this.spawn({ kind: "text", x, y, vx: 0, vy: -40, life: 0, max: 1.1, size, color, text, rot: (Math.random() - 0.5) * 0.3 });
  }

  private breakTracks() {
    this.pushTrack(-1);
    this.lastTrack = { x: this.car.x, y: this.car.y };
  }

  private pushTrack(intensity: number) {
    const { x, y, a } = this.car;
    const bx = x - Math.cos(a) * 16;
    const by = y - Math.sin(a) * 16;
    const nx = -Math.sin(a) * 13;
    const ny = Math.cos(a) * 13;
    const o = this.trackHead * 6;
    this.tracks[o] = bx + nx;
    this.tracks[o + 1] = by + ny;
    this.tracks[o + 2] = bx - nx;
    this.tracks[o + 3] = by - ny;
    this.tracks[o + 4] = this.t;
    this.tracks[o + 5] = intensity;
    this.trackHead = (this.trackHead + 1) % TRACK_N;
    this.trackCount = Math.min(TRACK_N, this.trackCount + 1);
  }

  // -------------------------------------------------------------------------
  // Input
  // -------------------------------------------------------------------------

  private static DRIVE_KEYS = new Set(["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " ", "shift"]);

  private onKeyDown = (e: KeyboardEvent) => {
    if (!this.enabled || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    const target = e.target as HTMLElement | null;
    if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
    if (!SketchEngine.DRIVE_KEYS.has(k)) {
      if (k === "r") this.resetCar();
      return;
    }
    if (k === " " && target?.closest("button, a")) return;
    e.preventDefault();
    this.keys.add(k);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase());
  };

  private onBlur = () => {
    this.keys.clear();
    this.pointer.active = false;
  };

  private onVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
      this.keys.clear();
    } else if (this.ready && !this.raf) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.frame);
    }
  };

  private toWorld(cx: number, cy: number) {
    const { left, top } = this.view();
    return { x: left + cx / this.zoom, y: top + cy / this.zoom };
  }

  private hitPlace(cx: number, cy: number): Place | null {
    const { x, y } = this.toWorld(cx, cy);
    let best: Place | null = null;
    let bestArea = Infinity;
    for (const p of places) {
      const x0 = p.x - p.box.ax;
      const y0 = p.y - p.box.ay;
      if (x > x0 && x < x0 + p.box.w && y > y0 && y < y0 + p.box.h) {
        const area = p.box.w * p.box.h;
        if (area < bestArea) {
          best = p;
          bestArea = area;
        }
      }
    }
    return best;
  }

  private localPoint(e: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private onPointerDown = (e: PointerEvent) => {
    if (!this.enabled || (e.pointerType === "mouse" && e.button !== 0)) return;
    const { x, y } = this.localPoint(e);
    this.pointer = { active: true, id: e.pointerId, x, y, downT: performance.now(), downX: x, downY: y, moved: false };
    this.canvas.setPointerCapture(e.pointerId);
  };

  private onPointerMove = (e: PointerEvent) => {
    const { x, y } = this.localPoint(e);
    if (this.pointer.active && e.pointerId === this.pointer.id) {
      this.pointer.x = x;
      this.pointer.y = y;
      if (Math.hypot(x - this.pointer.downX, y - this.pointer.downY) > 10) this.pointer.moved = true;
    } else if (e.pointerType === "mouse") {
      this.canvas.style.cursor = this.hitPlace(x, y) ? "pointer" : "grab";
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    if (e.pointerId !== this.pointer.id) return;
    const quick = performance.now() - this.pointer.downT < 240 && !this.pointer.moved;
    this.pointer.active = false;
    if (quick && e.type === "pointerup") {
      const p = this.hitPlace(this.pointer.x, this.pointer.y);
      if (p) this.cb.onOpen(p.id);
    }
  };

  // -------------------------------------------------------------------------
  // Simulation
  // -------------------------------------------------------------------------

  private frame = (now: number) => {
    if (!this.alive) return;
    const rawDt = (now - this.last) / 1000;
    this.last = now;
    const dt = Math.min(rawDt, 1 / 30);
    this.t += dt;

    // Quality check: if a few seconds run slow, step down (at most twice).
    if (this.quality < 2 && this.frameSamples < 150) {
      this.frameSamples++;
      if (this.frameSamples > 30) this.frameTotal += Math.min(rawDt, 0.25);
      if (this.frameSamples === 150) {
        if (this.frameTotal / 120 > 1 / 40) {
          this.stepDownQuality();
          this.frameSamples = 0;
        }
        this.frameTotal = 0;
      }
    }

    this.update(dt);
    this.ensureTiles(this.low ? 1 : 2);
    this.render();
    this.raf = requestAnimationFrame(this.frame);
  };

  private input() {
    const k = this.keys;
    let throttle = (k.has("arrowup") || k.has("w") ? 1 : 0) - (k.has("arrowdown") || k.has("s") ? 1 : 0);
    let steer = (k.has("arrowright") || k.has("d") ? 1 : 0) - (k.has("arrowleft") || k.has("a") ? 1 : 0);
    const drift = k.has(" ") || k.has("shift");
    const pt = this.pointer;
    if (pt.active && (pt.moved || performance.now() - pt.downT > 140)) {
      const target = this.toWorld(pt.x, pt.y);
      const dx = target.x - this.car.x;
      const dy = target.y - this.car.y;
      const dist = Math.hypot(dx, dy);
      const diff = wrapAngle(Math.atan2(dy, dx) - this.car.a);
      steer = clamp(diff * 2.4, -1, 1);
      throttle = dist < 46 ? 0 : Math.abs(diff) > 1.7 ? 0.4 : clamp(dist / 160, 0.45, 1);
    }
    return { throttle, steer, drift };
  }

  private update(dt: number) {
    const car = this.car;
    const { throttle, steer, drift } = this.input();
    if (!this.hasMoved && (throttle !== 0 || steer !== 0)) {
      this.hasMoved = true;
      this.cb.onMoved();
    }

    car.steer += (steer - car.steer) * Math.min(1, dt * 10);
    const fx = Math.cos(car.a);
    const fy = Math.sin(car.a);
    let fwd = car.vx * fx + car.vy * fy;
    let lat = -car.vx * fy + car.vy * fx;

    let inPond = false;
    for (const p of PONDS) if (((car.x - p.x) / p.rx) ** 2 + ((car.y - p.y) / p.ry) ** 2 < 1) inPond = true;
    const top = inPond ? MAX_SPEED * 0.45 : MAX_SPEED;

    if (throttle > 0) fwd += (fwd < 0 ? 1500 : 780) * throttle * dt;
    else if (throttle < 0) fwd += (fwd > 0 ? 1500 : 620) * throttle * dt;
    fwd *= Math.exp(-dt * (throttle === 0 ? 2.2 : 0.8));
    if (inPond) fwd *= Math.exp(-dt * 2.5);
    fwd = clamp(fwd, -240, top);
    const slip = Math.abs(lat);
    lat *= Math.exp(-dt * (drift ? 1.4 : 9));

    const turn = car.steer * 2.9 * clamp(fwd / 170, -1, 1) * (drift ? 1.25 : 1);
    car.a = wrapAngle(car.a + turn * dt);
    const nfx = Math.cos(car.a);
    const nfy = Math.sin(car.a);
    car.vx = nfx * fwd - nfy * lat;
    car.vy = nfy * fwd + nfx * lat;
    car.x += car.vx * dt;
    car.y += car.vy * dt;

    this.collideCar();

    // Tracks + dust.
    const speed = Math.hypot(car.vx, car.vy);
    if (Math.hypot(car.x - this.lastTrack.x, car.y - this.lastTrack.y) > 9 && speed > 30) {
      this.pushTrack(clamp(0.16 + slip / 300, 0.16, 0.75));
      this.lastTrack = { x: car.x, y: car.y };
    }
    const dustChance = (slip > 120 ? 0.6 : speed > 380 && throttle > 0 ? 0.18 : 0) * (this.low ? 0.4 : 1);
    if (Math.random() < dustChance) {
      const bx = car.x - nfx * 22;
      const by = car.y - nfy * 22;
      this.spawn({ kind: "dust", x: bx, y: by, vx: -car.vx * 0.15 + (Math.random() - 0.5) * 40, vy: -car.vy * 0.15 + (Math.random() - 0.5) * 40, life: 0, max: 0.7, size: 5, color: INK_SOFT });
    }
    if (inPond && speed > 80 && Math.random() < 0.25) {
      this.spawn({ kind: "ripple", x: car.x, y: car.y, vx: 0, vy: 0, life: 0, max: 1.2, size: 10, color: INK_SOFT });
    }
    if (speed > 120 && this.world && Math.random() < 0.35) {
      for (const b of this.world.bushes) {
        if (Math.abs(b.x - car.x) < b.r + CAR_R && Math.abs(b.y - car.y) < b.r + CAR_R) {
          this.leaf(car.x, car.y - 10);
          break;
        }
      }
    }

    this.updateBodies(dt);
    this.updateParticles(dt);
    this.updateNear();

    // Camera, with a little look-ahead.
    const tx = car.x + car.vx * 0.32;
    const ty = car.y + car.vy * 0.32 - 60;
    const k = 1 - Math.exp(-dt * 3.2);
    this.cam.x += (tx - this.cam.x) * k;
    this.cam.y += (ty - this.cam.y) * k;
    const { vw, vh } = this.view();
    this.cam.x = vw >= WORLD_W ? WORLD_W / 2 : clamp(this.cam.x, vw / 2, WORLD_W - vw / 2);
    this.cam.y = vh >= WORLD_H ? WORLD_H / 2 : clamp(this.cam.y, vh / 2, WORLD_H - vh / 2);
    this.shake *= Math.exp(-dt * 9);
  }

  private leaf(x: number, y: number) {
    this.spawn({
      kind: "leaf",
      x: x + (Math.random() - 0.5) * 30,
      y: y + (Math.random() - 0.5) * 20,
      vx: (Math.random() - 0.5) * 120,
      vy: -60 - Math.random() * 80,
      life: 0,
      max: 1 + Math.random() * 0.6,
      size: 4 + Math.random() * 3,
      color: INK,
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * 8,
    });
  }

  private collideCar() {
    const car = this.car;
    const minX = FENCE + CAR_R + 4;
    const maxX = WORLD_W - FENCE - CAR_R - 4;
    const minY = FENCE + CAR_R + 4;
    const maxY = WORLD_H - FENCE - CAR_R - 4;
    if (car.x < minX || car.x > maxX) {
      car.x = clamp(car.x, minX, maxX);
      this.bonk(Math.abs(car.vx));
      car.vx *= -0.35;
    }
    if (car.y < minY || car.y > maxY) {
      car.y = clamp(car.y, minY, maxY);
      this.bonk(Math.abs(car.vy));
      car.vy *= -0.35;
    }
    if (!this.world) return;
    const ids = queryColliders(this.world, car.x, car.y, this.colliderScratch);
    for (const i of ids) {
      const c = this.world.colliders[i];
      const dx = car.x - c.x;
      const dy = car.y - c.y;
      const min = CAR_R + c.r;
      const d2 = dx * dx + dy * dy;
      if (d2 >= min * min) continue;
      const d = Math.sqrt(d2) || 0.01;
      const nx = dx / d;
      const ny = dy / d;
      car.x += nx * (min - d);
      car.y += ny * (min - d);
      const vn = car.vx * nx + car.vy * ny;
      if (vn < 0) {
        car.vx -= 1.35 * vn * nx;
        car.vy -= 1.35 * vn * ny;
        this.bonk(-vn);
        if (c.leafy && -vn > 90) for (let k = 0; k < (this.low ? 3 : 7); k++) this.leaf(c.x, c.y - 24);
      }
    }
  }

  private bonk(impact: number) {
    if (impact < 170) return;
    if (!this.reduced) this.shake = Math.min(10, impact / 50);
    if (this.t - this.lastBonk > 0.6) {
      this.lastBonk = this.t;
      const words = ["bonk!", "oof", "boop!", "whoops", "thud"];
      this.say(words[Math.floor(Math.random() * words.length)], this.car.x, this.car.y - 46);
      this.puff(this.car.x, this.car.y, 6);
    }
  }

  private updateBodies(dt: number) {
    const car = this.car;
    const bodies = this.bodies;
    for (const b of bodies) {
      const friction = b.kind === "ball" ? 0.7 : b.kind === "pin" ? 1.8 : 2.6;
      b.vx *= Math.exp(-dt * friction);
      b.vy *= Math.exp(-dt * friction);
      b.va *= Math.exp(-dt * 2.5);
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.a += b.va * dt;

      // Car vs body.
      const dx = b.x - car.x;
      const dy = b.y - car.y;
      const min = b.r + CAR_R;
      const d2 = dx * dx + dy * dy;
      if (d2 < min * min) {
        const d = Math.sqrt(d2) || 0.01;
        const nx = dx / d;
        const ny = dy / d;
        const rel = (b.vx - car.vx) * nx + (b.vy - car.vy) * ny;
        if (rel < 0) {
          const e = b.kind === "ball" ? 0.9 : 0.5;
          const j = (-(1 + e) * rel) / (1 / CAR_M + 1 / b.m);
          b.vx += (j / b.m) * nx;
          b.vy += (j / b.m) * ny;
          car.vx -= (j / CAR_M) * nx;
          car.vy -= (j / CAR_M) * ny;
          const tang = (b.vx - car.vx) * -ny + (b.vy - car.vy) * nx;
          b.va += tang * 0.02 + (Math.random() - 0.5) * j * 0.01;
        }
        const overlap = min - d;
        const share = CAR_M / (CAR_M + b.m);
        b.x += nx * overlap * share;
        b.y += ny * overlap * share;
        car.x -= nx * overlap * (1 - share);
        car.y -= ny * overlap * (1 - share);
      }
    }
    // Body vs body + static.
    for (let i = 0; i < bodies.length; i++) {
      const a = bodies[i];
      const moving = a.vx * a.vx + a.vy * a.vy > 4;
      for (let j = i + 1; j < bodies.length; j++) {
        const b = bodies[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const min = a.r + b.r;
        if (Math.abs(dx) > min || Math.abs(dy) > min) continue;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min) continue;
        const d = Math.sqrt(d2) || 0.01;
        const nx = dx / d;
        const ny = dy / d;
        const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rel < 0) {
          const jimp = (-(1.6 * rel)) / (1 / a.m + 1 / b.m);
          a.vx -= (jimp / a.m) * nx;
          a.vy -= (jimp / a.m) * ny;
          b.vx += (jimp / b.m) * nx;
          b.vy += (jimp / b.m) * ny;
          a.va += (Math.random() - 0.5) * 4;
          b.va += (Math.random() - 0.5) * 4;
        }
        const push = (min - d) / 2;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
      }
      if (!moving || !this.world) continue;
      if (a.x < FENCE + a.r || a.x > WORLD_W - FENCE - a.r) {
        a.x = clamp(a.x, FENCE + a.r, WORLD_W - FENCE - a.r);
        a.vx *= -0.5;
      }
      if (a.y < FENCE + a.r || a.y > WORLD_H - FENCE - a.r) {
        a.y = clamp(a.y, FENCE + a.r, WORLD_H - FENCE - a.r);
        a.vy *= -0.5;
      }
      for (const ci of queryColliders(this.world, a.x, a.y, this.colliderScratch)) {
        const c = this.world.colliders[ci];
        const dx = a.x - c.x;
        const dy = a.y - c.y;
        const min = a.r + c.r;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min) continue;
        const d = Math.sqrt(d2) || 0.01;
        const nx = dx / d;
        const ny = dy / d;
        a.x += nx * (min - d);
        a.y += ny * (min - d);
        const vn = a.vx * nx + a.vy * ny;
        if (vn < 0) {
          a.vx -= 1.5 * vn * nx;
          a.vy -= 1.5 * vn * ny;
        }
      }
    }

    // Bowling.
    let knocked = 0;
    let settled = true;
    for (const b of bodies) {
      if (b.kind !== "pin") continue;
      if (Math.hypot(b.x - b.hx, b.y - b.hy) > 18) knocked++;
      if (b.vx * b.vx + b.vy * b.vy > 25) settled = false;
    }
    if (knocked > 0 && !this.strike.firstKnock) this.strike.firstKnock = this.t;
    if (!this.strike.done && knocked >= 9 && this.t - this.strike.firstKnock < 4) {
      this.strike.done = true;
      this.say("STRIKE!", BOWLING.x + 40, BOWLING.y - 70, "#d6409f", 64);
      for (let i = 0; i < (this.low ? 14 : 36); i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 120 + Math.random() * 260;
        this.spawn({
          kind: "confetti",
          x: BOWLING.x + 40,
          y: BOWLING.y - 40,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s - 160,
          life: 0,
          max: 1.4 + Math.random() * 0.6,
          size: 5 + Math.random() * 4,
          color: CONFETTI[i % CONFETTI.length],
          rot: Math.random() * 6,
          vr: (Math.random() - 0.5) * 12,
        });
      }
    }
    if (
      knocked > 0 &&
      settled &&
      this.t - this.strike.firstKnock > 7 &&
      Math.hypot(car.x - BOWLING.x, car.y - BOWLING.y) > 420
    ) {
      this.resetPins();
    }
  }

  private updateParticles(dt: number) {
    const ps = this.particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life += dt;
      if (p.life >= p.max) {
        ps[i] = ps[ps.length - 1];
        ps.pop();
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.kind === "dust") {
        p.vx *= 0.94;
        p.vy *= 0.94;
      } else if (p.kind === "leaf" || p.kind === "confetti") {
        p.vy += 260 * dt;
        p.vx *= 0.98;
      }
    }
  }

  private updateNear() {
    const car = this.car;
    let best: Place | null = null;
    let bestD = Infinity;
    for (const p of places) {
      const cx = p.kind === "social" ? p.front[0] : p.x;
      const cy = p.kind === "social" ? p.front[1] : p.y + 60;
      const d = Math.hypot(car.x - cx, car.y - cy);
      if (d < p.triggerRadius && d < bestD) {
        best = p;
        bestD = d;
      }
    }
    const id = best?.id ?? null;
    if (id !== this.near) {
      this.near = id;
      this.cb.onNear(id);
    }
  }

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  private render() {
    const ctx = this.ctx;
    const S = this.S;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    const shakeX = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    const shakeY = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    const { left, top, vw, vh } = this.view();
    const ox = Math.round(-(left + shakeX) * S);
    const oy = Math.round(-(top + shakeY) * S);

    ctx.fillStyle = PAPER;
    for (let tx = Math.floor(left / TILE); tx <= Math.floor((left + vw) / TILE); tx++)
      for (let ty = Math.floor(top / TILE); ty <= Math.floor((top + vh) / TILE); ty++) {
        const tile = this.tiles.get(`${tx},${ty}`);
        const px = Math.round(tx * TILE * S) + ox;
        const py = Math.round(ty * TILE * S) + oy;
        if (tile) ctx.drawImage(tile, px, py);
        else ctx.fillRect(px, py, Math.ceil(TILE * S) + 1, Math.ceil(TILE * S) + 1);
      }

    ctx.setTransform(S, 0, 0, S, ox, oy);
    this.drawTracks();

    const variant = this.variants > 1 ? Math.floor(this.t * 5) % this.variants : 0;
    const t = this.reduced ? 0 : this.t;
    const inView = (x0: number, y0: number, x1: number, y1: number) =>
      x1 > left && x0 < left + vw && y1 > top && y0 < top + vh;

    type D = { y: number; place?: Place; body?: Body; car?: true };
    const list: D[] = [];
    for (const p of places) {
      const x0 = p.x - p.box.ax;
      const y0 = p.y - p.box.ay - 120;
      if (inView(x0, y0, x0 + p.box.w, y0 + p.box.h + 140)) list.push({ y: p.y, place: p });
    }
    for (const b of this.bodies) if (inView(b.x - 30, b.y - 30, b.x + 30, b.y + 30)) list.push({ y: b.y, body: b });
    list.push({ y: this.car.y + 6, car: true });
    list.sort((a, b) => a.y - b.y);

    for (const d of list) {
      if (d.place) {
        const p = d.place;
        const near = this.near === p.id;
        const sprite = this.spriteFor(p, variant);
        if (p.kind === "social" && near) {
          const s = 1 + Math.abs(Math.sin(this.t * 6)) * 0.06;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.scale(s, s);
          ctx.drawImage(sprite, -p.box.ax, -p.box.ay, p.box.w, p.box.h);
          ctx.restore();
        } else {
          ctx.drawImage(sprite, p.x - p.box.ax, p.y - p.box.ay, p.box.w, p.box.h);
        }
        if (this.overlay) drawOverlay(ctx, p, t, this.overlay, near);
      } else if (d.body) {
        const b = d.body;
        const spr = this.bodySprite(b.kind);
        const size = b.kind === "ball" ? 60 : b.kind === "crate" ? 40 : 24;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.fillStyle = "rgba(51, 51, 58, 0.12)";
        ctx.beginPath();
        ctx.ellipse(4, b.r * 0.7, b.r, b.r * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.rotate(b.a);
        ctx.drawImage(spr, -size / 2, -size / 2, size, size);
        ctx.restore();
      } else {
        this.drawCar(variant);
      }
    }

    this.drawParticles();
  }

  private drawTracks() {
    const ctx = this.ctx;
    const tr = this.tracks;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    for (let n = 1; n < this.trackCount; n++) {
      const i = (this.trackHead - this.trackCount + n + TRACK_N) % TRACK_N;
      const pi = (i - 1 + TRACK_N) % TRACK_N;
      const a = i * 6;
      const b = pi * 6;
      if (tr[a + 5] < 0 || tr[b + 5] < 0) continue;
      const age = this.t - tr[a + 4];
      if (age > TRACK_LIFE) continue;
      ctx.globalAlpha = tr[a + 5] * (1 - age / TRACK_LIFE) * 0.55;
      ctx.beginPath();
      ctx.moveTo(tr[b], tr[b + 1]);
      ctx.lineTo(tr[a], tr[a + 1]);
      ctx.moveTo(tr[b + 2], tr[b + 3]);
      ctx.lineTo(tr[a + 2], tr[a + 3]);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private drawCar(variant: number) {
    const ctx = this.ctx;
    const { x, y, a, steer } = this.car;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(51, 51, 58, 0.16)";
    ctx.beginPath();
    ctx.ellipse(5, 9, 32, 17, a, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(a);
    ctx.fillStyle = "#3d3d44";
    for (const [wx, wy, front] of [[17, -16, 1], [17, 16, 1], [-16, -16, 0], [-16, 16, 0]] as const) {
      ctx.save();
      ctx.translate(wx, wy);
      if (front) ctx.rotate(steer * 0.45);
      ctx.fillRect(-7, -3.5, 14, 7);
      ctx.restore();
    }
    ctx.drawImage(this.carSprite(variant), -38, -26, 76, 52);
    ctx.restore();
  }

  private drawParticles() {
    const ctx = this.ctx;
    for (const p of this.particles) {
      const k = p.life / p.max;
      ctx.globalAlpha = 1 - k;
      switch (p.kind) {
        case "dust":
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1 + k * 1.5), 0, Math.PI * 2);
          ctx.stroke();
          break;
        case "ripple":
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.size + k * 40, (p.size + k * 40) * 0.45, 0, 0, Math.PI * 2);
          ctx.stroke();
          break;
        case "leaf":
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.strokeStyle = p.color;
          ctx.fillStyle = PAPER;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
          break;
        case "confetti":
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          ctx.restore();
          break;
        case "text":
          handText(ctx, p.text ?? "", p.x, p.y, p.size, p.color, { rot: p.rot, alpha: 1 - k * k });
          break;
      }
    }
    ctx.globalAlpha = 1;
  }
}

