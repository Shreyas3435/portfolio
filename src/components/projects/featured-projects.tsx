import { Section } from "@/components/ui/section";
import { flagshipProjects } from "@/data/projects";
import { ProjectCard } from "./project-card";

export function FeaturedProjects() {
  return (
    <Section
      id="work"
      eyebrow="Featured Systems"
      title="Projects worth a real look"
      description="Four systems that best represent how I approach engineering — problem first, architecture second, technology last."
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {flagshipProjects.map((project) => (
          <ProjectCard key={project.id} project={project} variant="flagship" />
        ))}
      </div>
    </Section>
  );
}
