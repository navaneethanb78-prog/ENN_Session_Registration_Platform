import { BRAND } from "@/lib/config";
import type { InHouseRequest, Registration, TrainingSession } from "@/lib/db/types";
import { formatRupees } from "@/lib/payment";
import { formatSessionDate, formatTimeRange, timeZoneLabel } from "@/lib/time";
import type { EmailMessage } from "./mailer";

/**
 * Email bodies. Every message goes out as both HTML and plain text, because a
 * confirmation someone may need to show at reception has to survive any client.
 */

const BRAND_COLOUR = "#16314b";

function layout(heading: string, intro: string, body: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f6f8fa;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#262d38;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #dde1e6;">
    <tr><td style="padding:24px 28px;border-bottom:1px solid #eef0f2;">
      <p style="margin:0;font-size:17px;font-weight:600;color:${BRAND_COLOUR};">${BRAND.name}</p>
      <p style="margin:4px 0 0;font-size:11px;letter-spacing:1.4px;text-transform:uppercase;color:#8d97a5;">${BRAND.tagline}</p>
    </td></tr>
    <tr><td style="padding:28px;">
      <h1 style="margin:0 0 12px;font-size:20px;font-weight:600;color:${BRAND_COLOUR};">${heading}</h1>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">${intro}</p>
      ${body}
    </td></tr>
    <tr><td style="padding:18px 28px;border-top:1px solid #eef0f2;font-size:12px;color:#8d97a5;">
      This is an automated confirmation from ${BRAND.name}. Please reply to this email if anything looks wrong.
    </td></tr>
  </table>
</body></html>`;
}

function detailTable(rows: [string, string][]): string {
  const cells = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#667080;white-space:nowrap;vertical-align:top;">${label}</td><td style="padding:6px 0;font-weight:500;color:#262d38;">${value}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;">${cells}</table>`;
}

/** Confirmation for a seat at a scheduled session. */
export function registrationEmail(
  registration: Registration,
  session: TrainingSession,
  qrDataUri?: string | null,
): EmailMessage {
  const dateLabel = formatSessionDate(session.startAt, session.timezone);
  const timeLabel = `${formatTimeRange(session.startAt, session.endAt, session.timezone)} (${timeZoneLabel(session.timezone)})`;
  const venue = session.location || "the venue confirmed with you";
  const firstName = registration.fullName.split(" ")[0] ?? registration.fullName;

  const rows: [string, string][] = [
    ["Reference", registration.registrationReference],
    ["Session", session.sessionName],
    ["Date", dateLabel],
    ["Time", timeLabel],
    ["Venue", venue],
    ["Name", registration.fullName],
    ["Company", registration.companyName],
  ];

  let paymentBlock = "";
  let paymentText = "";

  if (registration.amountDue > 0) {
    rows.push(["Fee", formatRupees(registration.amountDue)]);
    rows.push([
      "Payment",
      registration.paymentReference
        ? `Reference ${registration.paymentReference} - awaiting confirmation`
        : "Awaiting payment",
    ]);

    const qrImage = qrDataUri
      ? `<div style="margin-top:14px;text-align:center;"><img src="cid:payment-qr" alt="UPI payment QR code" width="200" height="200" style="border-radius:8px;" /></div>`
      : "";
    const qrCopy = qrDataUri
      ? "Scan the code below from any UPI app - the amount is already filled in."
      : "Our team will send payment details shortly.";

    paymentBlock = `<div style="margin-top:22px;padding:16px;border:1px solid #f0d9a8;background:#fdf8ec;border-radius:8px;"><p style="margin:0 0 6px;font-size:14px;font-weight:600;color:#7a5a12;">Payment</p><p style="margin:0;font-size:14px;line-height:1.6;color:#7a5a12;">Your place is held pending payment of ${formatRupees(registration.amountDue)}. ${qrCopy}</p>${qrImage}</div>`;
    paymentText = `Payment: ${formatRupees(registration.amountDue)} is due to confirm your place.`;
  }

  const closing = `<p style="margin:22px 0 0;font-size:14px;line-height:1.6;color:#4c5665;">Please keep your reference <strong>${registration.registrationReference}</strong> for your records, and bring it with you on the day.</p>`;

  const html = layout(
    "Registration confirmed",
    `Thank you for your registration for our <strong>${session.sessionName}</strong>. We are excited to see you at <strong>${venue}</strong> on <strong>${dateLabel}</strong>.`,
    detailTable(rows) + paymentBlock + closing,
  );

  const text = [
    `Registration confirmed - ${BRAND.name}`,
    "",
    `Dear ${firstName},`,
    "",
    `Thank you for your registration for our ${session.sessionName}. We are excited to see you at ${venue} on ${dateLabel}.`,
    "",
    `Reference: ${registration.registrationReference}`,
    `Session:   ${session.sessionName}`,
    `Date:      ${dateLabel}`,
    `Time:      ${timeLabel}`,
    `Venue:     ${venue}`,
    paymentText,
    "",
    "Please keep your reference for your records, and bring it with you on the day.",
    "",
    BRAND.name,
  ]
    .filter((line) => line !== "")
    .join("\n");

  return {
    to: registration.email,
    subject: `Registration confirmed - ${session.sessionName} on ${dateLabel}`,
    html,
    text,
    attachments: qrDataUri
      ? [{ filename: "payment-qr.png", cid: "payment-qr", dataUri: qrDataUri }]
      : undefined,
  };
}

