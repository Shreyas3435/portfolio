"use client";

import { ArrowRight, Mail } from "lucide-react";
import { profile } from "@/data/profile";
import { SystemMap } from "./system-map";

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function Hero() {
  return (
    <section id="hero" className="relative flex min-h-screen items-center pt-28 pb-16">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-16 px-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {profile.status}
          </div>

          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            {profile.name}
          </h1>
          <p className="mt-3 font-mono text-sm uppercase tracking-[0.25em] text-accent">
            {profile.role}
          </p>

          <p className="mt-8 max-w-xl text-lg text-foreground/90 md:text-xl">
            {profile.heroLine}
          </p>
          <p className="mt-4 max-w-xl text-base text-muted">{profile.heroSupport}</p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <button
              onClick={() => scrollToId("work")}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-medium text-accent-foreground transition-transform hover:-translate-y-0.5"
            >
              Explore My Work
              <ArrowRight size={15} />
            </button>
            <button
              onClick={() => scrollToId("contact")}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-5 py-3 text-sm font-medium text-foreground transition-colors hover:border-border-strong"
            >
              <Mail size={15} />
              Get in Touch
            </button>
          </div>
        </div>

        <SystemMap />
      </div>
    </section>
  );
}
