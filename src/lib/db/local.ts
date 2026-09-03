import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { AppError } from "@/lib/errors";
import {
  hydrateRegistration,
  hydrateSession,
  materialiseSession,
  mergeSessionInput,
} from "./derive";
import {
  applySeatClaim,
  assertRegistrable,
  buildRegistration,
  duplicateKey,
  formatInHouseReference,
  formatReference,
} from "./guard";
import type {
  InHouseRequest,
  Registration,
  RegistrationInput,
  SessionStore,
  TrainingSession,
} from "./types";

interface DbShape {
  sessions: TrainingSession[];
  registrations: Registration[];
  inHouseRequests: InHouseRequest[];
  /** Registration reference counters, keyed by year. */
  counters: Record<string, number>;
  /** duplicateKey -> registrationId */
  uniqueness: Record<string, string>;
}

const DB_PATH = process.env.ENN_LOCAL_DB_PATH ?? join(process.cwd(), ".data", "enn-dev-db.json");

const EMPTY: DbShape = {
  sessions: [],
  registrations: [],
  inHouseRequests: [],
  counters: {},
  uniqueness: {},
};

/**
 * A promise-chain mutex. Every mutating operation is appended to a single chain,
 * so read-modify-write sequences can never interleave — this is the local
 * stand-in for a Firestore transaction, and it is what makes the concurrency
 * behaviour testable without a live Firebase project.
 */
let chain: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  // Keep the chain alive even if this operation rejects.
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/**
 * Always read from disk rather than caching in memory.
 *
 * The file is the single source of truth: Next.js may instantiate this module
 * more than once (route handlers are separate bundles, and serverless
 * invocations are separate processes entirely), so an in-process cache would
 * silently serve stale seat counts and miss duplicate keys.
 */
