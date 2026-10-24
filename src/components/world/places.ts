import { profile } from "@/data/profile";

export const WORLD_W = 3400;
export const WORLD_H = 2500;
export const PLAZA = { x: 1600, y: 1200, r: 150 };
export const SPAWN = { x: 1600, y: 1250, angle: -Math.PI / 2 };

export type PlaceKind = "project" | "social" | "about" | "workshop";

export interface Place {
  id: string;
  kind: PlaceKind;
  title: string;
  subtitle: string;
  /** Watercolour wash colour. */
  color: string;
  /** Darker, legible version of the colour for text. */
  ink: string;
  accent: string;
  /** Ground anchor (base centre of the drawing). */
  x: number;
  y: number;
  /** Where you park to "visit" — also the fast-travel destination. */
  front: [number, number];
  triggerRadius: number;
  /** Sprite box, relative to the anchor. */
  box: { w: number; h: number; ax: number; ay: number };
  /** Static colliders, relative to the anchor. */
  colliders: [number, number, number][];
  projectSlug?: string;
  href?: string;
  hrefLabel?: string;
}

const landmark = (
  p: Omit<Place, "front" | "triggerRadius"> & { frontOffset?: number; triggerRadius?: number },
): Place => ({
  ...p,
  front: [p.x, p.y + (p.frontOffset ?? 185)],
  triggerRadius: p.triggerRadius ?? 210,
});

export const places: Place[] = [
  landmark({
    id: "shadowpath",
    kind: "project",
    title: "ShadowPath",
    subtitle: "attack-surface watchtower",
    color: "#e5484d",
    ink: "#b4232c",
    accent: "#8e4ec6",
    x: 850,
    y: 640,
    box: { w: 520, h: 590, ax: 260, ay: 430 },
    colliders: [[0, -14, 52]],
    projectSlug: "shadowpath",
  }),
  landmark({
    id: "industrial-product-search",
    kind: "project",
    title: "Industrial Product Search",
    subtitle: "constraint-aware search",
    color: "#f5a524",
    ink: "#9a5800",
    accent: "#12a594",
    x: 2350,
    y: 640,
    box: { w: 620, h: 590, ax: 310, ay: 400 },
    colliders: [
      [-150, -32, 58],
      [-55, -32, 58],
      [40, -32, 58],
      [170, -32, 44],
    ],
    projectSlug: "industrial-product-search",
  }),
  landmark({
    id: "trek-saathi",
    kind: "project",
    title: "Trek Saathi",
    subtitle: "BookMyShow for treks",
    color: "#30a46c",
    ink: "#1a6e45",
    accent: "#d4a72c",
    x: 850,
    y: 1820,
    box: { w: 680, h: 580, ax: 340, ay: 410 },
    colliders: [
      [-200, -36, 80],
      [0, -46, 100],
      [200, -36, 80],
    ],
    projectSlug: "trek-saathi",
  }),
  landmark({
    id: "website-content-search",
    kind: "project",
    title: "Website Content Search",
    subtitle: "semantic search, not ctrl-F",
    color: "#3e8bff",
    ink: "#1d58b8",
    accent: "#8ec5ff",
    x: 2350,
    y: 1820,
    box: { w: 600, h: 580, ax: 300, ay: 430 },
    colliders: [
      [-110, -34, 68],
      [0, -34, 68],
      [110, -34, 68],
      [215, -22, 34],
    ],
    projectSlug: "website-content-search",
  }),
  landmark({
    id: "workshop",
    kind: "workshop",
    title: "The Workshop",
    subtitle: "side builds & security lab",
    color: "#d6409f",
    ink: "#9c1f73",
    accent: "#ffd166",
    x: 2820,
    y: 1150,
    box: { w: 520, h: 530, ax: 260, ay: 380 },
    colliders: [
      [-90, -34, 68],
      [90, -34, 68],
    ],
  }),
  landmark({
    id: "about",
    kind: "about",
    title: "About me",
    subtitle: "say hi by the fire",
    color: "#ff7a3d",
    ink: "#b8420a",
    accent: "#ffd166",
    x: 1030,
    y: 1170,
    frontOffset: 150,
    triggerRadius: 170,
    box: { w: 380, h: 350, ax: 190, ay: 220 },
    colliders: [
      [0, -10, 32],
      [-110, -4, 26],
      [110, -4, 26],
    ],
  }),
  ...(
    [
      ["github", "GitHub", `@${profile.githubHandle}`, "#7c4dff", "#4b2a8f", profile.github, "Open GitHub"],
      ["linkedin", "LinkedIn", "let's connect", "#0a66c2", "#084a8c", profile.linkedin, "Open LinkedIn"],
      ["email", "Email", profile.email, "#e5484d", "#b4232c", `mailto:${profile.email}`, "Write an email"],
      ["resume", "Résumé", "one-page PDF", "#f5a524", "#9a5800", profile.resumeUrl, "Download résumé"],
    ] as const
  ).map(
    ([id, title, subtitle, color, ink, href, hrefLabel], i): Place => ({
      id,
      kind: "social",
      title,
      subtitle,
      color,
      ink,
      accent: color,
      x: 1398 + i * 134,
      y: 1560 + (i === 1 || i === 2 ? 22 : 0),
      front: [1398 + i * 134, 1560 + (i === 1 || i === 2 ? 22 : 0) + 50],
      triggerRadius: 70,
      box: { w: 180, h: 230, ax: 90, ay: 190 },
      colliders: [[0, -4, 12]],
      href,
      hrefLabel,
    }),
  ),
];

export const placeById = (id: string) => places.find((p) => p.id === id);

/** Roads: cubic beziers from the plaza out to each place's front. */
export const roads: { to: string; label: string; pts: [number, number][] }[] = [
  { to: "shadowpath", label: "ShadowPath", pts: [[1480, 1110], [1300, 980], [850, 1030], [850, 815]] },
  { to: "industrial-product-search", label: "Product Search", pts: [[1720, 1110], [1900, 980], [2350, 1030], [2350, 815]] },
  { to: "trek-saathi", label: "Trek Saathi", pts: [[1462, 1262], [1290, 1360], [1260, 2005], [890, 2005]] },
  { to: "website-content-search", label: "Content Search", pts: [[1738, 1262], [1910, 1360], [1940, 2005], [2310, 2005]] },
  { to: "workshop", label: "Workshop", pts: [[1750, 1205], [2120, 1190], [2480, 1340], [2790, 1335]] },
  { to: "about", label: "About me", pts: [[1450, 1205], [1320, 1225], [1200, 1320], [1060, 1320]] },
];

export const PONDS = [
  { x: 1600, y: 560, rx: 175, ry: 85 },
  { x: 430, y: 1240, rx: 120, ry: 64 },
];

export const BOWLING = { x: 2150, y: 1196 };
