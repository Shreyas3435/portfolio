"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, Copy, HelpCircle, LayoutList, Map as MapIcon, RotateCcw, X } from "lucide-react";
import { profile } from "@/data/profile";
import { getProjectBySlug, labProjects, secondaryProjects } from "@/data/projects";
import { cn } from "@/lib/utils";
import { SketchEngine } from "./engine";
import { PONDS, WORLD_H, WORLD_W, placeById, places, roads, type Place } from "./places";

const statusLabel: Record<string, string> = {
  shipped: "Shipped",
  "in-progress": "In progress",
  prototype: "Prototype",
  "learning-exercise": "Learning build",
};

export function SketchWorld() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SketchEngine | null>(null);
  const [ready, setReady] = useState(false);
  const [near, setNear] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [moved, setMoved] = useState(false);
  const [helpOpen, setHelpOpen] = useState(true);
  const [touch, setTouch] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setTouch(window.matchMedia("(pointer: coarse)").matches);
    const engine = new SketchEngine(
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
    engineRef.current?.setEnabled(!open && !mapOpen);
  }, [open, mapOpen]);

  // Let the hint linger a moment after the first drive, then tuck it away.
  useEffect(() => {
    if (!moved) return;
    const id = setTimeout(() => setHelpOpen(false), 7000);
    return () => clearTimeout(id);
  }, [moved]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
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
      } else if (k === "m") {
        setMapOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [near, open]);

  const travel = useCallback((id: string) => {
    engineRef.current?.travelTo(id);
    setMapOpen(false);
  }, []);

  const nearPlace = near ? placeById(near) : undefined;
  const openPlace = open ? placeById(open) : undefined;

  return (
    <div className="sketch-world fixed inset-0 overflow-hidden select-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
        style={{ cursor: "grab" }}
        aria-label="An interactive hand-drawn map of Shreyas Alva's work. Drive the little jeep to visit projects, or open the map to jump straight to one."
        role="img"
      />
      <div className="pointer-events-none absolute inset-0 sketch-vignette" />

      {/* Top bar */}
      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3 sm:p-5">
        <div className="pointer-events-auto sketch-chip px-3 py-1.5 sm:px-4 sm:py-2">
          <p className="font-hand text-2xl leading-none font-bold sm:text-3xl">{profile.name}</p>
          <p className="text-[11px] tracking-wide text-[var(--ink-soft)] sm:text-xs">{profile.role}</p>
        </div>
        <nav className="pointer-events-auto flex items-center gap-2">
          <button type="button" onClick={() => setMapOpen(true)} className="sketch-btn" aria-label="Open map">
            <MapIcon size={16} />
            <span className="hidden sm:inline">Map</span>
            {!touch && <kbd className="sketch-kbd hidden sm:inline">M</kbd>}
          </button>
          <button type="button" onClick={() => setHelpOpen((v) => !v)} className="sketch-btn" aria-label="How to play">
            <HelpCircle size={16} />
          </button>
          <Link href="/classic" className="sketch-btn" aria-label="Classic (non-interactive) site">
            <LayoutList size={16} />
            <span className="hidden sm:inline">Classic view</span>
          </Link>
        </nav>
      </header>

      {/* Controls hint */}
      <div
        className={cn(
          "pointer-events-none absolute bottom-3 left-3 max-w-[calc(100vw-1.5rem)] transition-all duration-500 sm:bottom-5 sm:left-5",
          helpOpen && ready && !open ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
          nearPlace && "max-sm:opacity-0",
        )}
      >
        <div className="sketch-card pointer-events-auto max-w-xs px-4 py-3 text-sm">
          <p className="font-hand text-2xl leading-none font-bold">Take it for a spin</p>
          {touch ? (
            <ul className="mt-2 space-y-1 text-[13px] text-[var(--ink-soft)]">
              <li>Hold and drag anywhere to drive toward your finger</li>
              <li>Tap a colourful place to open it</li>
              <li>Short on time? Hit the map up top</li>
            </ul>
          ) : (
            <ul className="mt-2 space-y-1 text-[13px] text-[var(--ink-soft)]">
              <li>
                <kbd className="sketch-kbd">W</kbd>
                <kbd className="sketch-kbd">A</kbd>
                <kbd className="sketch-kbd">S</kbd>
                <kbd className="sketch-kbd">D</kbd> or arrows to drive, or click &amp; hold
              </li>
              <li>
                <kbd className="sketch-kbd">Space</kbd> drift · <kbd className="sketch-kbd">E</kbd> open ·{" "}
                <kbd className="sketch-kbd">R</kbd> reset
              </li>
              <li>Everything in colour is something I built</li>
            </ul>
          )}
        </div>
      </div>

      {/* Nearby card */}
      {nearPlace && !open && ready && <NearCard place={nearPlace} touch={touch} onOpen={() => setOpen(nearPlace.id)} />}

      {/* Detail panel */}
      {openPlace && <DetailPanel place={openPlace} onClose={() => setOpen(null)} />}

      {/* Map */}
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

      {/* Loading */}
      <div
        className={cn(
          "absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[var(--paper)] transition-opacity duration-700",
          ready ? "pointer-events-none opacity-0" : "opacity-100",
        )}
        aria-hidden={ready}
      >
        <svg width="160" height="60" viewBox="0 0 160 60" className="sketch-loader" aria-hidden>
          <path d="M8 40 C 30 10, 50 55, 72 28 S 112 10, 128 36 S 150 44, 154 22" />
        </svg>
        <p className="font-hand text-3xl font-bold">sharpening pencils…</p>
      </div>
    </div>
  );
}

