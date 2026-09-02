import { getStore } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { sendEmail } from "./mailer";
import { sessionAnnouncementEmail } from "./templates";

/**
 * Announce a session to everyone on record.
 *
 * Bulk sending is throttled deliberately: providers rate-limit hard, and a
 * burst of a few hundred messages is a reliable way to get a domain
 * temporarily blocked. Messages go one at a time with a short gap, and a
 * failure to one recipient never stops the rest.
 */

const BATCH_SIZE = 10;
const PAUSE_BETWEEN_BATCHES_MS = 1200;

export interface AnnouncementResult {
  recipients: number;
  sent: number;
  failed: number;
}

function registerUrl(): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/register`;
}

/** Who would receive an announcement, without sending anything. */
export async function announcementAudience(): Promise<{ email: string; fullName: string }[]> {
  const store = await getStore();
  return store.listContactEmails();
}

export async function announceSession(sessionId: string): Promise<AnnouncementResult> {
  const store = await getStore();
  const session = await store.getSession(sessionId);
  if (!session) throw new AppError("SESSION_NOT_FOUND");

  const audience = await store.listContactEmails();
  const url = registerUrl();

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < audience.length; i += BATCH_SIZE) {
    const batch = audience.slice(i, i + BATCH_SIZE);
    const outcomes = await Promise.all(
      batch.map((recipient) => sendEmail(sessionAnnouncementEmail(recipient, session, url))),
    );
    for (const ok of outcomes) (ok ? sent++ : failed++);

    if (i + BATCH_SIZE < audience.length) {
      await new Promise((resolve) => setTimeout(resolve, PAUSE_BETWEEN_BATCHES_MS));
    }
  }

  return { recipients: audience.length, sent, failed };
}
