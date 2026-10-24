"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, Compass, Copy, HelpCircle, Map as MapIcon, Moon, RotateCcw, ScrollText, Sun, X } from "lucide-react";
import { profile } from "@/data/profile";
import { getProjectBySlug, labProjects, secondaryProjects } from "@/data/projects";
import { skills } from "@/data/skills";
import { cn } from "@/lib/utils";
import { WorldEngine } from "./engine";
import { PageView } from "./page-view";
import { PONDS, WORLD_H, WORLD_W, districtById, districts, placeById, places, roads, type Place } from "./places";

type View = "world" | "page";

const noopSubscribe = () => () => {};
const urlView = (): View => (new URLSearchParams(window.location.search).get("view") === "page" ? "page" : "world");
const isTouch = () => window.matchMedia("(pointer: coarse)").matches;
const MODE_KEY = "world-mode";
/** Saved preference, otherwise follow the visitor's clock. */
const prefersNight = () => {
  try {
    const saved = localStorage.getItem(MODE_KEY);
    if (saved) return saved === "night";
  } catch {
    // Storage can be unavailable (private mode); fall back to the clock.
  }
  const h = new Date().getHours();
  return h >= 19 || h < 6;
};

const statusLabel: Record<string, string> = {
  shipped: "Shipped",
  "in-progress": "In progress",
  prototype: "Prototype",
  "learning-exercise": "Learning build",
};

