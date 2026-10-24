"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Compass, FileText, Mail } from "lucide-react";
import { profile } from "@/data/profile";
import { flagshipProjects, labProjects, secondaryProjects } from "@/data/projects";
import { skills } from "@/data/skills";
import { timeline } from "@/data/timeline";
import { GithubIcon, LinkedinIcon } from "@/components/ui/brand-icons";
import { placeById } from "./places";

const levelLabel = { core: "Core", strong: "Strong", working: "Working", exploring: "Exploring" } as const;
const levelDots = { core: 4, strong: 3, working: 2, exploring: 1 } as const;
const categoryInfo = {
  ai: { label: "AI & Search", color: "#8c5bd6" },
  fullstack: { label: "Full-Stack", color: "#3e8bff" },
  security: { label: "Security", color: "#e5484d" },
  systems: { label: "Systems & Data", color: "#2f9e62" },
} as const;
const statusLabel: Record<string, string> = {
  shipped: "Shipped",
  "in-progress": "In progress",
  prototype: "Prototype",
  "learning-exercise": "Learning build",
};

/** The "rolled-down scroll" view: everything on one readable page. */
export function PageView({ closing, onExplore }: { closing: boolean; onExplore: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className={`pv-root ${closing ? "pv-closing" : ""}`} role="region" aria-label="Portfolio page">
      <div ref={scrollRef} tabIndex={-1} className="pv-scroll h-full overflow-y-auto overscroll-contain outline-none">
        <Hero onExplore={onExplore} />
        <main className="pv-paper mx-auto max-w-5xl px-5 pb-24 sm:px-10">
          <Intro />
          <Projects />
          <MoreWork />
          <Skills />
          <Journey />
          <Contact onExplore={onExplore} />
        </main>
      </div>
      <div className="pv-rod" aria-hidden />
    </div>
  );
}

function Hero({ onExplore }: { onExplore: () => void }) {
  return (
    <header className="pv-hero relative overflow-hidden">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1440 560" preserveAspectRatio="xMidYMax slice" aria-hidden>
        <defs>
          <linearGradient id="pv-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#9ed3ec" />
            <stop offset="0.55" stopColor="#fbe3bf" />
            <stop offset="1" stopColor="#ffd2a1" />
          </linearGradient>
          <radialGradient id="pv-sun" cx="0.78" cy="0.42" r="0.35">
            <stop offset="0" stopColor="#fff6d6" stopOpacity="1" />
            <stop offset="1" stopColor="#fff6d6" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="pv-h1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8fb9a6" />
            <stop offset="1" stopColor="#6f9f8c" />
          </linearGradient>
          <linearGradient id="pv-h2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8cc265" />
            <stop offset="1" stopColor="#5b9150" />
          </linearGradient>
          <linearGradient id="pv-h3" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6fa35a" />
            <stop offset="1" stopColor="#3f7348" />
          </linearGradient>
        </defs>
        <rect width="1440" height="560" fill="url(#pv-sky)" />
        <rect width="1440" height="560" fill="url(#pv-sun)" />
        <g fill="#fffaf0" opacity="0.85">
          <ellipse cx="260" cy="120" rx="90" ry="22" />
          <ellipse cx="320" cy="108" rx="60" ry="24" />
          <ellipse cx="1080" cy="80" rx="110" ry="20" />
          <ellipse cx="1150" cy="70" rx="60" ry="22" />
        </g>
        <path d="M0 380 C 180 280, 320 300, 480 340 S 820 250, 1000 300 S 1300 260, 1440 320 V560 H0 Z" fill="url(#pv-h1)" opacity="0.8" />
        <path d="M0 430 C 200 380, 380 400, 560 420 S 900 360, 1120 400 S 1340 380, 1440 400 V560 H0 Z" fill="url(#pv-h2)" />
        <path d="M0 490 C 240 460, 480 480, 720 470 S 1180 450, 1440 480 V560 H0 Z" fill="url(#pv-h3)" />
        <g fill="#f7c2d6">
          {[[120, 440], [180, 450], [1260, 420], [1320, 430], [1290, 410]].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="26" opacity="0.9" />
          ))}
        </g>
      </svg>
      <div className="relative mx-auto flex min-h-[520px] max-w-5xl flex-col justify-center px-5 pt-24 pb-28 sm:px-10">
        <p className="pv-pill w-fit">
          <span className="pv-dot" /> Open to work & collaborations
        </p>
        <h1 className="font-display mt-5 text-5xl leading-[0.95] font-semibold text-[#21302c] sm:text-7xl">{profile.name}</h1>
        <p className="font-display mt-3 text-xl text-[#2c3a36] italic sm:text-2xl">{profile.role}</p>
        <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-[#2c3a36] sm:text-base">{profile.heroLine}</p>
        <div className="mt-7 flex flex-wrap gap-2">
          <a href={`mailto:${profile.email}`} className="wv-btn wv-btn-solid" style={{ background: "#e0703f" }}>
            <Mail size={16} /> Get in touch
          </a>
          <a href={profile.resumeUrl} target="_blank" rel="noreferrer noopener" className="wv-btn">
            <FileText size={16} /> Résumé
          </a>
          <button type="button" onClick={onExplore} className="wv-btn">
            <Compass size={16} /> Explore the world
          </button>
        </div>
      </div>
    </header>
  );
}

