import Link from "next/link";
import { ViewTransition, type ReactNode } from "react";
import type { Project } from "@/data/types";
import { statusLabel, type Showcase } from "@/data/showcase";

export function Chapter({
  index,
  project,
  item,
  children,
  after,
}: {
  index: number;
  project: Project;
  item: Showcase;
  children: ReactNode;
  after?: ReactNode;
}) {
  return (
    <section
      id={project.slug}
      aria-labelledby={`${project.slug}-title`}
      className={`themed ${item.theme} pb-[clamp(2.5rem,4vw,6rem)] pt-[clamp(1.5rem,2.2vw,4rem)]`}
    >
      <div className="gutter">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-[var(--line)] pb-3">
          <h2 id={`${project.slug}-title`} className="flex items-baseline gap-3 text-[1.25rem] font-bold tracking-tight">
            <span className="label font-normal">0{index + 1}</span>
            <ViewTransition name={`title-${project.slug}`}>
              <span className="inline-block">{project.name}</span>
            </ViewTransition>
          </h2>
          <p className="label mut">
            {project.category} · {statusLabel[project.status]}
          </p>
        </div>

        <div className="mt-[clamp(1.25rem,2vw,3rem)] grid gap-x-[var(--gut)] gap-y-5 lg:grid-cols-12">
          <p className="display chapter-statement reveal lg:col-span-7">{item.statement}</p>
          <div className="lg:col-span-5">
            <p className="prose-body">{item.lede}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/work/${project.slug}`} className="btn btn-line">
                Case study →
              </Link>
              {project.liveUrl && (
                <a href={project.liveUrl} target="_blank" rel="noreferrer" className="btn btn-line">
                  Live app ↗
                </a>
              )}
              {project.repoUrl && (
                <a href={project.repoUrl} target="_blank" rel="noreferrer" className="btn btn-line">
                  Code ↗
                </a>
              )}
            </div>
            {project.note && <p className="label mut mt-4 border-t border-[var(--line)] pt-3">{project.note}</p>}
          </div>
        </div>

        <details className="fold mt-[clamp(1.25rem,2vw,3rem)]">
          <summary className="flex min-h-14 flex-wrap items-center justify-between gap-x-6 gap-y-1 bg-[var(--fg)] px-4 py-3 text-[var(--bg)] transition-opacity hover:opacity-90 md:px-5">
            <span className="text-[1.25rem] font-bold leading-tight tracking-tight">
              <span className="when-closed">{item.proof}</span>
              <span className="when-open">Close the demo</span>
            </span>
            <span className="flex flex-1 items-center justify-between gap-4 sm:flex-none">
              <span className="label when-closed">{item.hint}</span>
              <span aria-hidden className="fold-icon ml-auto text-[1.5rem] leading-none">
                +
              </span>
            </span>
          </summary>
          {children}
        </details>
      </div>
      {after}
    </section>
  );
}
