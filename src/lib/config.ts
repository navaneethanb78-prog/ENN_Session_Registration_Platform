/**
 * Central application configuration.
 * Business rules live here, never scattered through the UI.
 */

/** Default timezone for sessions. Configurable per-session; this is the fallback. */
export const DEFAULT_TIMEZONE = process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE ?? "Asia/Kolkata";

export const BRAND = {
  name: "ENN Consultancy",
  tagline: "ISO Certification | Documentation | Training",
  shortName: "ENN",
} as const;

/** Seat-availability thresholds, as a fraction of capacity that is occupied. */
export const SEAT_THRESHOLDS = {
  /** At/above this occupancy the session is flagged "filling fast". */
  moderate: 0.5,
  /** At/above this occupancy the session is flagged "low availability". */
  low: 0.8,
} as const;

/** Absolute seat count at/below which we always warn, regardless of capacity ratio. */
export const LOW_SEAT_ABSOLUTE = 5;

/** How long an admin session cookie remains valid. */
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

export const ADMIN_SESSION_COOKIE = "enn_admin_session";

/** Registration reference prefix: ENN-<year>-<seq> */
export const REFERENCE_PREFIX = "ENN";

/**
 * The canonical site URL, always a valid absolute URL.
 *
 * NEXT_PUBLIC_SITE_URL is typed by hand into a deployment dashboard, so it
 * regularly arrives without a scheme ("my-app.vercel.app") or with stray
 * whitespace. Passing that straight to `new URL()` throws during the build,
 * which fails the whole deployment for a cosmetic metadata value. A missing
 * scheme is assumed to be https, and anything unusable falls back.
 */
export function resolveSiteUrl(raw = process.env.NEXT_PUBLIC_SITE_URL): string {
  const fallback = "http://localhost:3000";
  const value = (raw ?? "").trim().replace(/\/+$/, "");
  if (!value) return fallback;

  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    return new URL(candidate).toString().replace(/\/$/, "");
  } catch {
    console.warn(
      `[enn] NEXT_PUBLIC_SITE_URL is not a usable URL (${JSON.stringify(raw)}). ` +
        `Falling back to ${fallback}. Set it to a full address such as https://example.com.`,
    );
    return fallback;
  }
}

/**
 * Read an environment variable, tolerating dashboard paste artefacts.
 *
 * Values pasted into a hosting dashboard frequently arrive wrapped in the
 * quotes carried over from the .env line, or with stray whitespace. Comparing
 * against such a value silently fails in ways that are very hard to diagnose,
 * so every setting compared as text is read through here.
 */
export function readEnv(name: string): string {
  return (process.env[name] ?? "").trim().replace(/^['"]|['"]$/g, "").trim();
}
