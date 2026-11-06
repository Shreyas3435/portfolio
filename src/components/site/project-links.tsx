import Link from "next/link";
import { projects } from "@/data/projects";
import { showcase } from "@/data/showcase";

/** Links to where a project can be seen: its section on the home page, or else its repo. */
export function ProjectLinks({ ids, limit = 4 }: { ids: string[]; limit?: number }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {ids.slice(0, limit).map((id) => {
        const project = projects.find((p) => p.id === id);
        if (!project) return null;
        const onPage = showcase.some((s) => s.slug === project.slug);
        const external = project.repoUrl ?? project.liveUrl;
        return (
          <li key={id}>
            {onPage ? (
              <Link href={`/#${project.slug}`} className="p-btn underline-offset-2 hover:underline">
                {project.name} ↓
              </Link>
            ) : external ? (
              <a href={external} target="_blank" rel="noreferrer" className="p-btn underline-offset-2 hover:underline">
                {project.name} ↗
              </a>
            ) : (
              <span className="p-btn">{project.name}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