function Tape({ color, className }: { color: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 -rotate-2 opacity-80", className)}
      style={{ background: color, mixBlendMode: "multiply" }}
    />
  );
}

function NearCard({ place, touch, onOpen }: { place: Place; touch: boolean; onOpen: () => void }) {
  const isSocial = place.kind === "social";
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-6">
      <div className="sketch-card sketch-pop pointer-events-auto relative w-full max-w-md px-5 pt-5 pb-4">
        <Tape color={place.color} />
        <p className="font-hand text-[2rem] leading-none font-bold" style={{ color: place.ink }}>
          {place.title}
        </p>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">{place.subtitle}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {isSocial && place.href ? (
            <a
              href={place.href}
              target={place.href.startsWith("http") ? "_blank" : undefined}
              rel="noreferrer noopener"
              className="sketch-btn sketch-btn-solid"
              style={{ background: place.color }}
            >
              {place.hrefLabel}
              <ArrowUpRight size={16} />
            </a>
          ) : (
            <button type="button" onClick={onOpen} className="sketch-btn sketch-btn-solid" style={{ background: place.color }}>
              {place.kind === "project" ? "See the build" : "Take a look"}
              <ArrowRight size={16} />
            </button>
          )}
          {place.id === "email" && <CopyEmail />}
          {!touch && !isSocial && (
            <span className="text-xs text-[var(--ink-soft)]">
              or press <kbd className="sketch-kbd">E</kbd>
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
      className="sketch-btn"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(profile.email);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          // Clipboard may be unavailable (e.g. insecure context) — the mailto button still works.
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
    <div className="absolute inset-0 flex items-end justify-center sm:items-stretch sm:justify-end" role="dialog" aria-modal="true" aria-label={place.title}>
      <button type="button" aria-label="Close" className="absolute inset-0 cursor-default bg-[rgba(40,36,30,0.18)]" onClick={onClose} />
      <article className="sketch-card sketch-slide relative m-2 flex max-h-[82vh] w-full flex-col sm:m-5 sm:max-h-none sm:w-[440px]">
        <Tape color={place.color} className="left-16 w-28" />
        <button ref={closeRef} type="button" onClick={onClose} className="sketch-btn absolute top-3 right-3 z-10 !px-2" aria-label="Close panel">
          <X size={16} />
        </button>
        <div className="overflow-y-auto overscroll-contain px-5 pt-7 pb-6 sm:px-7">
          {place.kind === "project" && <ProjectDetail place={place} />}
          {place.kind === "workshop" && <WorkshopDetail place={place} />}
          {place.kind === "about" && <AboutDetail place={place} />}
          {place.kind === "social" && <SocialDetail place={place} />}
        </div>
      </article>
    </div>
  );
}

