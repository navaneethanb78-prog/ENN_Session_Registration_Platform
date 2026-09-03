import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_MAX_AGE_SECONDS, readEnv } from "@/lib/config";
import { AppError } from "@/lib/errors";
import { isFirebaseAdminConfigured } from "@/lib/firebase/admin";

/**
 * Administrator authentication.
 *
 * Two verification paths, one session format:
 *
 *  - Firebase Authentication (production). The browser signs in with the
 *    Firebase client SDK and posts the resulting ID token here; the Admin SDK
 *    verifies it server-side. Only accounts carrying the `admin` custom claim,
 *    or listed in ADMIN_EMAILS, are accepted.
 *  - Email and password from environment variables (local development, and any
 *    deployment that has not yet enabled Firebase Auth).
 *
 * Either way the browser receives the same signed, HttpOnly session cookie.
 * No Firebase credential ever reaches client-side JavaScript.
 */

interface SessionPayload {
  email: string;
  issuedAt: number;
  expiresAt: number;
}

function sessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (secret && secret.length >= 16) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new AppError(
      "INTERNAL_ERROR",
      "Administrator sessions are not configured on this deployment.",
    );
  }
  return DEV_SESSION_SECRET;
}

/**
 * Development-only signing key.
 *
 * Deliberately a fixed constant rather than a random per-process value: Next.js
 * compiles each route into its own bundle (and each serverless invocation is a
 * separate process), so a random secret would be regenerated per module instance
 * and a cookie signed by one route would fail to verify in another.
 *
 * This is never reachable in production — sessionSecret() throws above unless
 * ADMIN_SESSION_SECRET is set.
 */
const DEV_SESSION_SECRET = "enn-development-only-session-secret-do-not-use-in-production";

function sign(value: string): string {
  return createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

export function createSessionToken(email: string): string {
  const now = Date.now();
  const payload: SessionPayload = {
    email,
    issuedAt: now,
    expiresAt: now + ADMIN_SESSION_MAX_AGE_SECONDS * 1000,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = sign(body);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  // Constant-time comparison, guarding against length-based short-circuits.
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    if (typeof payload.expiresAt !== "number" || Date.now() > payload.expiresAt) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Emails permitted to administer, from ADMIN_EMAILS (comma-separated). */
export function allowedEmails(): string[] {
  const raw = readEnv("ADMIN_EMAILS") || readEnv("ADMIN_EMAIL");
  return raw
    .split(",")
    // Each address is stripped too: quotes survive around individual entries
    // in a comma-separated list even when the whole value is unquoted.
    .map((e) => e.trim().replace(/^['"]|['"]$/g, "").trim().toLowerCase())
    .filter(Boolean);
}

export interface LoginAttempt {
  email: string;
  password?: string;
  idToken?: string;
}

/** Verify credentials and return the authenticated administrator's email. */
export async function authenticateAdmin(attempt: LoginAttempt): Promise<string> {
  const email = attempt.email.trim().toLowerCase();

  // --- Firebase Authentication path ---
  if (attempt.idToken && isFirebaseAdminConfigured()) {
    const { getAdminAuth } = await import("@/lib/firebase/admin");
    const auth = await getAdminAuth();
    let decoded;
    try {
      decoded = await auth.verifyIdToken(attempt.idToken, true);
    } catch {
      throw new AppError("UNAUTHORISED", "Your sign-in could not be verified. Please try again.");
    }
    const tokenEmail = (decoded.email ?? "").toLowerCase();
    const permitted = allowedEmails();
    const isAdmin = decoded.admin === true || permitted.includes(tokenEmail);
    if (!isAdmin) {
      console.warn(
        `[enn] admin sign-in refused for a verified account. ADMIN_EMAILS lists ` +
          `${permitted.length} address(es); the signed-in address was not among them. ` +
          `Check ADMIN_EMAILS is set on this deployment and matches exactly.`,
      );
      throw new AppError("UNAUTHORISED", "This account does not have administrator access.");
    }
    return tokenEmail || email;
  }

  // --- Environment credential path ---
  const expectedEmail = readEnv("ADMIN_EMAIL").toLowerCase();
  const expectedPassword = readEnv("ADMIN_PASSWORD");

  if (!expectedEmail || !expectedPassword) {
    if (process.env.NODE_ENV === "production") {
      throw new AppError(
        "UNAUTHORISED",
        "Administrator access is not configured on this deployment.",
      );
    }
    // Documented development-only credentials, so the demo is usable immediately.
    if (email === DEV_ADMIN_EMAIL && attempt.password === DEV_ADMIN_PASSWORD) {
      return email;
    }
    throw new AppError("UNAUTHORISED", "Incorrect email address or password.");
  }

  const emailOk = safeEqual(email, expectedEmail);
  const passwordOk = safeEqual(attempt.password ?? "", expectedPassword);
  if (!emailOk || !passwordOk) {
    throw new AppError("UNAUTHORISED", "Incorrect email address or password.");
  }
  return email;
}

/** Development-only fallback credentials. Never valid in production. */
export const DEV_ADMIN_EMAIL = "admin@ennconsultancy.local";
export const DEV_ADMIN_PASSWORD = "enn-admin-dev";

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Current administrator, or null. Safe to call from server components. */
export async function currentAdmin(): Promise<string | null> {
  const store = await cookies();
  const payload = verifySessionToken(store.get(ADMIN_SESSION_COOKIE)?.value);
  return payload?.email ?? null;
}

/** Throws UNAUTHORISED unless a valid admin session is present. */
export async function requireAdmin(): Promise<string> {
  const email = await currentAdmin();
  if (!email) throw new AppError("UNAUTHORISED");
  return email;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  };
}
