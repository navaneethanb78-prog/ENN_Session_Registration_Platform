import { createHash } from "node:crypto";
import { REFERENCE_PREFIX } from "@/lib/config";
import { AppError } from "@/lib/errors";
import { computeSessionView } from "@/lib/sessions/status";
import type { RegistrationInput, TrainingSession } from "./types";

/**
 * Rules enforced *inside* the transaction, by every adapter.
 *
 * The client's view of seat availability is only a hint. This runs against the
 * freshly-read session document at commit time, which is what makes overbooking
 * impossible even when two people claim the final seat simultaneously.
 */
export function assertRegistrable(session: TrainingSession | null, now: Date): TrainingSession {
  if (!session) throw new AppError("SESSION_NOT_FOUND");

  const view = computeSessionView(session, now);
  switch (view.status) {
    case "CANCELLED":
      throw new AppError("SESSION_CANCELLED");
    case "COMPLETED":
      throw new AppError("SESSION_COMPLETED");
    case "FULL":
      throw new AppError("SESSION_FULL");
    case "UPCOMING":
      throw new AppError("REGISTRATION_CLOSED");
    case "OPEN":
      return session;
  }
}

/**
 * Deterministic document id for a (session, email) pair.
 *
 * Using a derived id rather than a query makes duplicate detection a single
 * transactional read, and lets Firestore's create-if-absent semantics reject a
 * double submission even under a race.
 */
export function duplicateKey(sessionId: string, email: string): string {
  const digest = createHash("sha256").update(`${sessionId}|${email.toLowerCase()}`).digest("hex");
  return digest.slice(0, 32);
}

/** ENN-2026-00124 */
export function formatReference(year: number, sequence: number): string {
  return `${REFERENCE_PREFIX}-${year}-${String(sequence).padStart(5, "0")}`;
}

/** ENN-IH-2026-00007 — a separate series from seat registrations. */
export function formatInHouseReference(year: number, sequence: number): string {
  return `${REFERENCE_PREFIX}-IH-${year}-${String(sequence).padStart(5, "0")}`;
}

/** Build the registration record once the seat has been secured. */
export function buildRegistration(
  id: string,
  input: RegistrationInput,
  reference: string,
  now: Date,
  session: TrainingSession,
) {
  const iso = now.toISOString();
  return {
    id,
    sessionId: input.sessionId,
    registrationReference: reference,
    fullName: input.fullName,
    companyName: input.companyName,
    designation: input.designation,
    phoneNumber: input.phoneNumber,
    whatsappAvailable: input.whatsappAvailable,
    whatsappNumber: input.whatsappNumber ?? input.phoneNumber,
    email: input.email,
    registrationStatus: "CONFIRMED" as const,
    attendanceStatus: "PENDING" as const,
    // Free sessions need no reconciliation; paid ones await an administrator
    // matching the reference against the bank statement.
    paymentStatus: session.isFree ? ("NOT_REQUIRED" as const) : ("PENDING" as const),
    paymentReference: session.isFree ? "" : (input.paymentReference ?? ""),
    amountDue: session.isFree ? 0 : session.price,
    notes: "",
    registeredAt: iso,
    updatedAt: iso,
  };
}

/**
 * Seat count after a successful claim, plus whether the session is now full.
 * Kept here so both adapters flip `status` to FULL on exactly the same condition.
 */
export function applySeatClaim(session: TrainingSession, now: Date) {
  const registeredCount = session.registeredCount + 1;
  const isFull = registeredCount >= session.maximumSeats;
  return {
    registeredCount,
    status: isFull ? ("FULL" as const) : session.status,
    updatedAt: now.toISOString(),
  };
}
