"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { skills } from "@/data/skills";
import { projects } from "@/data/projects";
import { Section } from "@/components/ui/section";
import { LevelIndicator } from "@/components/ui/badges";
import { cn } from "@/lib/utils";

const categories = [
  { id: "ai", label: "AI" },
  { id: "fullstack", label: "Full Stack" },
  { id: "security", label: "Security" },
  { id: "systems", label: "Systems" },
] as const;

export function SkillTree() {
  const [active, setActive] = useState<(typeof categories)[number]["id"]>("ai");
  const activeSkills = skills.filter((s) => s.category === active);

  return (
    <Section
      id="skills"
      eyebrow="Skill Tree"
      title="Engineering skill map"
      description="No invented percentages — proficiency shown as Core, Strong, Working, or Exploring, tied to real projects."
    >
      <div className="mb-8 flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActive(c.id)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm transition-colors",
              active === c.id
                ? "border-accent bg-accent-soft text-foreground"
                : "border-border bg-surface text-muted hover:border-border-strong",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <motion.div
        key={active}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
      >
        {activeSkills.map((skill) => (
          <div key={skill.id} className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-medium text-foreground">{skill.name}</h3>
              <LevelIndicator level={skill.level} />
            </div>
            <p className="mt-2 text-sm text-muted">{skill.blurb}</p>
            {skill.relatedProjectIds.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {skill.relatedProjectIds.map((id) => {
                  const project = projects.find((p) => p.id === id);
                  if (!project) return null;
                  return (
                    <span
                      key={id}
                      className="rounded-full border border-border-strong bg-surface-2 px-2.5 py-1 font-mono text-[11px] text-muted-2"
                    >
                      {project.name}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </motion.div>
    </Section>
  );
}
