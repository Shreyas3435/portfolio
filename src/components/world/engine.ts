import {
  type BodyKind,
  type Foliage,
  type PropKind,
  type SpriteBox,
  BODY_SIZE,
  CAR_BOX,
  DECOR_BOX,
  FOLIAGE_BOX,
  GATE_BOX,
  PROP_BOX,
  PROP_DEBRIS,
  paintBody,
  paintCampfire,
  paintCar,
  paintFoliage,
  paintFountain,
  paintGate,
  paintPlace,
  paintProp,
  paintSignpost,
} from "./art";
import { drawDecorOverlay, drawPlaceOverlay, makeOverlaySprites, type OverlaySprites } from "./overlays";
import { type Ctx, displayFont, mulberry32, setDisplayFamily, text } from "./paint";
import { BOWLING, DECOR, EDGE, NAME, PONDS, SPAWN, WORLD_H, WORLD_W, districts, places, type Place } from "./places";
import { TILE, buildWorld, queryColliders, renderTile, type WorldData } from "./scenery";

export interface EngineCallbacks {
  onNear: (id: string | null) => void;
  onOpen: (id: string) => void;
  onReady: () => void;
  onMoved: () => void;
}

interface Body {
  kind: BodyKind;
  char: string;
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
  ha: number;
  order: number;
  disturbed: number;
  lift: number;
  /** Set while the body is gliding back to its home spot. */
  rb: { t0: number; delay: number; fx: number; fy: number; fa: number } | null;
}

type ParticleKind = "dust" | "leaf" | "debris" | "sparkle" | "text" | "confetti" | "ripple";

interface Particle {
  kind: ParticleKind;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  max: number;
  size: number;
  rot: number;
  vr: number;
  color: string;
  text?: string;
}

interface Flock {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
}

const CAR_R = 22;
const CAR_M = 4;
const MAX_SPEED = 580;
const TRACK_N = 260;
const TRACK_LIFE = 7;
const REBUILD_AFTER = 5;
const REGROW_AFTER = 6;
const CONFETTI = ["#e5484d", "#f0a020", "#2f9e62", "#3e8bff", "#ffd34d", "#1f7a8c"];

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const easeOutBack = (t: number) => 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2;

export class WorldEngine {
  private ctx: Ctx;
  private world: WorldData | null = null;
  private raf = 0;
  private last = 0;
  private t = 0;
  private alive = true;
  private ready = false;
  private paused = false;

  private cssW = 1;
  private cssH = 1;
  private zoom = 1;
  private S = 1;
  /** 0 = full, 1 = low (dpr 1, fewer effects), 2 = potato (below native resolution). */
  private quality = 0;
  private reduced: boolean;
  private maxParticles = 140;
  private frameSamples = 0;
  private frameTotal = 0;

  private tiles = new Map<string, HTMLCanvasElement>();
  private sprites = new Map<string, HTMLCanvasElement>();
  private overlay: OverlaySprites | null = null;

  car = { x: SPAWN.x, y: SPAWN.y, a: SPAWN.angle, vx: 0, vy: 0, steer: 0 };
  private cam = { x: SPAWN.x, y: SPAWN.y - 140 };
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
  private flocks: Flock[] = [];
  private treeWob = new Float32Array(0);
  private treeVel = new Float32Array(0);
  private activeTrees = new Set<number>();
  private placeWob = new Float32Array(places.length);
  private placeVel = new Float32Array(places.length);
  private lastBonk = 0;
  private strike = { firstKnock: 0, done: false };
  private scratch = new Set<number>();
  private drawList: { y: number; k: number; i: number }[] = [];

  private resizeObserver: ResizeObserver;

