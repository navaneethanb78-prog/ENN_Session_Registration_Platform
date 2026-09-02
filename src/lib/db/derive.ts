import { randomUUID } from "node:crypto";
import { zonedDateTimeToUtc } from "@/lib/time";
import type { CreateSessionInput, TrainingSession } from "./types";

/**
 * Fill in fields that may be absent on documents written before those fields
 * existed.
 *
 * Adding a field to the model does not retrofit it onto rows already in the
 * database, so every read goes through here. The defaults are deliberately the
 * safe direction: a session with no recorded fee is treated as free, because
 * showing or demanding a price that was never configured would be far worse
 * than showing none.
 */
export function hydrateSession(raw: TrainingSession): TrainingSession {
  const price = typeof raw.price === "number" && Number.isFinite(raw.price) ? raw.price : 0;
  return {
    ...raw,
    price,
    isFree: typeof raw.isFree === "boolean" ? raw.isFree : price <= 0,
    registeredCount: typeof raw.registeredCount === "number" ? raw.registeredCount : 0,
    maximumSeats: typeof raw.maximumSeats === "number" ? raw.maximumSeats : 0,
  };
}

/**
 * Turn authored session input (wall-clock date/time + timezone) into a stored
 * record with absolute UTC instants. Derived fields are computed in exactly one
 * place so the two adapters cannot drift.
 */
export function materialiseSession(
  input: CreateSessionInput,
  existing?: TrainingSession,
  now: Date = new Date(),
): TrainingSession {
  const startAt = zonedDateTimeToUtc(input.date, input.startTime, input.timezone);
  const endAt = zonedDateTimeToUtc(input.date, input.endTime, input.timezone);
  const iso = now.toISOString();

  return {
    id: existing?.id ?? randomUUID(),
    sessionName: input.sessionName,
    topic: input.topic,
    description: input.description,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    timezone: input.timezone,
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    location: input.location,
    mode: input.mode,
    maximumSeats: input.maximumSeats,
    registeredCount: input.registeredCount ?? existing?.registeredCount ?? 0,
    isFree: input.isFree,
    price: input.isFree ? 0 : input.price,
    status: input.status ?? existing?.status ?? "OPEN",
    registrationDeadline: input.registrationDeadline,
    isActive: input.isActive,
    createdAt: existing?.createdAt ?? iso,
    updatedAt: iso,
  };
}

/** Merge a partial admin edit onto an existing session's authored fields. */
export function mergeSessionInput(
  session: TrainingSession,
  patch: Partial<CreateSessionInput>,
): CreateSessionInput {
  return {
    sessionName: patch.sessionName ?? session.sessionName,
    topic: patch.topic ?? session.topic,
    description: patch.description ?? session.description,
    date: patch.date ?? session.date,
    startTime: patch.startTime ?? session.startTime,
    endTime: patch.endTime ?? session.endTime,
    timezone: patch.timezone ?? session.timezone,
    location: patch.location ?? session.location,
    mode: patch.mode ?? session.mode,
    maximumSeats: patch.maximumSeats ?? session.maximumSeats,
    isFree: patch.isFree ?? session.isFree,
    price: patch.price ?? session.price,
    registrationDeadline:
      patch.registrationDeadline !== undefined
        ? patch.registrationDeadline
        : session.registrationDeadline,
    isActive: patch.isActive ?? session.isActive,
    status: patch.status ?? session.status,
  };
}
