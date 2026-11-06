import { Expertise } from "@/components/site/expertise";
import { Principles } from "@/components/site/principles";
import { ProjectLinks } from "@/components/site/project-links";
import { nowLanes } from "@/data/now";
import { profile } from "@/data/profile";
import { timeline } from "@/data/timeline";

const [current, previous] = profile.experiences;

const facts: { label: string; value: string; note?: string }[] = [
  { label: "Now", value: current.org, note: current.title },
  { label: "Before", value: previous.org, note: previous.title },
  { label: "Studied", value: "VTU", note: profile.education.degree },
  { label: "Certified", value: profile.certifications.join(", ") },
];

const sectionSpace = "py-[clamp(3rem,5vw,8rem)]";

export function About() {
  return (
    <>
      <section id="about" className={`themed t-paper gutter border-t border-[var(--line)] ${sectionSpace}`}>
        <p className="label mut">About me</p>
        <h2 className="display chapter-statement mt-3 max-w-[20ch]">{profile.whatInterestsMe}</h2>

        <dl className="mt-[clamp(1.5rem,2.5vw,4rem)] grid grid-cols-2 gap-x-[var(--gut)] lg:grid-cols-4">
          {facts.map((fact) => (
            <div key={fact.label} className="border-t border-[var(--line)] py-3">
              <dt className="label mut">{fact.label}</dt>
              <dd className="mt-1 text-[1.25rem] font-semibold leading-tight tracking-tight">{fact.value}</dd>
              {fact.note && <dd className="mut mt-1 text-[0.95rem] leading-snug">{fact.note}</dd>}
            </div>
          ))}
        </dl>

        <h3 className="mt-[clamp(2rem,3.5vw,5rem)] text-[clamp(1.5rem,2.6vw,7rem)] font-bold leading-[1.05] tracking-[-0.025em]">
          What do you need built?
        </h3>
        <p className="label mut mt-1">Pick one, then pick a skill to see the proof.</p>
        <Expertise />
      </section>

      <section id="now" className={`themed t-ink gutter ${sectionSpace}`}>
        <p className="label mut">Right now</p>
        <h2 className="display chapter-statement mt-3">What I&rsquo;m focused on.</h2>
        <div className="mt-[clamp(1.5rem,2.5vw,4rem)] grid gap-x-[var(--gut)] gap-y-8 lg:grid-cols-2">
          {nowLanes.map((lane) => (
            <div key={lane.title}>
              <h3 className="label font-semibold text-[var(--acc)]">{lane.title}</h3>
              <div className="mt-2 border-b border-[var(--line)]">
                {lane.items.map((item) => (
                  <details key={item.label} name={`now-${lane.title}`} className="fold border-t border-[var(--line)]">
                    <summary className="flex items-baseline justify-between gap-4 py-3 text-[clamp(1.2rem,1.7vw,4.5rem)] font-semibold leading-tight tracking-[-0.015em] hover:text-[var(--acc)]">
                      {item.label}
                      <span aria-hidden className="fold-icon shrink-0 font-normal">
                        +
                      </span>
                    </summary>
                    <div className="pb-4">
                      <p className="mut prose-body max-w-[52ch]">{item.detail}</p>
                      {item.projectIds.length > 0 && (
                        <div className="mt-3">
                          <ProjectLinks ids={item.projectIds} />
                        </div>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section aria-label="Principles and career path" className={`themed t-paper gutter ${sectionSpace}`}>
        <div className="grid items-start gap-x-[var(--gut)] gap-y-8 lg:grid-cols-2">
          <Principles />
          <details className="fold">
            <summary className="flex items-center justify-between gap-4 border-y border-[var(--line)] py-3 text-[clamp(1.2rem,1.7vw,4.5rem)] font-semibold tracking-[-0.015em]">
              <span>
                <span className="when-closed">See my full path</span>
                <span className="when-open">Hide my full path</span>
              </span>
              <span aria-hidden className="fold-icon font-normal">
                +
              </span>
            </summary>
            <ol className="border-b border-[var(--line)]">
              {[...timeline].reverse().map((entry) => (
                <li
                  key={entry.id}
                  className="grid gap-x-5 gap-y-0.5 border-b border-[var(--line)] py-2.5 last:border-b-0 md:grid-cols-[7rem_minmax(0,1fr)]"
                >
                  <p className="label mut pt-1">{entry.date}</p>
                  <p className="text-[0.95rem] leading-snug">
                    <span className="font-medium">{entry.label}.</span> <span className="mut">{entry.description}</span>
                  </p>
                </li>
              ))}
            </ol>
          </details>
        </div>
      </section>
    </>
  );
}