  constructor(
    private canvas: HTMLCanvasElement,
    private cb: EngineCallbacks,
    opts: { reducedMotion: boolean },
  ) {
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    this.reduced = opts.reducedMotion;
    const nav = navigator as Navigator & { deviceMemory?: number };
    if ((nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4) this.quality = 1;
    this.applyQuality();

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
    const fam = getComputedStyle(document.documentElement).getPropertyValue("--font-barlow").trim();
    setDisplayFamily(fam ? `${fam}, "Arial Narrow", sans-serif` : "\"Arial Narrow\", sans-serif");
    try {
      await Promise.race([
        Promise.all([600, 700, 800].map((w) => document.fonts.load(displayFont(40, w)))),
        new Promise((res) => setTimeout(res, 2500)),
      ]);
    } catch {
      // Fall back to whatever font is available.
    }
    if (!this.alive) return;
    this.world = buildWorld();
    this.treeWob = new Float32Array(this.world.standing.length);
    this.treeVel = new Float32Array(this.world.standing.length);
    this.spawnBodies();
    this.spawnFlocks();
    this.resize();
    this.ensureTiles(Infinity);
    this.render();
    this.ready = true;
    this.cb.onReady();
    this.start();
  }

  private start() {
    if (this.raf || this.paused || document.hidden || !this.ready) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  destroy() {
    this.alive = false;
    this.stop();
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

  /** Stop the loop entirely, e.g. while the page view covers the world. */
  setPaused(paused: boolean) {
    this.paused = paused;
    if (paused) this.stop();
    else this.start();
  }

  travelTo(id: string) {
    const p = places.find((pl) => pl.id === id);
    if (!p) return;
    this.sparkles(this.car.x, this.car.y, 8);
    this.car.x = p.front[0];
    this.car.y = p.front[1] + 30;
    this.car.a = -Math.PI / 2;
    this.car.vx = this.car.vy = 0;
    this.breakTracks();
    this.sparkles(this.car.x, this.car.y, 12);
    if (this.reduced) this.cam = { x: this.car.x, y: this.car.y - 140 };
  }

  resetCar() {
    this.sparkles(this.car.x, this.car.y, 8);
    this.car = { x: SPAWN.x, y: SPAWN.y, a: SPAWN.angle, vx: 0, vy: 0, steer: 0 };
    this.breakTracks();
  }

  carOnMap() {
    return { x: this.car.x / WORLD_W, y: this.car.y / WORLD_H, a: this.car.a };
  }

  // -------------------------------------------------------------------------
  // Sizing, quality & caches
  // -------------------------------------------------------------------------

  private applyQuality() {
    this.maxParticles = this.quality ? 60 : 140;
  }

  private resize() {
    const w = Math.max(1, this.canvas.clientWidth);
    const h = Math.max(1, this.canvas.clientHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, [1.5, 1, 0.75][this.quality]);
    this.cssW = w;
    this.cssH = h;
    this.zoom = clamp(Math.min(w, h * 1.4) / 1050, 0.55, 1.05);
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    const S = this.zoom * dpr;
    if (Math.abs(S - this.S) > 0.01 || !this.overlay) {
      this.S = S;
      this.tiles.clear();
      this.sprites.clear();
      this.overlay = makeOverlaySprites(S);
    }
    if (this.ready && !this.raf) this.render();
  }

  private stepDownQuality(steps: number) {
    this.quality = Math.min(2, this.quality + steps);
    this.applyQuality();
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
    let made = 0;
    for (let tx = Math.floor((left - 64) / TILE); tx <= Math.floor((left + vw + 64) / TILE); tx++)
      for (let ty = Math.floor((top - 64) / TILE); ty <= Math.floor((top + vh + 64) / TILE); ty++) {
        const k = `${tx},${ty}`;
        const tile = this.tiles.get(k);
        if (tile) {
          this.tiles.delete(k);
          this.tiles.set(k, tile);
        } else if (made < budget) {
          this.tiles.set(k, renderTile(this.world, tx, ty, this.S));
          made++;
        }
      }
    const max = this.quality ? 24 : 40;
    while (this.tiles.size > max) this.tiles.delete(this.tiles.keys().next().value!);
  }

  private sprite(key: string, box: SpriteBox, paint: (g: Ctx) => void) {
    let c = this.sprites.get(key);
    if (!c) {
      c = document.createElement("canvas");
      c.width = Math.ceil(box.w * this.S);
      c.height = Math.ceil(box.h * this.S);
      const g = c.getContext("2d")!;
      g.scale(this.S, this.S);
      g.translate(box.ax, box.ay);
      paint(g);
      this.sprites.set(key, c);
    }
    return c;
  }

  private foliageSprite(kind: Foliage, variant: number) {
    return this.sprite(`f:${kind}:${variant}`, FOLIAGE_BOX[kind], (g) => paintFoliage(g, kind, mulberry32(kind.length * 97 + variant * 13)));
  }

  private propSprite(kind: PropKind, variant: number) {
    return this.sprite(`p:${kind}:${variant}`, PROP_BOX[kind], (g) => paintProp(g, kind, mulberry32(kind.length * 31 + variant * 7)));
  }

  private placeSprite(p: Place) {
    return this.sprite(`pl:${p.id}`, p.box, (g) => paintPlace(g, mulberry32(p.x * 7 + p.y * 13), p));
  }

  private bodySprite(b: Body) {
    const size = BODY_SIZE[b.kind];
    return this.sprite(`b:${b.kind}:${b.char}`, { w: size, h: size, ax: size / 2, ay: size / 2 }, (g) => paintBody(g, b.kind, b.char));
  }

  // -------------------------------------------------------------------------
  // World objects
  // -------------------------------------------------------------------------

  private spawnBodies() {
    const add = (kind: BodyKind, x: number, y: number, char = "") => {
      const r = { crate: 16, pin: 9, ball: 22, brick: 11, letter: 25 }[kind];
      const m = { crate: 1.3, pin: 0.35, ball: 0.9, brick: 0.7, letter: 1.4 }[kind];
      this.bodies.push({ kind, char, x, y, vx: 0, vy: 0, a: 0, va: 0, r, m, hx: x, hy: y, ha: 0, order: this.bodies.length, disturbed: -99, lift: 0, rb: null });
    };
    const chars = NAME.text.split("");
    chars.forEach((ch, i) => {
      if (ch !== " ") add("letter", NAME.x + (i - (chars.length - 1) / 2) * NAME.advance, NAME.y, ch);
    });
    for (let row = 0; row < 4; row++) for (let i = 0; i <= row; i++) add("pin", BOWLING.x + (i - row / 2) * 22, BOWLING.y + row * 22);
    for (let row = 0; row < 2; row++) for (let i = 0; i < 9; i++) add("brick", 1820 + i * 25 + row * 12, 2140 + row * 17);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) add("crate", 1880 + i * 34, 1950 + j * 34);
    for (const [x, y] of [[2560, 1440], [2594, 1452], [960, 1460], [1300, 700], [2140, 860]]) add("crate", x, y);
    add("ball", 1700, 2100);
    add("ball", 1890, 1460);
  }

  private spawnFlocks() {
    const r = mulberry32(55);
    for (let i = 0; i < 3; i++) {
      const a = r() * Math.PI * 2;
      this.flocks.push({ x: r() * WORLD_W, y: r() * WORLD_H, vx: Math.cos(a) * 70, vy: Math.sin(a) * 40, size: 4 + Math.floor(r() * 3) });
    }
  }

  private spawn(p: Partial<Particle> & Pick<Particle, "kind" | "x" | "y" | "max" | "color">) {
    if (this.particles.length >= this.maxParticles) return;
    this.particles.push({ z: 0, vx: 0, vy: 0, vz: 0, life: 0, size: 4, rot: 0, vr: 0, ...p });
  }

  private sparkles(x: number, y: number, n: number, color = "#fff6c8") {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 30 + Math.random() * 90;
      this.spawn({ kind: "sparkle", x: x + Math.cos(a) * 10, y, z: 10 + Math.random() * 30, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.5, vz: 40 + Math.random() * 60, max: 0.7 + Math.random() * 0.5, size: 3 + Math.random() * 3, color });
    }
  }

  private say(str: string, x: number, y: number, color = "#2c3a36", size = 30) {
    this.spawn({ kind: "text", x, y, vy: -40, max: 1.1, size, color, text: str, rot: (Math.random() - 0.5) * 0.25 });
  }

  private leaves(x: number, y: number, n: number, autumn: boolean) {
    const cols = autumn ? ["#c4561f", "#e8892f", "#9c3d18"] : ["#7fb35a", "#527f43", "#a7c977"];
    for (let i = 0; i < n; i++) {
      this.spawn({
        kind: "leaf",
        x: x + (Math.random() - 0.5) * 40,
        y,
        z: 40 + Math.random() * 50,
        vx: (Math.random() - 0.5) * 120,
        vy: (Math.random() - 0.5) * 50,
        vz: Math.random() * 60,
        max: 1.4 + Math.random() * 0.8,
        size: 4 + Math.random() * 2,
        color: cols[i % 3],
        rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 8,
      });
    }
  }

  private debris(x: number, y: number, colors: string[], n: number, vx: number, vy: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 60 + Math.random() * 160;
      this.spawn({
        kind: "debris",
        x,
        y,
        z: 10 + Math.random() * 20,
        vx: Math.cos(a) * s + vx * 0.4,
        vy: Math.sin(a) * s * 0.6 + vy * 0.4,
        vz: 120 + Math.random() * 160,
        max: 2.2 + Math.random(),
        size: 4 + Math.random() * 5,
        color: colors[i % colors.length],
        rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 14,
      });
    }
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
    this.tracks.set([bx + nx, by + ny, bx - nx, by - ny, this.t, intensity], this.trackHead * 6);
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
    if (!WorldEngine.DRIVE_KEYS.has(k)) {
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
      this.stop();
      this.keys.clear();
    } else this.start();
  };

