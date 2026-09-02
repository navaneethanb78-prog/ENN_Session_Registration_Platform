/**
 * Send a test confirmation, to check SMTP settings without registering anyone.
 *
 *   npm run test:email -- you@yourcompany.com
 *
 * Sends the real registration template against a sample session, so what you
 * receive is exactly what a registrant would get.
 */
import "./load-env";
import { isEmailConfigured, sendEmail } from "../src/lib/email/mailer";
import { registrationEmail } from "../src/lib/email/templates";
import { buildUpiQrDataUri, isUpiConfigured } from "../src/lib/payment";
import type { Registration, TrainingSession } from "../src/lib/db/types";

const recipient = process.argv[2];

const SAMPLE_SESSION: TrainingSession = {
  id: "sample",
  sessionName: "ISO 9001:2026 Transition Awareness (test)",
  topic: "Quality Management Systems",
  description: "",
  date: "2026-09-30",
  startTime: "10:00",
  endTime: "12:30",
  timezone: "Asia/Kolkata",
  startAt: "2026-09-30T04:30:00.000Z",
  endAt: "2026-09-30T07:00:00.000Z",
  location: "Coimbatore — ENN Consultancy",
  mode: "IN_PERSON",
  maximumSeats: 25,
  registeredCount: 4,
  isFree: false,
  price: 4500,
  status: "OPEN",
  registrationDeadline: null,
  isActive: true,
  createdAt: "",
  updatedAt: "",
};

function sampleRegistration(email: string): Registration {
  return {
    id: "sample",
    sessionId: "sample",
    registrationReference: "ENN-2026-TEST1",
    fullName: "Test Registrant",
    companyName: "Test Company",
    designation: "Quality Manager",
    phoneNumber: "+919876543210",
    whatsappAvailable: true,
    whatsappNumber: "+919876543210",
    email,
    registrationStatus: "CONFIRMED",
    attendanceStatus: "PENDING",
    paymentStatus: "PENDING",
    paymentReference: "TESTUTR123456",
    amountDue: 4500,
    notes: "",
    registeredAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

async function main() {
  if (!recipient || !recipient.includes("@")) {
    console.error("\n  Usage: npm run test:email -- you@yourcompany.com\n");
    process.exit(1);
  }

  console.log(`\n  SMTP configured: ${isEmailConfigured() ? "yes" : "NO"}`);
  console.log(`  UPI configured:  ${isUpiConfigured() ? "yes" : "no (QR will be omitted)"}`);

  if (!isEmailConfigured()) {
    console.error(
      "\n  SMTP_HOST, SMTP_USER and SMTP_PASSWORD must all be set in .env.local.\n" +
        "  Nothing will be sent until they are.\n",
    );
    process.exit(1);
  }

  console.log(`  Host: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT ?? 587}`);
  console.log(`  From: ${process.env.SMTP_FROM ?? process.env.SMTP_USER}`);
  console.log(`  To:   ${recipient}\n`);

  const qr = await buildUpiQrDataUri(4500, "ENN-2026-TEST1 sample session").catch(() => null);
  const sent = await sendEmail(registrationEmail(sampleRegistration(recipient), SAMPLE_SESSION, qr));

  if (sent) {
    console.log("  Sent. Check the inbox (and the spam folder on a first send).\n");
  } else {
    console.error("  Not sent — see the error above for the reason.\n");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
