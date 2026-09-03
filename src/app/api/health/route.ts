import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { isEmailConfigured, verifyEmailConnection } from "@/lib/email/mailer";
import { isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { isUpiConfigured } from "@/lib/payment";
import { allowedEmails } from "@/lib/auth/admin";

/**
 * Deployment health.
 *
 * Reports whether each piece of configuration is present and whether the
 * database actually answers — the questions you need after a deploy, which a
 * generic error page cannot tell you.
 *
 * Deliberately returns booleans and counts only. No configuration values, no
 * error text, nothing about registrants. Failure detail is logged server-side
 * where only an operator can read it.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // ?verify=smtp opens a real connection to the mail server. Kept opt-in so the
  // ordinary health check stays fast and does not authenticate on every poll.
  const verifySmtp = new URL(request.url).searchParams.get("verify") === "smtp";
  const checks: Record<string, unknown> = {
    firebaseAdminConfigured: isFirebaseAdminConfigured(),
    emailConfigured: isEmailConfigured(),
    upiConfigured: isUpiConfigured(),
    adminSessionSecretSet: Boolean(process.env.ADMIN_SESSION_SECRET),
    // Count only. If this is 0, no account can sign in to the admin area.
    adminEmailsConfigured: allowedEmails().length,
    siteUrlSet: Boolean(process.env.NEXT_PUBLIC_SITE_URL),
  };

  try {
    const store = await getStore();
    const sessions = await store.listSessions();
    checks.store = store.name;
    checks.databaseReachable = true;
    checks.sessionCount = sessions.length;
  } catch (err) {
    console.error("[enn][health] database unreachable:", err);
    checks.databaseReachable = false;
    checks.store = isFirebaseAdminConfigured() ? "firestore" : "local";
  }

  if (verifySmtp) {
    const result = await verifyEmailConnection();
    checks.smtpConnectionOk = result.ok;
    if (!result.ok) checks.smtpFailureReason = result.reason;
  }

  const healthy = checks.databaseReachable === true;
  return NextResponse.json(
    { status: healthy ? "ok" : "degraded", checks },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
