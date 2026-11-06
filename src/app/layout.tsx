import type { Metadata, Viewport } from "next";
import { Archivo, Geist_Mono } from "next/font/google";
import { profile } from "@/data/profile";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
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
  alternates: {
    canonical: siteUrl,
  },
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
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
};

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: profile.name,
  url: siteUrl,
  jobTitle: profile.role,
  description: profile.heroSupport,
  email: `mailto:${profile.email}`,
  sameAs: [profile.github, profile.linkedin],
  worksFor: {
    "@type": "Organization",
    name: "Smarter.Codes",
  },
  alumniOf: {
    "@type": "CollegeOrUniversity",
    name: profile.education.institution,
  },
};

export const viewport: Viewport = {
  themeColor: "#f4f5f2",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${geistMono.variable} antialiased`}
    >
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
