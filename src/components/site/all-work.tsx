"use client";

import Link from "next/link";
import { useState } from "react";
import { projects } from "@/data/projects";
import { groupByProject, statusLabel, workGroups, type WorkGroup } from "@/data/showcase";

type Filter = "All" | WorkGroup;

export function AllWork() {
  const [filter, setFilter] = useState<Filter>("All");
  const visible = projects.filter((p) => filter === "All" || groupByProject[p.id] === filter);

  return (
    <section id="all-work" className="themed t-paper gutter py-[clamp(3.5rem,7vw,10rem)]">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <h2 className="display chapter-statement">All {projects.length} projects</h2>
        <div role="group" aria-label="Filter projects" className="flex flex-wrap gap-1.5 pb-1">
          {(["All", ...workGroups] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={`btn ${filter === f ? "btn-solid" : "btn-line"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <ul className="mt-8 border-b border-[var(--line)]">
        {visible.map((p) => {
          const external = p.repoUrl ?? p.liveUrl;
          const href = p.caseStudy ? `/work/${p.slug}` : external;
          const row = (
            <>
              <span className="text-[1.25rem] font-semibold leading-tight tracking-tight md:col-span-4">{p.name}</span>
              <span className="mut text-[0.95rem] leading-snug md:col-span-4">{p.tagline}</span>
              <span className="label mut md:col-span-2">{p.tags.slice(0, 3).join(", ")}</span>
              <span className="label md:col-span-2 md:text-right">
                {statusLabel[p.status]}
                <span aria-hidden className="ml-2">
                  {p.caseStudy ? "→" : href ? "↗" : ""}
                </span>
              </span>
            </>
          );
          const cls =
            "grid items-baseline gap-x-6 gap-y-1 border-t border-[var(--line)] py-3.5 md:grid-cols-12 transition-colors";
          return (
            <li key={p.id}>
              {p.caseStudy && href ? (
                <Link href={href} className={`${cls} hover:bg-[#0c0e110d]`}>
                  {row}
                </Link>
              ) : href ? (
                <a href={href} target="_blank" rel="noreferrer" className={`${cls} hover:bg-[#0c0e110d]`}>
                  {row}
                </a>
              ) : (
                <div className={cls}>{row}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