function Heading({ place, eyebrow }: { place: Place; eyebrow: string }) {
  return (
    <>
      <p className="text-[11px] font-semibold tracking-[0.14em] text-[var(--ink-soft)] uppercase">{eyebrow}</p>
      <h2 className="font-hand mt-1 text-[2.6rem] leading-[0.95] font-bold" style={{ color: place.ink }}>
        {place.title}
      </h2>
      <svg viewBox="0 0 200 10" preserveAspectRatio="none" className="mt-1 h-2.5 w-40" aria-hidden>
        <path d="M2 6 C 50 2, 120 9, 198 4" stroke={place.color} strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.7" />
      </svg>
    </>
  );
}

function Section({ title, children, color }: { title: string; children: React.ReactNode; color: string }) {
  return (
    <section className="mt-5">
      <h3 className="font-hand text-2xl leading-none font-bold">
        <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: color }} />
        {title}
      </h3>
      <div className="mt-2 text-[14px] leading-relaxed text-[var(--ink)]">{children}</div>
    </section>
  );
}

function Tags({ tags, color }: { tags: readonly string[]; color: string }) {
  return (
    <ul className="mt-4 flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <li key={t} className="sketch-tag" style={{ ["--tag" as string]: color }}>
          {t}
        </li>
      ))}
    </ul>
  );
}

function ExtLink({ href, children, color }: { href: string; children: React.ReactNode; color?: string }) {
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel="noreferrer noopener"
      className={cn("sketch-btn", color && "sketch-btn-solid")}
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
      <Tags tags={project.tags} color={place.color} />
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
                  <span
                    className="font-hand mt-[-2px] flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
                    style={{ background: place.color }}
                  >
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
      {project.note && <p className="mt-5 border-l-2 pl-3 text-[13px] text-[var(--ink-soft)] italic" style={{ borderColor: place.color }}>{project.note}</p>}
      <div className="mt-6 flex flex-wrap gap-2">
        {project.liveUrl && (
          <ExtLink href={project.liveUrl} color={place.color}>
            Live app
          </ExtLink>
        )}
        {project.repoUrl && <ExtLink href={project.repoUrl}>Code</ExtLink>}
        <Link href={`/work/${project.slug}`} className="sketch-btn">
          Full case study
          <ArrowRight size={15} />
        </Link>
      </div>
    </>
  );
}

function WorkshopDetail({ place }: { place: Place }) {
  const noteColors = ["#ffd166", "#ff8fc7", "#8ec5ff", "#7fdba6", "#ffab70", "#c6a7ff"];
  return (
    <>
      <Heading place={place} eyebrow="More engineering" />
      <p className="mt-3 text-[14px] leading-relaxed">
        Smaller builds, spikes and experiments — the stuff on the pinboard. Each one taught me something the flagship
        projects needed.
      </p>
      <ul className="mt-5 grid gap-3">
        {secondaryProjects.map((p, i) => (
          <li key={p.id} className="sketch-note" style={{ background: noteColors[i % noteColors.length], rotate: `${(i % 2 ? 1 : -1) * 0.6}deg` }}>
            <div className="flex items-start justify-between gap-2">
              <p className="font-hand text-[1.6rem] leading-none font-bold">{p.name}</p>
              {p.repoUrl && (
                <a href={p.repoUrl} target="_blank" rel="noreferrer noopener" className="shrink-0 p-1" aria-label={`${p.name} on GitHub`}>
                  <ArrowUpRight size={16} />
                </a>
              )}
            </div>
            <p className="mt-1 text-[13px] leading-snug">{p.description}</p>
            <p className="mt-2 text-[11px] font-semibold tracking-wide opacity-70">{p.tags.join(" · ")}</p>
          </li>
        ))}
      </ul>
      <Section title="Security lab" color={place.color}>
        <p className="text-[13px] text-[var(--ink-soft)]">Fundamentals I worked through by hand.</p>
        <ul className="mt-2 divide-y divide-dashed divide-[var(--ink-faint)]">
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
      <p className="font-hand mt-3 text-[1.7rem] leading-tight font-bold">{profile.heroLine}</p>
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
        <ul className="list-disc space-y-1 pl-5 marker:text-[var(--ink-soft)]">
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
        <ExtLink href={profile.github}>GitHub</ExtLink>
      </div>
    </>
  );
}

