"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { architectureLayers } from "@/data/architecture";
import { getProjectBySlug, projects } from "@/data/projects";
import { Section } from "@/components/ui/section";
import { cn } from "@/lib/utils";

function findProjectById(id: string) {
  return projects.find((p) => p.id === id) ?? getProjectBySlug(id);
}

export function HowIBuild() {
  const [activeId, setActiveId] = useState(architectureLayers[0].id);
  const active = architectureLayers.find((l) => l.id === activeId) ?? architectureLayers[0];

  return (
    <Section
      id="how-i-build"
      eyebrow="How I Build"
      title="A layered way of thinking about systems"
      description="Click a layer to see which real projects exercise it."
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:gap-8">
        <div className="flex flex-col gap-2">
          {architectureLayers.map((layer, i) => (
            <button
              key={layer.id}
              onClick={() => setActiveId(layer.id)}
              className={cn(
                "flex items-center justify-between rounded-xl border px-5 py-4 text-left transition-colors",
                activeId === layer.id
                  ? "border-accent bg-accent-soft"
                  : "border-border bg-surface hover:border-border-strong",
              )}
            >
              <span className="flex items-center gap-3">
                <span className="font-mono text-xs text-muted-2">0{i + 1}</span>
                <span className={cn("text-sm font-medium", activeId === layer.id ? "text-foreground" : "text-foreground/80")}>
                  {layer.name}
                </span>
              </span>
            </button>
          ))}
        </div>

        <motion.div
          key={active.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-2xl border border-border bg-surface p-7"
        >
          <h3 className="text-lg font-medium text-foreground">{active.name}</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted">{active.description}</p>

          <p className="mb-3 mt-6 font-mono text-[11px] uppercase tracking-wide text-muted-2">
            Example projects
          </p>
          <div className="flex flex-wrap gap-2">
            {active.exampleProjectIds.map((id) => {
              const project = findProjectById(id);
              if (!project) return null;
              return project.caseStudy ? (
                <Link
                  key={id}
                  href={`/work/${project.slug}`}
                  className="rounded-full border border-border-strong bg-surface-2 px-3 py-1.5 text-xs text-foreground hover:border-accent"
                >
                  {project.name}
                </Link>
              ) : (
                <span
                  key={id}
                  className="rounded-full border border-border-strong bg-surface-2 px-3 py-1.5 text-xs text-foreground"
                >
                  {project.name}
                </span>
              );
            })}
          </div>
        </motion.div>
      </div>
    </Section>
  );
}