export function PortfolioWorld() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<WorldEngine | null>(null);
  const [ready, setReady] = useState(false);
  const [near, setNear] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [moved, setMoved] = useState(false);
  const [helpOpen, setHelpOpen] = useState(true);
  const touch = useSyncExternalStore(noopSubscribe, isTouch, () => false);
  const initialView = useSyncExternalStore(noopSubscribe, urlView, () => "world" as View);
  const [chosenView, setView] = useState<View | null>(null);
  const view = chosenView ?? initialView;
  const initialNight = useSyncExternalStore(noopSubscribe, prefersNight, () => false);
  const [chosenNight, setNight] = useState<boolean | null>(null);
  const night = chosenNight ?? initialNight;
  const [pageClosing, setPageClosing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new WorldEngine(
      canvas,
      {
        onNear: setNear,
        onOpen: setOpen,
        onReady: () => setReady(true),
        onMoved: () => setMoved(true),
      },
      { reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches },
    );
    engineRef.current = engine;
    return () => engine.destroy();
  }, []);

  useEffect(() => {
    engineRef.current?.setNight(night);
  }, [night, ready]);

  const toggleNight = useCallback(() => {
    setNight(!night);
    try {
      localStorage.setItem(MODE_KEY, night ? "day" : "night");
    } catch {
      // Not persisted; fine.
    }
  }, [night]);

  const pageShown = view === "page" && !pageClosing;
  useEffect(() => {
    engineRef.current?.setEnabled(!open && !mapOpen && view === "world");
  }, [open, mapOpen, view]);
  useEffect(() => {
    // Nothing to animate behind an opaque page: stop the loop to save battery.
    if (!pageShown) {
      engineRef.current?.setPaused(false);
      return;
    }
    const id = setTimeout(() => engineRef.current?.setPaused(true), 900);
    return () => clearTimeout(id);
  }, [pageShown]);

  const switchView = useCallback((next: View) => {
    const url = new URL(window.location.href);
    if (next === "page") url.searchParams.set("view", "page");
    else url.searchParams.delete("view");
    window.history.replaceState(null, "", url);
    setOpen(null);
    setMapOpen(false);
    if (next === "page") {
      setPageClosing(false);
      setView("page");
    } else {
      // Roll the page back up before revealing the world.
      setPageClosing(true);
      setTimeout(() => {
        setView("world");
        setPageClosing(false);
      }, 650);
    }
  }, []);

  useEffect(() => {
    if (!moved) return;
    const id = setTimeout(() => setHelpOpen(false), 7000);
    return () => clearTimeout(id);
  }, [moved]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (view !== "world") return;
      const k = e.key.toLowerCase();
      if (k === "escape") {
        setOpen(null);
        setMapOpen(false);
        return;
      }
      if (open) return;
      if ((k === "e" || (k === "enter" && !target?.closest("button, a"))) && near) {
        e.preventDefault();
        setOpen(near);
      } else if (k === "m") setMapOpen((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [near, open, view]);

  const travel = useCallback((id: string) => {
    engineRef.current?.travelTo(id);
    setMapOpen(false);
  }, []);

  const nearPlace = near ? placeById(near) : undefined;
  const openPlace = open ? placeById(open) : undefined;
  const inWorld = view === "world";

  return (
    <div className="world-root fixed inset-0 overflow-hidden select-none" data-mode={night ? "night" : "day"}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
        style={{ cursor: "grab" }}
        aria-label="A painted, drivable world of Shreyas Alva's work. Drive the jeep to visit projects, or switch to the page view."
        role="img"
      />
      <div className="world-light pointer-events-none absolute inset-0" />

      {/* Top bar */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-2 p-3 sm:p-5">
        <div className={cn("wv-card pointer-events-auto hidden px-4 py-2 sm:block", !inWorld && "sm:hidden")}>
          <p className="font-display text-lg leading-none font-semibold sm:text-xl">{profile.name}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--ink-soft)] sm:text-xs">
            <span className="pv-dot" /> Open to work
          </p>
        </div>
        <div className="pointer-events-auto ml-auto flex items-center gap-2">
          <div className="wv-toggle" role="group" aria-label="Choose view">
            <button type="button" aria-pressed={inWorld} onClick={() => !inWorld && switchView("world")}>
              <Compass size={15} /> World
            </button>
            <button type="button" aria-pressed={!inWorld} onClick={() => inWorld && switchView("page")}>
              <ScrollText size={15} /> Page
            </button>
          </div>
          <button type="button" onClick={toggleNight} className="wv-btn wv-icon" aria-label={night ? "Switch to day" : "Switch to night"} title={night ? "Day mode" : "Night mode"}>
            {night ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {inWorld && (
            <>
              <button type="button" onClick={() => setMapOpen(true)} className="wv-btn wv-icon" aria-label="Open map">
                <MapIcon size={16} />
                <span className="hidden md:inline">Map</span>
              </button>
              <button type="button" onClick={() => setHelpOpen((v) => !v)} className="wv-btn wv-icon hidden sm:inline-flex" aria-label="How to play">
                <HelpCircle size={16} />
              </button>
            </>
          )}
        </div>
      </header>

      {inWorld && (
        <>
          <div
            className={cn(
              "pointer-events-none absolute bottom-3 left-3 z-20 max-w-[calc(100vw-1.5rem)] transition-all duration-500 sm:bottom-5 sm:left-5",
              helpOpen && ready && !open ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
              nearPlace && "max-sm:opacity-0",
            )}
          >
            <div className="wv-card pointer-events-auto max-w-xs px-4 py-3 text-sm">
              <p className="font-display text-xl leading-tight font-bold">Take the jeep for a spin</p>
              {touch ? (
                <ul className="mt-1.5 space-y-1 text-[13px] text-[var(--ink-soft)]">
                  <li>Hold and drag to drive toward your finger</li>
                  <li>Tap any building to open it</li>
                  <li>Smash things — they rebuild themselves</li>
                </ul>
              ) : (
                <ul className="mt-1.5 space-y-1 text-[13px] text-[var(--ink-soft)]">
                  <li>
                    <kbd className="wv-kbd">W</kbd>
                    <kbd className="wv-kbd">A</kbd>
                    <kbd className="wv-kbd">S</kbd>
                    <kbd className="wv-kbd">D</kbd> or arrows · or click &amp; hold
                  </li>
                  <li>
                    <kbd className="wv-kbd">Space</kbd> drift · <kbd className="wv-kbd">E</kbd> enter · <kbd className="wv-kbd">H</kbd> honk · <kbd className="wv-kbd">M</kbd> map
                  </li>
                  <li>Smash anything — it rebuilds itself</li>
                </ul>
              )}
              <button type="button" onClick={() => switchView("page")} className="mt-2 text-[13px] font-semibold underline-offset-4 hover:underline">
                Prefer to just read? Open the page view →
              </button>
            </div>
          </div>

          {nearPlace && !open && ready && <NearCard place={nearPlace} touch={touch} onOpen={() => setOpen(nearPlace.id)} />}
          {openPlace && <DetailPanel place={openPlace} onClose={() => setOpen(null)} />}
          {mapOpen && (
            <MapOverlay
              onClose={() => setMapOpen(false)}
              onTravel={travel}
              getCar={() => engineRef.current?.carOnMap() ?? { x: 0.5, y: 0.5, a: 0 }}
              onReset={() => {
                engineRef.current?.resetCar();
                setMapOpen(false);
              }}
            />
          )}
        </>
      )}

      {view === "page" && <PageView closing={pageClosing} night={night} onExplore={() => switchView("world")} />}

      <div
        className={cn(
          "world-loading absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 transition-opacity duration-700",
          ready || view === "page" ? "pointer-events-none opacity-0" : "opacity-100",
        )}
        aria-hidden={ready}
      >
        <div className="world-loader" aria-hidden />
        <p className="font-display text-2xl font-bold text-white/90">Loading the city…</p>
      </div>
    </div>
  );
}

function NearCard({ place, touch, onOpen }: { place: Place; touch: boolean; onOpen: () => void }) {
  const isSocial = place.kind === "social";
  const district = districtById(place.district);
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-6">
      <div className="wv-card wv-pop pointer-events-auto relative w-full max-w-md overflow-hidden px-5 pt-4 pb-4">
        <span className="absolute inset-x-0 top-0 h-1.5" style={{ background: place.color }} aria-hidden />
        <p className="text-[11px] font-semibold tracking-[0.14em] uppercase" style={{ color: district.color }}>
          {district.name}
        </p>
        <p className="font-display mt-0.5 text-2xl leading-tight font-semibold" style={{ color: place.ink }}>
          {place.title}
        </p>
        <p className="mt-0.5 text-sm text-[var(--ink-soft)]">{place.subtitle}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {isSocial && place.href ? (
            <a
              href={place.href}
              target={place.href.startsWith("http") ? "_blank" : undefined}
              rel="noreferrer noopener"
              className="wv-btn wv-btn-solid"
              style={{ background: place.color }}
            >
              {place.hrefLabel} <ArrowUpRight size={16} />
            </a>
          ) : (
            <button type="button" onClick={onOpen} className="wv-btn wv-btn-solid" style={{ background: place.color }}>
              Step inside <ArrowRight size={16} />
            </button>
          )}
          {place.id === "email" && <CopyEmail />}
          {!touch && !isSocial && (
            <span className="text-xs text-[var(--ink-soft)]">
              or press <kbd className="wv-kbd">E</kbd>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function CopyEmail() {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="wv-btn"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(profile.email);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          // Clipboard can be unavailable (e.g. insecure context); the mailto button still works.
        }
      }}
    >
      {copied ? <Check size={16} /> : <Copy size={16} />}
      {copied ? "Copied" : "Copy address"}
    </button>
  );
}

