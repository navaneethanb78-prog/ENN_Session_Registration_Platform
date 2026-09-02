import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { DEFAULT_TIMEZONE } from "./config";

/**
 * Session times are authored as a wall-clock date + time in the session's own
 * timezone (e.g. 15 Sep 2026, 10:00, Asia/Kolkata). We convert those to absolute
 * UTC instants for storage/comparison, and always format back in the session
 * timezone for display. The browser's local timezone is never used to decide
 * whether a session has completed.
 */

/** "2026-09-15" + "10:00" in `timeZone` -> absolute UTC Date. */
export function zonedDateTimeToUtc(date: string, time: string, timeZone: string): Date {
  return fromZonedTime(`${date}T${padTime(time)}:00`, timeZone);
}

function padTime(time: string): string {
  const [h = "00", m = "00"] = time.split(":");
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
}

/** Format an instant in the session's timezone. */
export function formatInZone(instant: Date | string, pattern: string, timeZone = DEFAULT_TIMEZONE): string {
  return formatInTimeZone(typeof instant === "string" ? new Date(instant) : instant, timeZone, pattern);
}

/** "15 September 2026" */
export function formatSessionDate(instant: Date | string, timeZone = DEFAULT_TIMEZONE): string {
  return formatInZone(instant, "d MMMM yyyy", timeZone);
}

/** "10:00 AM" */
export function formatSessionTime(instant: Date | string, timeZone = DEFAULT_TIMEZONE): string {
  return formatInZone(instant, "h:mm a", timeZone);
}

/** "10:00 AM – 12:00 PM" */
export function formatTimeRange(start: Date | string, end: Date | string, timeZone = DEFAULT_TIMEZONE): string {
  return `${formatSessionTime(start, timeZone)} – ${formatSessionTime(end, timeZone)}`;
}

/** Calendar day key ("2026-09-15") of an instant, in the session timezone. */
export function zonedDayKey(instant: Date | string, timeZone = DEFAULT_TIMEZONE): string {
  return formatInZone(instant, "yyyy-MM-dd", timeZone);
}

/** Month key ("2026-09") of an instant, in the session timezone. */
export function zonedMonthKey(instant: Date | string, timeZone = DEFAULT_TIMEZONE): string {
  return formatInZone(instant, "yyyy-MM", timeZone);
}

/** Today's calendar day in the given timezone. */
export function todayInZone(timeZone = DEFAULT_TIMEZONE, now: Date = new Date()): string {
  return zonedDayKey(now, timeZone);
}

/** Wall-clock representation of an instant, for calendar grid maths. */
export function zonedParts(instant: Date | string, timeZone = DEFAULT_TIMEZONE) {
  const d = toZonedTime(typeof instant === "string" ? new Date(instant) : instant, timeZone);
  return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
}

/**
 * Common IANA zones mapped to the abbreviation people actually recognise.
 *
 * Deliberately a fixed table rather than an Intl lookup: Intl's short timezone
 * name is locale- and platform-dependent, so Node with full ICU renders "IST"
 * while a browser renders "GMT+5:30" for the same instant. Rendering different
 * text on the server and the client is a hydration mismatch, so the label has
 * to be computed the same way in both places.
 */
const TIMEZONE_LABELS: Record<string, string> = {
  "Asia/Kolkata": "IST",
  "Asia/Calcutta": "IST",
  "Asia/Colombo": "IST",
  "Asia/Dubai": "GST",
  "Asia/Singapore": "SGT",
  "Asia/Tokyo": "JST",
  "Australia/Sydney": "AEST",
  "Europe/London": "UK time",
  "Europe/Berlin": "CET",
  "America/New_York": "ET",
  "America/Chicago": "CT",
  "America/Los_Angeles": "PT",
  UTC: "UTC",
};

/** Short, stable timezone label, e.g. "IST". Identical on server and client. */
export function timeZoneLabel(timeZone = DEFAULT_TIMEZONE): string {
  return TIMEZONE_LABELS[timeZone] ?? timeZone;
}
