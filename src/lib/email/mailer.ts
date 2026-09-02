import type { Transporter } from "nodemailer";

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
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

let transporter: Transporter | null = null;

async function getTransporter(): Promise<Transporter> {
  if (transporter) return transporter;
  const nodemailer = (await import("nodemailer")).default;
  const port = Number(process.env.SMTP_PORT ?? 587);
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // 465 is implicit TLS; 587 upgrades with STARTTLS.
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });
  return transporter;
}

function fromAddress(): string {
  const name = process.env.SMTP_FROM_NAME ?? "ENN Consultancy";
  const address = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "no-reply@example.com";
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
      replyTo: process.env.SMTP_REPLY_TO || undefined,
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
 * Fire a message without making the caller wait for the SMTP round trip, and
 * without letting a rejection escape into the request.
 */
export function sendEmailInBackground(message: EmailMessage): void {
  void sendEmail(message).catch(() => undefined);
}
