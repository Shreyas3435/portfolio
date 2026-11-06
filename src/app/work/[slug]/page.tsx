import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition, type ReactNode } from "react";
import { Header } from "@/components/site/header";
import { flagshipProjects, getProjectBySlug } from "@/data/projects";
import { showcase, statusLabel } from "@/data/showcase";

export function generateStaticParams() {
  return flagshipProjects.map((p) => ({ slug: p.slug }));
}

interface CaseStudyPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CaseStudyPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) return {};
  const path = `/work/${project.slug}`;
  return {
    title: project.name,
    description: project.description,
    alternates: { canonical: path },
    openGraph: {
      title: `${project.name} — Case Study`,
      description: project.description,
      url: path,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${project.name} — Case Study`,
      description: project.description,
    },
  };
}

function Block({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  const id = title.toLowerCase().replace(/[^a-z]+/g, "-");
  return (
    <section id={id} className="grid scroll-mt-16 gap-x-[var(--gut)] gap-y-3 border-t border-[var(--line)] py-[clamp(2rem,3.5vw,5rem)] lg:grid-cols-12">
      <h2 className="flex items-baseline gap-3 text-[1.5rem] font-bold leading-tight tracking-tight lg:col-span-4">
        <span className="label font-normal">{number}</span>
        {title}
      </h2>
      <div className="max-w-[46rem] space-y-4 lg:col-span-8">{children}</div>
    </section>
  );
}

function Paragraphs({ items }: { items: string[] }) {
  return (
    <>
      {items.map((text) => (
        <p key={text} className="prose-body">
          {text}
        </p>
      ))}
    </>
  );
}

function Rows({ items }: { items: string[] }) {
  return (
    <ol className="border-b border-[var(--line)]">
      {items.map((text, i) => (
        <li key={text} className="flex gap-4 border-t border-[var(--line)] py-2.5 text-[1rem] leading-snug">
          <span className="label mut pt-0.5">{i + 1}</span>
          <span>{text}</span>
        </li>
      ))}
    </ol>
  );
}

export default async function CaseStudyPage({ params }: CaseStudyPageProps) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  const position = showcase.findIndex((s) => s.slug === slug);
  if (!project?.caseStudy || position < 0) notFound();

  const item = showcase[position];
  const next = showcase[(position + 1) % showcase.length];
  const nextProject = getProjectBySlug(next.slug)!;
  const cs = project.caseStudy;
  const lead = item.shots?.[0];

  return (
    <>
      <Header />
      <main>
        <header className={`themed ${item.theme} gutter pb-[clamp(2rem,4vw,6rem)] pt-[clamp(1.5rem,2.5vw,4rem)]`}>
          <Link href={`/#${project.slug}`} className="label underline underline-offset-4">
            ← Back to the project
          </Link>
          <p className="label mut mt-[clamp(2rem,5vw,8rem)]">
            Case study 0{position + 1} · {project.category} · {statusLabel[project.status]}
          </p>
          <h1 className="display mt-3 text-[clamp(3rem,10vw,32rem)]">
            <ViewTransition name={`title-${project.slug}`}>
              <span className="inline-block">{project.name}</span>
            </ViewTransition>
          </h1>
          <div className="mt-[clamp(1.5rem,3vw,4rem)] grid gap-x-[var(--gut)] gap-y-5 lg:grid-cols-12">
            <p className="text-[clamp(1.25rem,1.8vw,4rem)] font-medium leading-[1.2] tracking-[-0.01em] [text-wrap:pretty] lg:col-span-8">
              {project.description}
            </p>
            <div className="flex flex-wrap content-start gap-2 lg:col-span-4 lg:justify-end">
              {project.liveUrl && (
                <a href={project.liveUrl} target="_blank" rel="noreferrer" className="btn btn-solid">
                  Live app ↗
                </a>
              )}
              {project.repoUrl && (
                <a href={project.repoUrl} target="_blank" rel="noreferrer" className="btn btn-line">
                  Code ↗
                </a>
              )}
            </div>
          </div>
          {project.note && <p className="label mut mt-6 max-w-[70ch] border-t border-[var(--line)] pt-3">{project.note}</p>}
        </header>

        {lead && (
          <figure className={`themed ${item.theme} gutter pb-[clamp(2rem,4vw,6rem)]`}>
            <Image src={lead.src} alt={lead.alt} quality={90} sizes="100vw" priority placeholder="blur" className="w-full ring-1 ring-[var(--line)]" />
          </figure>
        )}

        <article className="themed t-paper gutter">
          <Block number="01" title="The problem">
            <Paragraphs items={cs.problem} />
          </Block>
          <Block number="02" title="The approach">
            <Paragraphs items={cs.approach} />
          </Block>
          <Block number="03" title="Architecture">
            <p className="prose-body">{cs.architecture.summary}</p>
            <Rows items={cs.architecture.layers} />
          </Block>
          <Block number="04" title="Hard parts">
            <div className="space-y-7">
              {cs.challenges.map((c) => (
                <div key={c.heading}>
                  <h3 className="text-[1.25rem] font-semibold leading-tight tracking-tight">{c.heading}</h3>
                  <div className="mt-2 space-y-3">
                    <Paragraphs items={c.body} />
                  </div>
                </div>
              ))}
            </div>
          </Block>
          <Block number="05" title="The solution">
            <Paragraphs items={cs.solution} />
          </Block>
          <Block number="06" title="Implementation">
            <Rows items={cs.implementation} />
          </Block>
          <Block number="07" title="The result">
            <Paragraphs items={cs.result} />
          </Block>
          <Block number="08" title="What I learned">
            <Paragraphs items={cs.learned} />
          </Block>
        </article>

        <Link href={`/work/${next.slug}`} className={`themed ${next.theme} gutter block py-[clamp(2.5rem,5vw,7rem)]`}>
          <span className="label mut block">Next case study</span>
          <span className="display mt-2 block chapter-statement">{nextProject.name} →</span>
        </Link>
      </main>
    </>
  );
}