function DetailPanel({ place, onClose }: { place: Place; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), [place.id]);
  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center sm:items-stretch sm:justify-end" role="dialog" aria-modal="true" aria-label={place.title}>
      <button type="button" aria-label="Close" className="absolute inset-0 cursor-default bg-[rgba(30,40,35,0.25)]" onClick={onClose} />
      <article className="wv-card wv-slide relative m-2 flex max-h-[84vh] w-full flex-col overflow-hidden sm:m-5 sm:max-h-none sm:w-[460px]">
        <div className="wv-panel-head" style={{ ["--c" as string]: place.color }} />
        <button ref={closeRef} type="button" onClick={onClose} className="wv-btn wv-icon absolute top-3 right-3 z-10" aria-label="Close panel">
          <X size={16} />
        </button>
        <div className="relative overflow-y-auto overscroll-contain px-5 pt-6 pb-6 sm:px-7">
          {place.kind === "project" && <ProjectDetail place={place} />}
          {place.kind === "workshop" && <WorkshopDetail place={place} />}
          {place.kind === "about" && <AboutDetail place={place} />}
          {place.kind === "skills" && <SkillsDetail place={place} />}
          {place.kind === "social" && <SocialDetail place={place} />}
        </div>
      </article>
    </div>
  );
}

function Heading({ place, eyebrow }: { place: Place; eyebrow: string }) {
  return (
    <>
      <p className="text-[11px] font-semibold tracking-[0.16em] text-[var(--ink-soft)] uppercase">{eyebrow}</p>
      <h2 className="font-display mt-1 text-[2.2rem] leading-[1.02] font-semibold" style={{ color: place.ink }}>
        {place.title}
      </h2>
      <span className="mt-2 block h-1 w-14 rounded-full" style={{ background: place.color }} />
    </>
  );
}

