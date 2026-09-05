import type { ArchitectureLayer } from "./types";

export const architectureLayers: ArchitectureLayer[] = [
  {
    id: "frontend",
    name: "Frontend / UX",
    description: "React interfaces for search, marketplaces, workflow editors, and dashboards — built around the data contract, not just the visual layer.",
    exampleProjectIds: ["trek-saathi", "website-content-search", "form-builder", "shadowpath"],
  },
  {
    id: "api",
    name: "API / Backend",
    description: "REST APIs across Flask, FastAPI, Frappe, and microservice backends — the contract between frontend and business logic.",
    exampleProjectIds: ["trek-saathi", "website-content-search", "form-builder"],
  },
  {
    id: "ai-search-logic",
    name: "AI / Search / Business Logic",
    description: "Constraint-aware ranking, entity extraction, semantic retrieval, and stateful business rules — where the actual hard problems live.",
    exampleProjectIds: ["industrial-product-search", "website-content-search", "trek-saathi"],
  },
  {
    id: "data",
    name: "Database / Vector / Search",
    description: "Elasticsearch, Weaviate, PostgreSQL, SQLite, MariaDB, and MongoDB — chosen per workload rather than defaulted to one system.",
    exampleProjectIds: ["industrial-product-search", "website-content-search", "trek-saathi", "movie-data-pipeline"],
  },
  {
    id: "infra",
    name: "Infrastructure / DevOps",
    description: "Multi-service deployment (Vercel, Render, Neon) and Docker Compose orchestration, chosen per project.",
    exampleProjectIds: ["trek-saathi", "form-builder", "shadowpath"],
  },
  {
    id: "security",
    name: "Security / Observability",
    description: "Backend-enforced authorization, attack-surface analysis, and security fundamentals treated as a first-class layer, not an afterthought.",
    exampleProjectIds: ["shadowpath", "trek-saathi"],
  },
];
