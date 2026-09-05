import { ArrowUpRight, Mail } from "lucide-react";
import { profile } from "@/data/profile";
import { Section } from "@/components/ui/section";
import { GithubIcon, LinkedinIcon } from "@/components/ui/brand-icons";

export function Contact() {
  return (
    <Section id="contact" eyebrow="Contact">
      <div className="rounded-3xl border border-border bg-surface px-8 py-16 text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Have a problem worth building?
        </h2>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href={`mailto:${profile.email}`}
            className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-medium text-accent-foreground hover:opacity-90"
          >
            <Mail size={15} />
            {profile.email}
          </a>
          <a
            href={profile.github}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 rounded-xl border border-border-strong bg-surface-2 px-5 py-3 text-sm font-medium text-foreground hover:border-accent"
          >
            <GithubIcon size={15} />
            GitHub
            <ArrowUpRight size={13} />
          </a>
          <a
            href={profile.linkedin}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 rounded-xl border border-border-strong bg-surface-2 px-5 py-3 text-sm font-medium text-foreground hover:border-accent"
          >
            <LinkedinIcon size={15} />
            LinkedIn
            <ArrowUpRight size={13} />
          </a>
        </div>
      </div>
    </Section>
  );
}
