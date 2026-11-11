import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/club";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/admin", "/api", "/auth", "/profil", "/messages", "/documente", "/declaratie"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
