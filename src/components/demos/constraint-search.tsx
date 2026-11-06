"use client";

import { useState } from "react";
import { rank, type Ranked } from "@/lib/constraint-search";

const samples = ["16 GB laptop", "32 GB RAM 14 inch Laptop 1 TB SSD", "12 inch tablet 8 GB"];

function ResultColumn({
  title,
  note,
  rows,
  aware = false,
}: {
  title: string;
  note: string;
  rows: Ranked[];
  aware?: boolean;
}) {
  const wrong = rows.filter((r) => r.violations > 0).length;
  const exact = rows.length - wrong;
  return (
    <div className="min-w-0 border-t p-line pt-3">
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-base font-semibold">{title}</h4>
        {!rows.some((r) => r.checks.length) ? (
          <p className="label p-mut shrink-0">No constraints to check</p>
        ) : aware ? (
          <p className="label shrink-0" style={{ color: exact ? "var(--ok)" : "var(--bad)" }}>
            {exact} exact {exact === 1 ? "match" : "matches"} first
          </p>
        ) : (
          <p className="label shrink-0" style={{ color: wrong ? "var(--bad)" : "var(--ok)" }}>
            {wrong} of {rows.length} wrong
          </p>
        )}
      </div>
      <p className="label p-mut mt-1">{note}</p>
      <ol className="mt-3">
        {rows.map((row, i) => (
          <li key={row.product.id} className="border-t p-line py-2.5">
            <div className="flex gap-2.5">
              <span className="label p-mut pt-0.5">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className={`text-[0.95rem] leading-snug ${row.violations ? "p-mut" : "font-medium"}`}>{row.product.title}</p>
                <p
                  className="label mt-1"
                  style={{ color: !row.violations ? "var(--ok)" : aware ? "var(--p-mut)" : "var(--bad)" }}
                >
                  {row.violations
                    ? (aware ? "Closest alternative, " : "") +
                      row.checks
                        .filter((c) => !c.ok)
                        .map((c) => `${c.key}: wanted ${c.want}, got ${c.got}`)
                        .join(" · ")
                    : row.checks.length
                      ? "Every constraint met"
                      : "No constraints in query"}
                </p>
                <div className="score-track mt-2" aria-hidden>
                  <div className="score-fill" style={{ width: `${Math.round(row.similarity * 100)}%` }} />
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function ConstraintSearch() {
  const [query, setQuery] = useState(samples[0]);
  const { constraints, bySimilarity, byConstraints } = rank(query);
  const extracted = Object.entries(constraints);

  return (
    <div className="panel p-4 md:p-6">
      <label htmlFor="product-query" className="label p-mut block">
        Search the sample catalog. Type anything, or pick a query.
      </label>
      <input
        id="product-query"
        className="p-input mt-2"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
        spellCheck={false}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        {samples.map((s) => (
          <button key={s} type="button" className="p-btn" aria-pressed={query === s} onClick={() => setQuery(s)}>
            {s}
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1" aria-live="polite">
        <span className="label p-mut">Extracted constraints</span>
        {extracted.length ? (
          extracted.map(([key, value]) => (
            <span key={key} className="label">
              <span className="p-mut">{key}=</span>
              {value}
            </span>
          ))
        ) : (
          <span className="label p-mut">none yet</span>
        )}
      </div>

      <div className="mt-5 grid gap-6 md:grid-cols-2">
        <ResultColumn title="Similarity only" note="What pure text matching ranks first" rows={bySimilarity} />
        <ResultColumn title="Constraint-aware" note="Constraints first, similarity second" rows={byConstraints} aware />
      </div>

      <p className="label p-mut mt-5 max-w-[70ch]">
        This runs in your browser on an invented catalog, with trigram similarity standing in for embeddings. Each bar
        shows that similarity score.
      </p>
    </div>
  );
}
