import { profile } from "@/data/profile";

export const WORLD_W = 3400;
export const WORLD_H = 2600;
export const EDGE = 70;
export const PLAZA = { x: 1700, y: 1320, r: 160 };
export const SPAWN = { x: 1700, y: 1395, angle: -Math.PI / 2 };

/** Giant concrete letters north of the plaza; drive through them. */
export const NAME = { text: "SHREYAS ALVA", x: 1700, y: 1060, advance: 66 };
export const TAGLINE = { text: "FULL-STACK × AI ENGINEER  ·  OPEN TO WORK & COLLABORATION", x: 1700, y: 1150 };
/** The railway along the south edge; a train runs along it every so often. */
export const TRACK_Y = WORLD_H - 150;
/** Sun direction for cast shadows (towards the lower right). */
export const SUN = { x: 0.62, y: 0.78 };

export type PlaceKind = "project" | "workshop" | "about" | "skills" | "social";

export interface Place {
  id: string;
  kind: PlaceKind;
  district: DistrictId;
  title: string;
  subtitle: string;
  /** Accent colour (labels, UI). */
  color: string;
  /** Darker, legible version for text on light backgrounds. */
  ink: string;
  /** Footprint centre. */
  x: number;
  y: number;
  /** Footprint size and building height (height drives the cast shadow). */
  w: number;
  h: number;
  height: number;
  /** Parking spot in front of the entrance; also the fast-travel drop. */
  front: [number, number];
  triggerRadius: number;
  /** Sprite box relative to the footprint centre (includes the shadow). */
  box: { w: number; h: number; ax: number; ay: number };
  projectSlug?: string;
  href?: string;
  hrefLabel?: string;
}

export type DistrictId = "projects" | "connections" | "home" | "playground";

export interface District {
  id: DistrictId;
  name: string;
  blurb: string;
  color: string;
  gate: { x: number; y: number };
  court: { x: number; y: number; rx: number; ry: number; surface: "stone" | "meadow" | "court" };
}

export const districts: District[] = [
  {
    id: "projects",
    name: "Projects",
    blurb: "Flagship builds around the fountain plaza",
    color: "#ff7a1a",
    gate: { x: 1700, y: 870 },
    court: { x: 1700, y: 560, rx: 690, ry: 265, surface: "stone" },
  },
  {
    id: "connections",
    name: "Connections",
    blurb: "GitHub, LinkedIn, the post office and the print shop",
    color: "#3b82f6",
    gate: { x: 2810, y: 1560 },
    court: { x: 2810, y: 1300, rx: 470, ry: 215, surface: "stone" },
  },
  {
    id: "home",
    name: "Home",
    blurb: "About me and the old tree of skills",
    color: "#14b8a6",
    gate: { x: 780, y: 1560 },
    court: { x: 780, y: 1290, rx: 430, ry: 225, surface: "meadow" },
  },
  {
    id: "playground",
    name: "The Court",
    blurb: "Street court: smash the cones, sink the ball",
    color: "#f59e0b",
    gate: { x: 1700, y: 1790 },
    court: { x: 1700, y: 2070, rx: 560, ry: 255, surface: "court" },
  },
];

export const districtById = (id: DistrictId) => districts.find((d) => d.id === id)!;

const PAD = 30;

const place = (
  p: Omit<Place, "front" | "triggerRadius" | "box"> & { frontGap?: number; triggerRadius?: number },
): Place => {
  const shadow = p.height * 0.7;
  return {
    ...p,
    front: [p.x, p.y + p.h / 2 + (p.frontGap ?? 55)],
    triggerRadius: p.triggerRadius ?? 140,
    box: { w: p.w + PAD * 2 + shadow * SUN.x, h: p.h + PAD * 2 + shadow * SUN.y, ax: p.w / 2 + PAD, ay: p.h / 2 + PAD },
  };
};

