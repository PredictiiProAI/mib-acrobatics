import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/club";

const PAGES: { path: string; changeFrequency: "weekly" | "monthly" | "yearly"; priority: number }[] = [
  { path: "", changeFrequency: "weekly", priority: 1 },
  { path: "/despre", changeFrequency: "monthly", priority: 0.9 },
  { path: "/signup", changeFrequency: "yearly", priority: 0.6 },
  { path: "/login", changeFrequency: "yearly", priority: 0.4 },
  { path: "/termeni", changeFrequency: "yearly", priority: 0.3 },
  { path: "/confidentialitate", changeFrequency: "yearly", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PAGES.map((p) => ({
    url: `${SITE_URL}${p.path}`,
    lastModified,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
