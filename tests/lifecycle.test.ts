import { beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.ENN_LOCAL_DB_PATH = join(mkdtempSync(join(tmpdir(), "enn-lifecycle-")), "db.json");

const { createLocalStore } = await import("@/lib/db/local");
const { AppError } = await import("@/lib/errors");
const { computeSessionView, completedSessionMessage } = await import("@/lib/sessions/status");
const { zonedDateTimeToUtc, formatSessionDate, formatSessionTime } = await import("@/lib/time");
import type { CreateSessionInput, TrainingSession } from "@/lib/db/types";

const store = createLocalStore();

function sessionInput(over: Partial<CreateSessionInput> = {}): CreateSessionInput {
  return {
    sessionName: "Lifecycle Session",
    topic: "Testing",
    description: "",
    date: "2026-09-15",
    startTime: "10:00",
    endTime: "12:00",
    timezone: "Asia/Kolkata",
    location: "Online",
    mode: "ONLINE",
    maximumSeats: 10,
    isFree: true,
    price: 0,
    registrationDeadline: null,
    isActive: true,
    ...over,
  };
}

/** Build a stored session directly, for pure status-maths assertions. */
function storedSession(registered: number, max: number): TrainingSession {
  return {
    ...sessionInput({ maximumSeats: max }),
    id: "x",
    startAt: "2026-09-15T04:30:00.000Z",
    endAt: "2026-09-15T06:30:00.000Z",
    registeredCount: registered,
    status: "OPEN",
    createdAt: "",
    updatedAt: "",
  } as TrainingSession;
}

const applicant = (sessionId: string) => ({
  sessionId,
  fullName: "Test Person",
  companyName: "Test Co",
  designation: "Manager",
  phoneNumber: "+919876543210",
  whatsappAvailable: true,
  whatsappNumber: "+919876543210",
  email: "test@example.com",
});

async function codeOf(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn();
    return "NO_ERROR";
  } catch (err) {
    return err instanceof AppError ? err.code : "UNKNOWN";
  }
}

describe("timezone handling", () => {
  it("interprets session times in the session timezone, not the machine timezone", () => {
    // 10:00 IST on 15 Sep 2026 is 04:30 UTC.
    const utc = zonedDateTimeToUtc("2026-09-15", "10:00", "Asia/Kolkata");
    expect(utc.toISOString()).toBe("2026-09-15T04:30:00.000Z");
  });

  it("formats instants back in the session timezone", () => {
    const utc = zonedDateTimeToUtc("2026-09-15", "10:00", "Asia/Kolkata");
    expect(formatSessionDate(utc, "Asia/Kolkata")).toBe("15 September 2026");
    expect(formatSessionTime(utc, "Asia/Kolkata")).toBe("10:00 AM");
  });

  it("keeps the session day correct across a UTC date boundary", () => {
    // 02:00 IST on 1 Jan 2026 is 20:30 UTC on 31 Dec 2025.
    const utc = zonedDateTimeToUtc("2026-01-01", "02:00", "Asia/Kolkata");
    expect(utc.toISOString()).toBe("2025-12-31T20:30:00.000Z");
    expect(formatSessionDate(utc, "Asia/Kolkata")).toBe("1 January 2026");
  });
});

describe("automatic completion", () => {
  beforeEach(async () => {
    await store.reset([]);
  });

  it("reports COMPLETED once the end time has passed, with no admin action", async () => {
    const session = await store.createSession(sessionInput());
    const stored = (await store.getSession(session.id))!;

    // The stored status is still OPEN — nobody has edited it.
    expect(stored.status).toBe("OPEN");

    const before = zonedDateTimeToUtc("2026-09-15", "11:59", "Asia/Kolkata");
    const after = zonedDateTimeToUtc("2026-09-15", "12:01", "Asia/Kolkata");

    expect(computeSessionView(stored, before).status).toBe("OPEN");
    expect(computeSessionView(stored, after).status).toBe("COMPLETED");
    expect(computeSessionView(stored, after).canRegister).toBe(false);
    expect(computeSessionView(stored, after).isPast).toBe(true);
  });

  it("flips exactly at the end instant", async () => {
    const session = await store.createSession(sessionInput());
    const stored = (await store.getSession(session.id))!;
    const exactly = zonedDateTimeToUtc("2026-09-15", "12:00", "Asia/Kolkata");
    expect(computeSessionView(stored, exactly).status).toBe("COMPLETED");
  });

  it("refuses registration for a completed session", async () => {
    const session = await store.createSession(sessionInput());
    const after = zonedDateTimeToUtc("2026-09-16", "10:00", "Asia/Kolkata");
    expect(await codeOf(() => store.registerAtomically(applicant(session.id), after))).toBe(
      "SESSION_COMPLETED",
    );
    expect((await store.getSession(session.id))!.registeredCount).toBe(0);
  });

  it("builds the completion message from the stored session name", async () => {
    const session = await store.createSession(
      sessionInput({ sessionName: "ISO 9001 Awareness", topic: "Quality Management" }),
    );
    const stored = (await store.getSession(session.id))!;
    const msg = completedSessionMessage(stored, "15 September 2026");
    expect(msg).toContain("ISO 9001 Awareness");
    expect(msg).toContain("15 September 2026");
    expect(msg).toContain("already been completed");
  });
});

