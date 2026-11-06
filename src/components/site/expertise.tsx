"use client";

import { useState } from "react";
import { ProjectLinks } from "@/components/site/project-links";
import { profile } from "@/data/profile";
import { showcase } from "@/data/showcase";
import { skills } from "@/data/skills";
import type { ExperienceLevel, SkillNode } from "@/data/types";

const levelRank: Record<ExperienceLevel, number> = { exploring: 1, working: 2, strong: 3, core: 4 };
const levelLabel: Record<ExperienceLevel, string> = {
  exploring: "Exploring",
  working: "Working",
  strong: "Strong",
  core: "Core",
};

const swatchOf = (slug: string) => showcase.find((s) => s.slug === slug)!;

const needs: {
  category: SkillNode["category"];
  title: string;
  principle: string;
  swatch: { swatch: string; swatchInk: string };
}[] = [
  {
    category: "ai",
    title: "Search and AI that stay correct",
    principle: "AI needs boundaries",
    swatch: swatchOf("constraint-aware-search"),
  },
  {
    category: "fullstack",
    title: "A full product, end to end",
    principle: "Build for the real problem",
    swatch: swatchOf("trek-saathi"),
  },
  {
    category: "security",
    title: "Security built in from the start",
    principle: "Security is part of engineering",
    swatch: swatchOf("shadowpath"),
  },
  {
    category: "systems",
    title: "Data and infrastructure that hold up",
    principle: "Systems should be explainable",
    swatch: swatchOf("website-content-search"),
  },
];

function skillsIn(category: SkillNode["category"]) {
  return skills
    .filter((s) => s.category === category)
    .sort((a, b) => levelRank[b.level] - levelRank[a.level]);
}

function Meter({ level }: { level: ExperienceLevel }) {
  return (
    <span className="meter" aria-hidden>
      {[1, 2, 3, 4].map((n) => (
        <i key={n} data-on={n <= levelRank[level]} />
      ))}
    </span>
  );
}

export function Expertise() {
  const [needIndex, setNeedIndex] = useState(0);
  const need = needs[needIndex];
  const list = skillsIn(need.category);
  const [skillId, setSkillId] = useState(list[0].id);
  const skill = list.find((s) => s.id === skillId) ?? list[0];
  const principle = profile.principles.find((p) => p.title === need.principle);

  return (
    <div className="mt-4 grid gap-x-[var(--gut)] gap-y-5 lg:grid-cols-12">
      <div role="group" aria-label="What you need built" className="flex flex-col lg:col-span-5">
        {needs.map((n, i) => {
          const on = i === needIndex;
          return (
            <button
              key={n.category}
              type="button"
              aria-pressed={on}
              onClick={() => {
                setNeedIndex(i);
                setSkillId(skillsIn(n.category)[0].id);
              }}
              style={on ? { background: n.swatch.swatch, color: n.swatch.swatchInk } : undefined}
              className={`flex items-baseline gap-3 border-t border-[var(--line)] px-2 py-3 text-left text-[clamp(1.35rem,2vw,5rem)] font-bold leading-[1.08] tracking-[-0.02em] transition-colors last:border-b ${
                on ? "" : "hover:bg-[#0c0e110d]"
              }`}
            >
              <span className="label shrink-0 font-normal tracking-normal">0{i + 1}</span>
              {n.title}
            </button>
          );
        })}
      </div>

      <div className="panel min-w-0 p-4 md:p-5 lg:col-span-7">
        <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
          <ul>
            {list.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  aria-pressed={s.id === skill.id}
                  onClick={() => setSkillId(s.id)}
                  className="p-btn min-h-11 w-full justify-between gap-3 border-x-0 border-t-0"
                >
                  <span className="text-[0.8rem]">{s.name}</span>
                  <Meter level={s.level} />
                </button>
              </li>
            ))}
          </ul>

          <div className="min-w-0" aria-live="polite">
            <p className="label p-mut">{levelLabel[skill.level]}</p>
            <p className="mt-1 text-[1.25rem] font-semibold leading-tight tracking-tight">{skill.name}</p>
            <p className="mt-2 text-[0.95rem] leading-snug">{skill.blurb}</p>
            <div className="mt-3">
              {skill.relatedProjectIds.length ? (
                <ProjectLinks ids={skill.relatedProjectIds} limit={3} />
              ) : (
                <p className="label p-mut">
                  {skill.level === "exploring" ? "Nothing public to show yet." : "Used professionally. No public project."}
                </p>
              )}
            </div>
          </div>
        </div>

        {principle && (
          <p className="mt-4 border-t p-line pt-3 text-[0.95rem] leading-snug">
            <span className="font-semibold">{principle.title}.</span> <span className="p-mut">{principle.body}</span>
          </p>
        )}
      </div>
    </div>
  );
}
