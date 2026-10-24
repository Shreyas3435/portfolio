import {
  type BodyKind,
  type Light,
  type PropKind,
  type SpriteBox,
  BODY_SIZE,
  CAR_BOX,
  CAR_WHEELS,
  DECOR_BOX,
  DECOR_LIGHTS,
  GATE_LIGHTS,
  LABEL_BOX,
  PROP_BOX,
  PROP_DEBRIS,
  PROP_LIGHTS,
  TRAIN_BOX,
  TRAIN_CAR_LEN,
  gateBox,
  paintBody,
  paintCampfire,
  paintCar,
  paintFountain,
  paintGate,
  paintLabel,
  paintPlace,
  paintProp,
  paintRooftop,
  paintTrainCar,
  paintTree,
  perimeterLights,
  placeLights,
  rooftopBox,
  treeBox,
} from "./art";
import { drawDecorOverlay, drawPlaceOverlay } from "./overlays";
import { type Ctx, displayFont, mulberry32, rgba, setDisplayFamily, text } from "./paint";
import { CONES, COURT, DECOR, EDGE, NAME, PARKING, PONDS, SPAWN, TRACK_Y, WORLD_H, WORLD_W, districts, places, type Place } from "./places";
import { TILE, buildWorld, contact, queryColliders, renderTile, type Standing, type WorldData } from "./scenery";

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
const CONFETTI = ["#3df0ff", "#ffffff", "#ffab00", "#2979ff", "#00c853", "#ff6d00"];
const TRAIN_CARS = 4;
const TRAIN_SPEED = 620;
const LIGHTMAP_SCALE = 6;

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
  private touch = false;
  private strike = { firstKnock: 0, done: false };
  private lastSwish = -9;
  private night = false;
  private nightK = 0;
  /** Left edge of the train in world x, or null while it's off-duty. */
  private trainX: number | null = null;
  private trainNext = 6;
  private fireflies: { x: number; y: number; phase: number }[] = [];
  private treeWob = new Float32Array(0);
  private treeVel = new Float32Array(0);
  private activeTrees = new Set<number>();
  private placeWob = new Float32Array(places.length);
  private placeVel = new Float32Array(places.length);
  private lastBonk = 0;
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
    this.touch = window.matchMedia("(pointer: coarse)").matches;
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
    const fam = getComputedStyle(document.documentElement).getPropertyValue("--font-chakra").trim();
    setDisplayFamily(fam ? `${fam}, "Arial Narrow", sans-serif` : "\"Arial Narrow\", sans-serif");
    try {
      await Promise.race([
        Promise.all([600, 700].map((w) => document.fonts.load(displayFont(40, w)))),
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
    this.spawnFireflies();
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

  /** Switch between day and night; the change fades in over a second. */
  setNight(on: boolean) {
    this.night = on;
    if (this.reduced) this.nightK = on ? 1 : 0;
    if (!this.raf && this.ready) this.render();
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
    const dpr = Math.min(window.devicePixelRatio || 1, [this.touch ? 1.5 : 2, 1, 0.75][this.quality]);
    this.cssW = w;
    this.cssH = h;
    this.zoom = clamp(Math.min(w, h * 1.4) / 1050, 0.55, 1.05);
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    const S = this.zoom * dpr;
    if (Math.abs(S - this.S) > 0.01 || !this.sprites.size) {
      this.S = S;
      this.tiles.clear();
      this.sprites.clear();
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
    const max = this.quality ? 24 : 32;
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

  private standingSprite(s: Standing): [HTMLCanvasElement, SpriteBox] {
    if (s.kind === "roof") {
      const box = rooftopBox(s.w, s.h, s.height);
      return [this.sprite(`roof:${s.variant}:${s.w}:${s.h}:${s.height}`, box, (g) => paintRooftop(g, mulberry32(s.variant * 31 + s.w), s.variant, s.w, s.h, s.height)), box];
    }
    const v = s.variant % 3;
    const box = treeBox(s.kind);
    return [this.sprite(`tree:${s.kind}:${v}`, box, (g) => paintTree(g, s.kind as Exclude<Standing["kind"], "roof">, mulberry32(s.kind.length * 97 + v * 13), v)), box];
  }

  private propSprite(kind: PropKind, variant: number) {
    return this.sprite(`p:${kind}:${variant}`, PROP_BOX[kind], (g) => paintProp(g, kind, variant));
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
      const r = { crate: 16, cone: 9, ball: 15, brick: 11, letter: 26, sedan: 24 }[kind];
      const m = { crate: 1.3, cone: 0.35, ball: 0.5, brick: 0.7, letter: 1.4, sedan: 3 }[kind];
      this.bodies.push({ kind, char, x, y, vx: 0, vy: 0, a: 0, va: 0, r, m, hx: x, hy: y, ha: 0, order: this.bodies.length, disturbed: -99, lift: 0, rb: null });
    };
    const chars = NAME.text.split("");
    chars.forEach((ch, i) => {
      if (ch !== " ") add("letter", NAME.x + (i - (chars.length - 1) / 2) * NAME.advance, NAME.y, ch);
    });
    // A pyramid of traffic cones, apex pointing at the plaza.
    for (let row = 0; row < 4; row++) for (let i = 0; i <= row; i++) add("cone", CONES.x + (i - row / 2) * 24, CONES.y - 66 + row * 22);
    for (let row = 0; row < 2; row++) for (let i = 0; i < 9; i++) add("brick", 2000 + i * 25 + row * 12, 2190 + row * 17);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) add("crate", 2080 + i * 34, 1940 + j * 34);
    for (const [x, y] of [[2560, 1440], [2594, 1452], [960, 1460], [1300, 700], [2140, 860]]) add("crate", x, y);
    add("ball", COURT.x, COURT.y);
    PARKING.forEach((slot, i) => {
      add("sedan", slot.x, slot.y, String.fromCharCode(i * 3 + 1));
      const b = this.bodies[this.bodies.length - 1];
      b.a = b.ha = slot.a;
    });
    add("ball", 1890, 1460);
  }

  private spawnFireflies() {
    const st = this.world!.standing;
    const anchors: [number, number][] = st.filter((s) => s.kind === "broadleaf").slice(0, 10).map((s) => [s.x, s.y]);
    for (const p of PONDS) anchors.push([p.x, p.y - 20]);
    anchors.push([1010, 1000]);
    for (const [x, y] of anchors) for (let k = 0; k < 4; k++) this.fireflies.push({ x: x + (Math.random() - 0.5) * 160, y: y + (Math.random() - 0.5) * 100, phase: Math.random() * 6 });
  }

  private honk() {
    this.say("BEEP BEEP!", this.car.x, this.car.y - 56, "#ff6d00", 30);
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

  private leaves(x: number, y: number, n: number, gold: boolean) {
    const cols = gold ? ["#ffd23f", "#e8a600", "#fff2a8"] : ["#5cbf5c", "#2f8a45", "#9be27a"];
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
      else if (k === "h") this.honk();
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
      const hw = p.kind === "skills" ? 150 : p.w / 2 + 20;
      const hh = p.kind === "skills" ? 150 : p.h / 2 + 40;
      if (Math.abs(x - p.x) < hw && y > p.y - hh - 30 && y < p.y + hh) {
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
    const dt = Math.max(0, Math.min(rawDt, 1 / 30));
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
        if (s.kind !== "shrub" || Math.abs(s.x - car.x) > 24 || Math.abs(s.y - car.y) > 24) continue;
        this.kickTree(i, speed / 2000);
        if (Math.random() < 0.3) this.leaves(s.x, s.y, 1, false);
      }
    }

    this.updateSprings(dt);
    this.updateBodies(dt);
    this.updateTrain(dt);
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
    this.nightK += ((this.night ? 1 : 0) - this.nightK) * Math.min(1, dt * 2.5);
    if (Math.abs(this.nightK - (this.night ? 1 : 0)) < 0.002) this.nightK = this.night ? 1 : 0;
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
      const hit = contact(c, car.x, car.y, CAR_R);
      if (!hit) continue;
      const { nx, ny, depth } = hit;
      const vn = car.vx * nx + car.vy * ny;
      if (c.ref.type === "prop" && -vn > 110) {
        this.breakProp(c.ref.i, car.vx, car.vy);
        car.vx *= 0.82;
        car.vy *= 0.82;
        continue;
      }
      car.x += nx * depth;
      car.y += ny * depth;
      if (vn < 0) {
        car.vx -= 1.35 * vn * nx;
        car.vy -= 1.35 * vn * ny;
        this.bonk(-vn);
        if (c.ref.type === "tree") {
          this.kickTree(c.ref.i, -vn / 260);
          const s = this.world.standing[c.ref.i];
          if (-vn > 90) this.leaves(s.x, s.y, this.quality ? 3 : 7, false);
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
      this.say(["crash!", "smash!", "kaboom!", "oops"][Math.floor(Math.random() * 4)], p.x, p.y - 50);
    }
    if (!this.reduced) this.shake = Math.max(this.shake, 4);
  }

  private bonk(impact: number) {
    if (impact < 170) return;
    if (!this.reduced) this.shake = Math.min(10, impact / 50);
    if (this.t - this.lastBonk > 0.6) {
      this.lastBonk = this.t;
      this.say(["bam!", "oof", "whoa!", "thud", "nani?!"][Math.floor(Math.random() * 5)], this.car.x, this.car.y - 50);
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
          if (b.kind !== "cone" && b.kind !== "brick") this.sparkles(b.x, b.y, 2);
        }
        continue;
      }
      const friction = b.kind === "ball" ? 0.7 : b.kind === "cone" ? 1.8 : 2.6;
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
        const hit = contact(c, a.x, a.y, a.r);
        if (!hit) continue;
        const { nx, ny, depth } = hit;
        const vn = a.vx * nx + a.vy * ny;
        if (c.ref.type === "prop" && -vn > 200) {
          this.breakProp(c.ref.i, a.vx, a.vy);
          continue;
        }
        a.x += nx * depth;
        a.y += ny * depth;
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

    // Cone pyramid: knock (nearly) all of them at once for a STRIKE.
    let knocked = 0;
    for (const b of bodies) if (b.kind === "cone" && (Math.hypot(b.x - b.hx, b.y - b.hy) > 16 || Math.abs(wrapAngle(b.a)) > 0.6)) knocked++;
    if (knocked === 0) this.strike = { firstKnock: 0, done: false };
    else if (!this.strike.firstKnock) this.strike.firstKnock = this.t;
    if (!this.strike.done && knocked >= 9 && this.t - this.strike.firstKnock < 4) {
      this.strike.done = true;
      this.say("STRIKE!", CONES.x, CONES.y - 110, "#ff6d00", 60);
      this.confetti(CONES.x, CONES.y - 40);
    }
    // Push the basketball under either hoop for a SWISH.
    for (const b of bodies) {
      if (b.kind !== "ball" || this.t - this.lastSwish < 2) continue;
      for (const s of [-1, 1]) {
        const hx = COURT.x + s * (COURT.half + 20);
        if (Math.hypot(b.x - hx, b.y - COURT.y) < 26) {
          this.lastSwish = this.t;
          this.say("SWISH!", hx, COURT.y - 70, "#2979ff", 56);
          this.confetti(hx, COURT.y);
          b.disturbed = this.t - REBUILD_AFTER + 1.2;
        }
      }
    }
  }

  private confetti(x: number, y: number) {
    for (let i = 0; i < (this.quality ? 14 : 36); i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 120 + Math.random() * 260;
      this.spawn({ kind: "confetti", x, y, z: 20, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: 200 + Math.random() * 200, max: 1.6 + Math.random() * 0.6, size: 5 + Math.random() * 4, color: CONFETTI[i % CONFETTI.length], rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12 });
    }
  }

  private updateTrain(dt: number) {
    if (this.trainX === null) {
      this.trainNext -= dt;
      if (this.trainNext <= 0) this.trainX = -TRAIN_CARS * TRAIN_CAR_LEN - 100;
      return;
    }
    this.trainX += TRAIN_SPEED * dt;
    if (this.trainX > WORLD_W + 100) {
      this.trainX = null;
      this.trainNext = 16 + Math.random() * 10;
      return;
    }
    // Get off the tracks!
    const car = this.car;
    const x0 = this.trainX;
    const x1 = x0 + TRAIN_CARS * TRAIN_CAR_LEN;
    if (car.x > x0 - 20 && car.x < x1 + 20 && Math.abs(car.y - TRACK_Y) < 46) {
      car.y = TRACK_Y - 48 - CAR_R;
      car.vy = -260;
      car.vx += TRAIN_SPEED * 0.5;
      this.bonk(400);
      this.say("WATCH OUT!", car.x, car.y - 60, "#ff3b30", 34);
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
    if (this.quality > 0 || this.reduced) return;
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

    ctx.fillStyle = "#6b8d3d";
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

    // Aerial view: ground-level things first, then the jeep, then anything
    // tall enough to pass over it (trees, rooftops, gantries).
    const inView = (x0: number, y0: number, x1: number, y1: number) => x1 > left && x0 < left + vw && y1 > top && y0 < top + vh;
    const world = this.world;
    for (let i = 0; i < DECOR.length; i++) {
      const dc = DECOR[i];
      const box = DECOR_BOX[dc.kind];
      if (!inView(dc.x - box.ax, dc.y - box.ay, dc.x - box.ax + box.w, dc.y - box.ay + box.h)) continue;
      ctx.setTransform(S, 0, 0, S, ox + S * dc.x, oy + S * dc.y);
      const spr = this.sprite(`d:${dc.kind}`, box, (g) => (dc.kind === "fountain" ? paintFountain(g) : paintCampfire(g, mulberry32(4))));
      ctx.drawImage(spr, -box.ax, -box.ay, box.w, box.h);
    }
    ctx.setTransform(S, 0, 0, S, ox, oy);
    for (const dc of DECOR) if (inView(dc.x - 120, dc.y - 120, dc.x + 120, dc.y + 120)) drawDecorOverlay(ctx, dc.kind, dc.x, dc.y, t);

    for (const b of this.bodies) {
      if (!inView(b.x - 50, b.y - 50, b.x + 50, b.y + 50)) continue;
      const size = BODY_SIZE[b.kind];
      ctx.setTransform(S, 0, 0, S, ox, oy);
      if (b.kind !== "letter") {
        ctx.fillStyle = `rgba(14, 22, 30, ${0.3 * (1 - b.lift / 60)})`;
        ctx.beginPath();
        ctx.ellipse(b.x + 4 + b.lift * 0.4, b.y + 5 + b.lift * 0.5, b.r * (b.kind === "sedan" ? 1.4 : 1), b.r * (b.kind === "sedan" ? 0.9 : 1), b.a, 0, Math.PI * 2);
        ctx.fill();
      }
      const sc = 1 + b.lift / 120;
      const cos = Math.cos(b.a) * S * sc;
      const sin = Math.sin(b.a) * S * sc;
      ctx.setTransform(cos, sin, -sin, cos, ox + S * b.x, oy + S * b.y);
      ctx.drawImage(this.bodySprite(b), -size / 2, -size / 2, size, size);
    }

    const props = world.props;
    for (let i = 0; i < props.length; i++) {
      const p = props[i];
      const box = PROP_BOX[p.kind];
      if (p.brokenAt >= 0 || !inView(p.x - box.ax, p.y - box.ay, p.x - box.ax + box.w, p.y - box.ay + box.h)) continue;
      const g = p.regrowAt >= 0 ? easeOutBack(clamp((this.t - p.regrowAt) / 0.55, 0, 1)) : 1;
      ctx.setTransform(S * g, 0, 0, S * g, ox + S * p.x, oy + S * p.y);
      ctx.drawImage(this.propSprite(p.kind, p.variant), -box.ax, -box.ay, box.w, box.h);
    }

    this.drawCar(ox, oy);

    if (this.trainX !== null) {
      for (let c = 0; c < TRAIN_CARS; c++) {
        const cx = this.trainX + c * TRAIN_CAR_LEN + TRAIN_CAR_LEN / 2;
        if (!inView(cx - 120, TRACK_Y - 40, cx + 120, TRACK_Y + 60)) continue;
        const engine = c === TRAIN_CARS - 1;
        ctx.setTransform(S, 0, 0, S, ox + S * cx, oy + S * TRACK_Y);
        ctx.drawImage(this.sprite(`train:${engine ? 1 : 0}`, TRAIN_BOX, (g) => paintTrainCar(g, engine)), -TRAIN_BOX.ax, -TRAIN_BOX.ay, TRAIN_BOX.w, TRAIN_BOX.h);
      }
    }

    for (let i = 0; i < places.length; i++) {
      const p = places[i];
      if (!inView(p.x - p.box.ax - 40, p.y - p.box.ay - 40, p.x - p.box.ax + p.box.w + 40, p.y - p.box.ay + p.box.h + 40)) continue;
      const w = this.placeWob[i];
      ctx.setTransform(S * (1 + w * 0.02), 0, 0, S * (1 + w * 0.02), ox + S * p.x, oy + S * p.y);
      ctx.drawImage(this.placeSprite(p), -p.box.ax, -p.box.ay, p.box.w, p.box.h);
      ctx.setTransform(S, 0, 0, S, ox, oy);
      drawPlaceOverlay(ctx, p, t, this.near === p.id);
    }

    const st = world.standing;
    for (let i = 0; i < st.length; i++) {
      const s = st[i];
      const ext = s.kind === "roof" ? Math.max(s.w, s.h) + s.height : 120;
      if (!inView(s.x - ext, s.y - ext, s.x + ext, s.y + ext)) continue;
      const [spr, box] = this.standingSprite(s);
      const wob = this.treeWob[i];
      const sc = S * s.s * (1 + wob * 0.06);
      const rot = s.kind === "roof" ? 0 : wob * 0.08 + (this.quality || this.reduced ? 0 : Math.sin(this.t * 1.1 + s.x * 0.01) * 0.012);
      const cos = Math.cos(rot) * sc;
      const sin = Math.sin(rot) * sc;
      ctx.setTransform(cos, sin, -sin, cos, ox + S * s.x, oy + S * s.y);
      ctx.drawImage(spr, -box.ax, -box.ay, box.w, box.h);
    }

    for (let i = 0; i < districts.length; i++) {
      const dist = districts[i];
      const g = dist.gate;
      const gb = gateBox();
      if (!inView(g.x - gb.ax, g.y - gb.ay, g.x - gb.ax + gb.w, g.y - gb.ay + gb.h)) continue;
      ctx.setTransform(S, 0, 0, S, ox + S * g.x, oy + S * g.y);
      ctx.drawImage(this.sprite(`g:${dist.id}`, gb, (gg) => paintGate(gg, dist)), -gb.ax, -gb.ay, gb.w, gb.h);
    }

    ctx.setTransform(S, 0, 0, S, ox, oy);
    if (this.nightK < 0.5) this.drawFlocks(left, top, vw, vh);
    this.drawParticles();
    if (!this.quality && !this.reduced && this.nightK < 0.99) this.drawCloudShadows(left, top, vw, vh);
    if (this.nightK > 0.01) this.drawNight(ox, oy, left, top, vw, vh);
    this.drawLabels(ox, oy, left, top, vw, vh);
  }

  /** Floating map labels, drawn after the night pass so they stay readable. */
  private drawLabels(ox: number, oy: number, left: number, top: number, vw: number, vh: number) {
    const ctx = this.ctx;
    const S = this.S;
    for (const p of places) {
      const ly = p.y - (p.kind === "skills" ? 150 : p.h / 2) - 26;
      if (p.x < left - 160 || p.x > left + vw + 160 || ly < top - 30 || ly > top + vh + 30) continue;
      const near = this.near === p.id;
      const sc = near ? 1.12 : 1;
      ctx.setTransform(S * sc, 0, 0, S * sc, ox + S * p.x, oy + S * (ly - (near ? 4 + Math.sin(this.t * 4) * 2 : 0)));
      ctx.drawImage(this.sprite(`label:${p.id}`, LABEL_BOX, (g) => paintLabel(g, p)), -LABEL_BOX.ax, -LABEL_BOX.ay, LABEL_BOX.w, LABEL_BOX.h);
    }
    ctx.setTransform(S, 0, 0, S, ox, oy);
  }

  private drawNight(ox: number, oy: number, left: number, top: number, vw: number, vh: number) {
    const ctx = this.ctx;
    const S = this.S;
    const k = this.nightK;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = `rgba(6, 10, 26, ${0.72 * k})`;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(S, 0, 0, S, ox, oy);
    ctx.globalCompositeOperation = "lighter";
    const visible = (x: number, y: number, r: number) => x + r > left && x - r < left + vw && y + r > top && y - r < top + vh;
    const lamp = (x: number, y: number, r: number, color: string, a: number) => {
      if (!visible(x, y, r)) return;
      ctx.globalAlpha = Math.min(1, a);
      ctx.drawImage(this.glowSprite(color), x - r, y - r, r * 2, r * 2);
    };
    const apply = (x: number, y: number, lights: Light[], a: number) => {
      for (const [dx, dy, r, color] of lights) lamp(x + dx, y + dy, r, color, a);
    };
    const a = 0.55 * k;
    // Everything that never moves comes from the baked lightmap in one draw.
    const lm = this.lightmapCanvas();
    if (lm) {
      ctx.globalAlpha = k;
      const sx = Math.max(0, left / LIGHTMAP_SCALE);
      const sy = Math.max(0, top / LIGHTMAP_SCALE);
      ctx.drawImage(lm, sx, sy, vw / LIGHTMAP_SCALE, vh / LIGHTMAP_SCALE, sx * LIGHTMAP_SCALE, sy * LIGHTMAP_SCALE, vw, vh);
    }
    if (this.world) {
      // Props can break, so their light is drawn live.
      for (const p of this.world.props) {
        if (p.brokenAt >= 0 || p.kind !== "lamp") continue;
        apply(p.x, p.y, PROP_LIGHTS[p.kind], a);
        if (p.kind === "lamp") lamp(p.x + 24, p.y, 95, "#ffe2b0", a * 0.75);
      }
    }
    // Red aviation beacons on the tall towers.
    if (Math.sin(this.t * 3) > 0.5) {
      for (const id of ["shadowpath", "linkedin"]) {
        const p = places.find((pl) => pl.id === id)!;
        for (const [dx, dy] of id === "linkedin" ? [[-72, -72], [72, 72]] : [[38, -30]]) lamp(p.x + dx, p.y + dy, 26, "#ff3b30", 0.9 * k);
      }
    }
    if (this.trainX !== null) for (let c = 0; c < TRAIN_CARS; c++) lamp(this.trainX + c * TRAIN_CAR_LEN + TRAIN_CAR_LEN / 2, TRACK_Y - 30, 110, "#ffe9b0", a * 0.8);
    if (!this.reduced) {
      for (const f of this.fireflies) {
        const fx = f.x + Math.sin(this.t * 0.7 + f.phase) * 30;
        const fy = f.y + Math.cos(this.t * 0.9 + f.phase * 1.3) * 18;
        const tw = 0.5 + 0.5 * Math.sin(this.t * 3 + f.phase * 2);
        lamp(fx, fy, 9, "#e0ff8a", a * tw * 1.3);
      }
    }
    // Headlights sweep ahead of the jeep; tail light behind.
    const car = this.car;
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.a);
    const g = ctx.createLinearGradient(30, 0, 300, 0);
    g.addColorStop(0, `rgba(255, 244, 210, ${0.5 * k})`);
    g.addColorStop(1, "rgba(255, 244, 210, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(30, -10);
    ctx.lineTo(300, -110);
    ctx.lineTo(300, 110);
    ctx.lineTo(30, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    lamp(car.x - Math.cos(car.a) * 30, car.y - Math.sin(car.a) * 30, 22, "#ff3b30", a);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  private lightmap: HTMLCanvasElement | null = null;
  /** Static night lights baked once at low resolution; soft glows survive the upscale. */
  private lightmapCanvas() {
    if (this.lightmap || !this.world) return this.lightmap;
    const c = document.createElement("canvas");
    c.width = Math.ceil(WORLD_W / LIGHTMAP_SCALE);
    c.height = Math.ceil(WORLD_H / LIGHTMAP_SCALE);
    const g = c.getContext("2d")!;
    g.scale(1 / LIGHTMAP_SCALE, 1 / LIGHTMAP_SCALE);
    g.globalCompositeOperation = "lighter";
    const a = 0.55;
    const stamp = (x: number, y: number, r: number, color: string, alpha: number) => {
      g.globalAlpha = Math.min(1, alpha);
      g.drawImage(this.glowSprite(color), x - r, y - r, r * 2, r * 2);
    };
    const apply = (x: number, y: number, lights: Light[], alpha: number) => {
      for (const [dx, dy, r, color] of lights) stamp(x + dx, y + dy, r, color, alpha);
    };
    for (const p of places) apply(p.x, p.y, placeLights(p), a * 0.7);
    for (const d of districts) apply(d.gate.x, d.gate.y, GATE_LIGHTS(d), a);
    for (const d of DECOR) apply(d.x, d.y, DECOR_LIGHTS[d.kind], a);
    for (const s of this.world.standing) if (s.kind === "roof") apply(s.x, s.y, perimeterLights(s.w, s.h), a * 0.55);
    // Uplights on the name letters.
    for (const b of this.bodies) if (b.kind === "letter") stamp(b.hx, b.hy + 30, 40, "#fff1d0", a * 0.7);
    this.lightmap = c;
    return c;
  }

  private cloudSprite: HTMLCanvasElement | null = null;

  /** A small pre-rendered radial glow per colour; stamping it is far cheaper than a gradient per light. */
  private glows = new Map<string, HTMLCanvasElement>();
  private glowSprite(color: string) {
    let c = this.glows.get(color);
    if (!c) {
      c = document.createElement("canvas");
      c.width = c.height = 64;
      const g = c.getContext("2d")!;
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, rgba(color, 1));
      grad.addColorStop(0.35, rgba(color, 0.55));
      grad.addColorStop(1, rgba(color, 0));
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
      this.glows.set(color, c);
    }
    return c;
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
    for (const [wx, wy, front] of CAR_WHEELS) {
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
    if (!this.cloudSprite) {
      const c = document.createElement("canvas");
      c.width = c.height = 128;
      const g = c.getContext("2d")!;
      const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64);
      grad.addColorStop(0, "rgba(30, 55, 70, 0.11)");
      grad.addColorStop(1, "rgba(30, 55, 70, 0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, 128, 128);
      this.cloudSprite = c;
    }
    for (let k = 0; k < 3; k++) {
      const cx = ((this.t * 14 + k * 1500) % (WORLD_W + 1200)) - 600;
      const cy = 400 + k * 800 + Math.sin(this.t * 0.05 + k) * 120;
      const rad = 420 + k * 60;
      if (cx + rad * 1.4 < left || cx - rad * 1.4 > left + vw || cy + rad < top || cy - rad > top + vh) continue;
      ctx.globalAlpha = 1 - this.nightK;
      ctx.drawImage(this.cloudSprite, cx - rad * 1.4, cy - rad * 0.8, rad * 2.8, rad * 1.6);
    }
    ctx.globalAlpha = 1;
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
