import { getStore } from "@/lib/db";
import type { Registration } from "@/lib/db/types";
import { AppError, toAppError } from "@/lib/errors";
import { registrationSchema, fieldErrorsFrom } from "@/lib/validation/schemas";
import { sendEmailInBackground } from "@/lib/email/mailer";
import { internalNotification, registrationEmail } from "@/lib/email/templates";
import { buildUpiQrDataUri } from "@/lib/payment";
import { bySessionStart, computeSessionView } from "./status";
import { toPublicDto, type PublicSessionDto } from "./dto";

// Re-exported so existing server-side imports keep working.
export { toPublicDto };
export type { PublicSessionDto };

/**
 * Application service layer: the only entry point the HTTP routes use. All
 * server-side validation and all authority over seat allocation lives here.
 */

/**
 * Sessions for the public registration page.
 *
 * Shows every future session (open, upcoming and full) plus a bounded window of
 * recently completed ones, so the calendar can render them as disabled without
 * dragging in years of history.
 */
export async function listPublicSessions(now: Date = new Date()): Promise<PublicSessionDto[]> {
  const store = await getStore();
  const all = await store.listSessions();

  // The whole delivery history is shown. The catalogue groups past sessions by
  // month and keeps them collapsed, so a long record never buries what is
  // actually bookable.
  return all
    .sort(bySessionStart)
    .map((s) => toPublicDto(computeSessionView(s, now)));
}

export async function getPublicSession(
  id: string,
  now: Date = new Date(),
): Promise<PublicSessionDto | null> {
  const store = await getStore();
  const session = await store.getSession(id);
  if (!session) return null;
  return toPublicDto(computeSessionView(session, now));
}

export interface RegistrationResult {
  registration: Registration;
  session: PublicSessionDto;
}

/**
 * Create a registration.
 *
 * Validation runs here regardless of what the client already checked, and the
 * seat is claimed by the store's atomic operation, which re-reads and
 * re-validates the session at commit time.
 */
export async function createRegistration(
  raw: unknown,
  now: Date = new Date(),
): Promise<RegistrationResult> {
  const parsed = registrationSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Please check the highlighted fields and try again.",
      fieldErrorsFrom(parsed.error),
    );
  }

  const store = await getStore();

  // A paid session cannot be booked without a payment reference. Checked here
  // rather than in the schema, because only the server knows the session's fee.
  const target = await store.getSession(parsed.data.sessionId);
  if (target && !target.isFree && !parsed.data.paymentReference.trim()) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Please complete payment and enter the transaction reference.",
      { paymentReference: "Enter the UPI or transaction reference for your payment." },
    );
  }

  try {
    const registration = await store.registerAtomically(
      {
        sessionId: parsed.data.sessionId,
        fullName: parsed.data.fullName,
        companyName: parsed.data.companyName,
        designation: parsed.data.designation,
        phoneNumber: parsed.data.phoneNumber,
        whatsappAvailable: parsed.data.whatsappAvailable,
        whatsappNumber: parsed.data.whatsappNumber,
        email: parsed.data.email,
        paymentReference: parsed.data.paymentReference,
      },
      now,
    );

    const session = await getPublicSession(parsed.data.sessionId, now);
    if (!session) throw new AppError("SESSION_NOT_FOUND");

    // The seat is committed. Confirmation email is fire-and-forget from here:
    // a mail failure must never undo a registration or surface as an error.
    const stored = await store.getSession(parsed.data.sessionId);
    if (stored) {
      const qr =
        registration.amountDue > 0
          ? await buildUpiQrDataUri(
              registration.amountDue,
              `${registration.registrationReference} ${stored.sessionName}`.slice(0, 50),
            ).catch(() => null)
          : null;

      sendEmailInBackground(registrationEmail(registration, stored, qr));

      const internal = internalNotification(
        `New registration - ${stored.sessionName}`,
        [
          `Reference:  ${registration.registrationReference}`,
          `Name:       ${registration.fullName}`,
          `Company:    ${registration.companyName}`,
          `Designation:${registration.designation}`,
          `Phone:      ${registration.phoneNumber}`,
          `Email:      ${registration.email}`,
          `Session:    ${stored.sessionName}`,
          `Seats:      ${stored.registeredCount}/${stored.maximumSeats}`,
          registration.amountDue > 0
            ? `Payment:    ${registration.amountDue} INR, reference "${registration.paymentReference}"`
            : "Payment:    free session",
        ],
      );
      if (internal) sendEmailInBackground(internal);
    }

    return { registration, session };
  } catch (err) {
    throw toAppError(err);
  }
}
