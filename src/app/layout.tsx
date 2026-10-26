import type { Metadata, Viewport } from "next";
import { Exo_2, Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin", "latin-ext"] });
const exo = Exo_2({ variable: "--font-exo", subsets: ["latin", "latin-ext"], weight: ["600", "800", "900"] });

export const metadata: Metadata = {
  title: { default: "MIB Acrobatics", template: "%s · MIB Acrobatics" },
  description: "Clubul MIB Acrobatics — antrenamente, comunitate și AcroFeed.",
};

export const viewport: Viewport = { themeColor: "#050506", colorScheme: "dark" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ro" className={`${geistSans.variable} ${exo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
