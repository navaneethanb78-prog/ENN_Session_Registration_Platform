import type { TrainingSession } from "@/lib/db/types";
import { computeSessionView } from "@/lib/sessions/status";
import { toPublicDto as projectPublic } from "@/lib/sessions/dto";

/**
 * Build the public card projection for a not-yet-saved session, so the admin
 * preview is rendered by exactly the same component registrants will see.
 */
export function toPublicDto(session: TrainingSession, now: Date = new Date()) {
  return projectPublic(computeSessionView(session, now));
}
