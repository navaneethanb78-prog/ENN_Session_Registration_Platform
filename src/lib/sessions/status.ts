import { LOW_SEAT_ABSOLUTE, SEAT_THRESHOLDS } from "@/lib/config";
import type { EffectiveSessionStatus, TrainingSession } from "@/lib/db/types";

export type AvailabilityLevel = "GOOD" | "MODERATE" | "LOW" | "NONE";

export interface SessionView {
  session: TrainingSession;
  status: EffectiveSessionStatus;
  remainingSeats: number;
  occupiedRatio: number;
  availability: AvailabilityLevel;
  /** True only when a registration may be created right now. */
  canRegister: boolean;
  /** Short, human phrase for the current availability, e.g. "8 seats remaining". */
  availabilityLabel: string;
  /** Explains why registration is unavailable, when it is. */
  blockedReason: string | null;
  isPast: boolean;
}

/**
 * The one place session status is decided.
 *
 * Precedence (documented in the README):
 *   1. Explicitly cancelled            -> CANCELLED
 *   2. End time has passed             -> COMPLETED
 *   3. Seats exhausted                 -> FULL
 *   4. Not open for registration yet /
 *      deadline passed / deactivated   -> UPCOMING
 *   5. Otherwise                       -> OPEN
 *
 * COMPLETED is derived from the clock, so a session becomes completed the moment
 * its end time passes with no administrator action. The stored `status` field
 * still exists so an admin can force CANCELLED (or pre-emptively FULL).
 */
export function computeSessionView(session: TrainingSession, now: Date = new Date()): SessionView {
  const remainingSeats = Math.max(0, session.maximumSeats - session.registeredCount);
  const occupiedRatio =
    session.maximumSeats > 0
      ? Math.min(1, session.registeredCount / session.maximumSeats)
      : 1;

  const endAt = new Date(session.endAt);
  const isPast = now.getTime() >= endAt.getTime();

  const deadlinePassed =
    session.registrationDeadline !== null &&
    now.getTime() >= new Date(session.registrationDeadline).getTime();

  let status: EffectiveSessionStatus;
  let blockedReason: string | null = null;

  if (session.status === "CANCELLED") {
    status = "CANCELLED";
    blockedReason = "This session has been cancelled.";
  } else if (isPast) {
    status = "COMPLETED";
    blockedReason = "This session has already been completed.";
  } else if (remainingSeats <= 0) {
    status = "FULL";
    blockedReason = "This session has reached maximum capacity.";
  } else if (!session.isActive) {
    status = "UPCOMING";
    blockedReason = "Registration for this session is not open yet.";
  } else if (deadlinePassed) {
    status = "UPCOMING";
    blockedReason = "The registration deadline for this session has passed.";
  } else {
    status = "OPEN";
  }

  const canRegister = status === "OPEN";

  return {
    session,
    status,
    remainingSeats,
    occupiedRatio,
    availability: availabilityLevel(remainingSeats, occupiedRatio),
    canRegister,
    availabilityLabel: availabilityLabelFor(status, remainingSeats),
    blockedReason,
    isPast,
  };
}

function availabilityLevel(remainingSeats: number, occupiedRatio: number): AvailabilityLevel {
  if (remainingSeats <= 0) return "NONE";
  if (occupiedRatio >= SEAT_THRESHOLDS.low || remainingSeats <= LOW_SEAT_ABSOLUTE) return "LOW";
  if (occupiedRatio >= SEAT_THRESHOLDS.moderate) return "MODERATE";
  return "GOOD";
}

function availabilityLabelFor(status: EffectiveSessionStatus, remainingSeats: number): string {
  switch (status) {
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    case "FULL":
      return "Session Full";
    case "UPCOMING":
      return "Registration not open";
    case "OPEN":
      return remainingSeats === 1 ? "1 seat remaining" : `${remainingSeats} seats remaining`;
  }
}

/**
 * The message shown when someone interacts with a completed session. Built from
 * the session's own name and topic — never hard-coded per session.
 */
export function completedSessionMessage(session: TrainingSession, dateLabel: string): string {
  return `The ${session.sessionName} session scheduled for ${dateLabel} has already been completed for registered members on this topic.`;
}

export const STATUS_LABEL: Record<EffectiveSessionStatus, string> = {
  OPEN: "Registration Open",
  UPCOMING: "Upcoming",
  FULL: "Session Full",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

/** Sort helper: soonest first. */
export function bySessionStart(a: TrainingSession, b: TrainingSession): number {
  return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
}
