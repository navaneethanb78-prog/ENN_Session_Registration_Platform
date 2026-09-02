import { beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Point the local store at a throwaway file before importing it.
process.env.ENN_LOCAL_DB_PATH = join(mkdtempSync(join(tmpdir(), "enn-test-")), "db.json");

const { createLocalStore } = await import("@/lib/db/local");
const { AppError } = await import("@/lib/errors");
const { computeSessionView } = await import("@/lib/sessions/status");
import type { CreateSessionInput } from "@/lib/db/types";

const store = createLocalStore();

function sessionInput(over: Partial<CreateSessionInput> = {}): CreateSessionInput {
  return {
    sessionName: "Capacity Test Session",
    topic: "Testing",
    description: "",
    date: "2099-09-15",
    startTime: "10:00",
    endTime: "12:00",
    timezone: "Asia/Kolkata",
    location: "Online",
    mode: "ONLINE",
    maximumSeats: 3,
    isFree: true,
    price: 0,
    registrationDeadline: null,
    isActive: true,
    ...over,
  };
}

function registrant(n: number, sessionId: string) {
  return {
    sessionId,
    fullName: `Person ${n}`,
    companyName: "Test Co",
    designation: "Manager",
    phoneNumber: `+91987654321${n % 10}`,
    whatsappAvailable: true,
    whatsappNumber: `+91987654321${n % 10}`,
    email: `person${n}@example.com`,
  };
}

async function codeOf(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn();
    return "NO_ERROR";
  } catch (err) {
    return err instanceof AppError ? err.code : "UNKNOWN";
  }
}

describe("seat capacity", () => {
  beforeEach(async () => {
    await store.reset([]);
  });

  it("counts down accurately and refuses the fourth registration", async () => {
    const session = await store.createSession(sessionInput({ maximumSeats: 3 }));
    const now = new Date();

    await store.registerAtomically(registrant(1, session.id), now);
    let view = computeSessionView((await store.getSession(session.id))!, now);
    expect(view.remainingSeats).toBe(2);
    expect(view.status).toBe("OPEN");

    await store.registerAtomically(registrant(2, session.id), now);
    view = computeSessionView((await store.getSession(session.id))!, now);
    expect(view.remainingSeats).toBe(1);
    expect(view.status).toBe("OPEN");

    await store.registerAtomically(registrant(3, session.id), now);
    view = computeSessionView((await store.getSession(session.id))!, now);
    expect(view.remainingSeats).toBe(0);
    expect(view.status).toBe("FULL");
    expect(view.canRegister).toBe(false);

    // The fourth is rejected by the server, not the UI.
    expect(await codeOf(() => store.registerAtomically(registrant(4, session.id), now))).toBe(
      "SESSION_FULL",
    );

    const stored = (await store.getSession(session.id))!;
    expect(stored.registeredCount).toBe(3);
    expect(stored.status).toBe("FULL");
  });

  it("persists the FULL status the moment the last seat is taken", async () => {
    const session = await store.createSession(sessionInput({ maximumSeats: 1 }));
    await store.registerAtomically(registrant(1, session.id), new Date());
    expect((await store.getSession(session.id))!.status).toBe("FULL");
  });
});

describe("duplicate protection", () => {
  beforeEach(async () => {
    await store.reset([]);
  });

  it("rejects the same email registering twice for one session", async () => {
    const session = await store.createSession(sessionInput({ maximumSeats: 10 }));
    const now = new Date();
    await store.registerAtomically(registrant(1, session.id), now);

    expect(await codeOf(() => store.registerAtomically(registrant(1, session.id), now))).toBe(
      "DUPLICATE_REGISTRATION",
    );
    expect((await store.getSession(session.id))!.registeredCount).toBe(1);
  });

  it("treats email case and surrounding space as the same person", async () => {
    const session = await store.createSession(sessionInput({ maximumSeats: 10 }));
    const now = new Date();
    await store.registerAtomically(
      { ...registrant(1, session.id), email: "dupe@example.com" },
      now,
    );
    const code = await codeOf(() =>
      store.registerAtomically({ ...registrant(2, session.id), email: "DUPE@example.com" }, now),
    );
    expect(code).toBe("DUPLICATE_REGISTRATION");
  });

  it("allows the same person to register for a different session", async () => {
    const a = await store.createSession(sessionInput({ maximumSeats: 5 }));
    const b = await store.createSession(sessionInput({ sessionName: "Second", maximumSeats: 5 }));
    const now = new Date();
    await store.registerAtomically({ ...registrant(1, a.id), email: "x@example.com" }, now);
    await store.registerAtomically({ ...registrant(1, b.id), email: "x@example.com" }, now);
    expect((await store.getSession(a.id))!.registeredCount).toBe(1);
    expect((await store.getSession(b.id))!.registeredCount).toBe(1);
  });
});

describe("race condition on the final seat", () => {
  beforeEach(async () => {
    await store.reset([]);
  });

  it("allows exactly one of two simultaneous claims on the last seat", async () => {
    const session = await store.createSession(sessionInput({ maximumSeats: 30 }));
    const now = new Date();

    // Fill 29 of 30 seats.
    for (let i = 0; i < 29; i++) {
      await store.registerAtomically(registrant(i, session.id), now);
    }
    expect((await store.getSession(session.id))!.registeredCount).toBe(29);

    // Two users claim the final seat at the same moment.
    const results = await Promise.allSettled([
      store.registerAtomically(registrant(100, session.id), now),
      store.registerAtomically(registrant(200, session.id), now),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const reason = (rejected[0] as PromiseRejectedResult).reason;
    expect(reason).toBeInstanceOf(AppError);
    expect(reason.code).toBe("SESSION_FULL");

    // The invariant that matters: never 31.
    const stored = (await store.getSession(session.id))!;
    expect(stored.registeredCount).toBe(30);
    expect(stored.registeredCount).toBeLessThanOrEqual(stored.maximumSeats);
    expect(stored.status).toBe("FULL");
  });

  it("never overbooks under heavy contention", async () => {
    const session = await store.createSession(sessionInput({ maximumSeats: 5 }));
    const now = new Date();

    // 25 people race for 5 seats.
    const results = await Promise.allSettled(
      Array.from({ length: 25 }, (_, i) => store.registerAtomically(registrant(i, session.id), now)),
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    expect(succeeded).toBe(5);

    const stored = (await store.getSession(session.id))!;
    expect(stored.registeredCount).toBe(5);

    const registrations = await store.listRegistrations({ sessionId: session.id });
    expect(registrations).toHaveLength(5);

    // Every issued reference is unique.
    const refs = new Set(registrations.map((r) => r.registrationReference));
    expect(refs.size).toBe(5);
  });
});