/** Acknowledgement for a request to run programmes at the client's own site. */
export function inHouseRequestEmail(request: InHouseRequest): EmailMessage {
  const firstName = request.fullName.split(" ")[0] ?? request.fullName;
  const programmes = request.programmes.join(", ");
  const plural = request.programmes.length === 1 ? "programme" : "programmes";

  const rows: [string, string][] = [
    ["Reference", request.requestReference],
    ["Programmes", programmes],
    ["Participants", String(request.participants)],
    ["Location", request.venueCity],
    ["Preferred timing", request.preferredTimeframe],
    ["Company", request.companyName],
  ];

  const closing = `<p style="margin:22px 0 0;font-size:14px;line-height:1.6;color:#4c5665;">Once we have agreed the details we will schedule your session, and your colleagues will each be able to register and pay individually.</p>`;

  const html = layout(
    "Request received",
    `Thank you for your interest in our <strong>${programmes}</strong> ${plural}. Our team will contact you shortly to agree a date, agenda and cost for delivering this at <strong>${request.venueCity}</strong>.`,
    detailTable(rows) + closing,
  );

  const text = [
    `Request received - ${BRAND.name}`,
    "",
    `Dear ${firstName},`,
    "",
    `Thank you for your interest in our ${programmes} ${plural}. Our team will contact you shortly to agree a date, agenda and cost for delivering this at ${request.venueCity}.`,
    "",
    `Reference:        ${request.requestReference}`,
    `Programmes:       ${programmes}`,
    `Participants:     ${request.participants}`,
    `Location:         ${request.venueCity}`,
    `Preferred timing: ${request.preferredTimeframe}`,
    "",
    "Once we have agreed the details we will schedule your session, and your colleagues will each be able to register and pay individually.",
    "",
    BRAND.name,
  ].join("\n");

  return {
    to: request.email,
    subject: `We have received your training request - ${request.requestReference}`,
    html,
    text,
  };
}

/** Internal copy, so the office sees activity without watching the dashboard. */
export function internalNotification(subject: string, lines: string[]): EmailMessage | null {
  const to = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!to) return null;
  const body = `<pre style="font-size:13px;line-height:1.6;white-space:pre-wrap;">${lines.join("\n")}</pre>`;
  return { to, subject, text: lines.join("\n"), html: layout(subject, "", body) };
}

/**
 * Announcement of a newly scheduled session, sent to everyone on record.
 *
 * Personalised by name, and carries an opt-out line: these are past registrants
 * and enquirers rather than a purchased list, but anyone we mail must still be
 * able to tell us to stop.
 */