  private toWorld(cx: number, cy: number) {
    const { left, top } = this.view();
    return { x: left + cx / this.zoom, y: top + cy / this.zoom };
  }

  private hitPlace(cx: number, cy: number): Place | null {
    const { x, y } = this.toWorld(cx, cy);
    let best: Place | null = null;
    let bestD = Infinity;
    for (const p of places) {
      const x0 = p.x - p.box.ax;
      const y0 = p.y - p.box.ay;
      if (x > x0 && x < x0 + p.box.w && y > y0 && y < p.y + 70) {
        const d = Math.abs(x - p.x) + Math.abs(y - p.y);
        if (d < bestD) {
          best = p;
          bestD = d;
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

    // If a couple of seconds run slow, step quality down; very slow jumps straight to the lightest mode.
    if (this.quality < 2 && this.frameSamples < 100) {
      this.frameSamples++;
      if (this.frameSamples > 20) this.frameTotal += Math.min(rawDt, 0.25);
      if (this.frameSamples === 100) {
        const avg = this.frameTotal / 80;
        if (avg > 1 / 40) {
          this.stepDownQuality(avg > 1 / 26 ? 2 : 1);
          this.frameSamples = 0;
        }
        this.frameTotal = 0;
      }
    }

    this.update(dt);
    this.ensureTiles(this.quality ? 1 : 2);
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
    if (throttle > 0) fwd += (fwd < 0 ? 1500 : 800) * throttle * dt;
    else if (throttle < 0) fwd += (fwd > 0 ? 1500 : 620) * throttle * dt;
    fwd *= Math.exp(-dt * (throttle === 0 ? 2.2 : 0.8));
    if (inPond) fwd *= Math.exp(-dt * 2.5);
    fwd = clamp(fwd, -240, top);
    const slip = Math.abs(lat);
    lat *= Math.exp(-dt * (drift ? 1.4 : 9));
    car.a = wrapAngle(car.a + car.steer * 2.9 * clamp(fwd / 170, -1, 1) * (drift ? 1.25 : 1) * dt);
    const nfx = Math.cos(car.a);
    const nfy = Math.sin(car.a);
    car.vx = nfx * fwd - nfy * lat;
    car.vy = nfy * fwd + nfx * lat;
    car.x += car.vx * dt;
    car.y += car.vy * dt;
    this.collideCar();

    const speed = Math.hypot(car.vx, car.vy);
    if (Math.hypot(car.x - this.lastTrack.x, car.y - this.lastTrack.y) > 9 && speed > 30) {
      this.pushTrack(clamp(0.16 + slip / 300, 0.16, 0.75));
      this.lastTrack = { x: car.x, y: car.y };
    }
    const dustChance = (slip > 120 ? 0.6 : speed > 380 && throttle > 0 ? 0.2 : 0) * (this.quality ? 0.4 : 1);
    if (Math.random() < dustChance) {
      this.spawn({ kind: "dust", x: car.x - nfx * 24, y: car.y - nfy * 24, vx: -car.vx * 0.15 + (Math.random() - 0.5) * 40, vy: -car.vy * 0.15 + (Math.random() - 0.5) * 40, max: 0.8, size: 6, color: "#e9d6ae" });
    }
    if (inPond && speed > 80 && Math.random() < 0.3) this.spawn({ kind: "ripple", x: car.x, y: car.y, max: 1.2, size: 10, color: "#ffffff" });

    if (this.world && speed > 60) {
      // Bushes: drive straight through them; they shiver and shed leaves.
      const st = this.world.standing;
      for (let i = 0; i < st.length; i++) {
        const s = st[i];
        if (s.kind !== "bush" || Math.abs(s.x - car.x) > 40 || Math.abs(s.y - 10 - car.y) > 34) continue;
        this.kickTree(i, speed / 2000);
        if (Math.random() < 0.3) this.leaves(s.x, s.y, 1, false);
      }
    }

    this.updateSprings(dt);
    this.updateBodies(dt);
    this.updateProps();
    this.updateParticles(dt);
    this.updateAmbient(dt);
    this.updateNear();

    const tx = car.x + car.vx * 0.32;
    const ty = car.y + car.vy * 0.32 - 70;
    const k = 1 - Math.exp(-dt * 3.2);
    this.cam.x += (tx - this.cam.x) * k;
    this.cam.y += (ty - this.cam.y) * k;
    const { vw, vh } = this.view();
    this.cam.x = vw >= WORLD_W ? WORLD_W / 2 : clamp(this.cam.x, vw / 2, WORLD_W - vw / 2);
    this.cam.y = vh >= WORLD_H ? WORLD_H / 2 : clamp(this.cam.y, vh / 2, WORLD_H - vh / 2);
    this.shake *= Math.exp(-dt * 9);
  }

  private kickTree(i: number, amount: number) {
    this.treeVel[i] += amount * (Math.random() < 0.5 ? -1 : 1);
    this.activeTrees.add(i);
  }

  private updateSprings(dt: number) {
    for (const i of this.activeTrees) {
      const a = -90 * this.treeWob[i] - 7 * this.treeVel[i];
      this.treeVel[i] += a * dt;
      this.treeWob[i] += this.treeVel[i] * dt;
      if (Math.abs(this.treeWob[i]) < 0.001 && Math.abs(this.treeVel[i]) < 0.01) {
        this.treeWob[i] = this.treeVel[i] = 0;
        this.activeTrees.delete(i);
      }
    }
    for (let i = 0; i < places.length; i++) {
      if (!this.placeWob[i] && !this.placeVel[i]) continue;
      const a = -140 * this.placeWob[i] - 9 * this.placeVel[i];
      this.placeVel[i] += a * dt;
      this.placeWob[i] += this.placeVel[i] * dt;
      if (Math.abs(this.placeWob[i]) < 0.001 && Math.abs(this.placeVel[i]) < 0.01) this.placeWob[i] = this.placeVel[i] = 0;
    }
  }

  private collideCar() {
    const car = this.car;
    const minX = EDGE + CAR_R;
    const maxX = WORLD_W - EDGE - CAR_R;
    const minY = EDGE + CAR_R;
    const maxY = WORLD_H - EDGE - CAR_R;
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
    for (const i of queryColliders(this.world, car.x, car.y, this.scratch)) {
      const c = this.world.colliders[i];
      if (c.ref.type === "prop" && this.world.props[c.ref.i].brokenAt >= 0) continue;
      const dx = car.x - c.x;
      const dy = car.y - c.y;
      const min = CAR_R + c.r;
      const d2 = dx * dx + dy * dy;
      if (d2 >= min * min) continue;
      const d = Math.sqrt(d2) || 0.01;
      const nx = dx / d;
      const ny = dy / d;
      const vn = car.vx * nx + car.vy * ny;
      if (c.ref.type === "prop" && -vn > 110) {
        this.breakProp(c.ref.i, car.vx, car.vy);
        car.vx *= 0.82;
        car.vy *= 0.82;
        continue;
      }
      car.x += nx * (min - d);
      car.y += ny * (min - d);
      if (vn < 0) {
        car.vx -= 1.35 * vn * nx;
        car.vy -= 1.35 * vn * ny;
        this.bonk(-vn);
        if (c.ref.type === "tree") {
          this.kickTree(c.ref.i, -vn / 260);
          const s = this.world.standing[c.ref.i];
          if (-vn > 90) this.leaves(s.x, s.y, this.quality ? 3 : 7, s.kind === "maple");
        } else if (c.ref.type === "place") {
          this.placeVel[c.ref.i] += -vn / 180;
        }
      }
    }
  }

  private breakProp(i: number, vx: number, vy: number) {
    const p = this.world!.props[i];
    p.brokenAt = this.t;
    p.regrowAt = -1;
    this.debris(p.x, p.y - 12, PROP_DEBRIS[p.kind], this.quality ? 5 : 10, vx, vy);
    if (this.t - this.lastBonk > 0.8) {
      this.lastBonk = this.t;
      this.say(["crash!", "oops", "smash!", "kaboom"][Math.floor(Math.random() * 4)], p.x, p.y - 50);
    }
    if (!this.reduced) this.shake = Math.max(this.shake, 4);
  }

  private bonk(impact: number) {
    if (impact < 170) return;
    if (!this.reduced) this.shake = Math.min(10, impact / 50);
    if (this.t - this.lastBonk > 0.6) {
      this.lastBonk = this.t;
      this.say(["bam!", "oof", "thud", "whoa", "crunch"][Math.floor(Math.random() * 5)], this.car.x, this.car.y - 50);
    }
  }

  private updateProps() {
    if (!this.world) return;
    for (const p of this.world.props) {
      if (p.brokenAt >= 0 && this.t - p.brokenAt > REGROW_AFTER && Math.hypot(this.car.x - p.x, this.car.y - p.y) > 150) {
        p.brokenAt = -1;
        p.regrowAt = this.t;
        this.sparkles(p.x, p.y, this.quality ? 3 : 6);
      } else if (p.regrowAt >= 0 && this.t - p.regrowAt > 0.6) {
        p.regrowAt = -1;
      }
    }
  }

  private updateBodies(dt: number) {
    const car = this.car;
    const bodies = this.bodies;
    for (const b of bodies) {
      if (b.rb) {
        const e = easeInOut(clamp((this.t - b.rb.t0 - b.rb.delay) / 0.8, 0, 1));
        b.x = b.rb.fx + (b.hx - b.rb.fx) * e;
        b.y = b.rb.fy + (b.hy - b.rb.fy) * e;
        b.a = b.rb.fa + wrapAngle(b.ha - b.rb.fa) * e;
        b.lift = Math.sin(Math.PI * e) * 34;
        if (e >= 1) {
          b.rb = null;
          b.lift = 0;
          b.vx = b.vy = b.va = 0;
          if (b.kind !== "pin" && b.kind !== "brick") this.sparkles(b.x, b.y, 2);
        }
        continue;
      }
      const friction = b.kind === "ball" ? 0.7 : b.kind === "pin" ? 1.8 : 2.6;
      b.vx *= Math.exp(-dt * friction);
      b.vy *= Math.exp(-dt * friction);
      b.va *= Math.exp(-dt * 2.5);
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.a += b.va * dt;

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
          b.va += ((b.vx - car.vx) * -ny + (b.vy - car.vy) * nx) * 0.02 + (Math.random() - 0.5) * j * 0.01;
          b.disturbed = this.t;
        }
        const overlap = min - d;
        const share = CAR_M / (CAR_M + b.m);
        b.x += nx * overlap * share;
        b.y += ny * overlap * share;
        car.x -= nx * overlap * (1 - share);
        car.y -= ny * overlap * (1 - share);
      }
    }
    for (let i = 0; i < bodies.length; i++) {
      const a = bodies[i];
      if (a.rb) continue;
      for (let j = i + 1; j < bodies.length; j++) {
        const b = bodies[j];
        if (b.rb) continue;
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
          const jimp = -(1.6 * rel) / (1 / a.m + 1 / b.m);
          a.vx -= (jimp / a.m) * nx;
          a.vy -= (jimp / a.m) * ny;
          b.vx += (jimp / b.m) * nx;
          b.vy += (jimp / b.m) * ny;
          a.va += (Math.random() - 0.5) * 4;
          b.va += (Math.random() - 0.5) * 4;
          if (rel < -10) a.disturbed = b.disturbed = this.t;
        }
        const push = (min - d) / 2;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
      }
      if (a.vx * a.vx + a.vy * a.vy < 4 || !this.world) continue;
      if (a.x < EDGE + a.r || a.x > WORLD_W - EDGE - a.r) {
        a.x = clamp(a.x, EDGE + a.r, WORLD_W - EDGE - a.r);
        a.vx *= -0.5;
      }
      if (a.y < EDGE + a.r || a.y > WORLD_H - EDGE - a.r) {
        a.y = clamp(a.y, EDGE + a.r, WORLD_H - EDGE - a.r);
        a.vy *= -0.5;
      }
      for (const ci of queryColliders(this.world, a.x, a.y, this.scratch)) {
        const c = this.world.colliders[ci];
        if (c.ref.type === "prop" && this.world.props[c.ref.i].brokenAt >= 0) continue;
        const dx = a.x - c.x;
        const dy = a.y - c.y;
        const min = a.r + c.r;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min) continue;
        const d = Math.sqrt(d2) || 0.01;
        const nx = dx / d;
        const ny = dy / d;
        const vn = a.vx * nx + a.vy * ny;
        if (c.ref.type === "prop" && -vn > 200) {
          this.breakProp(c.ref.i, a.vx, a.vy);
          continue;
        }
        a.x += nx * (min - d);
        a.y += ny * (min - d);
        if (vn < 0) {
          a.vx -= 1.5 * vn * nx;
          a.vy -= 1.5 * vn * ny;
          if (c.ref.type === "tree") this.kickTree(c.ref.i, -vn / 400);
        }
      }
    }

