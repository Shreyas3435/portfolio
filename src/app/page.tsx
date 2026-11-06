import Image from "next/image";
import type { CSSProperties } from "react";
import { ChunkLab } from "@/components/demos/chunk-lab";
import { ConstraintSearch } from "@/components/demos/constraint-search";
import { ContractMap } from "@/components/demos/contract-map";
import { SeatLedger } from "@/components/demos/seat-ledger";
import { About } from "@/components/site/about";
import { AllWork } from "@/components/site/all-work";
import { Chapter } from "@/components/site/chapter";
import { Contact } from "@/components/site/contact";
import { Header } from "@/components/site/header";
import { profile } from "@/data/profile";
import { getProjectBySlug, projects } from "@/data/projects";
import { showcase, statusLabel, type Showcase } from "@/data/showcase";

function demoFor(item: Showcase) {
  switch (item.slug) {
    case "constraint-aware-search":
      return <ConstraintSearch />;
    case "trek-saathi":
      return <SeatLedger />;
    case "website-content-search":
      return <ChunkLab />;
    default:
      return <ContractMap shots={item.shots ?? []} />;
  }
}

function Gallery({ item }: { item: Showcase }) {
  const shots = item.shots ?? [];
  if (!shots.length) return null;
  return (
    <div className="gutter mt-[clamp(1.25rem,2vw,3rem)] grid gap-[clamp(0.75rem,1.2vw,2rem)] md:grid-cols-3">
      {shots.map((shot) => (
        <figure key={shot.caption} className="shot-grow origin-top">
          <a href={shot.src.src} target="_blank" rel="noreferrer" aria-label={`${shot.caption}: open the full 4K screen`}>
            <Image
              src={shot.src}
              alt={shot.alt}
              quality={90}
              sizes="(min-width: 768px) 33vw, 100vw"
              className="w-full ring-1 ring-[var(--line)]"
              placeholder="blur"
            />
          </a>
          <figcaption className="label mut mt-2">{shot.caption}. Open for full 4K ↗</figcaption>
        </figure>
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <>
      <a
        href="#constraint-aware-search"
        className="label sr-only z-[60] bg-black p-3 text-white focus:not-sr-only focus:fixed focus:left-2 focus:top-2"
      >
        Skip to the work
      </a>
      <Header />
      <main>
        <section id="top" className="themed t-paper flex flex-col pt-[clamp(1rem,1.6vw,2.5rem)]">
          <div className="gutter">
            <p className="label flex flex-wrap justify-between gap-x-6 gap-y-1">
              <span>{profile.role}</span>
              <span className="flex items-center gap-2">
                <span aria-hidden className="inline-block size-2 rounded-full bg-[var(--ok)]" />
                {profile.status}
              </span>
            </p>
          </div>
          <h1 className="hero-name mt-[clamp(0.25rem,0.5vw,1rem)] pl-[calc(var(--gut)-0.04em)]">{profile.name}</h1>
          <div className="gutter mt-[clamp(1rem,1.8vw,2.5rem)] grid items-end gap-x-[var(--gut)] gap-y-2 pb-[clamp(1rem,1.8vw,2.5rem)] lg:grid-cols-12">
            <p className="text-[clamp(1.35rem,2.2vw,6rem)] font-medium leading-[1.08] tracking-[-0.02em] [text-wrap:balance] lg:col-span-8">
              {profile.heroLine}
            </p>
            <p className="label mut lg:col-span-4 lg:text-right">
              Four projects below, each with something you can try. Test the thinking instead of taking my word for it.
            </p>
          </div>

          <ol className="border-t border-[var(--line)]">
            {showcase.map((item, i) => {
              const project = getProjectBySlug(item.slug)!;
              return (
                <li key={item.slug} className="border-b border-[var(--line)]">
                  <a
                    href={`#${item.slug}`}
                    style={{ "--row-bg": item.swatch, "--row-fg": item.swatchInk } as CSSProperties}
                    className="index-row gutter grid items-baseline gap-x-6 py-[clamp(0.45rem,0.65vw,1.25rem)] md:grid-cols-12"
                  >
                    <span className="index-name flex min-w-0 items-baseline gap-3 text-[clamp(1.6rem,2.9vw,8rem)] font-bold leading-[1.05] tracking-[-0.03em] md:col-span-5">
                      <span className="label font-normal tracking-normal">0{i + 1}</span>
                      {project.name}
                    </span>
                    <span className="mut min-w-0 text-[0.95rem] leading-snug md:col-span-3">{project.tagline}</span>
                    <span className="label mut whitespace-nowrap md:col-span-2">{statusLabel[project.status]}</span>
                    <span className="label font-semibold md:col-span-2 md:text-right">{item.proof} ↓</span>
                  </a>
                </li>
              );
            })}
            <li>
              <a href="#all-work" className="gutter label mut block py-3 hover:text-[var(--fg)]">
                Plus {projects.length - showcase.length} more in the full list ↓
              </a>
            </li>
          </ol>
        </section>

        {showcase.map((item, i) => (
          <Chapter
            key={item.slug}
            index={i}
            item={item}
            project={getProjectBySlug(item.slug)!}
            after={item.slug === "trek-saathi" ? <Gallery item={item} /> : undefined}
          >
            {demoFor(item)}
          </Chapter>
        ))}

        <About />
        <AllWork />
        <Contact />
      </main>
    </>
  );
}
