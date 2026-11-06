import { ImageResponse } from "next/og";
import { profile } from "@/data/profile";
import { showcase } from "@/data/showcase";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#f4f5f2",
          color: "#0c0e11",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", padding: "64px 64px 0" }}>
          <div style={{ display: "flex", fontSize: 28 }}>{profile.role}</div>
          <div style={{ display: "flex", fontSize: 136, fontWeight: 800, letterSpacing: -5, marginTop: 12 }}>
            {profile.name}
          </div>
          <div style={{ display: "flex", fontSize: 36, marginTop: 24, maxWidth: 980, lineHeight: 1.25 }}>
            {profile.heroLine}
          </div>
        </div>
        <div style={{ display: "flex", height: 96 }}>
          {showcase.map((s) => (
            <div key={s.slug} style={{ display: "flex", flex: 1, backgroundColor: s.swatch }} />
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
