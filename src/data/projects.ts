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
    id: "industrial-product-search",
    slug: "industrial-product-search",
    name: "Industrial Product Search",
    tagline: "Constraint-aware search for industrial parts",
    category: "AI Search / Elasticsearch / Knowledge Systems",
    tier: "flagship",
    verification: "professional-undisclosed",
    status: "shipped",
    description:
      "Search relevance engineering for an industrial parts catalog on Elasticsearch — making sure exact-spec queries (a bolt size, a thread type, a grade) beat semantically-similar-but-wrong results.",
    tags: ["Elasticsearch", "Search Relevance", "Entity Extraction", "Ranking"],
    note: "Professional work — completed for a company, with ongoing freelance involvement. No public repository or live demo to link to.",
    caseStudy: {
      problem: [
        "Industrial parts search looks like a solved problem until you actually try it: a query like 'M14' needs to return M14 hardware, not M24 — even though a purely semantic model can rate the two as highly similar, since the surrounding product description language barely differs.",
        "A longer query like '304 Stainless Steel Fine Thread Full Nut Dia. 24' is worse — it's really several hard constraints stacked together (material, thread pitch, product type, diameter), and a search engine that treats it as one soft bag-of-words query will happily surface products that satisfy three of the four and silently drop the one that actually matters to a buyer.",
      ],
      approach: [
        "Stop treating the query as pure text similarity. Pull out the explicit constraints first (size, material, thread type, standard/grade) via entity and attribute extraction, then let semantic matching handle the fuzzy part — product intent, synonyms, descriptive language — on top of that.",
        "Ranking has to reward exact constraint satisfaction over semantic closeness. A product that matches every extracted attribute should consistently outrank one that merely reads as 'about the same kind of thing.'",
      ],
      architecture: {
        summary:
          "Elasticsearch as the retrieval and ranking layer, with an entity/attribute extraction step in front of it and a synonym layer to catch industry naming variance (e.g. abbreviations, regional part-naming conventions).",
        layers: [
          "Query intake: natural-language product query",
          "Entity detection + attribute extraction (size, material, thread type, standard)",
          "Elasticsearch: indexed product catalog with synonym mappings and attribute fields",
          "Ranking: constraint-satisfaction boosted over pure semantic score",
          "Result set: attribute-matched, size-prioritized products",
        ],
      },
      challenges: [
        {
          heading: "Entity ambiguity across near-identical part codes",
          body: [
            "'M14' vs 'M24' is a one-character difference in a query but a completely different part in reality. Attribute extraction has to treat the size token as a hard filter/boost, not just another word in the similarity vector, or the two collapse into the same semantic neighborhood.",
          ],
        },
        {
          heading: "Multi-constraint queries silently dropping a constraint",
          body: [
            "A query stacking material + thread + product type + size fails quietly, not loudly — the engine still returns results, they're just wrong on one axis. Evaluation had to specifically test multi-constraint queries against single-constraint ones to catch this, since aggregate relevance metrics can look fine while a whole constraint category is being ignored.",
          ],
        },
      ],
      solution: [
        "A hybrid retrieval approach: exact/attribute-filtered candidates first, semantic and synonym matching to expand recall around them, and a ranking function that treats explicit constraint matches as the dominant signal over general text similarity.",
      ],
      implementation: [
        "Elasticsearch indexing with dedicated attribute fields (not just free-text description)",
        "Synonym handling for industry-specific naming variance",
        "Query-time entity/attribute extraction ahead of the search call",
      ],
      result: [
        "Queries like the M14/M24 example and multi-constraint bolt/nut specs return results that respect the explicit constraints in the query rather than only the overall semantic theme.",
        "No numerical accuracy figures are published here since none have been independently verified for this write-up — the engineering claim is about the approach (constraint-aware ranking), not a specific benchmark number.",
      ],
      learned: [
        "In domain search, the failure mode isn't 'no results' — it's confidently-wrong results that look plausible. Relevance engineering here is mostly about finding where a system is quietly ignoring a constraint, which requires testing by constraint category, not just by overall query volume.",
      ],
    },
  },
  {
    id: "artifact-platform",
    slug: "artifact-platform",
    name: "Artifact Platform",
    tagline: "Workflow system for artifact creation, review, and approval",
    category: "Full-Stack / Workflow Systems",
    tier: "flagship",
    verification: "professional-undisclosed",
    status: "shipped",
    description:
      "A full-stack platform for creating structured artifacts through a lifecycle — sections, dependencies, validation, review and feedback, iteration, and approval — with approved artifacts made immutable.",
    tags: ["Full-Stack", "Workflow Architecture", "Authorization", "Validation"],
    note: "Professional work — completed as part of an internal platform. No public repository or live demo to link to.",
    caseStudy: {
      problem: [
        "Structured content (technical specs, learning artifacts, reviewed documents — the specific domain is confidential) needs a lifecycle, not just a form. Someone drafts it, sections have dependencies on each other, it goes through validation and review, feedback drives another iteration, and once it's approved it needs to stay that way — no silent edits to something that's already been signed off on.",
        "That lifecycle is easy to describe and easy to get wrong in practice: authorization has to be enforced at every transition, not just on paper in a workflow diagram.",
      ],
      approach: [
        "Model the artifact lifecycle as an explicit state machine — draft, in review, changes requested, approved — rather than a status string that any authorized user can flip. Each transition has its own authorization rule and its own side effects (e.g. approval locks the artifact).",
        "Keep validation section-scoped rather than whole-document, since sections can have dependencies on each other and partial completion is the normal state, not an edge case.",
      ],
      architecture: {
        summary:
          "A backend-enforced workflow layer sitting in front of the artifact data model, with portfolio-scoped access control and immutability enforced at the data layer once an artifact reaches approved state.",
        layers: [
          "Auth: portfolio-scoped access control per user/role",
          "Artifact model: sections, inter-section dependencies, per-section validation state",
          "Workflow: draft → review → feedback/iteration → approval, each transition backend-authorized",
          "Immutability: approved artifacts become read-only at the data layer, not just the UI",
        ],
      },
      challenges: [
        {
          heading: "Enforcing immutability at the right layer",
          body: [
            "A 'read-only after approval' rule that only lives in the frontend is not a rule — it's a suggestion. Immutability had to be enforced in the backend authorization layer so that no client, including one bypassing the UI entirely, can mutate an approved artifact.",
          ],
        },
        {
          heading: "Section dependencies vs. partial validation",
          body: [
            "Sections aren't independent — some can't be marked valid until a dependency section is complete. Validation logic had to track this graph rather than checking each section in isolation, otherwise an artifact could look 'valid' while depending on an incomplete section.",
          ],
        },
      ],
      solution: [
        "A workflow engine that treats state transitions, not just states, as first-class — each transition is its own authorized operation with its own preconditions, rather than a single generic 'update status' endpoint.",
      ],
      implementation: [
        "Backend-enforced authorization on every workflow transition",
        "Section-level validation with dependency awareness",
        "Immutable-on-approval data model",
      ],
      result: [
        "A working internal platform supporting the full draft-to-approval lifecycle with enforced immutability and portfolio-scoped access.",
      ],
      learned: [
        "Workflow bugs hide in the transitions, not the states. Most of the real engineering here was in deciding what each transition was allowed to do and who was allowed to trigger it — the states themselves were the easy part.",
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
