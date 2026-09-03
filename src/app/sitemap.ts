import type { MetadataRoute } from "next";
import { resolveSiteUrl } from "@/lib/config";

/** Public pages only — the admin area is deliberately absent. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = resolveSiteUrl();
  const now = new Date();
  return [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/register`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/request`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
  ];
}
