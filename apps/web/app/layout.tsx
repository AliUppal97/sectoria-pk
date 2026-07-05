import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { SITE, SITE_URL } from "@/lib/site";
import "./globals.css";

/**
 * Fonts are self-hosted via next/font (no FOUT/FOIT, Core Web Vitals safe —
 * nextjs-app-router.mdc). They expose CSS variables that the design tokens in
 * `@sectoria/ui/theme.css` consume (`--font-inter`, `--font-jetbrains-mono`),
 * keeping theme.css the single source of truth for the font *stack* while the
 * app supplies the actual files. Two families only (design spec §3.1).
 */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: "en_PK",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0A1628",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetBrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body
        className="font-sans text-text-primary antialiased"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
