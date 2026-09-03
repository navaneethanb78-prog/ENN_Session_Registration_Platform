import { after } from "next/server";
import type { Transporter } from "nodemailer";
import { readEnv } from "@/lib/config";

/**
 * Outbound email.
 *
 * Two rules govern this module:
 *
 *  1. Sending is never allowed to fail a registration. The seat is already
 *     committed by the time we get here; a mail outage must not roll that back
 *     or surface an error to someone who is genuinely registered.
 *  2. It degrades silently but visibly. With no SMTP configuration the message
 *     is logged instead of sent, so local development and an unconfigured
 *     deployment both keep working.
 */

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Optional inline images, keyed by the cid referenced in the HTML. */
  attachments?: { filename: string; cid: string; dataUri: string }[];
}

export function isEmailConfigured(): boolean {
  return Boolean(readEnv("SMTP_HOST") && readEnv("SMTP_USER") && readEnv("SMTP_PASSWORD"));
}

let transporter: Transporter | null = null;

async function getTransporter(): Promise<Transporter> {
  if (transporter) return transporter;
  const nodemailer = (await import("nodemailer")).default;
  // Read through readEnv: a password pasted into a hosting dashboard often
  // keeps the quotes from its .env line, which fails authentication with a
  // misleading "bad credentials" error.
  const port = Number(readEnv("SMTP_PORT") || 587);
  transporter = nodemailer.createTransport({
    host: readEnv("SMTP_HOST"),
    port,
    // 465 is implicit TLS; 587 upgrades with STARTTLS.
    secure: port === 465,
    auth: { user: readEnv("SMTP_USER"), pass: readEnv("SMTP_PASSWORD") },
  });
  return transporter;
}

function fromAddress(): string {
  const name = readEnv("SMTP_FROM_NAME") || "ENN Consultancy";
  const address = readEnv("SMTP_FROM") || readEnv("SMTP_USER") || "no-reply@example.com";
  return `"${name}" <${address}>`;
}

/**
 * Send a message. Resolves to whether it was actually sent; never throws.
 */
export async function sendEmail(message: EmailMessage): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.info(
      `[enn][email] SMTP is not configured — not sending "${message.subject}" to ${message.to}. ` +
        "Set SMTP_HOST, SMTP_USER and SMTP_PASSWORD to enable delivery.",
    );
    return false;
  }

  try {
    const mail = await getTransporter();
    await mail.sendMail({
      from: fromAddress(),
      to: message.to,
      replyTo: readEnv("SMTP_REPLY_TO") || undefined,
      subject: message.subject,
      text: message.text,
      html: message.html,
      attachments: message.attachments?.map((a) => ({
        filename: a.filename,
        cid: a.cid,
        path: a.dataUri,
      })),
    });
    return true;
  } catch (err) {
    // Deliberately swallowed: the registration is already committed.
    console.error(`[enn][email] failed to send "${message.subject}" to ${message.to}:`, err);
    return false;
  }
}

/**
 * Send after the response, without making the caller wait for the SMTP round
 * trip and without letting a rejection escape into the request.
 *
 * `after()` is essential on a serverless host. A plain floating promise works
 * on a long-lived Node process, but a serverless function is frozen the moment
 * its response is returned — which killed the SMTP connection mid-handshake and
 * silently delivered nothing. `after()` keeps the invocation alive until the
 * work finishes.
 *
 * Outside a request (a script, a test) `after()` has nothing to attach to, so
 * the send is awaited in the background instead.
 */
export function sendEmailInBackground(message: EmailMessage): void {
  try {
    after(async () => {
      await sendEmail(message);
    });
  } catch {
    void sendEmail(message).catch(() => undefined);
  }
}

/**
 * Open a real connection and authenticate, without sending anything.
 *
 * isEmailConfigured() only reports that the settings exist. This answers the
 * question that actually matters after a deployment: will the mail server
 * accept us? The returned reason is for an operator, so it is never shown to a
 * visitor.
 */
export async function verifyEmailConnection(): Promise<{ ok: boolean; reason?: string }> {
  if (!isEmailConfigured()) return { ok: false, reason: "SMTP settings are not all present" };
  try {
    const mail = await getTransporter();
    await mail.verify();
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[enn][email] SMTP verification failed:", message);
    return { ok: false, reason: message.slice(0, 200) };
  }
}
