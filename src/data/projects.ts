import type { Project } from "./types";

export const projects: Project[] = [
  // ---------------------------------------------------------------------
  // FLAGSHIP
  // ---------------------------------------------------------------------
  {
    id: "shadowpath",
    slug: "shadowpath",
    name: "ShadowPath",
    tagline: "Automated repository attack-surface analysis",
    category: "Security / DevSecOps",
    tier: "flagship",
    verification: "verified-live-app",
    status: "in-progress",
    description:
      "A security-tooling dashboard that scans a GitHub repository for attack-surface risk — severity-classified findings, category breakdown, and attack paths, exportable as JSON or HTML.",
    tags: ["Security", "DevSecOps", "Vercel", "Serverless"],
    liveUrl: "https://shadowpath-core.vercel.app/",
    note: "In-progress prototype — the UI is real and complete; the scan backend is still being wired up.",
    caseStudy: {
      problem: [
        "Most developers never look at their repository the way an attacker would. Secrets, dependency risk, and unsafe patterns accumulate quietly, and there's no quick, honest way to ask 'what does my attack surface actually look like?' without hiring someone or running a heavyweight enterprise scanner.",
        "ShadowPath is an attempt at a lightweight, repo-in-URL-out answer to that question — point it at a GitHub repo and get back a structured risk picture instead of a wall of raw grep output.",
      ],
      approach: [
        "Treat the scan as a pipeline: clone (optionally, keep the clone), analyze, classify, and render — with the UI built first against the exact shape the analysis engine needs to produce, so the frontend and the data contract are never guessing at each other.",
        "Every screen was designed around a single question a security reviewer actually asks: how bad is it overall (Risk Score), where is the risk concentrated (Category Mix, Severity), what are the specific problems (Findings, with remediation), and how do they chain together (Attack Paths).",
      ],
      architecture: {
        summary:
          "A static single-page dashboard (vanilla JS, no framework) talking to serverless API routes on Vercel — deliberately minimal on the frontend so the analysis engine is the part that has to be right.",
        layers: [
          "Client: target-URL input, authorization checkbox, tabbed dashboard (Overview / Findings / Paths)",
          "POST /api/scan — repository clone + static analysis, returns a structured report",
          "POST /api/export/html — turns a report into a shareable static HTML file",
          "Report model: risk score, findings[] (severity, category, file:line, evidence, remediation, attackPath[])",
        ],
      },
      challenges: [
        {
          heading: "Designing the report shape before the engine existed",
          body: [
            "The dashboard (severity bars, category mix, filterable findings, attack-path lists) was built against a report schema designed up front, so the hard part — the actual scanning/classification logic — can be built and iterated on without touching the UI again.",
          ],
        },
        {
          heading: "Making 'attack path' mean something, not just a list of findings",
          body: [
            "A raw findings list doesn't tell you how an attacker would actually chain issues together. The Paths tab is built to render an ordered attackPath[] per finding rather than just another flat list — the harder problem is generating that chain, which is the active work.",
          ],
        },
      ],
      solution: [
        "Ship the honest version: a fully-built, real dashboard UI with an explicit 'Authorized assessment' gate (no scanning without consent) and clearly empty states everywhere data hasn't been generated yet, rather than faking a demo report.",
      ],
      implementation: [
        "Vanilla JS + hand-written CSS on the client — no framework overhead for what is fundamentally a data-rendering dashboard",
        "Vercel serverless functions for the API surface",
        "JSON and static-HTML export so a scan result can be shared without needing the tool itself",
      ],
      result: [
        "The dashboard — Risk Score, Findings, Category Mix, Severity breakdown, filterable Findings with remediation, Attack Paths, JSON/HTML export — is fully built and deployed.",
        "The scan backend is not yet functional end-to-end; there's no live scan to demo right now, and no accuracy or scale claims are made anywhere on the deployed app.",
      ],
      learned: [
        "Building the interface against a report contract first — before the analysis logic exists — made the hard engineering problem (attack-surface classification) easier to isolate, but it also means the visible product can look 'done' well before it actually is. Worth naming honestly rather than papering over.",
      ],
    },
  },
  {
    id: "constraint-aware-search",
    slug: "constraint-aware-search",
    name: "Constraint-Aware Search",
    tagline: "Ranking that respects exact specs, not just similar words",
    category: "AI Search / Relevance Engineering",
    tier: "flagship",
    verification: "professional-undisclosed",
    status: "prototype",
    description:
      "A working demonstration of constraint-aware ranking: pull the exact requirements out of a query, then make sure results that meet them outrank results that merely sound similar.",
    tags: ["Search Relevance", "Entity Extraction", "Ranking", "TypeScript"],
    note: "A public demo on an invented catalog. It draws on my professional search experience, but that work's domain, data and code are confidential and aren't shown here.",
    caseStudy: {
      problem: [
        "Similarity-based search looks like a solved problem until a query contains an exact requirement. Someone searching for a 16 GB laptop doesn't want a 6 GB one, yet the two listings differ by a single character, so a text or semantic similarity score can rate them as nearly identical.",
        "A longer query like '32 GB RAM 14 inch Laptop 1 TB SSD' is worse. It's really several hard requirements stacked together, and an engine that treats it as one soft query will happily surface products that satisfy three of the four and silently drop the one that matters most.",
      ],
      approach: [
        "Stop treating the query as pure text similarity. Pull out the explicit constraints first, then let similarity handle the fuzzy part: intent, synonyms and descriptive language.",
        "Ranking has to reward exact constraint satisfaction over closeness. A product that meets every extracted requirement should consistently outrank one that merely reads as the same kind of thing.",
      ],
      architecture: {
        summary:
          "The demo on this site is a small pipeline that runs entirely in the browser, with structured product attributes alongside the free-text titles it compares against.",
        layers: [
          "Query intake: a natural-language product query",
          "Constraint extraction: memory, storage, screen size and product type",
          "Similarity scoring: character trigrams, standing in for embeddings",
          "Ranking: fewest violated constraints first, similarity as the tie-breaker",
          "Results: both rankings side by side, with each violated constraint named",
        ],
      },
      challenges: [
        {
          heading: "Near-identical values that mean different things",
          body: [
            "'16 GB' and '6 GB' are one character apart in a query but different products in reality. Extraction has to treat that value as a hard requirement rather than one more token in a similarity score, or the two collapse into the same neighbourhood.",
          ],
        },
        {
          heading: "Multi-constraint queries that silently drop a constraint",
          body: [
            "A query stacking several requirements fails quietly, not loudly. The engine still returns results, and they're just wrong on one axis. That's why this kind of system has to be tested by constraint category, because an overall relevance score can look fine while one category is being ignored.",
          ],
        },
      ],
      solution: [
        "Treat explicit constraint matches as the dominant ranking signal, and use similarity to order results within each level of constraint satisfaction. When nothing meets every requirement, the closest alternatives still appear, labelled with exactly what they miss.",
      ],
      implementation: [
        "Structured attributes for each product, separate from its free-text title",
        "Query-time constraint extraction, including normalising formats like '32GB' and '14-inch'",
        "Trigram cosine similarity as the text-matching baseline",
        "Written in TypeScript as a pure ranking function, with no server involved",
      ],
      result: [
        "You can try it on the home page: type a query and compare similarity-only results with constraint-aware results on the same catalog.",
        "The catalog is invented and small, so this demonstrates the approach rather than a benchmark. No accuracy figures are claimed.",
      ],
      learned: [
        "In search, the dangerous failure isn't 'no results'. It's confidently wrong results that look plausible. Relevance engineering is largely about finding where a system is quietly ignoring a constraint.",
      ],
    },
  },
  {
    id: "trek-saathi",
    slug: "trek-saathi",
    name: "Trek Saathi",
    tagline: "A centralized discovery & booking platform for Indian trekking",
    category: "Full-Stack / Marketplace Platform",
    tier: "flagship",
    verification: "verified-repo",
    status: "in-progress",
    description:
      "A full-stack trekking discovery and booking platform for India, starting with Karnataka and the Western Ghats — 'BookMyShow for trekking' in place of scattered Instagram DMs and WhatsApp groups.",
    tags: ["FastAPI", "PostgreSQL", "React", "TypeScript", "TanStack Query"],
    repoUrl: "https://github.com/Shreyas3435/trek-saathi",
    liveUrl: "https://trek-saathi.vercel.app/",
    note: "Actively developed MVP — booking is a request model (no payments yet). The live backend is on free-tier hosting, so the first load can take ~30s while it wakes up.",
    caseStudy: {
      problem: [
        "Finding and booking a trek in India mostly happens through scattered Instagram DMs and WhatsApp groups — there's no centralized place to browse organizers, compare treks, or make a booking with any real structure.",
        "The goal was a 'BookMyShow for trekking': a single platform where trekkers can discover treks in the Western Ghats and organizers can manage listings and bookings, instead of everyone re-solving discovery and coordination by hand.",
      ],
      approach: [
        "Build it as a three-role marketplace — trekker, trek organizer, platform admin — sharing one JWT auth system rather than three separate ones, since the roles overlap more than they differ (all three read from the same trek/booking data, just with different permissions).",
        "Keep the MVP's booking model deliberately simple: a request that an organizer manually confirms or rejects, with no payments, notifications, or real-time seat locking yet — solving the discovery and coordination problem first, before the transaction problem.",
      ],
      architecture: {
        summary:
          "A layered FastAPI backend (routes → services → SQLAlchemy models) with PostgreSQL and Alembic migrations, and a React/TypeScript frontend (pages → TanStack Query hooks → Axios client) with a custom trekking-specific design system — deployed across three managed free-tier services.",
        layers: [
          "Frontend: React 18 + TypeScript + Vite + Tailwind, TanStack Query for data, deployed on Vercel",
          "Design system: Space Grotesk / Inter / JetBrains Mono type, a canopy/mist/blaze/moss/brass palette, signature trail-line elevation-profile and topographic-contour motifs",
          "Backend: FastAPI, 34 REST endpoints across auth, treks, organizers, destinations, bookings, reviews, wishlist, and admin — deployed on Render",
          "Data: PostgreSQL via SQLAlchemy 2.0, schema versioned with Alembic, hosted on Neon",
        ],
      },
      challenges: [
        {
          heading: "Seat math without overselling",
          body: [
            "Since booking is request-based, seats can't just decrement the moment someone asks — they have to hold at the requested count while pending, decrement only on organizer confirmation, and restore on cancellation, without letting two near-simultaneous confirmations oversell the same seats.",
            "This is exactly the kind of logic that looks obviously correct until it isn't — it has dedicated pytest coverage for the pending/confirm/reject/cancel paths specifically because 'seems right' isn't good enough for something that touches real seat counts.",
          ],
        },
        {
          heading: "One auth system, three genuinely different roles",
          body: [
            "Trekkers, organizers, and admins all sit on the same JWT auth rather than three separate systems, but their permissions are real and different — an organizer can only manage their own treks and bookings, an admin can moderate anyone's. Keeping that enforcement in the service layer (not scattered across routes) was the deciding architectural choice.",
          ],
        },
        {
          heading: "A design system that doesn't read as generic Tailwind",
          body: [
            "A trekking product with default Tailwind styling would look like every other SaaS template. Building a small, deliberate design system first — a specific palette, type pairing, and two signature motifs (trail-line elevation profiles, topographic contours) — gave every page a consistent, domain-specific feel instead of one-off styling per screen.",
          ],
        },
      ],
      solution: [
        "Enforce seat-math and role-permission rules at the service layer so the same rules apply no matter which route calls them, and cover the seat-math state transitions (pending → confirmed → cancelled/rejected) with focused tests rather than relying on manual QA.",
      ],
      implementation: [
        "FastAPI + SQLAlchemy 2.0 + PostgreSQL, Alembic migrations",
        "34 REST endpoints across auth, treks, organizers, destinations, bookings, reviews, wishlist, and admin",
        "React 18 + TypeScript + Vite + Tailwind CSS, TanStack Query + Axios",
        "Deployed: frontend on Vercel, backend on Render, Postgres on Neon",
      ],
      result: [
        "A live, working three-role marketplace — real seeded Western Ghats treks and destinations (Kodachadri, Kumara Parvatha, Skandagiri) are browsable today, organizers can list treks and manage seat availability, and bookings flow through the full request → confirm/reject cycle with tested seat math.",
        "Still an early, actively developed MVP by design — no payments, notifications, or real-time seat locking yet, matching the project's own stated scope rather than overselling it as finished.",
      ],
      learned: [
        "Putting business rules (seat math, role permissions) in the service layer instead of the routes made the hardest part of this build — correctness under confirm/cancel races — something I could actually write a targeted test for, rather than something I just hoped held up.",
      ],
    },
  },
  {
    id: "website-content-search",
    slug: "website-content-search",
    name: "Website Content Search",
    tagline: "Semantic search over any website's content",
    category: "Semantic Search / Vector Search / AI",
    tier: "flagship",
    verification: "verified-repo",
    status: "shipped",
    description:
      "Point it at a website, ask a question in natural language, get back the most relevant content — via HTML extraction, chunking, and vector search rather than keyword matching.",
    tags: ["React", "Flask", "Weaviate", "BeautifulSoup", "BERT", "Docker"],
    repoUrl: "https://github.com/Shreyas3435/website-content-search",
    caseStudy: {
      problem: [
        "Ctrl-F only finds content that matches your exact words. A visitor asking a question in their own phrasing gets nothing if the page uses different terminology — the content might be relevant, but keyword search can't tell.",
      ],
      approach: [
        "Turn a website into a searchable set of semantic chunks: scrape the page, strip it down to real content, split it into meaningfully-sized pieces, embed each piece, and store the embeddings in a vector database so a query can be matched by meaning rather than exact words.",
      ],
      architecture: {
        summary:
          "React frontend, Flask backend, Weaviate as the vector store, BeautifulSoup for extraction, and a BERT tokenizer for chunking — a compact, real RAG-style pipeline.",
        layers: [
          "Website → BeautifulSoup HTML extraction",
          "Cleaning + chunking via a bert-base-uncased tokenizer",
          "Vector representation stored in Weaviate (Dockerized, v4 API)",
          "Flask API: takes a natural-language query, returns top-matching chunks",
          "React frontend: URL + query in, ranked relevant content out",
        ],
      },
      challenges: [
        {
          heading: "Chunking without losing meaning",
          body: [
            "Splitting raw HTML into pieces that are small enough to embed well but large enough to still make sense on their own is the crux of the whole pipeline — chunk badly and every downstream step inherits the damage.",
          ],
        },
      ],
      solution: [
        "A straightforward, correctly-ordered pipeline: extract → clean → chunk → embed → store → query — built as a real working demo rather than a diagram, with Weaviate running in Docker so the vector store is reproducible.",
      ],
      implementation: [
        "React (Create React App) frontend",
        "Flask backend calling Weaviate's v4 client",
        "BeautifulSoup for HTML-to-text extraction",
        "bert-base-uncased tokenizer for chunk boundaries",
      ],
      result: [
        "A working full-stack demo: give it a website URL and a question, get back the top 10 semantically relevant results — built with 8 incremental commits rather than a single scaffold-and-abandon push.",
      ],
      learned: [
        "The unglamorous middle of a RAG pipeline — chunking strategy — matters more than the choice of vector database. Getting that step right made everything downstream noticeably better.",
      ],
    },
  },

  // ---------------------------------------------------------------------
  // SECONDARY — "More Engineering"
  // ---------------------------------------------------------------------
  {
    id: "movie-data-pipeline",
    slug: "movie-data-pipeline",
    name: "Movie Data Pipeline",
    tagline: "ETL pipeline enriching MovieLens data via the OMDb API",
    category: "Data Engineering",
    tier: "secondary",
    verification: "verified-repo",
    status: "shipped",
    description:
      "An ETL pipeline combining MovieLens CSV data with OMDb API enrichment into a normalized SQLite schema — built with rate limiting, idempotent reruns, and a documented path to production (PostgreSQL, scheduling, caching).",
    tags: ["Python", "Pandas", "SQLAlchemy", "SQLite", "ETL"],
    repoUrl: "https://github.com/Shreyas3435/movie-data-pipeline",
    note: "Self-described as an educational project; production-hardening steps are documented as future work, not implemented.",
  },
  {
    id: "blockchain-pharma",
    slug: "blockchain-pharma",
    name: "Blockchain in Pharma",
    tagline: "Pharmaceutical track-and-traceability proof of concept",
    category: "Blockchain",
    tier: "secondary",
    verification: "verified-repo",
    status: "prototype",
    description:
      "A blockchain-based proof of concept for tracking pharmaceutical products from production to customer, aimed at reducing counterfeit drugs — ERC-721 smart contracts with a Next.js/MetaMask frontend.",
    tags: ["Solidity", "OpenZeppelin", "Hardhat", "Next.js", "MetaMask"],
    repoUrl: "https://github.com/Shreyas3435/Blockchain_in_pharma",
  },
  {
    id: "frappe-artifact-editor",
    slug: "frappe-artifact-editor",
    name: "Frappe Artifact Editor",
    tagline: "A learning-platform artifact editor built on Frappe",
    category: "Full-Stack / Learning Platform",
    tier: "secondary",
    verification: "verified-repo",
    status: "learning-exercise",
    description:
      "A Frappe app modeling artifact templates and sections with progress tracking and autosave — doctypes for artifacts, templates, and sections, backed by MariaDB.",
    tags: ["Frappe", "Python", "MariaDB"],
    repoUrl: "https://github.com/Shreyas3435/frappe-framework-Testing",
  },
  {
    id: "form-builder",
    slug: "form-builder",
    name: "Form Builder Platform",
    tagline: "Service-oriented form builder with split-screen editing",
    category: "Full-Stack / Workflow Systems",
    tier: "secondary",
    verification: "verified-repo",
    status: "learning-exercise",
    description:
      "A 6-microservice architecture (gateway, form, artifact, bootcamp, validation, communication services) behind a React split-screen editor with a rich-text editor and debounced autosave.",
    tags: ["React", "Microservices", "Docker Compose"],
    repoUrl: "https://github.com/Shreyas3435/form_builder",
  },
  {
    id: "formio-spike",
    slug: "formio-spike",
    name: "Form.io Spike",
    tagline: "Technical evaluation of Form.io for an artifact editor",
    category: "AI / Full-Stack",
    tier: "secondary",
    verification: "verified-repo",
    status: "learning-exercise",
    description:
      "A technical spike evaluating whether Form.io can support section-level AI triggers and controlled validation — explicitly an evaluation prototype, not production code.",
    tags: ["React", "FastAPI", "Form.io"],
    repoUrl: "https://github.com/Shreyas3435/formio-spike",
  },
  {
    id: "ai-summary",
    slug: "ai-summary",
    name: "AI Summary",
    tagline: "Early-stage AI summarization scaffold",
    category: "AI / Full-Stack",
    tier: "secondary",
    verification: "verified-repo",
    status: "learning-exercise",
    description:
      "A Dockerized backend/frontend scaffold for an AI summarization tool — early-stage, documentation still to come.",
    tags: ["Python", "Docker"],
    repoUrl: "https://github.com/Shreyas3435/Ai_Summary",
  },

  // ---------------------------------------------------------------------
  // ENGINEERING LAB
  // ---------------------------------------------------------------------
  {
    id: "caesar-cipher",
    slug: "caesar-cipher",
    name: "Caesar Cipher",
    tagline: "Shift-based text encryption/decryption",
    category: "Security Fundamentals",
    tier: "lab",
    verification: "verified-repo",
    status: "learning-exercise",
    description: "A Python implementation of the classic Caesar cipher, encrypting or decrypting text by a given shift value.",
    tags: ["Python"],
    repoUrl: "https://github.com/Shreyas3435/Implement-Caesar-Cipher",
  },
  {
    id: "password-complexity-checker",
    slug: "password-complexity-checker",
    name: "Password Complexity Checker",
    tagline: "Password strength validation",
    category: "Security Fundamentals",
    tier: "lab",
    verification: "verified-repo",
    status: "learning-exercise",
    description: "A Python script that evaluates password strength against complexity rules.",
    tags: ["Python"],
    repoUrl: "https://github.com/Shreyas3435/Password-Complexity-Checker",
  },
  {
    id: "pixel-image-encryption",
    slug: "pixel-image-encryption",
    name: "Pixel Manipulation Image Encryption",
    tagline: "Image encryption via pixel manipulation",
    category: "Security Fundamentals",
    tier: "lab",
    verification: "verified-repo",
    status: "learning-exercise",
    description: "A Python program that encrypts or decrypts images by manipulating pixel data directly.",
    tags: ["Python"],
    repoUrl: "https://github.com/Shreyas3435/Pixel-Manipulation-for-Image-Encryption",
  },
  {
    id: "network-packet-analyzer",
    slug: "network-packet-analyzer",
    name: "Network Packet Analyzer",
    tagline: "Network traffic inspection exercise",
    category: "Networking / Security",
    tier: "lab",
    verification: "verified-repo",
    status: "learning-exercise",
    description: "A Python exercise in inspecting and analyzing network packets.",
    tags: ["Python", "Networking"],
    repoUrl: "https://github.com/Shreyas3435/Network-Packet-Analyzer",
  },
  {
    id: "hashing",
    slug: "hashing",
    name: "Hashing",
    tagline: "Password hashing in a PHP login system",
    category: "Security Fundamentals",
    tier: "lab",
    verification: "verified-repo",
    status: "learning-exercise",
    description: "A basic PHP login/signup system exploring password hashing.",
    tags: ["PHP"],
    repoUrl: "https://github.com/Shreyas3435/Hashing",
  },
  {
    id: "waveportal",
    slug: "waveportal",
    name: "WavePortal",
    tagline: "Guided Buildspace Web3 tutorial",
    category: "Web3",
    tier: "lab",
    verification: "verified-repo",
    status: "learning-exercise",
    description: "A guided Buildspace tutorial project exploring smart-contract interaction from a React frontend.",
    tags: ["Solidity", "React", "Web3"],
    repoUrl: "https://github.com/Shreyas3435/waveportal-starter-project",
    note: "A guided tutorial build, not original architecture.",
  },
  {
    id: "simple-keylogger",
    slug: "simple-keylogger",
    name: "Simple Keylogger",
    tagline: "Keystroke-capture fundamentals",
    category: "Security Fundamentals",
    tier: "lab",
    verification: "verified-repo",
    status: "learning-exercise",
    description:
      "A learning exercise in keystroke capture — the kind of low-level mechanism defensive security tooling needs to understand.",
    tags: ["Python", "Security"],
    repoUrl: "https://github.com/Shreyas3435/Simple-Keylogger",
  },
];

export const flagshipProjects = projects.filter((p) => p.tier === "flagship");
export const secondaryProjects = projects.filter((p) => p.tier === "secondary");
export const labProjects = projects.filter((p) => p.tier === "lab");

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}
