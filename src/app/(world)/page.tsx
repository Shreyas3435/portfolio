import Link from "next/link";
import { profile } from "@/data/profile";
import { flagshipProjects } from "@/data/projects";
import { PortfolioWorld } from "@/components/world/portfolio-world";

export default function Home() {
  return (
    <>
      <h1 className="sr-only">
        {profile.name} — {profile.role}
      </h1>
      <PortfolioWorld />
      {/* The same content as plain links, for screen readers, crawlers and no-JS visitors. */}
      <nav className="sr-only" aria-label="Projects and contact">
        <p>{profile.heroLine}</p>
        <ul>
          {flagshipProjects.map((p) => (
            <li key={p.id}>
              <Link href={`/work/${p.slug}`}>
                {p.name} — {p.tagline}
              </Link>
            </li>
          ))}
          <li>
            <a href={profile.github}>GitHub</a>
          </li>
          <li>
            <a href={profile.linkedin}>LinkedIn</a>
          </li>
          <li>
            <a href={`mailto:${profile.email}`}>Email</a>
          </li>
          <li>
            <a href={profile.resumeUrl}>Résumé</a>
          </li>
          <li>
            <Link href="/classic">Classic, non-interactive version of this site</Link>
          </li>
        </ul>
      </nav>
    </>
  );
}
