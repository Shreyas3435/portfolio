import { ImageResponse } from "next/og";
import { profile } from "@/data/profile";

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
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#08090b",
          backgroundImage:
            "radial-gradient(circle at 15% 0%, rgba(77,163,255,0.16), transparent 55%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 22,
            letterSpacing: 4,
            color: "#4da3ff",
            fontFamily: "monospace",
            textTransform: "uppercase",
          }}
        >
          {profile.role}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 96,
            fontWeight: 700,
            color: "#e9eaed",
            marginTop: 20,
            letterSpacing: -2,
          }}
        >
          {profile.name}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 32,
            color: "#9a9ea7",
            marginTop: 28,
            maxWidth: 920,
          }}
        >
          {profile.heroLine}
        </div>
      </div>
    ),
    { ...size },
  );
}
