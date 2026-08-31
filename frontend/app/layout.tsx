import type { Metadata } from "next";
import { Space_Grotesk, Public_Sans, Space_Mono } from "next/font/google";

import { hasSiteUrl, SITE_URL } from "@/lib/site";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  weight: ["400", "700"],
  subsets: ["latin"],
});

const DESCRIPTION =
  "Membranes, Osmosis & Food Preservation. Six stages, seven report sections, one deadline.";

export const metadata: Metadata = {
  title: "BiPi Schedule Hub",
  description: DESCRIPTION,
  // `metadataBase` is what turns the generated `opengraph-image` into the
  // absolute URL link-preview scrapers require. It is only set once
  // NEXT_PUBLIC_SITE_URL is (see lib/site.ts); until then Next falls back
  // to localhost and prints one build warning about it — expected, and
  // harmless, because a site with no public URL has no preview anyone can
  // fetch. Setting the env var removes both the warning and the fallback.
  ...(hasSiteUrl ? { metadataBase: new URL(SITE_URL) } : {}),
  openGraph: {
    title: "BiPi Schedule Hub",
    description: DESCRIPTION,
    locale: "en_IE",
    type: "website",
  },
  // Twitter/X and several other scrapers only enlarge a preview image when
  // the card type says so; without this the OG image renders as a thumbnail.
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en-IE"
      className={`${spaceGrotesk.variable} ${publicSans.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
