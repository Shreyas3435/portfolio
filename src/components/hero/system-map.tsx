"use client";

import { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";

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

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function SystemMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const mvX = useMotionValue(0);
  const mvY = useMotionValue(0);
  const springX = useSpring(mvX, { stiffness: 120, damping: 20 });
  const springY = useSpring(mvY, { stiffness: 120, damping: 20 });
  const rotateX = useTransform(springY, [-1, 1], [4, -4]);
  const rotateY = useTransform(springX, [-1, 1], [-4, 4]);

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
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

  return (
    <motion.div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={{ rotateX, rotateY }}
      className="relative mx-auto aspect-square w-full max-w-md [perspective:1000px]"
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
      </svg>

      <button
        onClick={() => scrollToId("hero")}
        className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
        style={{ left: `${(center.x / 400) * 100}%`, top: `${(center.y / 400) * 100}%` }}
      >
        <span className="flex h-20 w-20 items-center justify-center rounded-full border border-border-strong bg-surface font-mono text-xs font-medium text-foreground shadow-[0_0_40px_rgba(77,163,255,0.12)]">
          SHREYAS
        </span>
      </button>

      {nodes.map((n) => (
        <button
          key={n.id}
          onMouseEnter={() => setHovered(n.id)}
          onMouseLeave={() => setHovered(null)}
          onClick={() => scrollToId(n.targetId)}
          className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5"
          style={{ left: `${(n.x / 400) * 100}%`, top: `${(n.y / 400) * 100}%` }}
        >
          <motion.span
            whileHover={{ scale: 1.08 }}
            className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-surface-2 text-xs font-medium text-foreground transition-colors group-hover:border-accent"
          >
            {n.label}
          </motion.span>
          <span className="max-w-[8rem] whitespace-nowrap font-mono text-[10px] text-muted-2">
            {n.sub}
          </span>
        </button>
      ))}
    </motion.div>
  );
}
