import { timeline } from "@/data/timeline";
import { Section } from "@/components/ui/section";
import { cn } from "@/lib/utils";

export function Timeline() {
  return (
    <Section
      id="journey"
      eyebrow="Engineering Journey"
      title="How this progressed"
      description="Ordered by evidence where it exists — commit history for dated entries, direct account for the rest."
    >
      <ol className="relative border-l border-border pl-8">
        {timeline.map((entry) => (
          <li key={entry.id} className="mb-10 last:mb-0">
            <span
              className={cn(
                "absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full",
                entry.verified ? "bg-accent" : "border-2 border-accent bg-background",
              )}
            />
            <p className="font-mono text-xs uppercase tracking-wide text-muted-2">{entry.date}</p>
            <h3 className="mt-1 text-base font-medium text-foreground">{entry.label}</h3>
            <p className="mt-1 max-w-2xl text-sm text-muted">{entry.description}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