describe("status precedence", () => {
  beforeEach(async () => {
    await store.reset([]);
  });

  it("prefers CANCELLED over every other state", async () => {
    const session = await store.createSession(sessionInput({ status: "CANCELLED" }));
    const stored = (await store.getSession(session.id))!;
    const during = zonedDateTimeToUtc("2026-09-15", "11:00", "Asia/Kolkata");
    const after = zonedDateTimeToUtc("2026-09-20", "11:00", "Asia/Kolkata");
    expect(computeSessionView(stored, during).status).toBe("CANCELLED");
    expect(computeSessionView(stored, after).status).toBe("CANCELLED");
    expect(await codeOf(() => store.registerAtomically(applicant(session.id), during))).toBe(
      "SESSION_CANCELLED",
    );
  });

  it("prefers COMPLETED over FULL", async () => {
    const session = await store.createSession(sessionInput({ maximumSeats: 1 }));
    const during = zonedDateTimeToUtc("2026-09-15", "10:30", "Asia/Kolkata");
    await store.registerAtomically(applicant(session.id), during);

    const stored = (await store.getSession(session.id))!;
    expect(computeSessionView(stored, during).status).toBe("FULL");

    const after = zonedDateTimeToUtc("2026-09-16", "10:00", "Asia/Kolkata");
    expect(computeSessionView(stored, after).status).toBe("COMPLETED");
  });

  it("closes registration once the deadline passes, while staying upcoming", async () => {
    const session = await store.createSession(
      sessionInput({ registrationDeadline: "2026-09-14T00:00:00.000Z" }),
    );
    const stored = (await store.getSession(session.id))!;

    const beforeDeadline = new Date("2026-09-13T00:00:00.000Z");
    const afterDeadline = new Date("2026-09-14T06:00:00.000Z");

    expect(computeSessionView(stored, beforeDeadline).status).toBe("OPEN");
    expect(computeSessionView(stored, afterDeadline).status).toBe("UPCOMING");
    expect(computeSessionView(stored, afterDeadline).canRegister).toBe(false);
    expect(await codeOf(() => store.registerAtomically(applicant(session.id), afterDeadline))).toBe(
      "REGISTRATION_CLOSED",
    );
  });

  it("treats a deactivated session as not yet open", async () => {
    const session = await store.createSession(sessionInput({ isActive: false }));
    const stored = (await store.getSession(session.id))!;
    const now = new Date("2026-09-01T00:00:00.000Z");
    expect(computeSessionView(stored, now).status).toBe("UPCOMING");
    expect(computeSessionView(stored, now).canRegister).toBe(false);
  });
});

describe("availability levels", () => {
  const at = new Date("2026-09-01T00:00:00.000Z");

  it("moves through good, moderate, low and none", () => {
    expect(computeSessionView(storedSession(10, 100), at).availability).toBe("GOOD");
    expect(computeSessionView(storedSession(60, 100), at).availability).toBe("MODERATE");
    expect(computeSessionView(storedSession(85, 100), at).availability).toBe("LOW");
    expect(computeSessionView(storedSession(97, 100), at).availability).toBe("LOW");
    expect(computeSessionView(storedSession(100, 100), at).availability).toBe("NONE");
    // The absolute low-seat rule applies even at a low occupancy ratio.
    expect(computeSessionView(storedSession(0, 4), at).availability).toBe("LOW");
  });

  it("labels remaining seats in readable English", () => {
    expect(computeSessionView(storedSession(22, 30), at).availabilityLabel).toBe(
      "8 seats remaining",
    );
    expect(computeSessionView(storedSession(29, 30), at).availabilityLabel).toBe(
      "1 seat remaining",
    );
    expect(computeSessionView(storedSession(30, 30), at).availabilityLabel).toBe("Session Full");
  });
});
