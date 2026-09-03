import { NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { isEmailConfigured } from "@/lib/email/mailer";
import { isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { isUpiConfigured } from "@/lib/payment";

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

export async function GET() {
  const checks: Record<string, unknown> = {
    firebaseAdminConfigured: isFirebaseAdminConfigured(),
    emailConfigured: isEmailConfigured(),
    upiConfigured: isUpiConfigured(),
    adminSessionSecretSet: Boolean(process.env.ADMIN_SESSION_SECRET),
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

  const healthy = checks.databaseReachable === true;
  return NextResponse.json(
    { status: healthy ? "ok" : "degraded", checks },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
