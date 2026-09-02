import { DEFAULT_TIMEZONE } from "@/lib/config";
import { zonedDayKey } from "@/lib/time";
import type { CreateSessionInput } from "./types";

/**
 * Development seed data.
 *
 * Dates are computed relative to "now" so the demo always shows a realistic mix
 * of upcoming, nearly-full, full, completed and cancelled sessions — no matter
 * when the project is first run. Session content is data, not hard-coded
 * behaviour: an administrator can create any session they like.
 */

function dayOffset(days: number, now: Date, timeZone: string): string {
  const d = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return zonedDayKey(d, timeZone);
}

export interface SeedPlan {
  sessions: CreateSessionInput[];
  /** Registered counts keyed by session name. */
  counts: Record<string, number>;
}

export function buildSeedPlan(now: Date = new Date(), timeZone = DEFAULT_TIMEZONE): SeedPlan {
  const base = {
    timezone: timeZone,
    registrationDeadline: null,
    isActive: true,
    isFree: false,
    price: 4500,
  };

  const sessions: CreateSessionInput[] = [
    {
      ...base,
      sessionName: "ISO 9001 Awareness Session",
      topic: "Quality Management Systems",
      description:
        "A practical introduction to the ISO 9001:2015 quality management standard: the process approach, risk-based thinking, and what an internal audit really looks for. Suitable for managers and process owners with no prior standards experience.",
      date: dayOffset(12, now, timeZone),
      startTime: "10:00",
      endTime: "12:00",
      location: "Online (Microsoft Teams)",
      mode: "ONLINE",
      maximumSeats: 30,
      status: "OPEN",
    },
    {
      ...base,
      sessionName: "ISO 14001 Awareness Session",
      topic: "Environmental Management Systems",
      description:
        "Understand the environmental management requirements of ISO 14001:2015 — aspects and impacts, compliance obligations, and building an environmental policy your team will actually use.",
      date: dayOffset(19, now, timeZone),
      startTime: "14:00",
      endTime: "17:00",
      location: "Chennai — ENN Training Centre",
      mode: "IN_PERSON",
      maximumSeats: 25,
      status: "OPEN",
    },
    {
      ...base,
      sessionName: "ISO 45001 Lead Auditor Briefing",
      topic: "Occupational Health & Safety",
      description:
        "An intensive briefing for teams preparing for ISO 45001 certification: hazard identification, worker consultation requirements, and audit evidence expectations.",
      date: dayOffset(26, now, timeZone),
      startTime: "09:30",
      endTime: "13:00",
      location: "Online (Microsoft Teams)",
      mode: "ONLINE",
      maximumSeats: 40,
      status: "OPEN",
    },
    {
      ...base,
      sessionName: "ISO 27001 Information Security Awareness",
      topic: "Information Security Management",
      description:
        "Annex A controls in plain language, with worked examples of risk assessment and statement of applicability for growing organisations.",
      date: dayOffset(33, now, timeZone),
      startTime: "10:00",
      endTime: "12:30",
      location: "Coimbatore — Partner Venue",
      mode: "HYBRID",
      maximumSeats: 20,
      status: "OPEN",
    },
    {
      ...base,
      sessionName: "Internal Auditor Refresher",
      topic: "Audit Technique & Reporting",
      description:
        "A half-day refresher for existing internal auditors: writing findings that hold up, sampling strategy, and closing out corrective actions.",
      date: dayOffset(-9, now, timeZone),
      startTime: "10:00",
      endTime: "13:00",
      location: "Online (Microsoft Teams)",
      mode: "ONLINE",
      maximumSeats: 35,
      status: "OPEN",
    },
    {
      ...base,
      sessionName: "Integrated Management Systems Workshop",
      topic: "IMS — 9001 / 14001 / 45001",
      description:
        "Combining three management systems into one coherent set of processes, documents and audits.",
      date: dayOffset(-2, now, timeZone),
      startTime: "09:00",
      endTime: "16:00",
      location: "Chennai — ENN Training Centre",
      mode: "IN_PERSON",
      maximumSeats: 24,
      status: "OPEN",
    },
    {
      ...base,
      sessionName: "Supplier Quality Assurance Clinic",
      topic: "Supply Chain Quality",
      description:
        "This session has been rescheduled. A new date will be announced shortly.",
      date: dayOffset(40, now, timeZone),
      startTime: "11:00",
      endTime: "13:00",
      location: "Online (Microsoft Teams)",
      mode: "ONLINE",
      maximumSeats: 30,
      status: "CANCELLED",
    },
  ];

  const counts: Record<string, number> = {
    // Healthy availability.
    "ISO 9001 Awareness Session": 22,
    // Low availability — exercises the amber state.
    "ISO 14001 Awareness Session": 22,
    // Full — exercises the disabled/full state.
    "ISO 45001 Lead Auditor Briefing": 40,
    // Plenty of room.
    "ISO 27001 Information Security Awareness": 4,
    // Completed sessions, for the disabled past-date treatment.
    "Internal Auditor Refresher": 31,
    "Integrated Management Systems Workshop": 24,
    "Supplier Quality Assurance Clinic": 3,
  };

  return { sessions, counts };
}
