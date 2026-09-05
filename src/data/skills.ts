import type { SkillNode } from "./types";

export const skills: SkillNode[] = [
  // AI
  {
    id: "search-relevance",
    name: "Search & Retrieval",
    level: "strong",
    category: "ai",
    relatedProjectIds: ["industrial-product-search", "website-content-search"],
    blurb: "Constraint-aware ranking, entity/attribute extraction, semantic + vector retrieval.",
  },
  {
    id: "vector-search",
    name: "Vector Search / RAG",
    level: "working",
    category: "ai",
    relatedProjectIds: ["website-content-search"],
    blurb: "Chunking, embeddings, and vector databases (Weaviate) for semantic retrieval.",
  },
  {
    id: "llm-integration",
    name: "LLM Integration",
    level: "working",
    category: "ai",
    relatedProjectIds: ["ai-summary", "formio-spike"],
    blurb: "Grounding model output in controlled data, structured responses over open-ended generation.",
  },
  {
    id: "agents",
    name: "Agentic Systems",
    level: "exploring",
    category: "ai",
    relatedProjectIds: [],
    blurb: "Currently exploring agent architectures and AI-assisted engineering workflows.",
  },

  // FULL STACK
  {
    id: "react",
    name: "React",
    level: "strong",
    category: "fullstack",
    relatedProjectIds: ["trek-saathi", "website-content-search", "form-builder", "blockchain-pharma", "formio-spike"],
    blurb: "Frontend architecture across search UIs, workflow editors, marketplaces, and Web3 frontends.",
  },
  {
    id: "python-backend",
    name: "Python Backends",
    level: "core",
    category: "fullstack",
    relatedProjectIds: ["trek-saathi", "website-content-search", "movie-data-pipeline", "ai-summary"],
    blurb: "Flask/FastAPI services, ETL pipelines, and data processing scripts.",
  },
  {
    id: "workflow-systems",
    name: "Workflow Architecture",
    level: "strong",
    category: "fullstack",
    relatedProjectIds: ["trek-saathi", "form-builder", "frappe-artifact-editor"],
    blurb: "Lifecycle modeling, state transitions, and backend-enforced authorization.",
  },
  {
    id: "apis",
    name: "API Design",
    level: "strong",
    category: "fullstack",
    relatedProjectIds: ["trek-saathi", "form-builder", "website-content-search"],
    blurb: "REST APIs across microservice and monolithic backends.",
  },

  // SECURITY
  {
    id: "appsec",
    name: "Application Security",
    level: "working",
    category: "security",
    relatedProjectIds: ["shadowpath", "trek-saathi", "hashing"],
    blurb: "Attack-surface thinking, role-based authorization enforcement, secure-by-default design.",
  },
  {
    id: "devsecops",
    name: "DevSecOps Tooling",
    level: "working",
    category: "security",
    relatedProjectIds: ["shadowpath"],
    blurb: "Repository scanning, severity classification, and findings-driven remediation workflows.",
  },
  {
    id: "security-fundamentals",
    name: "Security Fundamentals",
    level: "core",
    category: "security",
    relatedProjectIds: ["caesar-cipher", "password-complexity-checker", "pixel-image-encryption", "simple-keylogger"],
    blurb: "Cryptography basics, password hashing, and keystroke/network-level mechanics.",
  },
  {
    id: "networking",
    name: "Networking",
    level: "working",
    category: "security",
    relatedProjectIds: ["network-packet-analyzer"],
    blurb: "Packet-level inspection and traffic analysis.",
  },

  // SYSTEMS
  {
    id: "elasticsearch",
    name: "Elasticsearch",
    level: "strong",
    category: "systems",
    relatedProjectIds: ["industrial-product-search"],
    blurb: "Indexing, synonym mappings, and constraint-aware ranking at production scale.",
  },
  {
    id: "databases",
    name: "Databases",
    level: "working",
    category: "systems",
    relatedProjectIds: ["trek-saathi", "movie-data-pipeline", "frappe-artifact-editor", "blockchain-pharma"],
    blurb: "PostgreSQL, SQLite, MariaDB, and MongoDB across relational and document workloads.",
  },
  {
    id: "docker",
    name: "Docker",
    level: "working",
    category: "systems",
    relatedProjectIds: ["website-content-search", "ai-summary", "form-builder"],
    blurb: "Containerized services and multi-service orchestration via Docker Compose.",
  },
  {
    id: "blockchain",
    name: "Blockchain / Solidity",
    level: "exploring",
    category: "systems",
    relatedProjectIds: ["blockchain-pharma"],
    blurb: "Smart contracts (ERC-721, OpenZeppelin) for a traceability proof of concept.",
  },
];