function SocialDetail({ place }: { place: Place }) {
  return (
    <>
      <Heading place={place} eyebrow="Find me" />
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
  const landmarks = places.filter((p) => p.kind !== "social");
  const socials = places.filter((p) => p.kind === "social");
  return (
    <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-8" role="dialog" aria-modal="true" aria-label="Map">
      <button type="button" aria-label="Close map" className="absolute inset-0 cursor-default bg-[rgba(40,36,30,0.25)]" onClick={onClose} />
      <div className="sketch-card sketch-pop relative w-full max-w-3xl p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-hand text-4xl leading-none font-bold">The map</h2>
          <div className="flex gap-2">
            <button type="button" className="sketch-btn" onClick={onReset}>
              <RotateCcw size={15} />
              <span className="hidden sm:inline">Back to start</span>
            </button>
            <button type="button" className="sketch-btn !px-2" onClick={onClose} aria-label="Close map">
              <X size={16} />
            </button>
          </div>
        </div>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">Tap a place to jump straight there.</p>

        <div className="relative mt-4 w-full overflow-hidden rounded-[6px] border-2 border-dashed border-[var(--ink-faint)] bg-[var(--paper)]" style={{ aspectRatio: `${WORLD_W} / ${WORLD_H}` }}>
          <svg viewBox={`0 0 ${WORLD_W} ${WORLD_H}`} className="absolute inset-0 h-full w-full" aria-hidden>
            {roads.map((r) => (
              <path
                key={r.to}
                d={`M${r.pts[0].join(" ")} C${r.pts[1].join(" ")} ${r.pts[2].join(" ")} ${r.pts[3].join(" ")}`}
                stroke="#c9bfa9"
                strokeWidth="30"
                fill="none"
                strokeLinecap="round"
              />
            ))}
            {PONDS.map((p) => (
              <ellipse key={p.x} cx={p.x} cy={p.y} rx={p.rx} ry={p.ry} fill="#e3e6e3" stroke="#9a9a9f" strokeWidth="6" />
            ))}
          </svg>
          {places.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onTravel(p.id)}
              className="group absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${(p.x / WORLD_W) * 100}%`, top: `${((p.y - (p.kind === "social" ? 60 : 120)) / WORLD_H) * 100}%` }}
              aria-label={`Go to ${p.title}`}
            >
              <span
                className={cn(
                  "block rounded-full border-2 border-[var(--ink)] transition-transform group-hover:scale-125",
                  p.kind === "social" ? "h-3 w-3 sm:h-4 sm:w-4" : "h-5 w-5 sm:h-7 sm:w-7",
                )}
                style={{ background: p.color }}
              />
              {p.kind !== "social" && (
                <span className="font-hand absolute top-full left-1/2 mt-0.5 hidden -translate-x-1/2 text-lg leading-none font-bold whitespace-nowrap sm:block" style={{ color: p.ink }}>
                  {p.title}
                </span>
              )}
            </button>
          ))}
          <span
            className="pointer-events-none absolute h-0 w-0 transition-[left,top] duration-200"
            style={{ left: `${car.x * 100}%`, top: `${car.y * 100}%` }}
            aria-hidden
          >
            <span className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ff6b4a] p-1 ring-2 ring-[var(--ink)]">
              <span className="block h-2 w-2" />
            </span>
            <span className="font-hand absolute top-2 left-2 text-base font-bold whitespace-nowrap">you</span>
          </span>
        </div>

        <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {landmarks.map((p, i) => (
            <li key={p.id}>
              <button ref={i === 0 ? firstRef : undefined} type="button" onClick={() => onTravel(p.id)} className="sketch-btn w-full !justify-start text-left">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: p.color }} />
                <span className="truncate">{p.title}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-hand text-xl font-bold">Socials:</span>
          {socials.map((p) => (
            <a
              key={p.id}
              href={p.href}
              target={p.href?.startsWith("http") ? "_blank" : undefined}
              rel="noreferrer noopener"
              className="sketch-btn !py-1"
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
              {p.title}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
