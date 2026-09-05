"use client";

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
}

export function ProjectCard({ project, variant = "flagship" }: ProjectCardProps) {
  const isFlagship = variant === "flagship";

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={cn(
        "group relative flex h-full flex-col rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-border-strong",
        isFlagship && "p-7",
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-wide text-accent">{project.category}</p>
        <StatusBadge status={project.status} />
      </div>

      <h3 className={cn("font-semibold text-foreground", isFlagship ? "text-xl" : "text-base")}>
        {project.name}
      </h3>
      <p className="mt-1 text-sm text-muted">{project.tagline}</p>

      {isFlagship && <p className="mt-4 text-sm text-foreground/80">{project.description}</p>}

      {project.note && (
        <p className="mt-3 text-xs italic text-muted-2">{project.note}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {project.tags.slice(0, isFlagship ? 6 : 4).map((tag) => (
          <Tag key={tag}>{tag}</Tag>
        ))}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-4 pt-6 text-sm">
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
