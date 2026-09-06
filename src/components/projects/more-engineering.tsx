import { Section } from "@/components/ui/section";
import { secondaryProjects, labProjects } from "@/data/projects";
import { ProjectCard } from "./project-card";
import { Tag } from "@/components/ui/tag";

export function MoreEngineering() {
  return (
    <Section
      id="lab"
      eyebrow="More Engineering"
      title="Beyond the flagship work"
      description="Smaller builds, spikes, and evaluation prototypes — kept honest about what stage each one is at."
    >
      <div className="mb-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {secondaryProjects.map((project, i) => (
          <ProjectCard key={project.id} project={project} variant="compact" index={i} />
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-surface/60 p-6">
        <p className="mb-1 font-mono text-xs uppercase tracking-[0.2em] text-accent">Engineering Lab</p>
        <p className="mb-6 text-sm text-muted">Things I built while learning — kept small on purpose.</p>
        <div className="flex flex-wrap gap-3">
          {labProjects.map((project) => (
            <a
              key={project.id}
              href={project.repoUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="group flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-foreground/80 transition-colors hover:border-border-strong hover:text-foreground"
              title={project.description}
            >
              {project.name}
              <Tag className="hidden group-hover:inline-flex sm:inline-flex">{project.tags[0]}</Tag>
            </a>
          ))}
        </div>
      </div>
    </Section>
  );
}
