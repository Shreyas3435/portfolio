import { profile } from "@/data/profile";
import { Section } from "@/components/ui/section";

export function About() {
  return (
    <Section id="about" eyebrow="About" title="The human side">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-8">
          <div>
            <p className="font-mono text-xs uppercase tracking-wide text-muted-2">What I Build</p>
            <p className="mt-2 text-base text-foreground/90">{profile.whatIBuild}</p>
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-wide text-muted-2">How I Think</p>
            <p className="mt-2 text-base text-foreground/90">{profile.howIThink}</p>
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-wide text-muted-2">What Interests Me</p>
            <p className="mt-2 text-base text-foreground/90">{profile.whatInterestsMe}</p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-foreground/90">{profile.education.degree}</p>
            <p className="text-sm text-muted">{profile.education.institution}</p>
            {profile.experiences.map((exp) => (
              <div key={`${exp.title}-${exp.org}`}>
                <div className="my-4 h-px bg-border" />
                <p className="text-sm text-foreground/90">
                  {exp.title} {exp.period && <span className="text-muted">— {exp.period}</span>}
                </p>
                <p className="text-sm text-muted">{exp.org}</p>
              </div>
            ))}
            {profile.certifications.length > 0 && (
              <>
                <div className="my-4 h-px bg-border" />
                <p className="text-sm text-muted">
                  Certifications: {profile.certifications.join(", ")}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {profile.principles.map((p) => (
              <div key={p.title} className="rounded-xl border border-border bg-surface p-5">
                <h3 className="text-sm font-medium text-foreground">{p.title}</h3>
                <p className="mt-1.5 text-sm text-muted">{p.body}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="font-mono text-xs uppercase tracking-wide text-accent">Built &amp; Experienced</p>
              <ul className="mt-3 space-y-1.5 text-sm text-muted">
                {profile.currentlyBuilding.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-surface p-5">
              <p className="font-mono text-xs uppercase tracking-wide text-muted-2">Exploring &amp; Learning</p>
              <ul className="mt-3 space-y-1.5 text-sm text-muted">
                {profile.currentlyExploring.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
