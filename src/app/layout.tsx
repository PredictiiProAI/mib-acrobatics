import type { Metadata, Viewport } from "next";
import { Exo_2, Geist } from "next/font/google";
import { THEME_SCRIPT } from "@/components/theme-toggle";
import { SITE_URL } from "@/lib/club";
import { openGraph, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin", "latin-ext"] });
const exo = Exo_2({ variable: "--font-exo", subsets: ["latin", "latin-ext"], weight: ["600", "800", "900"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  keywords: ["club acrobație", "gimnastică copii", "MIB Acrobatics", "antrenamente acrobație", "sport", "dezvoltare fizică"],
  applicationName: "AcroMIB",
  openGraph: openGraph("/", SITE_TITLE, SITE_DESCRIPTION),
  twitter: { card: "summary", title: SITE_TITLE, description: SITE_DESCRIPTION, images: ["/mib-logo.png"] },
  appleWebApp: { capable: true, title: "AcroMIB", statusBarStyle: "black-translucent" },
  verification: { google: "Eu43EGpW7gnGQUIwWGc5lzs-SrfgMsRwpNA3LWYXRe8" },
};

export const viewport: Viewport = { themeColor: "#000000", colorScheme: "dark" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ro" className={`${geistSans.variable} ${exo.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
