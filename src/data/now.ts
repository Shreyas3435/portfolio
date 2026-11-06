import { profile } from "./profile";

export interface NowItem {
  label: string;
  detail: string;
  projectIds: string[];
}

export interface NowLane {
  title: string;
  items: NowItem[];
}

const [agents, search, security] = profile.currentlyBuilding;
const [rag, assisted, tooling] = profile.currentlyExploring;

export const nowLanes: NowLane[] = [
  {
    title: "Building",
    items: [
      {
        label: agents,
        detail: "Grounding model output in controlled data, with structured responses over open-ended generation.",
        projectIds: ["ai-summary", "formio-spike"],
      },
      {
        label: search,
        detail: "Constraint-aware ranking, attribute extraction, and semantic and vector retrieval.",
        projectIds: ["constraint-aware-search", "website-content-search"],
      },
      {
        label: security,
        detail: "Repository scanning, severity classification, and remediation workflows driven by findings.",
        projectIds: ["shadowpath"],
      },
    ],
  },
  {
    title: "Exploring",
    items: [
      {
        label: rag,
        detail: "Chunking, embeddings and vector databases. The chunking demo shows why that middle step matters.",
        projectIds: ["website-content-search"],
      },
      {
        label: assisted,
        detail: "Agent architectures and AI-assisted engineering workflows. Nothing public to show yet.",
        projectIds: [],
      },
      {
        label: tooling,
        detail: "Tools that make engineers' work easier to check. ShadowPath is the closest public example.",
        projectIds: ["shadowpath"],
      },
    ],
  },
];
