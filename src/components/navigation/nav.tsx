"use client";

import { useState } from "react";
import { Command, Menu, X } from "lucide-react";
import { useActiveSection } from "@/hooks/use-active-section";
import { useUIState } from "@/components/providers/ui-state-provider";
import { allSectionIds, navSections } from "@/lib/sections";
import { cn } from "@/lib/utils";

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function Nav() {
  const active = useActiveSection([...allSectionIds]);
  const { openPalette } = useUIState();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-40 flex justify-center px-4 pt-4">
      <nav className="flex w-full max-w-4xl items-center justify-between rounded-2xl border border-border bg-background/70 px-4 py-2.5 shadow-lg shadow-black/20 backdrop-blur-md">
        <button
          onClick={() => scrollToId("hero")}
          className="font-mono text-sm font-medium tracking-tight text-foreground"
        >
          SHREYAS
        </button>

        <div className="hidden items-center gap-1 md:flex">
          {navSections.map((s) => (
            <button
              key={s.id}
              onClick={() => scrollToId(s.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm transition-colors",
                active === s.id ? "text-foreground bg-surface" : "text-muted hover:text-foreground",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openPalette}
            aria-label="Open command palette"
            className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted hover:text-foreground"
          >
            <Command size={13} />
            <span>K</span>
          </button>
          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
            className="rounded-lg border border-border p-1.5 text-muted md:hidden"
          >
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="absolute top-full mt-2 w-full max-w-4xl rounded-2xl border border-border bg-background/95 p-2 backdrop-blur-md md:hidden">
          {navSections.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                scrollToId(s.id);
                setMobileOpen(false);
              }}
              className={cn(
                "block w-full rounded-lg px-3 py-2.5 text-left text-sm",
                active === s.id ? "text-foreground bg-surface" : "text-muted",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