function Section({ title, children, color }: { title: string; children: React.ReactNode; color: string }) {
  return (
    <section className="mt-5">
      <h3 className="font-display flex items-center gap-2 text-lg font-semibold">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
        {title}
      </h3>
      <div className="mt-1.5 text-[14px] leading-relaxed">{children}</div>
    </section>
  );
}

function ExtLink({ href, children, color }: { href: string; children: React.ReactNode; color?: string }) {
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel="noreferrer noopener"
      className={cn("wv-btn", color && "wv-btn-solid")}
      style={color ? { background: color } : undefined}
    >
      {children}
      <ArrowUpRight size={15} />
    </a>
  );
}

function ProjectDetail({ place }: { place: Place }) {
  const project = getProjectBySlug(place.projectSlug!);
  if (!project) return null;
  const cs = project.caseStudy;
  return (
    <>
      <Heading place={place} eyebrow={project.category} />
      <p className="mt-3 text-[15px] font-medium">{project.tagline}</p>
      <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-[var(--ink-soft)]">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: place.color }} />
        {statusLabel[project.status]}
      </p>
      <p className="mt-3 text-[14px] leading-relaxed">{project.description}</p>
      <ul className="mt-4 flex flex-wrap gap-1.5">
        {project.tags.map((t) => (
          <li key={t} className="wv-tag" style={{ ["--tag" as string]: place.color }}>
            {t}
          </li>
        ))}
      </ul>
      {cs && (
        <>
          <Section title="The problem" color={place.color}>
            <p>{cs.problem[0]}</p>
          </Section>
          <Section title="How it's built" color={place.color}>
            <p>{cs.architecture.summary}</p>
            <ol className="mt-3 space-y-2">
              {cs.architecture.layers.map((l, i) => (
                <li key={l} className="flex gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: place.color }}>
                    {i + 1}
                  </span>
                  <span>{l}</span>
                </li>
              ))}
            </ol>
          </Section>
          <Section title="What I learned" color={place.color}>
            <p>{cs.learned[0]}</p>
          </Section>
        </>
      )}
      {project.note && (
        <p className="mt-5 border-l-2 pl-3 text-[13px] text-[var(--ink-soft)] italic" style={{ borderColor: place.color }}>
          {project.note}
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-2">
        {project.liveUrl && (
          <ExtLink href={project.liveUrl} color={place.color}>
            Live app
          </ExtLink>
        )}
        {project.repoUrl && <ExtLink href={project.repoUrl}>Code</ExtLink>}
        <Link href={`/work/${project.slug}`} className="wv-btn">
          Full case study <ArrowRight size={15} />
        </Link>
      </div>
    </>
  );
}

function WorkshopDetail({ place }: { place: Place }) {
  const notes = ["#f3e7c4", "#dbe6ee", "#dbe9d6", "#f2dcc6", "#e4e1d8", "#e9e3c6"];
  return (
    <>
      <Heading place={place} eyebrow="More engineering" />
      <p className="mt-3 text-[14px] leading-relaxed">Smaller builds, spikes and experiments — each one taught me something the flagship projects needed.</p>
      <ul className="mt-5 grid gap-3">
        {secondaryProjects.map((p, i) => (
          <li key={p.id} className="pv-note" style={{ background: notes[i % notes.length] }}>
            <div className="flex items-start justify-between gap-2">
              <p className="font-display text-lg leading-tight font-semibold">{p.name}</p>
              {p.repoUrl && (
                <a href={p.repoUrl} target="_blank" rel="noreferrer noopener" className="shrink-0 p-1" aria-label={`${p.name} on GitHub`}>
                  <ArrowUpRight size={16} />
                </a>
              )}
            </div>
            <p className="mt-1 text-[13px] leading-snug">{p.description}</p>
            <p className="mt-2 text-[11px] font-semibold opacity-70">{p.tags.join(" · ")}</p>
          </li>
        ))}
      </ul>
      <Section title="Security lab" color={place.color}>
        <ul className="divide-y divide-dashed divide-[var(--ink-faint)]">
          {labProjects.map((p) => (
            <li key={p.id}>
              <a href={p.repoUrl} target="_blank" rel="noreferrer noopener" className="flex items-baseline justify-between gap-3 py-2 hover:opacity-70">
                <span>
                  <span className="font-medium">{p.name}</span>
                  <span className="block text-[12px] text-[var(--ink-soft)]">{p.tagline}</span>
                </span>
                <ArrowUpRight size={14} className="shrink-0" />
              </a>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}

function AboutDetail({ place }: { place: Place }) {
  return (
    <>
      <Heading place={place} eyebrow={profile.status} />
      <p className="font-display mt-3 text-xl leading-snug font-medium italic">{profile.heroLine}</p>
      <p className="mt-3 text-[14px] leading-relaxed">{profile.heroSupport}</p>
      <Section title="Where I've worked" color={place.color}>
        <ul className="space-y-1.5">
          {profile.experiences.map((x) => (
            <li key={x.org}>
              <span className="font-medium">{x.title}</span> · {x.org}
              {x.period && <span className="text-[var(--ink-soft)]"> · {x.period}</span>}
            </li>
          ))}
          <li>
            <span className="font-medium">{profile.education.degree}</span> · {profile.education.institution}
          </li>
        </ul>
      </Section>
      <Section title="Building right now" color={place.color}>
        <ul className="list-disc space-y-1 pl-5">
          {profile.currentlyBuilding.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </Section>
      <Section title="How I work" color={place.color}>
        <ul className="space-y-2">
          {profile.principles.slice(0, 4).map((p) => (
            <li key={p.title}>
              <span className="font-medium">{p.title}.</span> <span className="text-[var(--ink-soft)]">{p.body}</span>
            </li>
          ))}
        </ul>
      </Section>
      <div className="mt-6 flex flex-wrap gap-2">
        <ExtLink href={`mailto:${profile.email}`} color={place.color}>
          Say hello
        </ExtLink>
        <ExtLink href={profile.resumeUrl}>Résumé</ExtLink>
        <ExtLink href={profile.linkedin}>LinkedIn</ExtLink>
      </div>
    </>
  );
}

function SkillsDetail({ place }: { place: Place }) {
  const cats = [
    ["ai", "AI & Search", "#00bfa5"],
    ["fullstack", "Full-Stack", "#3e8bff"],
    ["security", "Security", "#e5484d"],
    ["systems", "Systems & Data", "#2f9e62"],
  ] as const;
  const dots = { core: 4, strong: 3, working: 2, exploring: 1 } as const;
  return (
    <>
      <Heading place={place} eyebrow="Home" />
      <p className="mt-3 text-[14px] leading-relaxed">Each lantern on the tree is a branch of what I do. Full dots are where I&apos;m strongest; the rest are growing.</p>
      {cats.map(([id, label, color]) => (
        <Section key={id} title={label} color={color}>
          <ul className="space-y-2.5">
            {skills
              .filter((s) => s.category === id)
              .map((s) => (
                <li key={s.id}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{s.name}</span>
                    <span className="flex gap-1" aria-label={s.level}>
                      {[0, 1, 2, 3].map((i) => (
                        <span key={i} className="h-2 w-2 rounded-full" style={{ background: i < dots[s.level] ? color : "var(--ink-faint)" }} />
                      ))}
                    </span>
                  </div>
                  <p className="text-[12.5px] leading-snug text-[var(--ink-soft)]">{s.blurb}</p>
                </li>
              ))}
          </ul>
        </Section>
      ))}
    </>
  );
}

function SocialDetail({ place }: { place: Place }) {
  return (
    <>
      <Heading place={place} eyebrow="Connections" />
      <p className="mt-3 text-[15px]">{place.subtitle}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {place.href && (
          <ExtLink href={place.href} color={place.color}>
            {place.hrefLabel}
          </ExtLink>
        )}
        {place.id === "email" && <CopyEmail />}
      </div>
    </>
  );
}

function MapOverlay({
  onClose,
  onTravel,
  getCar,
  onReset,
}: {
  onClose: () => void;
  onTravel: (id: string) => void;
  getCar: () => { x: number; y: number; a: number };
  onReset: () => void;
}) {
  const [car, setCar] = useState(getCar);
  const firstRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    firstRef.current?.focus();
    const id = setInterval(() => setCar(getCar()), 250);
    return () => clearInterval(id);
  }, [getCar]);
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-3 sm:p-8" role="dialog" aria-modal="true" aria-label="Map">
      <button type="button" aria-label="Close map" className="absolute inset-0 cursor-default bg-[rgba(30,40,35,0.3)]" onClick={onClose} />
      <div className="wv-card wv-pop relative max-h-[92vh] w-full max-w-3xl overflow-y-auto p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-3xl leading-none font-semibold">The map</h2>
          <div className="flex gap-2">
            <button type="button" className="wv-btn" onClick={onReset}>
              <RotateCcw size={15} />
              <span className="hidden sm:inline">Back to start</span>
            </button>
            <button type="button" className="wv-btn wv-icon" onClick={onClose} aria-label="Close map">
              <X size={16} />
            </button>
          </div>
        </div>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">Tap a place to jump straight there.</p>

        <div className="wv-minimap relative mt-4 w-full overflow-hidden rounded-2xl" style={{ aspectRatio: `${WORLD_W} / ${WORLD_H}` }}>
          <svg viewBox={`0 0 ${WORLD_W} ${WORLD_H}`} className="absolute inset-0 h-full w-full" aria-hidden>
            {districts.map((d) => (
              <ellipse key={d.id} cx={d.court.x} cy={d.court.y} rx={d.court.rx} ry={d.court.ry} fill={d.color} opacity="0.18" />
            ))}
            {roads.map((r, i) => (
              <path key={i} d={`M${r[0].join(" ")} C${r[1].join(" ")} ${r[2].join(" ")} ${r[3].join(" ")}`} stroke="#e6cc9c" strokeWidth="34" fill="none" strokeLinecap="round" />
            ))}
            {PONDS.map((p) => (
              <ellipse key={p.x} cx={p.x} cy={p.y} rx={p.rx} ry={p.ry} fill="#4fa8c7" opacity="0.8" />
            ))}
            {districts.map((d) => (
              <text key={d.id} x={d.court.x} y={d.court.y + d.court.ry + 90} textAnchor="middle" className="font-display" fontSize="86" fontWeight="700" fill={d.color}>
                {d.name}
              </text>
            ))}
          </svg>
          {places.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onTravel(p.id)}
              className="group absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${(p.x / WORLD_W) * 100}%`, top: `${((p.y - 60) / WORLD_H) * 100}%` }}
              aria-label={`Go to ${p.title}`}
              title={p.title}
            >
              <span className="block h-4 w-4 rounded-full border-2 border-white shadow-md transition-transform group-hover:scale-125 sm:h-5 sm:w-5" style={{ background: p.color }} />
            </button>
          ))}
          <span className="pointer-events-none absolute h-0 w-0 transition-[left,top] duration-200" style={{ left: `${car.x * 100}%`, top: `${car.y * 100}%` }} aria-hidden>
            <span className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f26b4a] p-1.5 ring-2 ring-white">
              <span className="block h-1.5 w-1.5" />
            </span>
          </span>
        </div>

        {districts.map((d, di) => {
          const list = places.filter((p) => p.district === d.id);
          if (!list.length) return null;
          return (
            <div key={d.id} className="mt-4">
              <p className="text-[11px] font-semibold tracking-[0.14em] uppercase" style={{ color: d.color }}>
                {d.name} · <span className="normal-case tracking-normal text-[var(--ink-soft)]">{d.blurb}</span>
              </p>
              <ul className="mt-1.5 flex flex-wrap gap-2">
                {list.map((p, i) => (
                  <li key={p.id}>
                    <button ref={di === 0 && i === 0 ? firstRef : undefined} type="button" onClick={() => onTravel(p.id)} className="wv-btn">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.color }} />
                      {p.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
