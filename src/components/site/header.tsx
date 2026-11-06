"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { profile } from "@/data/profile";
import { showcase } from "@/data/showcase";

const items = [
  ...showcase.map((s, i) => ({ id: s.slug, label: `0${i + 1}` })),
  { id: "about", label: "About" },
  { id: "now", label: "Now" },
  { id: "all-work", label: "All work" },
];

export function Header() {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    for (const id of ["top", ...items.map((i) => i.id), "contact"]) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <header className="themed t-paper gutter sticky top-0 z-50 flex h-[3.25rem] items-center justify-between gap-4 border-b border-[var(--line)]">
      <Link href="/#top" className="hidden shrink-0 text-[0.95rem] font-bold tracking-tight md:block">
        {profile.name}
      </Link>
      <nav aria-label="Sections" className="min-w-0">
        <ul className="flex items-center gap-[clamp(0.6rem,1.6vw,1.6rem)]">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/#${item.id}`}
                aria-current={active === item.id ? "true" : undefined}
                className={`label block whitespace-nowrap py-2 underline-offset-4 ${
                  active === item.id ? "font-semibold underline" : "mut hover:text-[var(--fg)]"
                }`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <Link href="/#contact" className="label shrink-0 py-2 font-semibold underline underline-offset-4">
        Hire me
      </Link>
    </header>
  );
}
