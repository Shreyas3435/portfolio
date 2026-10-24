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
  ai: { label: "AI & Search", color: "#00897b" },
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
            <stop offset="0" stopColor="#5fb7e8" />
            <stop offset="0.5" stopColor="#ffd08a" />
            <stop offset="1" stopColor="#ff9a4d" />
          </linearGradient>
          <radialGradient id="pv-sun" cx="0.74" cy="0.5" r="0.3">
            <stop offset="0" stopColor="#fff3c4" />
            <stop offset="0.25" stopColor="#ffd27a" stopOpacity="0.9" />
            <stop offset="1" stopColor="#ffd27a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="1440" height="560" fill="url(#pv-sky)" />
        <rect width="1440" height="560" fill="url(#pv-sun)" />
        <circle cx="1065" cy="285" r="58" fill="#fff4cc" />
        <path d="M0 360 L120 300 L230 340 L360 250 L470 320 L600 270 L720 330 L860 240 L980 310 L1100 260 L1240 320 L1340 280 L1440 310 V560 H0 Z" fill="#3f8f8a" opacity="0.75" />
        <path d="M0 410 L160 360 L300 395 L450 340 L610 395 L760 350 L920 400 L1080 355 L1240 400 L1440 370 V560 H0 Z" fill="#2c7a5a" />
        {/* Gopuram silhouette */}
        <path d="M1150 470 V420 H1162 V392 H1172 V366 H1182 V342 H1192 V322 H1218 V342 H1228 V366 H1238 V392 H1248 V420 H1260 V470 Z" fill="#7a3a16" opacity="0.85" />
        <path d="M0 470 C 240 440, 480 460, 720 450 S 1180 430, 1440 460 V560 H0 Z" fill="#3f8a3a" />
        <path d="M0 510 C 300 490, 640 505, 900 495 S 1300 490, 1440 505 V560 H0 Z" fill="#2a6334" />
        {/* Coconut palms */}
        {[[70, 500, 1], [150, 505, 0.8], [1330, 490, 1.1], [1400, 500, 0.85]].map(([x, y, k]) => (
          <g key={`${x}-${y}`} fill="#173f20" transform={`translate(${x} ${y}) scale(${k})`}>
            <path d="M-3 0 Q 4 -70 14 -140 L20 -140 Q 10 -70 3 0 Z" />
            <path d="M17 -140 q -40 -10 -70 20 q 34 -26 70 -14 Z" />
            <path d="M17 -140 q 40 -12 72 16 q -36 -22 -72 -10 Z" />
            <path d="M17 -140 q -10 -40 -44 -54 q 30 22 40 54 Z" />
            <path d="M17 -140 q 14 -40 50 -50 q -32 20 -44 52 Z" />
            <path d="M17 -140 q -36 10 -54 50 q 26 -36 54 -46 Z" />
            <path d="M17 -140 q 36 12 50 54 q -22 -38 -50 -50 Z" />
          </g>
        ))}
      </svg>
      <div className="relative mx-auto flex min-h-[520px] max-w-5xl flex-col justify-center px-5 pt-24 pb-28 sm:px-10">
        <p className="pv-pill w-fit">
          <span className="pv-dot" /> Open to work & collaborations
        </p>
        <h1 className="font-display mt-5 text-6xl leading-[0.95] text-[#1f1a14] sm:text-8xl">{profile.name}</h1>
        <p className="font-display mt-3 text-xl text-[#3a2410] sm:text-2xl">{profile.role}</p>
        <p className="mt-5 max-w-xl text-[15px] leading-relaxed font-medium text-[#2a1c10] sm:text-base">{profile.heroLine}</p>
        <div className="mt-7 flex flex-wrap gap-2">
          <a href={`mailto:${profile.email}`} className="wv-btn wv-btn-solid" style={{ background: "#e8601c" }}>
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
        <SectionTitle eyebrow="Hello" title="What I build" color="#e8601c" />
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
      <SectionTitle eyebrow="Flagship work" title="Projects" color="#e8601c" />
      <div className="grid gap-5 md:grid-cols-2">
        {flagshipProjects.map((p) => {
          const place = placeById(p.id);
          const color = place?.color ?? "#e8601c";
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
  const notes = ["#f3e7c4", "#dbe6ee", "#dbe9d6", "#f2dcc6", "#e4e1d8", "#e9e3c6"];
  return (
    <section className="pv-section">
      <SectionTitle eyebrow="The workshop" title="More builds & experiments" color="#455a64" />
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
      <SectionTitle eyebrow="The skill tree" title="What I work with" color="#00897b" />
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
          <a href={`mailto:${profile.email}`} className="wv-btn wv-btn-solid" style={{ background: "#e8601c" }}>
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
