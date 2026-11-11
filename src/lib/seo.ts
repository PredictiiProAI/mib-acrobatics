import type { Metadata } from "next";

export const SITE_NAME = "MIB Acrobatics";
export const SITE_TITLE = "MIB Acrobatics | Club de Acrobație și Gimnastică";
export const SITE_DESCRIPTION =
  "Alătură-te clubului MIB Acrobatics! Antrenamente de acrobație, gimnastică și dezvoltare sportivă pentru copii și adulți. Descoperă programele noastre.";

const OG_IMAGE = { url: "/mib-logo.png", width: 480, height: 480, alt: SITE_NAME };

export function openGraph(path: string, title: string, description: string): Metadata["openGraph"] {
  return { title, description, siteName: SITE_NAME, locale: "ro_RO", type: "website", url: path, images: [OG_IMAGE] };
}

export function pageMetadata(path: string, title: string, description: string): Metadata {
  const full = `${title} | ${SITE_NAME}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: openGraph(path, full, description),
    twitter: { card: "summary", title: full, description, images: [OG_IMAGE.url] },
  };
}