export function sessionAnnouncementEmail(
  recipient: { email: string; fullName: string },
  session: TrainingSession,
  registerUrl: string,
): EmailMessage {
  const firstName = recipient.fullName.split(" ")[0] ?? "there";
  const dateLabel = formatSessionDate(session.startAt, session.timezone);
  const timeLabel = `${formatTimeRange(session.startAt, session.endAt, session.timezone)} (${timeZoneLabel(session.timezone)})`;
  const venue = session.location || "a venue we will confirm";
  const feeLabel = session.isFree ? "This session is free to attend." : `Fee: ${formatRupees(session.price)} per participant.`;

  const rows: [string, string][] = [
    ["Session", session.sessionName],
    ["Topic", session.topic],
    ["Date", dateLabel],
    ["Time", timeLabel],
    ["Venue", venue],
    ["Seats", `${session.maximumSeats} available`],
  ];

  const cta = `<p style="margin:24px 0 0;"><a href="${registerUrl}" style="display:inline-block;background:${BRAND_COLOUR};color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:15px;font-weight:600;">Register for this session</a></p>`;
  const optOut = `<p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#8d97a5;">You are receiving this because you previously registered for, or enquired about, an ENN Consultancy programme. Reply with "unsubscribe" and we will not email you about future sessions.</p>`;

  const html = layout(
    "A new session has been scheduled",
    `Dear ${firstName}, we are running <strong>${session.sessionName}</strong> on <strong>${dateLabel}</strong> at <strong>${venue}</strong>. ${feeLabel} If you are interested, you can register using the link below.`,
    detailTable(rows) + cta + optOut,
  );

  const text = [
    `A new session has been scheduled - ${BRAND.name}`,
    "",
    `Dear ${firstName},`,
    "",
    `We are running ${session.sessionName} on ${dateLabel} at ${venue}. ${feeLabel}`,
    "",
    `Session: ${session.sessionName}`,
    `Topic:   ${session.topic}`,
    `Date:    ${dateLabel}`,
    `Time:    ${timeLabel}`,
    `Venue:   ${venue}`,
    `Seats:   ${session.maximumSeats} available`,
    "",
    `If you are interested, please register here: ${registerUrl}`,
    "",
    "You are receiving this because you previously registered for, or enquired about, an ENN Consultancy programme.",
    'Reply with "unsubscribe" and we will not email you about future sessions.',
    "",
    BRAND.name,
  ].join("\n");

  return {
    to: recipient.email,
    subject: `New session: ${session.sessionName} on ${dateLabel}`,
    html,
    text,
  };
}

/** Sent once an administrator has verified a payment against the bank statement. */
export function paymentConfirmedEmail(
  registration: Registration,
  session: TrainingSession,
): EmailMessage {
  const firstName = registration.fullName.split(" ")[0] ?? registration.fullName;
  const dateLabel = formatSessionDate(session.startAt, session.timezone);
  const timeLabel = `${formatTimeRange(session.startAt, session.endAt, session.timezone)} (${timeZoneLabel(session.timezone)})`;
  const venue = session.location || "the venue confirmed with you";

  const rows: [string, string][] = [
    ["Reference", registration.registrationReference],
    ["Amount received", formatRupees(registration.amountDue)],
    ["Payment reference", registration.paymentReference || "—"],
    ["Session", session.sessionName],
    ["Date", dateLabel],
    ["Time", timeLabel],
    ["Venue", venue],
  ];

  const closing = `<p style="margin:22px 0 0;font-size:14px;line-height:1.6;color:#4c5665;">Your seat is now fully confirmed. Please bring your reference <strong>${registration.registrationReference}</strong> with you on the day.</p>`;

  const html = layout(
    "Payment received",
    `Thank you, ${firstName} — we have received your payment of <strong>${formatRupees(registration.amountDue)}</strong> for <strong>${session.sessionName}</strong>. We look forward to seeing you at <strong>${venue}</strong> on <strong>${dateLabel}</strong>.`,
    detailTable(rows) + closing,
  );

  const text = [
    `Payment received - ${BRAND.name}`,
    "",
    `Dear ${firstName},`,
    "",
    `Thank you - we have received your payment of ${formatRupees(registration.amountDue)} for ${session.sessionName}. We look forward to seeing you at ${venue} on ${dateLabel}.`,
    "",
    `Reference:         ${registration.registrationReference}`,
    `Amount received:   ${formatRupees(registration.amountDue)}`,
    `Payment reference: ${registration.paymentReference || "-"}`,
    `Session:           ${session.sessionName}`,
    `Date:              ${dateLabel}`,
    `Time:              ${timeLabel}`,
    `Venue:             ${venue}`,
    "",
    "Your seat is now fully confirmed. Please bring your reference with you on the day.",
    "",
    BRAND.name,
  ].join("\n");

  return {
    to: registration.email,
    subject: `Payment received - ${session.sessionName}`,
    html,
    text,
  };
}