export const places: Place[] = [
  // --- Projects district -----------------------------------------------------
  place({
    id: "shadowpath",
    kind: "project",
    district: "projects",
    title: "ShadowPath",
    subtitle: "Automated repository attack-surface analysis",
    color: "#ef4444",
    ink: "#b91c1c",
    x: 1080,
    y: 470,
    w: 130,
    h: 130,
    height: 260,
    projectSlug: "shadowpath",
  }),
  place({
    id: "industrial-product-search",
    kind: "project",
    district: "projects",
    title: "Product Search",
    subtitle: "Constraint-aware search for industrial parts",
    color: "#f59e0b",
    ink: "#a16207",
    x: 1390,
    y: 300,
    w: 320,
    h: 170,
    height: 70,
    projectSlug: "industrial-product-search",
  }),
  place({
    id: "workshop",
    kind: "workshop",
    district: "projects",
    title: "The Workshop",
    subtitle: "Side builds, spikes and a security lab",
    color: "#64748b",
    ink: "#334155",
    x: 1700,
    y: 200,
    w: 230,
    h: 140,
    height: 55,
  }),
  place({
    id: "website-content-search",
    kind: "project",
    district: "projects",
    title: "Content Search",
    subtitle: "Semantic search over any website",
    color: "#3b82f6",
    ink: "#1d4ed8",
    x: 2010,
    y: 300,
    w: 300,
    h: 190,
    height: 95,
    projectSlug: "website-content-search",
  }),
  place({
    id: "trek-saathi",
    kind: "project",
    district: "projects",
    title: "Trek Saathi",
    subtitle: "Discovery & booking for Indian treks",
    color: "#22c55e",
    ink: "#15803d",
    x: 2320,
    y: 470,
    w: 250,
    h: 170,
    height: 60,
    projectSlug: "trek-saathi",
  }),

  // --- Home district ---------------------------------------------------------
  place({
    id: "about",
    kind: "about",
    district: "home",
    title: "About me",
    subtitle: "Who I am and how I work",
    color: "#f97316",
    ink: "#c2410c",
    x: 560,
    y: 1080,
    w: 200,
    h: 150,
    height: 70,
  }),
  place({
    id: "skills",
    kind: "skills",
    district: "home",
    title: "Skill Tree",
    subtitle: "The old tree: what I'm strong at, and what's growing",
    color: "#14b8a6",
    ink: "#0f766e",
    x: 1010,
    y: 1070,
    w: 300,
    h: 300,
    height: 160,
    frontGap: 20,
  }),

  // --- Connections district --------------------------------------------------
  ...(
    [
      ["github", "GitHub", `Code & experiments · @${profile.githubHandle}`, "#22c55e", "#15803d", profile.github, "Open GitHub", 60],
      ["linkedin", "LinkedIn", "The office tower · let's connect", "#0a66c2", "#084a8c", profile.linkedin, "Open LinkedIn", 240],
      ["email", "Email", `Post office · ${profile.email}`, "#ef4444", "#b91c1c", `mailto:${profile.email}`, "Write an email", 55],
      ["resume", "Résumé", "Print shop · one-page PDF", "#eab308", "#854d0e", profile.resumeUrl, "Download résumé", 45],
    ] as const
  ).map(([id, title, subtitle, color, ink, href, hrefLabel, height], i) =>
    place({
      id,
      kind: "social",
      district: "connections",
      title,
      subtitle,
      color,
      ink,
      x: 2440 + i * 247,
      y: i === 0 || i === 3 ? 1100 : 1030,
      w: id === "linkedin" ? 160 : 180,
      h: id === "linkedin" ? 160 : 130,
      height,
      href,
      hrefLabel,
      triggerRadius: 115,
    }),
  ),
];

export const placeById = (id: string) => places.find((p) => p.id === id);

/** Roads: cubic beziers from the plaza out through each district gate. */
export const roads: [number, number][][] = [
  [[1700, 1165], [1690, 1040], [1712, 940], [1700, 825]],
  [[1860, 1335], [2260, 1365], [2810, 1650], [2810, 1505]],
  [[1540, 1335], [1140, 1365], [780, 1650], [780, 1505]],
  [[1700, 1480], [1712, 1600], [1688, 1700], [1700, 1830]],
];

export const PONDS = [
  { x: 420, y: 560, rx: 210, ry: 110 },
  { x: 3000, y: 2150, rx: 230, ry: 120 },
  { x: 900, y: 2190, rx: 150, ry: 80 },
];

export type DecorKind = "fountain" | "campfire";
export const DECOR: { kind: DecorKind; x: number; y: number; r: number }[] = [
  { kind: "fountain", x: 1700, y: 600, r: 84 },
  { kind: "campfire", x: 790, y: 1300, r: 28 },
];

/** Street basketball court: hoops at both ends, a cone pyramid to the side. */
export const COURT = { x: 1700, y: 2060, half: 230 };
export const CONES = { x: 1700, y: 1950 };

/** Parking bays with cars you can shove (they roll back to their bay). */
export const PARKING: { x: number; y: number; a: number }[] = [
  ...[0, 1, 2, 3, 4].map((i) => ({ x: 2560 + i * 60, y: 1380, a: -Math.PI / 2 })),
  ...[0, 1, 2].map((i) => ({ x: 1200 + i * 60, y: 700, a: -Math.PI / 2 })),
  ...[0, 1, 2].map((i) => ({ x: 2080 + i * 60, y: 700, a: Math.PI / 2 })),
];
