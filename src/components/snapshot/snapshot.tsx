import { Section } from "@/components/ui/section";
import { profile } from "@/data/profile";

const flow = ["Problem", "System", "Engineering", "Result"];

const focusAreas = [
  {
    title: "AI & Search",
    body: "Grounded retrieval and constraint-aware ranking — not just wiring up an LLM call.",
  },
  {
    title: "Full-Stack Systems",
    body: "Workflow architecture, backend-enforced authorization, and APIs that hold up under real use.",
  },
  {
    title: "Security",
    body: "Attack-surface thinking and security fundamentals treated as engineering, not an afterthought.",
  },
];

export function Snapshot() {
  return (
    <Section id="snapshot" eyebrow="What I Build" title={profile.whatIBuild}>
      <div className="mb-16 flex flex-wrap items-center gap-3 font-mono text-xs uppercase tracking-[0.2em] text-muted-2 md:gap-4 md:text-sm">
        {flow.map((step, i) => (
          <span key={step} className="flex items-center gap-3 md:gap-4">
            <span
              className={i === flow.length - 1 ? "text-accent" : "text-foreground/80"}
            >
              {step}
            </span>
            {i < flow.length - 1 && <span className="text-muted-2">→</span>}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {focusAreas.map((area) => (
          <div key={area.title} className="rounded-2xl border border-border bg-surface p-6">
            <h3 className="text-lg font-medium text-foreground">{area.title}</h3>
            <p className="mt-2 text-sm text-muted">{area.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
