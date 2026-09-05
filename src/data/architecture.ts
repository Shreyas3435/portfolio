import type { ArchitectureLayer } from "./types";

export const architectureLayers: ArchitectureLayer[] = [
  {
    id: "frontend",
    name: "Frontend / UX",
    description: "React interfaces for search, workflow editors, and dashboards — built around the data contract, not just the visual layer.",
    exampleProjectIds: ["website-content-search", "form-builder", "shadowpath"],
  },
  {
    id: "api",
    name: "API / Backend",
    description: "REST APIs across Flask, FastAPI, Frappe, and microservice backends — the contract between frontend and business logic.",
    exampleProjectIds: ["website-content-search", "form-builder", "artifact-platform"],
  },
  {
    id: "ai-search-logic",
    name: "AI / Search / Business Logic",
    description: "Constraint-aware ranking, entity extraction, semantic retrieval, and workflow state machines — where the actual hard problems live.",
    exampleProjectIds: ["industrial-product-search", "website-content-search", "artifact-platform"],
  },
  {
    id: "data",
    name: "Database / Vector / Search",
    description: "Elasticsearch, Weaviate, SQLite, MariaDB, and MongoDB — chosen per workload rather than defaulted to one system.",
    exampleProjectIds: ["industrial-product-search", "website-content-search", "movie-data-pipeline"],
  },
  {
    id: "infra",
    name: "Infrastructure / DevOps",
    description: "Docker Compose for multi-service orchestration, Vercel for serverless deployment.",
    exampleProjectIds: ["form-builder", "shadowpath", "ai-summary"],
  },
  {
    id: "security",
    name: "Security / Observability",
    description: "Backend-enforced authorization, attack-surface analysis, and security fundamentals treated as a first-class layer, not an afterthought.",
    exampleProjectIds: ["shadowpath", "artifact-platform"],
  },
];
