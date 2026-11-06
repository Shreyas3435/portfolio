"use client";

import { useState } from "react";
import { profile } from "@/data/profile";

export function Contact() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.location.href = `mailto:${profile.email}`;
    }
  };

  return (
    <section id="contact" className="themed t-yellow gutter pb-6 pt-[clamp(3.5rem,7vw,10rem)]">
      <p className="label">{profile.status}</p>
      <h2 className="display mt-3 chapter-statement">Have a hard problem? Send it over.</h2>
      <a
        href={`mailto:${profile.email}`}
        className="mt-[clamp(2rem,4vw,6rem)] block whitespace-nowrap border-y border-[var(--line)] py-[0.12em] text-[calc((100vw-2*var(--gut))/12.4)] font-extrabold leading-none tracking-[-0.045em] hover:bg-[var(--fg)] hover:text-[var(--bg)]"
      >
        {profile.email}
      </a>
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" className="btn btn-solid" onClick={copy} aria-live="polite">
          {copied ? "Copied" : "Copy email"}
        </button>
        <a className="btn btn-line" href={profile.resumeUrl} target="_blank" rel="noreferrer">
          Résumé PDF ↗
        </a>
        <a className="btn btn-line" href={profile.linkedin} target="_blank" rel="noreferrer">
          LinkedIn ↗
        </a>
        <a className="btn btn-line" href={profile.github} target="_blank" rel="noreferrer">
          GitHub ↗
        </a>
      </div>
      <p className="label mt-[clamp(3rem,5vw,6rem)]">© {profile.name}</p>
    </section>
  );
}
