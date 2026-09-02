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
