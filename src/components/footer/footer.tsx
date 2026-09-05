import { profile } from "@/data/profile";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-10 text-sm text-muted md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-mono text-foreground">{profile.name}</p>
          <p className="text-xs text-muted-2">{profile.role}</p>
        </div>
        <p className="max-w-md text-xs text-muted-2">
          Built with curiosity, systems thinking, and an unreasonable number of debugging sessions.
        </p>
        <div className="flex gap-4 text-xs">
          <a href={profile.github} target="_blank" rel="noreferrer noopener" className="hover:text-foreground">
            GitHub
          </a>
          <a href={profile.linkedin} target="_blank" rel="noreferrer noopener" className="hover:text-foreground">
            LinkedIn
          </a>
          <a href={`mailto:${profile.email}`} className="hover:text-foreground">
            Email
          </a>
        </div>
      </div>
    </footer>
  );
}