function SectionTitle({ eyebrow, title, color }: { eyebrow: string; title: string; color: string }) {
  return (
    <div className="mb-6">
      <p className="text-[11px] font-semibold tracking-[0.18em] uppercase" style={{ color }}>
        {eyebrow}
      </p>
      <h2 className="font-display mt-1 text-3xl font-semibold sm:text-4xl">{title}</h2>
      <span className="mt-3 block h-1 w-16 rounded-full" style={{ background: color }} />
    </div>
  );
}

function Intro() {
  return (
    <section className="pv-section grid gap-8 sm:grid-cols-[1.4fr_1fr]">
      <div>
        <SectionTitle eyebrow="Hello" title="What I build" color="#e0703f" />
        <p className="text-[15px] leading-relaxed">{profile.heroSupport}</p>
        <p className="mt-3 text-[15px] leading-relaxed">{profile.howIThink}</p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {profile.principles.map((p) => (
            <li key={p.title} className="pv-card p-4">
              <p className="font-display text-lg font-semibold">{p.title}</p>
              <p className="mt-1 text-[13px] leading-snug text-[var(--ink-soft)]">{p.body}</p>
            </li>
          ))}
        </ul>
      </div>
      <aside className="pv-card h-fit p-5">
        <p className="font-display text-xl font-semibold">At a glance</p>
        <dl className="mt-3 space-y-3 text-[14px]">
          {profile.experiences.map((x) => (
            <div key={x.org}>
              <dt className="font-semibold">{x.title}</dt>
              <dd className="text-[var(--ink-soft)]">
                {x.org}
                {x.period && ` · ${x.period}`}
              </dd>
            </div>
          ))}
          <div>
            <dt className="font-semibold">{profile.education.degree}</dt>
            <dd className="text-[var(--ink-soft)]">{profile.education.institution}</dd>
          </div>
          <div>
            <dt className="font-semibold">Certifications</dt>
            <dd className="text-[var(--ink-soft)]">{profile.certifications.join(" · ")}</dd>
          </div>
          <div>
            <dt className="font-semibold">Currently building</dt>
            <dd className="text-[var(--ink-soft)]">{profile.currentlyBuilding.join(" · ")}</dd>
          </div>
        </dl>
      </aside>
    </section>
  );
}

