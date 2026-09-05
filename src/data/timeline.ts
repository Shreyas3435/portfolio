import type { TimelineEntry } from "./types";

export const timeline: TimelineEntry[] = [
  {
    id: "education",
    label: "Computer Science degree",
    date: "Foundations",
    description: "B.E. in Computer Science, Visvesvaraya Technological University.",
    verified: false,
  },
  {
    id: "internship",
    label: "Database Management Internship",
    date: "Foundations",
    description: "HCL Aftermarket Cloud — early hands-on database and backend experience.",
    verified: false,
  },
  {
    id: "early-builds",
    label: "Programming & security fundamentals",
    date: "2022 – 2024",
    description:
      "Guided builds and learning exercises — Web3 fundamentals (WavePortal), password hashing, Caesar cipher and other cryptography basics.",
    verified: true,
  },
  {
    id: "blockchain-exploration",
    label: "Blockchain exploration",
    date: "Sep 2025",
    description: "A pharmaceutical traceability proof of concept using Solidity, ERC-721, and Hardhat.",
    verified: true,
  },
  {
    id: "data-and-search",
    label: "Data engineering & semantic search",
    date: "Nov 2025",
    description:
      "An ETL pipeline enriching MovieLens data via the OMDb API, and a full RAG-style semantic search pipeline (React, Flask, Weaviate).",
    verified: true,
  },
  {
    id: "professional-search",
    label: "Industrial search relevance",
    date: "Professional",
    description:
      "Constraint-aware search relevance engineering on Elasticsearch for an industrial parts catalog — completed for a company, with ongoing freelance work.",
    verified: false,
  },
  {
    id: "ai-applications",
    label: "AI applications & workflow spikes",
    date: "Jan – Mar 2026",
    description:
      "An AI summarization scaffold, a Form.io evaluation spike for AI-assisted validation, and a service-oriented form-builder platform.",
    verified: true,
  },
  {
    id: "trek-saathi",
    label: "Trek Saathi — trekking marketplace",
    date: "Sep 2026",
    description:
      "A full-stack trekking discovery and booking platform for the Western Ghats — FastAPI/PostgreSQL backend, React/TypeScript frontend, deployed and still actively being developed.",
    verified: true,
  },
  {
    id: "security-tooling",
    label: "Security tooling",
    date: "Ongoing",
    description: "ShadowPath — a repository attack-surface analysis dashboard, currently in progress.",
    verified: true,
  },
  {
    id: "smarter-codes",
    label: "Full-Stack Developer — Smarter.Codes",
    date: "Since November",
    description: "Working as a Full-Stack Developer at Smarter.Codes.",
    verified: false,
  },
];
