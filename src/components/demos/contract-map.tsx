"use client";

import Image from "next/image";
import { useState } from "react";
import type { Shot } from "@/data/showcase";

/** Region coordinates are fractions of the 4K capture, measured from the live ShadowPath UI. */
const box = (x: number, y: number, w: number, h: number) => ({
  left: `${(x / 2576) * 100}%`,
  top: `${(y / 1449) * 100}%`,
  width: `${(w / 2576) * 100}%`,
  height: `${(h / 1449) * 100}%`,
});

const fields = [
  { code: "POST /api/scan", shot: 0, region: box(390, 148, 2150, 180), note: "Target input with an explicit authorization gate" },
  { code: "riskScore", shot: 0, region: box(390, 391, 524, 124), note: "How bad is it overall?" },
  { code: "findings[].severity", shot: 0, region: box(390, 538, 1170, 339), note: "Severity breakdown" },
  { code: "findings[].category", shot: 0, region: box(1582, 538, 958, 339), note: "Where is the risk concentrated?" },
  { code: "findings[].file:line", shot: 1, region: box(390, 538, 2150, 355), note: "What are the specific problems?" },
  { code: "findings[].evidence", shot: 1, region: box(390, 538, 2150, 355), note: "Why this was flagged" },
  { code: "findings[].remediation", shot: 1, region: box(390, 538, 2150, 355), note: "What to do about it" },
  { code: "findings[].attackPath[]", shot: 2, region: box(390, 538, 2150, 339), note: "How do the issues chain together?" },
  { code: "POST /api/export/html", shot: 0, region: box(2423, 52, 118, 52), note: "A report you can share without the tool" },
];

export function ContractMap({ shots }: { shots: Shot[] }) {
  const [active, setActive] = useState(0);
  const field = fields[active];

  return (
    <div className="panel p-4 md:p-6">
      <p className="label p-mut">Report contract. Pick a field to see the screen built against it.</p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {fields.map((f, i) => (
          <li key={f.code}>
            <button type="button" aria-pressed={active === i} onClick={() => setActive(i)} className="p-btn">
              {f.code}
            </button>
          </li>
        ))}
      </ul>
      <p className="mb-3 mt-3 text-[1.25rem] font-semibold leading-snug tracking-tight" aria-live="polite">
        {field.note}
      </p>

      <figure>
        <div className="relative overflow-hidden bg-[#f4f5f7]">
          {shots.map((shot, i) => (
            <Image
              key={shot.caption}
              src={shot.src}
              alt={shot.alt}
              quality={90}
              sizes="100vw"
              className={`w-full transition-opacity duration-200 ${i === 0 ? "relative" : "absolute inset-0"}`}
              style={{ opacity: field.shot === i ? 1 : 0 }}
            />
          ))}
          <div
            aria-hidden
            className="pointer-events-none absolute transition-all duration-300 ease-out motion-reduce:transition-none"
            style={{
              ...field.region,
              boxShadow: "0 0 0 200vmax rgb(8 12 20 / 0.5)",
              outline: "0.14rem solid var(--p-acc)",
            }}
          />
        </div>
        <figcaption className="label p-mut mt-2">
          Real screens from the live app, captured at 3840 × 2160. The empty states are real: the scan backend is still being
          wired up.
        </figcaption>
      </figure>
    </div>
  );
}
