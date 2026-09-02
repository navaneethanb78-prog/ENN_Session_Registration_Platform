import type { MetadataRoute } from "next";

/**
 * The administration area is unlinked from the public site and excluded from
 * crawling. That keeps it out of search results; it is not a security control
 * — access is enforced by the session check on every admin route and API.
 */
export default function robots(): MetadataRoute.Robots {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/admin/", "/api/"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
