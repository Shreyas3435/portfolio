/**
 * A small, real implementation of constraint-aware ranking over an invented product catalog.
 * Character-trigram similarity stands in for an embedding model: like embeddings, it sees
 * "16 GB" and "6 GB" as nearly the same text.
 */

export type ConstraintKey = "memory" | "storage" | "screen" | "type";

export interface Product {
  id: string;
  title: string;
  memory: string;
  storage: string;
  screen: string;
  type: "Laptop" | "Tablet" | "Phone";
}

export type Constraints = Partial<Record<ConstraintKey, string>>;

export interface Check {
  key: ConstraintKey;
  want: string;
  got: string;
  ok: boolean;
}

export interface Ranked {
  product: Product;
  similarity: number;
  checks: Check[];
  violations: number;
}

const item = (
  id: string,
  title: string,
  memory: string,
  storage: string,
  screen: string,
  type: Product["type"],
): Product => ({ id, title, memory, storage, screen, type });

export const catalog: Product[] = [
  item("a1", "6 GB Laptop", "6 GB", "256 GB", "14 in", "Laptop"),
  item("a2", "64 GB Laptop", "64 GB", "2 TB", "16 in", "Laptop"),
  item("a3", "8 GB Laptop", "8 GB", "256 GB", "14 in", "Laptop"),
  item("a4", "Slim Notebook Laptop, 14 in Display, 16GB Memory, 512GB Storage", "16 GB", "512 GB", "14 in", "Laptop"),
  item("a5", "Everyday Laptop for Work and Study with 16GB Memory, 13 in", "16 GB", "256 GB", "13 in", "Laptop"),
  item("a6", "Creator Notebook Laptop, 16 in Display, Dedicated Graphics, 16GB Memory", "16 GB", "1 TB", "16 in", "Laptop"),
  item("a7", "6 GB Phone", "6 GB", "128 GB", "6 in", "Phone"),
  item("b1", "32 GB RAM 14 inch Laptop 512 GB SSD", "32 GB", "512 GB", "14 in", "Laptop"),
  item("b2", "32 GB RAM 16 inch Laptop 1 TB SSD", "32 GB", "1 TB", "16 in", "Laptop"),
  item("b3", "16 GB RAM 14 inch Laptop 1 TB SSD", "16 GB", "1 TB", "14 in", "Laptop"),
  item("b4", "32 GB RAM 14 inch Tablet 1 TB SSD", "32 GB", "1 TB", "14 in", "Tablet"),
  item("b5", "Ultralight Notebook Laptop, 14 in Display, 32GB Memory, 1TB Storage", "32 GB", "1 TB", "14 in", "Laptop"),
  item("b6", "Developer Laptop: 1TB NVMe Drive, 32GB Memory, 14-inch Screen", "32 GB", "1 TB", "14 in", "Laptop"),
  item("c1", "12 inch Tablet 6 GB", "6 GB", "128 GB", "12 in", "Tablet"),
  item("c2", "11 inch Tablet 8 GB", "8 GB", "128 GB", "11 in", "Tablet"),
  item("c3", "10 inch Tablet 8 GB", "8 GB", "64 GB", "10 in", "Tablet"),
  item("c4", "12 inch Laptop 8 GB", "8 GB", "256 GB", "12 in", "Laptop"),
  item("c5", "12 inch Tablet 8 GB", "8 GB", "256 GB", "12 in", "Tablet"),
  item("c6", "Drawing Tablet with 12 in Display and 8GB Memory", "8 GB", "128 GB", "12 in", "Tablet"),
];

export function parseConstraints(raw: string): Constraints {
  const q = raw.toLowerCase();
  const found: Constraints = {};

  // Capacity units alone can't separate memory from storage, so size decides it.
  for (const [, amount, unit] of q.matchAll(/(\d+)\s?(gb|tb)\b/g)) {
    const value = Number(amount);
    if (unit === "tb" || value >= 128) found.storage ??= `${value} ${unit.toUpperCase()}`;
    else found.memory ??= `${value} GB`;
  }

  const screen = q.match(/(\d{1,2}(?:\.\d)?)\s?-?(?:inch(?:es)?|in\b|")/);
  if (screen) found.screen = `${screen[1]} in`;

  const type = q.match(/\b(laptop|notebook|tablet|phone)s?\b/);
  if (type) found.type = type[1] === "notebook" ? "Laptop" : type[1][0].toUpperCase() + type[1].slice(1);

  return found;
}

function trigrams(text: string): Map<string, number> {
  const padded = `  ${text.toLowerCase().replace(/[^a-z0-9.]+/g, " ").trim()} `;
  const grams = new Map<string, number>();
  for (let i = 0; i < padded.length - 2; i++) {
    const gram = padded.slice(i, i + 3);
    grams.set(gram, (grams.get(gram) ?? 0) + 1);
  }
  return grams;
}

function similarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const [gram, count] of a) {
    normA += count * count;
    dot += count * (b.get(gram) ?? 0);
  }
  for (const count of b.values()) normB += count * count;
  return normA && normB ? dot / Math.sqrt(normA * normB) : 0;
}

function checkProduct(p: Product, constraints: Constraints): Check[] {
  return (Object.entries(constraints) as [ConstraintKey, string][]).map(([key, want]) => ({
    key,
    want,
    got: p[key],
    ok: p[key] === want,
  }));
}

export function rank(query: string, limit = 4) {
  const constraints = parseConstraints(query);
  const queryGrams = trigrams(query);

  const scored: Ranked[] = catalog.map((p) => {
    const checks = checkProduct(p, constraints);
    return {
      product: p,
      similarity: similarity(queryGrams, trigrams(p.title)),
      checks,
      violations: checks.filter((c) => !c.ok).length,
    };
  });

  const bySimilarity = [...scored].sort((a, b) => b.similarity - a.similarity).slice(0, limit);
  const byConstraints = [...scored]
    .sort((a, b) => a.violations - b.violations || b.similarity - a.similarity)
    .slice(0, limit);

  return { constraints, bySimilarity, byConstraints };
}