    // Anything knocked out of place glides back home after a short rest.
    for (const b of bodies) {
      if (b.rb) continue;
      const displaced = Math.hypot(b.x - b.hx, b.y - b.hy) > 5 || Math.abs(wrapAngle(b.a - b.ha)) > 0.12;
      if (!displaced || this.t - b.disturbed < REBUILD_AFTER) continue;
      if (b.vx * b.vx + b.vy * b.vy > 64 || Math.hypot(car.x - b.hx, car.y - b.hy) < 170) continue;
      b.rb = { t0: this.t, delay: b.kind === "letter" ? b.order * 0.06 : Math.random() * 0.4, fx: b.x, fy: b.y, fa: b.a };
      b.vx = b.vy = b.va = 0;
    }

    // Bowling.
    let knocked = 0;
    for (const b of bodies) if (b.kind === "pin" && Math.hypot(b.x - b.hx, b.y - b.hy) > 18) knocked++;
    if (knocked === 0) this.strike = { firstKnock: 0, done: false };
    else if (!this.strike.firstKnock) this.strike.firstKnock = this.t;
    if (!this.strike.done && knocked >= 9 && this.t - this.strike.firstKnock < 4) {
      this.strike.done = true;
      this.say("STRIKE!", BOWLING.x, BOWLING.y - 60, "#d9622b", 64);
      for (let i = 0; i < (this.quality ? 14 : 36); i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 120 + Math.random() * 260;
        this.spawn({ kind: "confetti", x: BOWLING.x, y: BOWLING.y, z: 20, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6, vz: 200 + Math.random() * 200, max: 1.6 + Math.random() * 0.6, size: 5 + Math.random() * 4, color: CONFETTI[i % CONFETTI.length], rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12 });
      }
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
      switch (p.kind) {
        case "dust":
          p.vx *= 0.94;
          p.vy *= 0.94;
          break;
        case "debris":
        case "confetti":
        case "sparkle":
          p.vz -= (p.kind === "sparkle" ? 120 : 520) * dt;
          p.z += p.vz * dt;
          if (p.z <= 0) {
            p.z = 0;
            p.vz *= -0.35;
            p.vx *= 0.7;
            p.vy *= 0.7;
            p.vr *= 0.6;
          }
          break;
        case "leaf":
          p.vz = Math.max(p.vz - 60 * dt, -40);
          p.z = Math.max(0, p.z + p.vz * dt);
          p.vx += Math.sin(this.t * 3 + p.rot) * 30 * dt;
          if (p.z === 0) {
            p.vx *= 0.9;
            p.vy *= 0.9;
          }
          break;
      }
    }
  }

  private updateAmbient(dt: number) {
    if (this.quality > 0 || this.reduced || !this.world) return;
    // Autumn leaves drift from maples near the camera.
    const { left, top, vw, vh } = this.view();
    if (Math.random() < 0.12) {
      const st = this.world.standing;
      const s = st[Math.floor(Math.random() * st.length)];
      if (s.kind === "maple" && s.x > left - 100 && s.x < left + vw + 100 && s.y > top - 100 && s.y < top + vh + 200) {
        this.leaves(s.x, s.y, 1, true);
      }
    }
    for (const f of this.flocks) {
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      if (f.x < -300) f.x = WORLD_W + 300;
      if (f.x > WORLD_W + 300) f.x = -300;
      if (f.y < -300) f.y = WORLD_H + 300;
      if (f.y > WORLD_H + 300) f.y = -300;
    }
  }

  private updateNear() {
    const car = this.car;
    let best: Place | null = null;
    let bestD = Infinity;
    for (const p of places) {
      const d = Math.hypot(car.x - p.front[0], car.y - p.front[1]);
      if (d < p.triggerRadius && d < bestD) {
        best = p;
        bestD = d;
      }
    }
    const id = best?.id ?? null;
    if (id !== this.near) {
      this.near = id;
      if (best) {
        this.placeVel[places.indexOf(best)] += 1.2;
        this.sparkles(best.x, best.y - 40, this.quality ? 4 : 10, best.color);
      }
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
    const shakeX = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    const shakeY = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    const { left, top, vw, vh } = this.view();
    const ox = Math.round(-(left + shakeX) * S);
    const oy = Math.round(-(top + shakeY) * S);

    ctx.fillStyle = "#76a35a";
    for (let tx = Math.floor(left / TILE); tx <= Math.floor((left + vw) / TILE); tx++)
      for (let ty = Math.floor(top / TILE); ty <= Math.floor((top + vh) / TILE); ty++) {
        const tile = this.tiles.get(`${tx},${ty}`);
        const px = Math.round(tx * TILE * S) + ox;
        const py = Math.round(ty * TILE * S) + oy;
        if (tile) ctx.drawImage(tile, px, py);
        else ctx.fillRect(px, py, Math.ceil(TILE * S) + 1, Math.ceil(TILE * S) + 1);
      }

    ctx.setTransform(S, 0, 0, S, ox, oy);
    const t = this.reduced ? 0 : this.t;
    this.drawWaterGlints(t, left, top, vw, vh);
    this.drawTracks();
    if (!this.world) return;

    // Gather everything that stands up, then paint back-to-front.
    const inView = (x0: number, y0: number, x1: number, y1: number) => x1 > left && x0 < left + vw && y1 > top && y0 < top + vh;
    const list = this.drawList;
    list.length = 0;
    const st = this.world.standing;
    for (let i = 0; i < st.length; i++) {
      const s = st[i];
      const b = FOLIAGE_BOX[s.kind];
      if (inView(s.x - b.ax * s.s, s.y - b.ay * s.s, s.x + b.ax * s.s, s.y + 20)) list.push({ y: s.y, k: 0, i });
    }
    const props = this.world.props;
    for (let i = 0; i < props.length; i++) {
      const p = props[i];
      if (p.brokenAt < 0 && inView(p.x - 40, p.y - 100, p.x + 40, p.y + 20)) list.push({ y: p.y, k: 1, i });
    }
    for (let i = 0; i < places.length; i++) {
      const p = places[i];
      if (inView(p.x - p.box.ax - 160, p.y - p.box.ay - 120, p.x - p.box.ax + p.box.w + 160, p.y - p.box.ay + p.box.h + 60)) list.push({ y: p.y, k: 2, i });
    }
    for (let i = 0; i < districts.length; i++) {
      const g = districts[i].gate;
      if (inView(g.x - 180, g.y - 220, g.x + 180, g.y + 40)) list.push({ y: g.y, k: 3, i });
    }
    for (let i = 0; i < DECOR.length; i++) {
      const d = DECOR[i];
      if (inView(d.x - 160, d.y - 220, d.x + 160, d.y + 60)) list.push({ y: d.y, k: 4, i });
    }
    for (let i = 0; i < this.bodies.length; i++) {
      const b = this.bodies[i];
      if (inView(b.x - 50, b.y - 90, b.x + 50, b.y + 50)) list.push({ y: b.y, k: 5, i });
    }
    list.push({ y: this.car.y + 6, k: 6, i: 0 });
    list.sort((a, b) => a.y - b.y);

    const sway = this.quality || this.reduced ? 0 : 1;
    for (const d of list) {
      switch (d.k) {
        case 0: {
          const s = st[d.i];
          const box = FOLIAGE_BOX[s.kind];
          const wob = this.treeWob[d.i];
          const low = s.kind === "bush" || s.kind === "rock";
          const skew = low ? wob * 0.4 : sway * Math.sin(this.t * 1.3 + s.x * 0.013) * 0.014 + wob * 0.35;
          const sc = S * s.s;
          ctx.setTransform(sc, 0, -sc * skew, sc * (low ? 1 - Math.abs(wob) * 0.25 : 1), ox + S * s.x, oy + S * s.y);
          ctx.drawImage(this.foliageSprite(s.kind, s.variant), -box.ax, -box.ay, box.w, box.h);
          break;
        }
        case 1: {
          const p = props[d.i];
          const box = PROP_BOX[p.kind];
          const g = p.regrowAt >= 0 ? easeOutBack(clamp((this.t - p.regrowAt) / 0.55, 0, 1)) : 1;
          ctx.setTransform(S * g, 0, 0, S * g, ox + S * p.x, oy + S * p.y);
          ctx.drawImage(this.propSprite(p.kind, p.variant), -box.ax, -box.ay, box.w, box.h);
          break;
        }
        case 2: {
          const p = places[d.i];
          const w = this.placeWob[d.i];
          ctx.setTransform(S * (1 - w * 0.035), 0, -S * w * 0.02, S * (1 + w * 0.05), ox + S * p.x, oy + S * p.y);
          ctx.drawImage(this.placeSprite(p), -p.box.ax, -p.box.ay, p.box.w, p.box.h);
          ctx.setTransform(S, 0, 0, S, ox, oy);
          if (this.overlay) drawPlaceOverlay(ctx, p, t, this.overlay, this.near === p.id);
          break;
        }
        case 3: {
          const dist = districts[d.i];
          ctx.setTransform(S, 0, 0, S, ox + S * dist.gate.x, oy + S * dist.gate.y);
          ctx.drawImage(this.sprite(`g:${dist.id}`, GATE_BOX, (g) => paintGate(g, dist)), -GATE_BOX.ax, -GATE_BOX.ay, GATE_BOX.w, GATE_BOX.h);
          break;
        }
        case 4: {
          const dc = DECOR[d.i];
          const box = DECOR_BOX[dc.kind];
          ctx.setTransform(S, 0, 0, S, ox + S * dc.x, oy + S * dc.y);
          const spr = this.sprite(`d:${dc.kind}`, box, (g) =>
            dc.kind === "fountain" ? paintFountain(g) : dc.kind === "campfire" ? paintCampfire(g, mulberry32(4)) : paintSignpost(g, districts),
          );
          ctx.drawImage(spr, -box.ax, -box.ay, box.w, box.h);
          ctx.setTransform(S, 0, 0, S, ox, oy);
          drawDecorOverlay(ctx, dc.kind, dc.x, dc.y, t);
          break;
        }
        case 5: {
          const b = this.bodies[d.i];
          const size = BODY_SIZE[b.kind];
          ctx.setTransform(S, 0, 0, S, ox, oy);
          const shadowR = b.kind === "letter" ? 28 : b.r;
          ctx.fillStyle = `rgba(24, 48, 44, ${0.28 * (1 - b.lift / 60)})`;
          ctx.beginPath();
          ctx.ellipse(b.x + 5, b.y + b.r * 0.55, shadowR, shadowR * 0.4, 0, 0, Math.PI * 2);
          ctx.fill();
          const cos = Math.cos(b.a) * S;
          const sin = Math.sin(b.a) * S;
          ctx.setTransform(cos, sin, -sin, cos, ox + S * b.x, oy + S * (b.y - b.lift));
          ctx.drawImage(this.bodySprite(b), -size / 2, -size / 2, size, size);
          break;
        }
        case 6:
          this.drawCar(ox, oy);
          break;
      }
    }

    ctx.setTransform(S, 0, 0, S, ox, oy);
    this.drawFlocks(left, top, vw, vh);
    this.drawParticles();
    if (!this.quality && !this.reduced) this.drawCloudShadows(left, top, vw, vh);
  }

  private drawWaterGlints(t: number, left: number, top: number, vw: number, vh: number) {
    const ctx = this.ctx;
    ctx.fillStyle = "#ffffff";
    for (const p of PONDS) {
      if (p.x + p.rx < left || p.x - p.rx > left + vw || p.y + p.ry < top || p.y - p.ry > top + vh) continue;
      for (let k = 0; k < 8; k++) {
        const a = Math.max(0, Math.sin(t * 2.2 + k * 1.7));
        if (a < 0.05) continue;
        const gx = p.x + Math.sin(k * 12.9898) * p.rx * 0.6;
        const gy = p.y + Math.cos(k * 78.233) * p.ry * 0.5;
        const s = 2 + a * 3;
        ctx.globalAlpha = a * 0.9;
        ctx.beginPath();
        ctx.moveTo(gx - s * 2, gy);
        ctx.lineTo(gx, gy - s * 0.5);
        ctx.lineTo(gx + s * 2, gy);
        ctx.lineTo(gx, gy + s * 0.5);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawTracks() {
    const ctx = this.ctx;
    const tr = this.tracks;
    ctx.strokeStyle = "#5d4a2c";
    ctx.lineWidth = 3.2;
    ctx.lineCap = "round";
    for (let n = 1; n < this.trackCount; n++) {
      const i = (this.trackHead - this.trackCount + n + TRACK_N) % TRACK_N;
      const pi = (i - 1 + TRACK_N) % TRACK_N;
      const a = i * 6;
      const b = pi * 6;
      if (tr[a + 5] < 0 || tr[b + 5] < 0) continue;
      const age = this.t - tr[a + 4];
      if (age > TRACK_LIFE) continue;
      ctx.globalAlpha = tr[a + 5] * (1 - age / TRACK_LIFE) * 0.45;
      ctx.beginPath();
      ctx.moveTo(tr[b], tr[b + 1]);
      ctx.lineTo(tr[a], tr[a + 1]);
      ctx.moveTo(tr[b + 2], tr[b + 3]);
      ctx.lineTo(tr[a + 2], tr[a + 3]);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  private drawCar(ox: number, oy: number) {
    const ctx = this.ctx;
    const S = this.S;
    const { x, y, a, steer } = this.car;
    ctx.setTransform(S, 0, 0, S, ox + S * x, oy + S * y);
    ctx.fillStyle = "rgba(24, 48, 44, 0.3)";
    ctx.beginPath();
    ctx.ellipse(6, 10, 34, 18, a, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(a);
    ctx.fillStyle = "#2f2f35";
    for (const [wx, wy, front] of [[18, -17, 1], [18, 17, 1], [-17, -17, 0], [-17, 17, 0]] as const) {
      ctx.save();
      ctx.translate(wx, wy);
      if (front) ctx.rotate(steer * 0.45);
      ctx.beginPath();
      ctx.roundRect(-7.5, -4, 15, 8, 3);
      ctx.fill();
      ctx.restore();
    }
    ctx.drawImage(this.sprite("car", CAR_BOX, paintCar), -CAR_BOX.ax, -CAR_BOX.ay, CAR_BOX.w, CAR_BOX.h);
  }

  private drawFlocks(left: number, top: number, vw: number, vh: number) {
    if (this.quality || this.reduced) return;
    const ctx = this.ctx;
    for (const f of this.flocks) {
      if (f.x < left - 200 || f.x > left + vw + 200 || f.y < top - 200 || f.y > top + vh + 300) continue;
      const heading = Math.atan2(f.vy, f.vx);
      for (let k = 0; k < f.size; k++) {
        // V formation behind the leader.
        const row = Math.ceil(k / 2);
        const side = k % 2 ? 1 : -1;
        const bx = f.x - Math.cos(heading) * row * 26 + Math.sin(heading) * side * row * 22;
        const by = f.y - Math.sin(heading) * row * 26 - Math.cos(heading) * side * row * 22;
        const flap = Math.sin(this.t * 9 + k * 1.3) * 5;
        ctx.fillStyle = "rgba(24, 48, 44, 0.12)";
        ctx.beginPath();
        ctx.ellipse(bx + 40, by + 150, 9, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#26302d";
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(bx - 11, by - flap);
        ctx.quadraticCurveTo(bx - 5, by - 5, bx, by);
        ctx.quadraticCurveTo(bx + 5, by - 5, bx + 11, by - flap);
        ctx.stroke();
      }
    }
  }

  private drawCloudShadows(left: number, top: number, vw: number, vh: number) {
    const ctx = this.ctx;
    for (let k = 0; k < 3; k++) {
      const cx = ((this.t * 14 + k * 1500) % (WORLD_W + 1200)) - 600;
      const cy = 400 + k * 800 + Math.sin(this.t * 0.05 + k) * 120;
      const rad = 420 + k * 60;
      if (cx + rad * 1.4 < left || cx - rad * 1.4 > left + vw || cy + rad < top || cy - rad > top + vh) continue;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1.4, 0.8);
      const g = ctx.createRadialGradient(0, 0, 20, 0, 0, rad);
      g.addColorStop(0, "rgba(30, 55, 70, 0.11)");
      g.addColorStop(1, "rgba(30, 55, 70, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(-rad, -rad, rad * 2, rad * 2);
      ctx.restore();
    }
  }

  private drawParticles() {
    const ctx = this.ctx;
    for (const p of this.particles) {
      const k = p.life / p.max;
      ctx.globalAlpha = p.kind === "debris" ? Math.min(1, (1 - k) * 3) : 1 - k;
      switch (p.kind) {
        case "dust":
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1 + k * 1.5), 0, Math.PI * 2);
          ctx.fill();
          break;
        case "ripple":
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.size + k * 40, (p.size + k * 40) * 0.45, 0, 0, Math.PI * 2);
          ctx.stroke();
          break;
        case "leaf":
        case "debris":
        case "confetti":
          ctx.save();
          ctx.translate(p.x, p.y - p.z);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          if (p.kind === "leaf") {
            ctx.beginPath();
            ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
          } else ctx.fillRect(-p.size / 2, -p.size / 3, p.size, (p.size * 2) / 3);
          ctx.restore();
          break;
        case "sparkle": {
          const s = p.size * (1 - k * 0.5);
          const sx = p.x;
          const sy = p.y - p.z;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(sx, sy - s * 1.6);
          ctx.lineTo(sx + s * 0.4, sy - s * 0.4);
          ctx.lineTo(sx + s * 1.6, sy);
          ctx.lineTo(sx + s * 0.4, sy + s * 0.4);
          ctx.lineTo(sx, sy + s * 1.6);
          ctx.lineTo(sx - s * 0.4, sy + s * 0.4);
          ctx.lineTo(sx - s * 1.6, sy);
          ctx.lineTo(sx - s * 0.4, sy - s * 0.4);
          ctx.closePath();
          ctx.fill();
          break;
        }
        case "text":
          text(ctx, p.text ?? "", p.x, p.y, p.size, p.color, { alpha: 1 - k * k, rot: p.rot, weight: 900, shadow: "rgba(255,255,255,0.8)" });
          break;
      }
    }
    ctx.globalAlpha = 1;
  }
}
