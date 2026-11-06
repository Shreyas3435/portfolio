"use client";

import { useState } from "react";
import { profile } from "@/data/profile";

export function Principles() {
  const [active, setActive] = useState(0);
  const principle = profile.principles[active];

  return (
    <div>
      <h3 className="label mut">How I think</h3>
      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Working principles">
        {profile.principles.map((p, i) => (
          <button
            key={p.title}
            type="button"
            aria-pressed={active === i}
            aria-label={p.title}
            onClick={() => setActive(i)}
            className={`btn min-w-11 ${active === i ? "btn-solid" : "btn-line"}`}
          >
            0{i + 1}
          </button>
        ))}
      </div>
      <div className="mt-4 min-h-[8.5rem]" aria-live="polite">
        <p className="text-[clamp(1.6rem,2.6vw,7rem)] font-bold leading-[1.05] tracking-[-0.025em]">{principle.title}</p>
        <p className="mut prose-body mt-2 max-w-[44ch]">{principle.body}</p>
      </div>
    </div>
  );
}
