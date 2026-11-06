"use client";

import { useState } from "react";

const SOURCE = `Shipping. Orders leave our warehouse within two working days. Delivery to metro cities takes three to five days, and remote pincodes can take up to ten days. You will get a tracking link by email once the parcel is handed to the courier. Returns. Unused gear can be sent back within thirty days of delivery. If an item arrives damaged, photograph it and write to support within seven days. Once the damaged item is inspected, we refund the money to your original payment method. Refunds usually take five working days to appear. Repairs. Tents and backpacks carry a two year warranty against stitching and zip failures. Bring the product to any partner workshop with your order number. Repairs are free during the warranty period, and after it we charge only for parts. Care. Dry tents fully before storing them, because damp fabric grows mould within days. Wash sleeping bags with mild soap and never use a dryer on high heat. Store boots somewhere cool, away from direct sunlight.`;

const WORDS = SOURCE.split(" ");
const STOP = new Set(
  "a an and are at be by can do does for from get how i if in is it my of on once or our the them to we what when will with you your".split(" "),
);
const QUERIES = ["refund for a damaged tent", "how long does delivery take", "free zip repairs under warranty"];
const STAGES = ["Extract", "Clean", "Chunk", "Embed", "Store", "Query"];

const tokens = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !STOP.has(t))
    .map((t) => (t.length > 3 ? t.replace(/s$/, "") : t));

function retrieve(query: string, size: number) {
  const chunks: string[] = [];
  for (let i = 0; i < WORDS.length; i += size) chunks.push(WORDS.slice(i, i + size).join(" "));

  const docs = chunks.map(tokens);
  const idf = (term: string) => {
    const hits = docs.filter((d) => d.includes(term)).length;
    return Math.log((docs.length + 1) / (hits + 1)) + 1;
  };
  const vector = (terms: string[]) => {
    const v = new Map<string, number>();
    for (const t of terms) v.set(t, (v.get(t) ?? 0) + idf(t));
    return v;
  };
  const queryVector = vector(tokens(query));

  const scores = docs.map((doc) => {
    const docVector = vector(doc);
    let dot = 0;
    let qNorm = 0;
    let dNorm = 0;
    for (const [t, w] of queryVector) {
      qNorm += w * w;
      dot += w * (docVector.get(t) ?? 0);
    }
    for (const w of docVector.values()) dNorm += w * w;
    return qNorm && dNorm ? dot / Math.sqrt(qNorm * dNorm) : 0;
  });

  const top = scores
    .map((score, index) => ({ index, score }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return { chunks, top };
}

function verdict(size: number) {
  if (size <= 18) return "Too small: passages split mid-thought, so the top match loses its context.";
  if (size >= 70) return "Too large: unrelated topics share a chunk, so the match buries the answer.";
  return "Balanced: each chunk holds one idea and still makes sense alone.";
}

export function ChunkLab() {
  const [size, setSize] = useState(40);
  const [query, setQuery] = useState(QUERIES[0]);
  const { chunks, top } = retrieve(query, size);
  const best = top[0];
  const exact = query.trim() ? SOURCE.toLowerCase().split(query.trim().toLowerCase()).length - 1 : 0;

  return (
    <div className="panel p-4 md:p-6">
      <ol className="flex flex-wrap gap-x-1.5 gap-y-1" aria-label="Pipeline stages">
        {STAGES.map((stage, i) => (
          <li key={stage} className="label flex items-center gap-1.5">
            <span
              className={stage === "Chunk" ? "px-1.5 py-0.5" : "p-mut py-0.5"}
              style={stage === "Chunk" ? { background: "var(--p-acc)", color: "var(--p-acc-fg)" } : undefined}
            >
              {stage}
            </span>
            {i < STAGES.length - 1 && <span className="p-mut">→</span>}
          </li>
        ))}
      </ol>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="min-w-0">
          <div className="flex items-baseline justify-between gap-4">
            <label htmlFor="chunk-size" className="label">
              Chunk size: <strong>{size} words</strong>, {chunks.length} chunks
            </label>
          </div>
          <input
            id="chunk-size"
            type="range"
            min={8}
            max={120}
            step={2}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="mt-2 h-6 w-full"
            style={{ accentColor: "var(--p-acc)" }}
          />
          <p className="label mt-1 min-h-[2.1em]" aria-live="polite">
            {verdict(size)}
          </p>

          <div className="mt-3 border-t p-line pt-3 text-[0.95rem] leading-[1.7]">
            {chunks.map((chunk, i) => {
              const isBest = best?.index === i;
              return (
                <span key={i}>
                  <span
                    className="box-decoration-clone px-[0.2em] py-[0.1em] transition-colors"
                    style={
                      isBest
                        ? { background: "var(--p-acc)", color: "var(--p-acc-fg)" }
                        : { background: i % 2 ? "color-mix(in srgb, var(--p-acc) 9%, transparent)" : "transparent" }
                    }
                  >
                    {chunk}
                  </span>{" "}
                </span>
              );
            })}
          </div>
        </div>

        <div className="min-w-0">
          <label htmlFor="chunk-query" className="label p-mut block">
            Ask in your own words
          </label>
          <input
            id="chunk-query"
            className="p-input mt-2"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {QUERIES.map((q) => (
              <button key={q} type="button" className="p-btn" aria-pressed={query === q} onClick={() => setQuery(q)}>
                {q}
              </button>
            ))}
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-4 border-t p-line pt-3">
            <div>
              <dt className="label p-mut">Ctrl-F, exact phrase</dt>
              <dd className="display mt-1 text-[2.25rem] tabular-nums">{exact}</dd>
            </div>
            <div>
              <dt className="label p-mut">Chunks matched</dt>
              <dd className="display mt-1 text-[2.25rem] tabular-nums">{top.length}</dd>
            </div>
          </dl>

          <ol className="mt-4">
            {top.map((t, i) => (
              <li key={t.index} className="border-t p-line py-2">
                <div className="flex items-center gap-2">
                  <span className="label p-mut">Chunk {t.index + 1}</span>
                  <div className="score-track flex-1" aria-hidden>
                    <div className="score-fill" style={{ width: `${Math.round(t.score * 100)}%` }} />
                  </div>
                  <span className="label tabular-nums">{t.score.toFixed(2)}</span>
                </div>
                {i === 0 && <p className="mt-1.5 line-clamp-3 text-sm leading-snug">{chunks[t.index]}</p>}
              </li>
            ))}
            {!top.length && <li className="label p-mut border-t p-line py-3">No chunk shares a term with that query.</li>}
          </ol>
        </div>
      </div>

      <p className="label p-mut mt-5 max-w-[70ch]">
        This runs in your browser on a sample help page. TF-IDF scoring stands in for the embeddings, because the thing to
        watch here is the chunking. The real project uses a BERT tokenizer and Weaviate.
      </p>
    </div>
  );
}
