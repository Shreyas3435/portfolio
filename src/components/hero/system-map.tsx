"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion, useMotionValue, useSpring, useTransform, type PanInfo } from "motion/react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(callback: () => void) {
  const mql = window.matchMedia(REDUCED_MOTION_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

function useIsReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );
}

interface Node {
  id: string;
  label: string;
  sub: string;
  x: number;
  y: number;
  targetId: string;
}

const nodes: Node[] = [
  { id: "ai", label: "AI", sub: "RAG · Search · Agents", x: 200, y: 46, targetId: "skills" },
  { id: "systems", label: "Systems", sub: "Backend · APIs · Data", x: 344, y: 268, targetId: "how-i-build" },
  { id: "security", label: "Security", sub: "ShadowPath · AppSec", x: 56, y: 268, targetId: "work" },
];

const center = { x: 200, y: 200 };
const TILT_LIMIT = 3;
const HINT_KEY = "systemMapHintSeen";

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function Particles({ node, active }: { node: Node; active: boolean }) {
  if (!active) return null;
  return (
    <>
      {[0, 1, 2].map((i) => (
        <motion.circle
          key={i}
          r={2.5}
          fill="var(--accent)"
          initial={{ cx: center.x, cy: center.y, opacity: 0 }}
          animate={{
            cx: [center.x, node.x],
            cy: [center.y, node.y],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 1.1,
            repeat: Infinity,
            ease: "linear",
            delay: i * 0.37,
          }}
        />
      ))}
    </>
  );
}

export function SystemMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const prefersReducedMotion = useIsReducedMotion();

  const mvX = useMotionValue(0);
  const mvY = useMotionValue(0);
  const springX = useSpring(mvX, { stiffness: 120, damping: 20 });
  const springY = useSpring(mvY, { stiffness: 120, damping: 20 });
  const rotateX = useTransform(springY, [-TILT_LIMIT, TILT_LIMIT], [10, -10]);
  const rotateY = useTransform(springX, [-TILT_LIMIT, TILT_LIMIT], [-10, 10]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.localStorage.getItem(HINT_KEY)) {
      const showTimer = setTimeout(() => setShowHint(true), 900);
      const hideTimer = setTimeout(() => dismissHint(), 6500);
      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      };
    }
  }, []);

  function dismissHint() {
    setShowHint(false);
    window.localStorage.setItem(HINT_KEY, "1");
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (prefersReducedMotion) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const relX = (e.clientX - rect.left) / rect.width - 0.5;
    const relY = (e.clientY - rect.top) / rect.height - 0.5;
    mvX.set(relX * 2);
    mvY.set(relY * 2);
  }

  function handlePointerLeave() {
    mvX.set(0);
    mvY.set(0);
  }

  function handleDrag(_: unknown, info: PanInfo) {
    if (prefersReducedMotion) return;
    if (showHint) dismissHint();
    mvX.set(clamp(mvX.get() + info.delta.x * 0.03, -TILT_LIMIT, TILT_LIMIT));
    mvY.set(clamp(mvY.get() + info.delta.y * 0.03, -TILT_LIMIT, TILT_LIMIT));
  }

  function handleDragEnd() {
    mvX.set(0);
    mvY.set(0);
  }

  return (
    <div className="relative mx-auto w-full max-w-md">
      <motion.div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        drag
        dragElastic={0.15}
        dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{ rotateX, rotateY }}
        className="relative aspect-square touch-none [perspective:1000px]"
      >
        <svg viewBox="0 0 400 400" className="h-full w-full overflow-visible">
          {nodes.map((n) => (
            <line
              key={n.id}
              x1={center.x}
              y1={center.y}
              x2={n.x}
              y2={n.y}
              stroke={hovered === n.id ? "var(--accent)" : "var(--border-strong)"}
              strokeWidth={1.5}
              className="transition-colors duration-300"
            />
          ))}
          {!prefersReducedMotion &&
            nodes.map((n) => <Particles key={n.id} node={n} active={hovered === n.id} />)}
        </svg>

        <button
          onClick={() => scrollToId("hero")}
          className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
          style={{ left: `${(center.x / 400) * 100}%`, top: `${(center.y / 400) * 100}%` }}
        >
          {!prefersReducedMotion && (
            <motion.span
              aria-hidden
              className="pointer-events-none absolute h-24 w-24 rounded-full bg-accent/20 blur-xl"
              animate={{ opacity: [0.3, 0.6, 0.3], scale: [0.9, 1.08, 0.9] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
          <span className="relative flex h-20 w-20 items-center justify-center rounded-full border border-border-strong bg-surface font-mono text-xs font-medium text-foreground shadow-[0_0_40px_rgba(77,163,255,0.12)]">
            SHREYAS
          </span>
        </button>

        {nodes.map((n, i) => (
          <button
            key={n.id}
            onMouseEnter={() => setHovered(n.id)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => {
              dismissHint();
              scrollToId(n.targetId);
            }}
            className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5"
            style={{ left: `${(n.x / 400) * 100}%`, top: `${(n.y / 400) * 100}%` }}
          >
            {!prefersReducedMotion && (
              <motion.span
                aria-hidden
                className="pointer-events-none absolute h-16 w-16 rounded-full bg-accent/10 blur-lg"
                animate={{ opacity: [0.2, 0.45, 0.2], scale: [0.85, 1.1, 0.85] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: i * 0.6 }}
              />
            )}
            <motion.span
              whileHover={{ scale: 1.08 }}
              className="relative flex h-16 w-16 items-center justify-center rounded-full border border-border bg-surface-2 text-xs font-medium text-foreground transition-colors group-hover:border-accent"
            >
              {n.label}
            </motion.span>
            <span className="max-w-[8rem] whitespace-nowrap font-mono text-[10px] text-muted-2">
              {n.sub}
            </span>
          </button>
        ))}
      </motion.div>

      {showHint && (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none absolute inset-x-0 bottom-2 text-center font-mono text-[11px] text-muted-2"
        >
          drag or click a node to explore
        </motion.p>
      )}
    </div>
  );
}
