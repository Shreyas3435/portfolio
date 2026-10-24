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
  ai: { label: "AI & Search", color: "#00bfa5" },
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
export function PageView({ closing, night, onExplore }: { closing: boolean; night: boolean; onExplore: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className={`pv-root ${closing ? "pv-closing" : ""}`} role="region" aria-label="Portfolio page">
      <div ref={scrollRef} tabIndex={-1} className="pv-scroll h-full overflow-y-auto overscroll-contain outline-none">
        <Hero night={night} onExplore={onExplore} />
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

function Hero({ night, onExplore }: { night: boolean; onExplore: () => void }) {
  return (
    <header className="pv-hero relative overflow-hidden">
      <CitySkyline night={night} />
      <div className="pv-scrim pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative mx-auto flex min-h-[520px] max-w-5xl flex-col justify-center px-5 pt-24 pb-28 sm:px-10">
        <p className="pv-pill w-fit">
          <span className="pv-dot" /> Open to work & collaborations
        </p>
        <h1 className="pv-hero-ink font-display mt-5 text-6xl leading-[0.95] font-bold sm:text-8xl">{profile.name}</h1>
        <p className="pv-hero-ink font-display mt-3 text-xl font-semibold sm:text-2xl">{profile.role}</p>
        <p className="pv-hero-ink mt-5 max-w-xl text-base leading-relaxed font-medium sm:text-lg">{profile.heroLine}</p>
        <div className="mt-7 flex flex-wrap gap-2">
          <a href={`mailto:${profile.email}`} className="wv-btn wv-btn-solid" style={{ background: "#ff6d00" }}>
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
        <SectionTitle eyebrow="Hello" title="What I build" color="#ff6d00" />
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
      <SectionTitle eyebrow="Flagship work" title="Projects" color="#ff6d00" />
      <div className="grid gap-5 md:grid-cols-2">
        {flagshipProjects.map((p) => {
          const place = placeById(p.id);
          const color = place?.color ?? "#ff6d00";
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
      <SectionTitle eyebrow="The skill tree" title="What I work with" color="#00bfa5" />
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
          <a href={`mailto:${profile.email}`} className="wv-btn wv-btn-solid" style={{ background: "#ff6d00" }}>
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

/** City skyline for the page hero, in day or night colours. */
function CitySkyline({ night }: { night: boolean }) {
  const sky = night ? ["#050916", "#121a3a", "#2a2450"] : ["#6fb3e0", "#b9dcf0", "#f3e6d3"];
  const far = night ? "#141b38" : "#9db6c9";
  const near = night ? ["#0d1328", "#080c1c"] : ["#6d8597", "#4b6274"];
  const ground = night ? "#070b16" : "#3f5a3a";
  const lit = night ? "#ffcf7a" : "#e6f2fa";
  const far1 = [[0, 300, 90], [80, 260, 70], [150, 320, 60], [210, 240, 80], [300, 290, 60], [360, 210, 70], [440, 280, 90], [540, 250, 60], [610, 300, 80], [700, 230, 70], [780, 290, 90], [880, 260, 60], [950, 310, 80], [1040, 240, 70], [1120, 290, 60], [1190, 220, 80], [1280, 280, 70], [1360, 250, 80]];
  const near1 = [[20, 380, 110], [140, 340, 90], [250, 400, 100], [370, 330, 80], [460, 390, 120], [600, 350, 90], [710, 410, 100], [830, 360, 80], [930, 390, 110], [1060, 340, 90], [1170, 400, 100], [1290, 350, 120]];
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1440 560" preserveAspectRatio="xMidYMax slice" aria-hidden>
      <defs>
        <linearGradient id="pv-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky[0]} />
          <stop offset="0.6" stopColor={sky[1]} />
          <stop offset="1" stopColor={sky[2]} />
        </linearGradient>
        <linearGradient id="pv-near" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={near[0]} />
          <stop offset="1" stopColor={near[1]} />
        </linearGradient>
        <linearGradient id="pv-haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.45" stopColor={sky[2]} stopOpacity="0" />
          <stop offset="1" stopColor={sky[2]} stopOpacity={night ? 0.35 : 0.55} />
        </linearGradient>
        <radialGradient id="pv-orb" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={night ? "#fffbe8" : "#fff7d6"} />
          <stop offset="0.35" stopColor={night ? "#fffbe8" : "#ffe9a8"} stopOpacity="0.5" />
          <stop offset="1" stopColor={night ? "#fffbe8" : "#ffe9a8"} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1440" height="560" fill="url(#pv-sky)" />
      {night &&
        Array.from({ length: 70 }, (_, i) => (
          <circle key={i} cx={(i * 197) % 1440} cy={(i * 89) % 280} r={i % 7 === 0 ? 1.5 : 0.9} fill="#ffffff" opacity={0.35 + (i % 4) * 0.12} />
        ))}
      <circle cx="1120" cy="150" r="150" fill="url(#pv-orb)" />
      <circle cx="1120" cy="150" r={night ? 30 : 40} fill={night ? "#f6f1df" : "#fff6dc"} />
      <path d="M1250 420 L1270 170 L1276 170 L1296 420 Z" fill={far} />
      <rect x="1271" y="120" width="4" height="52" fill={far} />
      <circle cx="1273" cy="118" r="3.5" fill="#ff3b30" />
      {far1.map(([x, top, w]) => (
        <rect key={`f${x}`} x={x} y={top} width={w} height={560 - top} fill={far} />
      ))}
      <rect width="1440" height="560" fill="url(#pv-haze)" />
      {near1.map(([x, top, w]) => (
        <g key={`n${x}`}>
          <rect x={x} y={top} width={w} height={560 - top} fill="url(#pv-near)" />
          <rect x={x} y={top} width={w} height="3" fill={night ? "#26305a" : "#8fa7b8"} />
          {Array.from({ length: Math.floor((560 - top) / 22) }, (_, r) =>
            Array.from({ length: Math.floor(w / 18) }, (_, c) =>
              (r * 7 + c * 3 + x) % 5 === 0 ? (
                <rect key={`${r}-${c}`} x={x + 5 + c * 18} y={top + 12 + r * 22} width="8" height="10" fill={lit} opacity={night ? 0.75 : 0.35} />
              ) : null,
            ),
          )}
        </g>
      ))}
      <path d="M0 505 C 300 490, 640 500, 900 495 S 1300 490, 1440 500 V560 H0 Z" fill={ground} />
    </svg>
  );
}
