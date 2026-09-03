import { describe, expect, it } from "vitest";
import { resolveSiteUrl } from "@/lib/config";

/**
 * NEXT_PUBLIC_SITE_URL is typed by hand into a deployment dashboard. A mistyped
 * value used to throw during `next build` and fail the whole deployment, so
 * every plausible mistake is covered here.
 */
describe("resolveSiteUrl", () => {
  it("accepts a well-formed URL unchanged", () => {
    expect(resolveSiteUrl("https://enn.vercel.app")).toBe("https://enn.vercel.app");
  });

  it("assumes https when the scheme is missing", () => {
    expect(resolveSiteUrl("enn.vercel.app")).toBe("https://enn.vercel.app");
  });

  it("trims whitespace and trailing slashes", () => {
    expect(resolveSiteUrl("  https://enn.vercel.app/  ")).toBe("https://enn.vercel.app");
    expect(resolveSiteUrl("https://enn.vercel.app///")).toBe("https://enn.vercel.app");
  });

  it("falls back when unset or empty", () => {
    expect(resolveSiteUrl(undefined)).toBe("http://localhost:3000");
    expect(resolveSiteUrl("")).toBe("http://localhost:3000");
    expect(resolveSiteUrl("   ")).toBe("http://localhost:3000");
  });

  it("never throws on an unusable value", () => {
    for (const bad of ["http://", "://nope", "ht tp://x.com", "%%%"]) {
      expect(() => resolveSiteUrl(bad)).not.toThrow();
    }
  });

  it("keeps a port and a preview subdomain", () => {
    expect(resolveSiteUrl("http://localhost:3001")).toBe("http://localhost:3001");
    expect(resolveSiteUrl("enn-git-main-team.vercel.app")).toBe(
      "https://enn-git-main-team.vercel.app",
    );
  });
});
