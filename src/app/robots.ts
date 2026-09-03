import type { MetadataRoute } from "next";
import { resolveSiteUrl } from "@/lib/config";

/**
 * The administration area is unlinked from the public site and excluded from
 * crawling. That keeps it out of search results; it is not a security control
 * — access is enforced by the session check on every admin route and API.
 */
export default function robots(): MetadataRoute.Robots {
  const base = resolveSiteUrl();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/admin/", "/api/"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