function Projects() {
  return (
    <section className="pv-section">
      <SectionTitle eyebrow="Flagship work" title="Projects" color="#e0703f" />
      <div className="grid gap-5 md:grid-cols-2">
        {flagshipProjects.map((p) => {
          const place = placeById(p.id);
          const color = place?.color ?? "#e0703f";
          const ink = place?.ink ?? "#2c3a36";
          return (
            <article key={p.id} className="pv-card pv-project flex flex-col overflow-hidden" style={{ ["--c" as string]: color }}>
              <div className="pv-project-head px-5 pt-5 pb-4">
                <p className="text-[11px] font-semibold tracking-[0.14em] uppercase opacity-80">{p.category}</p>
                <h3 className="font-display mt-1 text-2xl font-semibold" style={{ color: ink }}>
                  {p.name}
                </h3>
                <p className="mt-1 text-[14px] font-medium">{p.tagline}</p>
              </div>
              <div className="flex flex-1 flex-col px-5 pb-5">
                <p className="text-xs text-[var(--ink-soft)]">
                  <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: color }} />
                  {statusLabel[p.status]}
                </p>
                <p className="mt-2 text-[14px] leading-relaxed">{p.description}</p>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {p.tags.map((t) => (
                    <li key={t} className="wv-tag" style={{ ["--tag" as string]: color }}>
                      {t}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto flex flex-wrap gap-2 pt-5">
                  {p.liveUrl && (
                    <a href={p.liveUrl} target="_blank" rel="noreferrer noopener" className="wv-btn wv-btn-solid" style={{ background: color }}>
                      Live app <ArrowUpRight size={15} />
                    </a>
                  )}
                  {p.repoUrl && (
                    <a href={p.repoUrl} target="_blank" rel="noreferrer noopener" className="wv-btn">
                      Code <ArrowUpRight size={15} />
                    </a>
                  )}
                  <Link href={`/work/${p.slug}`} className="wv-btn">
                    Case study <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function MoreWork() {
  const notes = ["#fff1b8", "#ffd6e8", "#d6e9ff", "#d4f2df", "#ffe0c7", "#e8dcff"];
  return (
    <section className="pv-section">
      <SectionTitle eyebrow="The workshop" title="More builds & experiments" color="#d6409f" />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {secondaryProjects.map((p, i) => (
          <li key={p.id} className="pv-note" style={{ background: notes[i % notes.length] }}>
            <div className="flex items-start justify-between gap-2">
              <p className="font-display text-lg leading-tight font-semibold">{p.name}</p>
              {p.repoUrl && (
                <a href={p.repoUrl} target="_blank" rel="noreferrer noopener" aria-label={`${p.name} on GitHub`} className="shrink-0 p-1">
                  <ArrowUpRight size={16} />
                </a>
              )}
            </div>
            <p className="mt-1.5 text-[13px] leading-snug">{p.description}</p>
            <p className="mt-2 text-[11px] font-semibold opacity-70">{p.tags.join(" · ")}</p>
          </li>
        ))}
      </ul>
      <div className="pv-card mt-5 p-5">
        <p className="font-display text-xl font-semibold">Security lab</p>
        <ul className="mt-2 grid gap-x-6 sm:grid-cols-2">
          {labProjects.map((p) => (
            <li key={p.id} className="border-b border-dashed border-[var(--ink-faint)] last:border-0 sm:[&:nth-last-child(2)]:border-0">
              <a href={p.repoUrl} target="_blank" rel="noreferrer noopener" className="flex items-baseline justify-between gap-3 py-2 hover:opacity-70">
                <span>
                  <span className="text-[14px] font-medium">{p.name}</span>
                  <span className="block text-[12px] text-[var(--ink-soft)]">{p.tagline}</span>
                </span>
                <ArrowUpRight size={14} className="shrink-0" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Skills() {
  const cats = Object.keys(categoryInfo) as (keyof typeof categoryInfo)[];
  return (
    <section className="pv-section">
      <SectionTitle eyebrow="The skill tree" title="What I work with" color="#8c5bd6" />
      <div className="grid gap-4 sm:grid-cols-2">
        {cats.map((c) => (
          <div key={c} className="pv-card p-5">
            <p className="font-display text-xl font-semibold" style={{ color: categoryInfo[c].color }}>
              {categoryInfo[c].label}
            </p>
            <ul className="mt-3 space-y-3">
              {skills
                .filter((s) => s.category === c)
                .map((s) => (
                  <li key={s.id}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[14px] font-semibold">{s.name}</span>
                      <span className="flex items-center gap-1 text-[11px] text-[var(--ink-soft)]" title={levelLabel[s.level]}>
                        {[0, 1, 2, 3].map((i) => (
                          <span
                            key={i}
                            className="h-2 w-2 rounded-full"
                            style={{ background: i < levelDots[s.level] ? categoryInfo[c].color : "var(--ink-faint)" }}
                          />
                        ))}
                        <span className="ml-1 w-14 text-right">{levelLabel[s.level]}</span>
                      </span>
                    </div>
                    <p className="mt-0.5 text-[12.5px] leading-snug text-[var(--ink-soft)]">{s.blurb}</p>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function Journey() {
  return (
    <section className="pv-section">
      <SectionTitle eyebrow="So far" title="Journey" color="#2f9e62" />
      <ol className="relative ml-2 border-l-2 border-dashed border-[#9fc58a] pl-6">
        {timeline.map((e) => (
          <li key={e.id} className="relative mb-6 last:mb-0">
            <span className="absolute top-1.5 -left-[33px] h-4 w-4 rounded-full border-2 border-[#fffaf0] bg-[#2f9e62] shadow" />
            <p className="text-[11px] font-semibold tracking-[0.12em] text-[var(--ink-soft)] uppercase">{e.date}</p>
            <p className="font-display text-lg font-semibold">{e.label}</p>
            <p className="text-[14px] leading-relaxed text-[var(--ink-soft)]">{e.description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Contact({ onExplore }: { onExplore: () => void }) {
  return (
    <section className="pv-section">
      <div className="pv-contact relative overflow-hidden rounded-[28px] p-7 sm:p-10">
        <p className="pv-pill w-fit">
          <span className="pv-dot" /> {profile.status}
        </p>
        <h2 className="font-display mt-4 text-3xl font-semibold sm:text-5xl">Let&apos;s build something together.</h2>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed">
          Full-time roles, freelance projects or a collaboration on something ambitious — I&apos;d love to hear about it.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <a href={`mailto:${profile.email}`} className="wv-btn wv-btn-solid" style={{ background: "#e0703f" }}>
            <Mail size={16} /> {profile.email}
          </a>
          <a href={profile.linkedin} target="_blank" rel="noreferrer noopener" className="wv-btn">
            <LinkedinIcon size={16} /> LinkedIn
          </a>
          <a href={profile.github} target="_blank" rel="noreferrer noopener" className="wv-btn">
            <GithubIcon size={16} /> GitHub
          </a>
          <a href={profile.resumeUrl} target="_blank" rel="noreferrer noopener" className="wv-btn">
            <FileText size={16} /> Résumé
          </a>
        </div>
        <button type="button" onClick={onExplore} className="mt-8 inline-flex items-center gap-2 text-sm font-semibold underline-offset-4 hover:underline">
          <Compass size={16} /> Or go explore the world version
        </button>
      </div>
    </section>
  );
}
