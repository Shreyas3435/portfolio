import { ArrowUpRight } from "lucide-react";
import { profile } from "@/data/profile";
import { projects } from "@/data/projects";
import { Section } from "@/components/ui/section";
import { GithubIcon } from "@/components/ui/brand-icons";

const curatedIds = ["trek-saathi", "website-content-search", "movie-data-pipeline", "form-builder"];

export function GitHubSection() {
  const curated = curatedIds.map((id) => projects.find((p) => p.id === id)).filter(Boolean);

  return (
    <Section id="github" eyebrow="GitHub" title="Public work">
      <div className="flex flex-col gap-8 rounded-2xl border border-border bg-surface p-7 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-border-strong bg-surface-2">
            <GithubIcon size={20} />
          </span>
          <div>
            <p className="text-lg font-medium text-foreground">@{profile.githubHandle}</p>
            <p className="text-sm text-muted">18 public repositories</p>
          </div>
        </div>
        <a
          href={profile.github}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-2 rounded-xl border border-border-strong bg-surface-2 px-4 py-2.5 text-sm font-medium text-foreground hover:border-accent"
        >
          View Profile
          <ArrowUpRight size={14} />
        </a>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {curated.map(
          (project) =>
            project && (
              <a
                key={project.id}
                href={project.repoUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="group rounded-xl border border-border bg-surface p-4 transition-colors hover:border-border-strong"
              >
                <p className="flex items-center justify-between text-sm font-medium text-foreground">
                  {project.name}
                  <ArrowUpRight size={13} className="text-muted-2 transition-colors group-hover:text-accent" />
                </p>
                <p className="mt-1 text-xs text-muted">{project.category}</p>
              </a>
            ),
        )}
      </div>
    </Section>
  );
}
