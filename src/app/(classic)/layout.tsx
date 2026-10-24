import { UIStateProvider } from "@/components/providers/ui-state-provider";
import { Nav } from "@/components/navigation/nav";
import { CommandPalette } from "@/components/command-palette/command-palette";
import { Footer } from "@/components/footer/footer";
import { AmbientBackground } from "@/components/providers/ambient-background";
import { CursorGlow } from "@/components/providers/cursor-glow";

export default function ClassicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AmbientBackground />
      <CursorGlow />
      <UIStateProvider>
        <Nav />
        <main className="flex-1">{children}</main>
        <Footer />
        <CommandPalette />
      </UIStateProvider>
    </>
  );
}
