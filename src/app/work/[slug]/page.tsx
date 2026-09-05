import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { GithubIcon } from "@/components/ui/brand-icons";
import { flagshipProjects, getProjectBySlug } from "@/data/projects";
import { StatusBadge } from "@/components/ui/badges";
import { Tag } from "@/components/ui/tag";

export function generateStaticParams() {
  return flagshipProjects.map((p) => ({ slug: p.slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) return {};
  return {
    title: project.name,
    description: project.description,
  };
}

function CaseSection({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border py-12 first:border-t-0 first:pt-0">
      <div className="mb-5 flex items-baseline gap-3">
        <span className="font-mono text-sm text-accent">{number}</span>
        <h2 className="text-xl font-semibold text-foreground md:text-2xl">{title}</h2>
      </div>
      <div className="max-w-3xl space-y-4 text-base leading-relaxed text-foreground/80">{children}</div>
    </section>
  );
}

export default async function CaseStudyPage({ params }: PageProps) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  if (!project || !project.caseStudy) {
    notFound();
  }

  const cs = project.caseStudy;

  return (
    <article className="mx-auto max-w-4xl px-6 pb-24 pt-32">
      <Link href="/#work" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft size={14} />
        Back to work
      </Link>

      <header className="mt-8 border-b border-border pb-10">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">{project.category}</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
          {project.name}
        </h1>
        <p className="mt-3 text-lg text-muted">{project.tagline}</p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <StatusBadge status={project.status} />
          {project.tags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </div>

        {project.note && (
          <p className="mt-5 max-w-2xl rounded-xl border border-border bg-surface px-4 py-3 text-sm italic text-muted">
            {project.note}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          {project.liveUrl && (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground hover:opacity-90"
            >
              Open Live Demo
              <ArrowUpRight size={14} />
            </a>
          )}
          {project.repoUrl && (
            <a
              href={project.repoUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 rounded-xl border border-border-strong bg-surface-2 px-4 py-2.5 text-sm font-medium text-foreground hover:border-accent"
            >
              <GithubIcon size={15} />
              View Code
            </a>
          )}
        </div>
      </header>

      <div className="mt-4">
        <CaseSection number="01" title="The Problem">
          {cs.problem.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </CaseSection>

        <CaseSection number="02" title="The Approach">
          {cs.approach.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </CaseSection>

        <CaseSection number="03" title="Architecture">
          <p>{cs.architecture.summary}</p>
          <ul className="space-y-2 border-l border-border pl-5">
            {cs.architecture.layers.map((layer, i) => (
              <li key={i} className="font-mono text-sm text-foreground/70">
                {layer}
              </li>
            ))}
          </ul>
        </CaseSection>

        <CaseSection number="04" title="Engineering Challenges">
          <div className="space-y-6">
            {cs.challenges.map((challenge, i) => (
              <div key={i}>
                <h3 className="mb-1.5 font-medium text-foreground">{challenge.heading}</h3>
                {challenge.body.map((p, j) => (
                  <p key={j} className="text-foreground/80">
                    {p}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </CaseSection>

        <CaseSection number="05" title="Solution">
          {cs.solution.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </CaseSection>

        <CaseSection number="06" title="Implementation">
          <ul className="list-disc space-y-1.5 pl-5">
            {cs.implementation.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </CaseSection>

        <CaseSection number="07" title="Result">
          {cs.result.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </CaseSection>

        <CaseSection number="08" title="What I Learned">
          {cs.learned.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </CaseSection>

        <CaseSection number="09" title="Explore">
          <div className="flex flex-wrap gap-3">
            {project.liveUrl && (
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground hover:opacity-90"
              >
                Live Demo
                <ArrowUpRight size={14} />
              </a>
            )}
            {project.repoUrl && (
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2 rounded-xl border border-border-strong bg-surface-2 px-4 py-2.5 text-sm font-medium text-foreground hover:border-accent"
              >
                <GithubIcon size={15} />
                Source
              </a>
            )}
            {!project.liveUrl && !project.repoUrl && (
              <p className="text-sm text-muted">{project.note}</p>
            )}
          </div>
        </CaseSection>
      </div>
    </article>
  );
}
