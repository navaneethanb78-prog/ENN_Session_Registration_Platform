import type { SessionMode } from "@/lib/db/types";
import type { SessionView } from "./status";

/**
 * The public projection of a session.
 *
 * Deliberately free of any server-only dependency, because client components
 * import it: keeping it here stops the Firebase Admin SDK being pulled into the
 * browser bundle through a transitive import.
 */
export interface PublicSessionDto {
  id: string;
  sessionName: string;
  topic: string;
  description: string;
  date: string;
  startAt: string;
  endAt: string;
  timezone: string;
  location: string;
  mode: SessionMode;
  maximumSeats: number;
  registeredCount: number;
  isFree: boolean;
  price: number;
  remainingSeats: number;
  occupiedRatio: number;
  status: SessionView["status"];
  availability: SessionView["availability"];
  availabilityLabel: string;
  canRegister: boolean;
  blockedReason: string | null;
}

/** Project a session view for public consumption. Registrant data is never included. */
export function toPublicDto(view: SessionView): PublicSessionDto {
  const s = view.session;
  return {
    id: s.id,
    sessionName: s.sessionName,
    topic: s.topic,
    description: s.description,
    date: s.date,
    startAt: s.startAt,
    endAt: s.endAt,
    timezone: s.timezone,
    location: s.location,
    mode: s.mode,
    maximumSeats: s.maximumSeats,
    registeredCount: s.registeredCount,
    isFree: s.isFree,
    price: s.price,
    remainingSeats: view.remainingSeats,
    occupiedRatio: view.occupiedRatio,
    status: view.status,
    availability: view.availability,
    availabilityLabel: view.availabilityLabel,
    canRegister: view.canRegister,
    blockedReason: view.blockedReason,
  };
}
