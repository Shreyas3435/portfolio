"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Search } from "lucide-react";
import { GithubIcon } from "@/components/ui/brand-icons";
import { useUIState } from "@/components/providers/ui-state-provider";
import { navSections } from "@/lib/sections";
import { flagshipProjects } from "@/data/projects";
import { profile } from "@/data/profile";
import { cn } from "@/lib/utils";

interface Command {
  id: string;
  label: string;
  group: string;
  action: () => void;
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function CommandPalette() {
  const { paletteOpen, closePalette } = useUIState();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: Command[] = useMemo(
    () => [
      ...navSections.map((s) => ({
        id: `nav-${s.id}`,
        label: `Go to ${s.label}`,
        group: "Navigate",
        action: () => scrollToId(s.id),
      })),
      { id: "nav-lab", label: "Go to Engineering Lab", group: "Navigate", action: () => scrollToId("lab") },
      { id: "nav-github", label: "Go to GitHub", group: "Navigate", action: () => scrollToId("github") },
      { id: "nav-contact", label: "Go to Contact", group: "Navigate", action: () => scrollToId("contact") },
      ...flagshipProjects.map((p) => ({
        id: `project-${p.id}`,
        label: `View ${p.name}`,
        group: "Projects",
        action: () => router.push(`/work/${p.slug}`),
      })),
      {
        id: "view-github",
        label: "Open GitHub Profile",
        group: "Actions",
        action: () => window.open(profile.github, "_blank", "noopener,noreferrer"),
      },
      {
        id: "view-resume",
        label: "View Resume",
        group: "Actions",
        action: () => window.open(profile.resumeUrl, "_blank", "noopener,noreferrer"),
      },
      {
        id: "email",
        label: "Email Shreyas",
        group: "Actions",
        action: () => window.open(`mailto:${profile.email}`, "_self"),
      },
    ],
    [router],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [commands, query]);

  // Reset query/selection when the palette transitions open, and reset the
  // selection when the query changes — done during render (React's
  // recommended pattern for derived-state adjustments) rather than in an
  // effect, to avoid an extra cascading render.
  const [prevPaletteOpen, setPrevPaletteOpen] = useState(paletteOpen);
  if (paletteOpen !== prevPaletteOpen) {
    setPrevPaletteOpen(paletteOpen);
    if (paletteOpen) {
      setQuery("");
      setSelected(0);
    }
  }

  const [prevQuery, setPrevQuery] = useState(query);
  if (query !== prevQuery) {
    setPrevQuery(query);
    setSelected(0);
  }

  useEffect(() => {
    if (paletteOpen) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [paletteOpen]);

  function run(command: Command) {
    command.action();
    closePalette();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter" && filtered[selected]) {
      run(filtered[selected]);
    }
  }

  return (
    <AnimatePresence>
      {paletteOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-sm"
          onClick={closePalette}
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
        >
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-border-strong bg-surface shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <Search size={16} className="text-muted-2" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search projects, skills, sections…"
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-2"
                aria-label="Command palette search"
              />
              <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-2">
                ESC
              </kbd>
            </div>

            <div className="max-h-80 overflow-y-auto p-2">
              {filtered.length === 0 && (
                <p className="px-3 py-6 text-center text-sm text-muted">No matches.</p>
              )}
              {filtered.map((command, i) => (
                <button
                  key={command.id}
                  onClick={() => run(command)}
                  onMouseEnter={() => setSelected(i)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm",
                    i === selected ? "bg-accent-soft text-foreground" : "text-foreground/80",
                  )}
                >
                  <span className="flex items-center gap-2">
                    {command.id === "view-github" && <GithubIcon size={13} className="text-muted-2" />}
                    {command.label}
                  </span>
                  <span className="font-mono text-[10px] uppercase text-muted-2">{command.group}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
