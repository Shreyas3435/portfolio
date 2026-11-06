import type { StaticImageData } from "next/image";
import shadowpathFindings from "@/assets/work/shadowpath-findings.webp";
import shadowpathHome from "@/assets/work/shadowpath-home.webp";
import shadowpathPaths from "@/assets/work/shadowpath-paths.webp";
import trekHome from "@/assets/work/treksaathi-home.webp";
import trekSearch from "@/assets/work/treksaathi-search.webp";
import trekDetail from "@/assets/work/treksaathi-trek.webp";

export interface Shot {
  src: StaticImageData;
  alt: string;
  caption: string;
}

export interface Showcase {
  slug: string;
  /** Theme class from globals.css that recolours the whole chapter. */
  theme: "t-yellow" | "t-canopy" | "t-blue" | "t-night";
  swatch: string;
  swatchInk: string;
  statement: string;
  lede: string;
  proof: string;
  hint: string;
  shots?: Shot[];
}

/** Order is deliberate: strongest verifiable proof first, unfinished work last. */
export const showcase: Showcase[] = [
  {
    slug: "constraint-aware-search",
    theme: "t-yellow",
    swatch: "#ffd60a",
    swatchInk: "#0c0e11",
    statement: "“16 GB” must never return 6 GB.",
    lede: "To a similarity score, the two look nearly identical. To the person buying, they aren't. This demo makes explicit requirements outrank anything that merely sounds similar.",
    proof: "Try the ranking",
    hint: "Live demo. Type any query and compare the two rankings.",
  },
  {
    slug: "trek-saathi",
    theme: "t-canopy",
    swatch: "#16251f",
    swatchInk: "#eef1ea",
    statement: "Two confirmations. Seats for one.",
    lede: "A three-role trekking marketplace replacing Instagram DMs and WhatsApp groups: 34 REST endpoints, one JWT auth system, and seat rules enforced in the service layer with targeted pytest coverage.",
    proof: "Break the seat math",
    hint: "Live demo. Turn the guard off and watch it oversell.",
    shots: [
      {
        src: trekHome,
        alt: "Trek Saathi home page with a dark green hero, trek search box and featured trek cards",
        caption: "Home: search and featured treks",
      },
      {
        src: trekSearch,
        alt: "Trek Saathi search results listing treks across the Western Ghats",
        caption: "Discovery: browse and compare",
      },
      {
        src: trekDetail,
        alt: "Trek Saathi detail page for the Kumara Parvatha Sunrise Trek with itinerary and seats left",
        caption: "Detail: itinerary and live seat count",
      },
    ],
  },
  {
    slug: "website-content-search",
    theme: "t-blue",
    swatch: "#1d1fd6",
    swatchInk: "#ffffff",
    statement: "Chunking decides what a search can find.",
    lede: "Point it at a website, ask in your own words, get the most relevant passages back. A compact RAG-style pipeline in React, Flask and Weaviate, where the unglamorous middle step mattered most.",
    proof: "Resize the chunks",
    hint: "Live demo. Drag the slider and watch the match change.",
  },
  {
    slug: "shadowpath",
    theme: "t-night",
    swatch: "#0e1626",
    swatchInk: "#eaf0f6",
    statement: "Design the report before the scanner exists.",
    lede: "A repository attack-surface dashboard, built against its data contract first so the analysis engine can change without touching the UI. It shows honest empty states rather than a faked demo report.",
    proof: "Trace the contract",
    hint: "Real screens. Pick a report field to see what it powers.",
    shots: [
      {
        src: shadowpathHome,
        alt: "ShadowPath overview: target input, risk score cards, severity and category panels in their empty state",
        caption: "Overview",
      },
      {
        src: shadowpathFindings,
        alt: "ShadowPath findings tab with a severity filter in its empty state",
        caption: "Findings",
      },
      {
        src: shadowpathPaths,
        alt: "ShadowPath attack paths tab in its empty state",
        caption: "Attack paths",
      },
    ],
  },
];

export const workGroups = ["AI & Search", "Full-Stack", "Security", "Data & Web3"] as const;
export type WorkGroup = (typeof workGroups)[number];

export const groupByProject: Record<string, WorkGroup> = {
  shadowpath: "Security",
  "constraint-aware-search": "AI & Search",
  "trek-saathi": "Full-Stack",
  "website-content-search": "AI & Search",
  "movie-data-pipeline": "Data & Web3",
  "blockchain-pharma": "Data & Web3",
  "frappe-artifact-editor": "Full-Stack",
  "form-builder": "Full-Stack",
  "formio-spike": "AI & Search",
  "ai-summary": "AI & Search",
  "caesar-cipher": "Security",
  "password-complexity-checker": "Security",
  "pixel-image-encryption": "Security",
  "network-packet-analyzer": "Security",
  hashing: "Security",
  waveportal: "Data & Web3",
  "simple-keylogger": "Security",
};

export const statusLabel = {
  shipped: "Shipped",
  "in-progress": "In progress",
  prototype: "Prototype",
  "learning-exercise": "Learning exercise",
} as const;
