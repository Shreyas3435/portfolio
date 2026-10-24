import { profile } from "@/data/profile";

export const WORLD_W = 3400;
export const WORLD_H = 2600;
export const EDGE = 70;
export const PLAZA = { x: 1700, y: 1320, r: 160 };
export const SPAWN = { x: 1700, y: 1395, angle: -Math.PI / 2 };

/** The big knock-over-able name north of the plaza. */
export const NAME = { text: "SHREYAS ALVA", x: 1700, y: 1060, advance: 66 };
export const TAGLINE = { text: "Full-Stack × AI Engineer — open to work & collaboration", x: 1700, y: 1160 };

export type PlaceKind = "project" | "workshop" | "about" | "skills" | "social";

export interface Place {
  id: string;
  kind: PlaceKind;
  district: DistrictId;
  title: string;
  subtitle: string;
  /** Main paint colour. */
  color: string;
  /** Darker, legible version for text. */
  ink: string;
  /** Ground anchor: base centre of the building. */
  x: number;
  y: number;
  /** Parking spot; also where fast travel drops you. */
  front: [number, number];
  triggerRadius: number;
  /** Sprite box relative to the anchor. */
  box: { w: number; h: number; ax: number; ay: number };
  /** Static colliders relative to the anchor: [dx, dy, r]. */
  colliders: [number, number, number][];
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
  court: { x: number; y: number; rx: number; ry: number; surface: "stone" | "meadow" | "sand" };
}

export const districts: District[] = [
  {
    id: "projects",
    name: "Projects",
    blurb: "Flagship builds, each with its own house",
    color: "#d9622b",
    gate: { x: 1700, y: 870 },
    court: { x: 1700, y: 560, rx: 690, ry: 265, surface: "stone" },
  },
  {
    id: "connections",
    name: "Connections",
    blurb: "GitHub, LinkedIn, email and résumé",
    color: "#3e7fd9",
    gate: { x: 2810, y: 1560 },
    court: { x: 2810, y: 1300, rx: 470, ry: 215, surface: "stone" },
  },
  {
    id: "home",
    name: "Home",
    blurb: "About me and the skill tree",
    color: "#e89a2c",
    gate: { x: 780, y: 1560 },
    court: { x: 780, y: 1290, rx: 430, ry: 225, surface: "meadow" },
  },
  {
    id: "playground",
    name: "Playground",
    blurb: "Break anything — it rebuilds",
    color: "#7a8b2e",
    gate: { x: 1700, y: 1790 },
    court: { x: 1700, y: 2070, rx: 560, ry: 255, surface: "sand" },
  },
];

export const districtById = (id: DistrictId) => districts.find((d) => d.id === id)!;

const place = (p: Omit<Place, "front" | "triggerRadius"> & { frontOffset?: number; triggerRadius?: number }): Place => ({
  ...p,
  front: [p.x, p.y + (p.frontOffset ?? 85)],
  triggerRadius: p.triggerRadius ?? 150,
});

const projectBox = (w: number, h: number, ay: number) => ({ w, h, ax: w / 2, ay });

export const places: Place[] = [
  // --- Projects district -----------------------------------------------------
  place({
    id: "shadowpath",
    kind: "project",
    district: "projects",
    title: "ShadowPath",
    subtitle: "Automated repository attack-surface analysis",
    color: "#e5484d",
    ink: "#b4232c",
    x: 1080,
    y: 560,
    box: projectBox(320, 500, 420),
    colliders: [[0, -22, 46]],
    projectSlug: "shadowpath",
  }),
  place({
    id: "industrial-product-search",
    kind: "project",
    district: "projects",
    title: "Product Search",
    subtitle: "Constraint-aware search for industrial parts",
    color: "#f0a020",
    ink: "#9a5800",
    x: 1390,
    y: 390,
    box: projectBox(400, 420, 340),
    colliders: [[-95, -30, 50], [0, -30, 50], [95, -30, 50]],
    projectSlug: "industrial-product-search",
  }),
  place({
    id: "workshop",
    kind: "workshop",
    district: "projects",
    title: "The Workshop",
    subtitle: "Side builds, spikes and a security lab",
    color: "#5b7083",
    ink: "#36495a",
    x: 1700,
    y: 270,
    box: projectBox(340, 360, 290),
    colliders: [[-62, -28, 48], [62, -28, 48]],
  }),
  place({
    id: "website-content-search",
    kind: "project",
    district: "projects",
    title: "Content Search",
    subtitle: "Semantic search over any website",
    color: "#3e8bff",
    ink: "#1d58b8",
    x: 2010,
    y: 390,
    box: projectBox(400, 440, 360),
    colliders: [[-95, -30, 52], [0, -30, 52], [95, -30, 52]],
    projectSlug: "website-content-search",
  }),
  place({
    id: "trek-saathi",
    kind: "project",
    district: "projects",
    title: "Trek Saathi",
    subtitle: "Discovery & booking for Indian treks",
    color: "#2f9e62",
    ink: "#1a6e45",
    x: 2320,
    y: 560,
    box: projectBox(600, 460, 380),
    colliders: [[-75, -30, 56], [75, -30, 56]],
    projectSlug: "trek-saathi",
  }),

  // --- Home district ---------------------------------------------------------
  place({
    id: "about",
    kind: "about",
    district: "home",
    title: "About me",
    subtitle: "Who I am and how I work",
    color: "#ef8a3a",
    ink: "#b8520a",
    x: 560,
    y: 1150,
    box: projectBox(360, 380, 300),
    colliders: [[-62, -30, 52], [62, -30, 52]],
  }),
  place({
    id: "skills",
    kind: "skills",
    district: "home",
    title: "Skill Tree",
    subtitle: "What I'm strong at, and what I'm growing",
    color: "#1f7a8c",
    ink: "#13505c",
    x: 1010,
    y: 1140,
    box: projectBox(380, 470, 400),
    colliders: [[0, -16, 34]],
  }),

  // --- Connections district --------------------------------------------------
  ...(
    [
      ["github", "GitHub", `@${profile.githubHandle} — code & experiments`, "#3b434b", "#24292f", profile.github, "Open GitHub"],
      ["linkedin", "LinkedIn", "Let's connect", "#0a66c2", "#084a8c", profile.linkedin, "Open LinkedIn"],
      ["email", "Email", profile.email, "#e5484d", "#b4232c", `mailto:${profile.email}`, "Write an email"],
      ["resume", "Résumé", "One-page PDF", "#f0a020", "#9a5800", profile.resumeUrl, "Download résumé"],
    ] as const
  ).map(([id, title, subtitle, color, ink, href, hrefLabel], i) =>
    place({
      id,
      kind: "social",
      district: "connections",
      title,
      subtitle,
      color,
      ink,
      x: 2440 + i * 247,
      y: i === 0 || i === 3 ? 1170 : 1090,
      box: projectBox(270, 320, 250),
      colliders: [[-40, -26, 46], [40, -26, 46]],
      href,
      hrefLabel,
      triggerRadius: 120,
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

export type DecorKind = "fountain" | "campfire" | "signpost";
export const DECOR: { kind: DecorKind; x: number; y: number; r: number }[] = [
  { kind: "fountain", x: 1700, y: 610, r: 62 },
  { kind: "campfire", x: 790, y: 1360, r: 28 },
  { kind: "signpost", x: 1500, y: 1470, r: 10 },
];

export const BOWLING = { x: 1470, y: 1950 };
