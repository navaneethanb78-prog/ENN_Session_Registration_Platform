import type { MetadataRoute } from "next";

/** Public pages only — the admin area is deliberately absent. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const now = new Date();
  return [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/register`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/request`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
  ];
}
