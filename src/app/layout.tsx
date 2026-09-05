import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { profile } from "@/data/profile";
import { UIStateProvider } from "@/components/providers/ui-state-provider";
import { Nav } from "@/components/navigation/nav";
import { CommandPalette } from "@/components/command-palette/command-palette";
import { Footer } from "@/components/footer/footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://portfolio-six-bice-90.vercel.app";
const title = `${profile.name} — ${profile.role}`;
const description = profile.heroSupport;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: `%s — ${profile.name}`,
  },
  description,
  keywords: [
    "Shreyas Alva",
    "Full-Stack Engineer",
    "AI Engineer",
    "Search Engineering",
    "Security Engineering",
    "Portfolio",
  ],
  authors: [{ name: profile.name, url: profile.github }],
  openGraph: {
    title,
    description,
    url: siteUrl,
    siteName: `${profile.name} — Portfolio`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#08090b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <UIStateProvider>
          <Nav />
          <main className="flex-1">{children}</main>
          <Footer />
          <CommandPalette />
        </UIStateProvider>
      </body>
    </html>
  );
}
