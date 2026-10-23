import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/shell/providers";
import { SITE, siteUrl } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "FootballIQ: the 2026 World Cup, explained by models you can check",
    template: "%s · FootballIQ",
  },
  description: SITE.description,
  authors: [{ name: SITE.author, url: SITE.authorUrl }],
  openGraph: {
    title: "FootballIQ: the 2026 World Cup, explained by models you can check",
    description: SITE.description,
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "The 2026 World Cup knockout bracket, Spain champions" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export const viewport: Viewport = {
  themeColor: "#fafaf7",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col bg-paper text-ink">
        <a
          href="#main"
          className="sr-only z-[60] rounded-[3px] bg-ink px-4 py-3 font-semibold text-paper focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
