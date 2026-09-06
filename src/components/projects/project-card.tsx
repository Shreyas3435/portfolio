"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import type { Project } from "@/data/types";
import { StatusBadge } from "@/components/ui/badges";
import { Tag } from "@/components/ui/tag";
import { GithubIcon } from "@/components/ui/brand-icons";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
  project: Project;
  variant?: "flagship" | "compact";
  index?: number;
}

export function ProjectCard({ project, variant = "flagship", index = 0 }: ProjectCardProps) {
  const isFlagship = variant === "flagship";
  const spotlightRef = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const el = spotlightRef.current;
    if (!el) return;
    el.style.background = `radial-gradient(320px circle at ${e.clientX - rect.left}px ${e.clientY - rect.top}px, rgba(77,163,255,0.22), transparent 70%)`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: Math.min(index, 6) * 0.06, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      onMouseMove={handleMouseMove}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface p-6 transition-colors duration-300 hover:border-accent/50",
        isFlagship && "p-7",
      )}
    >
      <div
        ref={spotlightRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />

      <div className="relative mb-3 flex items-start justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-wide text-accent">{project.category}</p>
        <StatusBadge status={project.status} />
      </div>

      <h3 className={cn("relative font-semibold text-foreground", isFlagship ? "text-xl" : "text-base")}>
        {project.name}
      </h3>
      <p className="relative mt-1 text-sm text-muted">{project.tagline}</p>

      {isFlagship && <p className="relative mt-4 text-sm text-foreground/80">{project.description}</p>}

      {project.note && (
        <p className="relative mt-3 text-xs italic text-muted-2">{project.note}</p>
      )}

      <div className="relative mt-4 flex flex-wrap gap-2">
        {project.tags.slice(0, isFlagship ? 6 : 4).map((tag) => (
          <Tag key={tag}>{tag}</Tag>
        ))}
      </div>

      <div className="relative mt-auto flex flex-wrap items-center gap-4 pt-6 text-sm">
        {project.caseStudy && (
          <Link
            href={`/work/${project.slug}`}
            className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
          >
            Read case study
            <ArrowUpRight size={14} />
          </Link>
        )}
        {project.repoUrl && (
          <a
            href={project.repoUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 text-muted hover:text-foreground"
          >
            <GithubIcon size={14} />
            Code
          </a>
        )}
        {project.liveUrl && (
          <a
            href={project.liveUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 text-muted hover:text-foreground"
          >
            <ArrowUpRight size={14} />
            Live
          </a>
        )}
      </div>
    </motion.div>
  );
}