async function load(): Promise<DbShape> {
  try {
    const raw = await readFile(DB_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<DbShape>;
    return {
      sessions: parsed.sessions ?? [],
      registrations: parsed.registrations ?? [],
      inHouseRequests: parsed.inHouseRequests ?? [],
      counters: parsed.counters ?? {},
      uniqueness: parsed.uniqueness ?? {},
    };
  } catch {
    return structuredClone(EMPTY);
  }
}

async function persist(db: DbShape): Promise<void> {
  await mkdir(dirname(DB_PATH), { recursive: true });
  // Write to a temp file and rename, so a crash mid-write cannot corrupt the file.
  const tmp = `${DB_PATH}.${randomUUID()}.tmp`;
  await writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await rename(tmp, DB_PATH);
}

export function createLocalStore(): SessionStore {
  return {
    name: "local",

    async listSessions() {
      return withLock(async () => (await load()).sessions.map(hydrateSession));
    },

    async getSession(id) {
      return withLock(async () => {
        const found = (await load()).sessions.find((s) => s.id === id);
        return found ? hydrateSession(found) : null;
      });
    },

    async createSession(input) {
      return withLock(async () => {
        const db = await load();
        const session = materialiseSession(input);
        db.sessions.push(session);
        await persist(db);
        return session;
      });
    },

    async updateSession(id, patch) {
      return withLock(async () => {
        const db = await load();
        const index = db.sessions.findIndex((s) => s.id === id);
        const existing = db.sessions[index];
        if (index === -1 || !existing) throw new AppError("SESSION_NOT_FOUND");

        const merged = mergeSessionInput(existing, patch);
        const next = materialiseSession(merged, existing);
        // Capacity must never be reduced below the number already registered.
        if (next.maximumSeats < existing.registeredCount) {
          throw new AppError(
            "VALIDATION_ERROR",
            `Maximum seats cannot be lower than the ${existing.registeredCount} registrations already taken.`,
            { maximumSeats: `Cannot be lower than ${existing.registeredCount}.` },
          );
        }
        // Keep the persisted status coherent with the new capacity.
        if (next.status !== "CANCELLED") {
          next.status = next.registeredCount >= next.maximumSeats ? "FULL" : "OPEN";
        }
        db.sessions[index] = next;
        await persist(db);
        return next;
      });
    },

    async deleteSession(id) {
      return withLock(async () => {
        const db = await load();
        db.sessions = db.sessions.filter((s) => s.id !== id);
        db.registrations = db.registrations.filter((r) => r.sessionId !== id);
        for (const [key, regId] of Object.entries(db.uniqueness)) {
          if (!db.registrations.some((r) => r.id === regId)) delete db.uniqueness[key];
        }
        await persist(db);
      });
    },

    async listRegistrations(filter) {
      return withLock(async () => {
        const db = await load();
        const rows = filter?.sessionId
          ? db.registrations.filter((r) => r.sessionId === filter.sessionId)
          : db.registrations;
        return rows.map(hydrateRegistration);
      });
    },

    async registerAtomically(input: RegistrationInput, now: Date) {
      return withLock(async () => {
        const db = await load();

        // 1. Re-read and re-validate the session against the current clock.
        const session = db.sessions.find((s) => s.id === input.sessionId) ?? null;
        const valid = assertRegistrable(session, now);

        // 2. Reject a duplicate for this (session, email).
        const key = duplicateKey(input.sessionId, input.email);
        if (db.uniqueness[key]) throw new AppError("DUPLICATE_REGISTRATION");

        // 3. Claim the seat.
        const year = now.getUTCFullYear();
        const sequence = (db.counters[String(year)] ?? 0) + 1;
        const reference = formatReference(year, sequence);
        const registration = buildRegistration(randomUUID(), input, reference, now, valid);

        const claim = applySeatClaim(valid, now);
        const index = db.sessions.findIndex((s) => s.id === valid.id);
        db.sessions[index] = { ...valid, ...claim };
        db.counters[String(year)] = sequence;
        db.uniqueness[key] = registration.id;
        db.registrations.push(registration);

        await persist(db);
        return registration;
      });
    },

    async importRegistrations(sessionId, rows) {
      return withLock(async () => {
        const db = await load();
        const index = db.sessions.findIndex((s) => s.id === sessionId);
        const session = db.sessions[index];
        if (index === -1 || !session) throw new AppError("SESSION_NOT_FOUND");

        const created: Registration[] = [];
        for (const row of rows) {
          const key = duplicateKey(sessionId, row.email);
          // Two delegates sharing one company mailbox is legitimate historical
          // data; keep the record, and only claim the key the first time.
          const registration: Registration = {
            id: randomUUID(),
            sessionId,
            registrationReference: "",
            fullName: row.fullName,
            companyName: row.companyName,
            designation: row.designation,
            phoneNumber: row.phoneNumber,
            whatsappAvailable: row.whatsappAvailable,
            whatsappNumber: row.whatsappNumber,
            email: row.email,
            registrationStatus: "CONFIRMED",
            attendanceStatus: "PENDING",
            paymentStatus: "NOT_REQUIRED",
            paymentReference: "",
            amountDue: 0,
            notes: row.notes ?? "",
            registeredAt: row.registeredAt,
            updatedAt: new Date().toISOString(),
          };

          const year = new Date(row.registeredAt).getUTCFullYear();
          const sequence = (db.counters[String(year)] ?? 0) + 1;
          db.counters[String(year)] = sequence;
          registration.registrationReference = formatReference(year, sequence);

          if (!db.uniqueness[key]) db.uniqueness[key] = registration.id;
          db.registrations.push(registration);
          created.push(registration);
        }

        const registeredCount = Math.min(
          session.maximumSeats,
          session.registeredCount + created.length,
        );
        db.sessions[index] = {
          ...session,
          registeredCount,
          status:
            session.status === "CANCELLED"
              ? "CANCELLED"
              : registeredCount >= session.maximumSeats
                ? "FULL"
                : session.status,
          updatedAt: new Date().toISOString(),
        };

        await persist(db);
        return created;
      });
    },

    async deleteRegistration(registrationId, now) {
      return withLock(async () => {
        const db = await load();
        const index = db.registrations.findIndex((r) => r.id === registrationId);
        const registration = db.registrations[index];
        if (index === -1 || !registration) {
          throw new AppError("SESSION_NOT_FOUND", "That registration could not be found.");
        }

        db.registrations.splice(index, 1);

        // Release the uniqueness key only if it still points at this record;
        // historical imports may have two people sharing one company mailbox.
        const key = duplicateKey(registration.sessionId, registration.email);
        if (db.uniqueness[key] === registration.id) {
          delete db.uniqueness[key];
          const survivor = db.registrations.find(
            (r) => r.sessionId === registration.sessionId && r.email === registration.email,
          );
          if (survivor) db.uniqueness[key] = survivor.id;
        }

        // Return the seat, and reopen the session if it had filled.
        const sessionIndex = db.sessions.findIndex((s) => s.id === registration.sessionId);
        const session = db.sessions[sessionIndex];
        if (session) {
          const registeredCount = Math.max(0, session.registeredCount - 1);
          db.sessions[sessionIndex] = {
            ...session,
            registeredCount,
            status:
              session.status === "CANCELLED"
                ? "CANCELLED"
                : registeredCount >= session.maximumSeats
                  ? "FULL"
                  : "OPEN",
            updatedAt: now.toISOString(),
          };
        }

        await persist(db);
        return registration;
      });
    },

    async setPaymentStatus(registrationId, status, now) {
      return withLock(async () => {
        const db = await load();
        const index = db.registrations.findIndex((r) => r.id === registrationId);
        const existing = db.registrations[index];
        if (index === -1 || !existing) {
          throw new AppError("SESSION_NOT_FOUND", "That registration could not be found.");
        }
        const next = { ...existing, paymentStatus: status, updatedAt: now.toISOString() };
        db.registrations[index] = next;
        await persist(db);
        return next;
      });
    },

    async createInHouseRequest(input, now) {
      return withLock(async () => {
        const db = await load();
        const year = now.getUTCFullYear();
        const counterKey = `inhouse-${year}`;
        const sequence = (db.counters[counterKey] ?? 0) + 1;
        db.counters[counterKey] = sequence;

        const request: InHouseRequest = {
          id: randomUUID(),
          requestReference: formatInHouseReference(year, sequence),
          fullName: input.fullName,
          companyName: input.companyName,
          designation: input.designation,
          phoneNumber: input.phoneNumber,
          whatsappAvailable: input.whatsappAvailable,
          whatsappNumber: input.whatsappNumber ?? input.phoneNumber,
          email: input.email,
          programmes: input.programmes,
          trainingMode: input.trainingMode,
          participants: input.participants,
          preferredTimeframe: input.preferredTimeframe,
          venueName: input.venueName ?? "",
          venueAddress: input.venueAddress ?? "",
          venueCity: input.venueCity,
          notes: input.notes ?? "",
          status: "PENDING",
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        };

        db.inHouseRequests.push(request);
        await persist(db);
        return request;
      });
    },

    async listInHouseRequests() {
      return withLock(async () =>
        (await load()).inHouseRequests.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      );
    },

    async updateInHouseRequestStatus(requestId, status, now) {
      return withLock(async () => {
        const db = await load();
        const index = db.inHouseRequests.findIndex((r) => r.id === requestId);
        const existing = db.inHouseRequests[index];
        if (index === -1 || !existing) {
          throw new AppError("SESSION_NOT_FOUND", "That request could not be found.");
        }
        const next = { ...existing, status, updatedAt: now.toISOString() };
        db.inHouseRequests[index] = next;
        await persist(db);
        return next;
      });
    },

    async listContactEmails() {
      return withLock(async () => {
        const db = await load();
        // One entry per address, keeping the most recently seen name.
        const byEmail = new Map<string, { email: string; fullName: string }>();
        for (const r of db.registrations) {
          if (r.email.includes("@")) byEmail.set(r.email.toLowerCase(), { email: r.email, fullName: r.fullName });
        }
        for (const q of db.inHouseRequests) {
          if (q.email.includes("@")) byEmail.set(q.email.toLowerCase(), { email: q.email, fullName: q.fullName });
        }
        return [...byEmail.values()];
      });
    },

    async reset(sessions, counts) {
      return withLock(async () => {
        const db: DbShape = structuredClone(EMPTY);
        for (const input of sessions) {
          const session = materialiseSession(input);
          const seeded = counts?.[input.sessionName];
          if (typeof seeded === "number") {
            session.registeredCount = Math.min(seeded, session.maximumSeats);
            if (session.status !== "CANCELLED" && session.registeredCount >= session.maximumSeats) {
              session.status = "FULL";
            }
          }
          db.sessions.push(session);
        }
        await persist(db);
      });
    },
  };
}
