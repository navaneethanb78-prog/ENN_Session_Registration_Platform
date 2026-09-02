import { DEFAULT_TIMEZONE } from "@/lib/config";
import type { SessionMode, TrainingSession } from "@/lib/db/types";

/**
 * Form value shape and its constructors.
 *
 * Deliberately kept out of the "use client" component file: the admin pages are
 * server components and call these directly, and a server component cannot
 * invoke a function exported from a client module.
 */
export interface SessionFormValues {
  sessionName: string;
  topic: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  timezone: string;
  location: string;
  mode: SessionMode;
  maximumSeats: string;
  isFree: boolean;
  price: string;
  registrationDeadline: string;
  isActive: boolean;
}

export function emptyValues(): SessionFormValues {
  return {
    sessionName: "",
    topic: "",
    description: "",
    date: "",
    startTime: "10:00",
    endTime: "12:00",
    timezone: DEFAULT_TIMEZONE,
    location: "",
    mode: "ONLINE",
    maximumSeats: "30",
    isFree: false,
    price: "4500",
    registrationDeadline: "",
    isActive: true,
  };
}

export function valuesFrom(session: TrainingSession): SessionFormValues {
  return {
    sessionName: session.sessionName,
    topic: session.topic,
    description: session.description,
    date: session.date,
    startTime: session.startTime,
    endTime: session.endTime,
    timezone: session.timezone,
    location: session.location,
    mode: session.mode,
    maximumSeats: String(session.maximumSeats),
    isFree: session.isFree,
    price: String(session.price),
    // datetime-local expects "yyyy-MM-ddTHH:mm".
    registrationDeadline: session.registrationDeadline
      ? new Date(session.registrationDeadline).toISOString().slice(0, 16)
      : "",
    isActive: session.isActive,
  };
}

export function toSessionPayload(values: SessionFormValues) {
  return {
    sessionName: values.sessionName.trim(),
    topic: values.topic.trim(),
    description: values.description.trim(),
    date: values.date,
    startTime: values.startTime,
    endTime: values.endTime,
    timezone: values.timezone,
    location: values.location.trim(),
    mode: values.mode,
    maximumSeats: Number(values.maximumSeats),
    isFree: values.isFree,
    price: values.isFree ? 0 : Number(values.price),
    registrationDeadline: values.registrationDeadline
      ? new Date(values.registrationDeadline).toISOString()
      : null,
    isActive: values.isActive,
  };
}
