export function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-20 overflow-hidden">
      <div
        className="ambient-blob"
        style={{
          top: "-10%",
          left: "5%",
          width: "40rem",
          height: "40rem",
          background: "rgba(77, 163, 255, 0.16)",
          animation: "drift-1 30s ease-in-out infinite",
        }}
      />
      <div
        className="ambient-blob"
        style={{
          top: "20%",
          right: "-10%",
          width: "34rem",
          height: "34rem",
          background: "rgba(77, 163, 255, 0.13)",
          animation: "drift-2 25s ease-in-out infinite",
        }}
      />
      <div
        className="ambient-blob"
        style={{
          bottom: "-15%",
          left: "30%",
          width: "36rem",
          height: "36rem",
          background: "rgba(77, 163, 255, 0.11)",
          animation: "drift-3 36s ease-in-out infinite",
        }}
      />
    </div>
  );
}
