import { AppError } from "@/lib/errors";
import { getDb } from "@/lib/firebase/admin";
import { hydrateSession, materialiseSession, mergeSessionInput } from "./derive";
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

const SESSIONS = "sessions";
const REGISTRATIONS = "registrations";
const UNIQUENESS = "registrationKeys";
const COUNTERS = "counters";
const IN_HOUSE = "inHouseRequests";

export function createFirestoreStore(): SessionStore {
  return {
    name: "firestore",

    async listSessions() {
      const db = await getDb();
      const snap = await db.collection(SESSIONS).orderBy("startAt", "asc").get();
      return snap.docs.map((d) => hydrateSession({ ...(d.data() as TrainingSession), id: d.id }));
    },

    async getSession(id) {
      const db = await getDb();
      const doc = await db.collection(SESSIONS).doc(id).get();
      if (!doc.exists) return null;
      return hydrateSession({ ...(doc.data() as TrainingSession), id: doc.id });
    },

    async createSession(input) {
      const db = await getDb();
      const session = materialiseSession(input);
      const { id, ...rest } = session;
      await db.collection(SESSIONS).doc(id).set(rest);
      return session;
    },

    async updateSession(id, patch) {
      const db = await getDb();
      const ref = db.collection(SESSIONS).doc(id);

      // Transactional so an admin edit cannot race a registration and lose a seat.
      return db.runTransaction(async (tx) => {
        const doc = await tx.get(ref);
        if (!doc.exists) throw new AppError("SESSION_NOT_FOUND");
        const existing = hydrateSession({ ...(doc.data() as TrainingSession), id: doc.id });

        const merged = mergeSessionInput(existing, patch);
        const next = materialiseSession(merged, existing);

        if (next.maximumSeats < existing.registeredCount) {
          throw new AppError(
            "VALIDATION_ERROR",
            "Maximum seats cannot be lower than the registrations already taken.",
            { maximumSeats: "Cannot be lower than " + existing.registeredCount + "." },
          );
        }
        if (next.status !== "CANCELLED") {
          next.status = next.registeredCount >= next.maximumSeats ? "FULL" : "OPEN";
        }

        const { id: _id, ...rest } = next;
        tx.set(ref, rest);
        return next;
      });
    },

    async deleteSession(id) {
      const db = await getDb();
      const regs = await db.collection(REGISTRATIONS).where("sessionId", "==", id).get();
      const batch = db.batch();
      for (const doc of regs.docs) {
        batch.delete(doc.ref);
        const key = duplicateKey(id, (doc.data() as Registration).email);
        batch.delete(db.collection(UNIQUENESS).doc(key));
      }
      batch.delete(db.collection(SESSIONS).doc(id));
      await batch.commit();
    },

    async listRegistrations(filter) {
      const db = await getDb();
      const base = db.collection(REGISTRATIONS);

      // Combining where() with orderBy() on a different field would require a
      // composite index, which has to be built before the query works at all —
      // an avoidable deployment dependency. A single session's registrations
      // are bounded by its seat capacity, so sorting them in memory is cheap
      // and removes that requirement entirely.
      const snap = filter?.sessionId
        ? await base.where("sessionId", "==", filter.sessionId).get()
        : await base.orderBy("registeredAt", "desc").get();

      const rows = snap.docs.map((d) => ({ ...(d.data() as Registration), id: d.id }));

      return filter?.sessionId
        ? rows.sort(
            (a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime(),
          )
        : rows;
    },

    /**
     * The critical path. Everything below happens inside one Firestore
     * transaction: the session is re-read, re-validated against the clock,
     * checked for a duplicate, and the seat is claimed. When two clients contend
     * for the final seat, Firestore aborts and retries the loser, which then
     * re-reads a full session and fails cleanly with SESSION_FULL.
     */
    async registerAtomically(input: RegistrationInput, now: Date) {
      const db = await getDb();
      const sessionRef = db.collection(SESSIONS).doc(input.sessionId);
      const key = duplicateKey(input.sessionId, input.email);
      const uniqueRef = db.collection(UNIQUENESS).doc(key);
      const year = now.getUTCFullYear();
      const counterRef = db.collection(COUNTERS).doc("registrations-" + year);
      const registrationRef = db.collection(REGISTRATIONS).doc();

      return db.runTransaction(async (tx) => {
        // Firestore requires every read to precede every write.
        const [sessionDoc, uniqueDoc, counterDoc] = await Promise.all([
          tx.get(sessionRef),
          tx.get(uniqueRef),
          tx.get(counterRef),
        ]);

        const session = sessionDoc.exists
          ? hydrateSession({ ...(sessionDoc.data() as TrainingSession), id: sessionDoc.id })
          : null;

        // 1. Re-validate status, timing and capacity from the just-read document.
        const valid = assertRegistrable(session, now);

        // 2. Duplicate protection: same email + same session.
        if (uniqueDoc.exists) throw new AppError("DUPLICATE_REGISTRATION");

        // 3. Allocate the reference number.
        const previous = counterDoc.exists ? (counterDoc.data()?.value as number | undefined) : undefined;
        const sequence = (previous ?? 0) + 1;
        const reference = formatReference(year, sequence);
        const registration = buildRegistration(registrationRef.id, input, reference, now, valid);

        const claim = applySeatClaim(valid, now);
        tx.update(sessionRef, claim);
        tx.set(counterRef, { value: sequence, updatedAt: now.toISOString() });
        // create() fails if the key already exists, closing the double-submit race.
        tx.create(uniqueRef, {
          registrationId: registration.id,
          sessionId: input.sessionId,
          createdAt: now.toISOString(),
        });
        const { id: _id, ...rest } = registration;
        tx.set(registrationRef, rest);

        return registration;
      });
    },

    async importRegistrations(sessionId, rows) {
      const db = await getDb();
      const sessionRef = db.collection(SESSIONS).doc(sessionId);
      const sessionDoc = await sessionRef.get();
      if (!sessionDoc.exists) throw new AppError("SESSION_NOT_FOUND");
      const session = hydrateSession({ ...(sessionDoc.data() as TrainingSession), id: sessionDoc.id });

      const created: Registration[] = [];
      const batch = db.batch();

      // Reference sequences are grouped by the year each person registered.
      const sequences = new Map<number, number>();
      for (const year of new Set(rows.map((r) => new Date(r.registeredAt).getUTCFullYear()))) {
        const counter = await db.collection(COUNTERS).doc("registrations-" + year).get();
        sequences.set(year, (counter.data()?.value as number | undefined) ?? 0);
      }

      for (const row of rows) {
        const ref = db.collection(REGISTRATIONS).doc();
        const year = new Date(row.registeredAt).getUTCFullYear();
        const next = (sequences.get(year) ?? 0) + 1;
        sequences.set(year, next);

        const registration: Registration = {
          id: ref.id,
          sessionId,
          registrationReference: formatReference(year, next),
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

        const { id: _id, ...rest } = registration;
        batch.set(ref, rest);
        // set() rather than create(): two delegates may share a company mailbox
        // in historical data, and the import must not fail on that.
        batch.set(db.collection(UNIQUENESS).doc(duplicateKey(sessionId, row.email)), {
          registrationId: registration.id,
          sessionId,
          createdAt: row.registeredAt,
        });
        created.push(registration);
      }

      for (const [year, value] of sequences) {
        batch.set(db.collection(COUNTERS).doc("registrations-" + year), {
          value,
          updatedAt: new Date().toISOString(),
        });
      }

      const registeredCount = Math.min(
        session.maximumSeats,
        session.registeredCount + created.length,
      );
      batch.update(sessionRef, {
        registeredCount,
        status:
          session.status === "CANCELLED"
            ? "CANCELLED"
            : registeredCount >= session.maximumSeats
              ? "FULL"
              : session.status,
        updatedAt: new Date().toISOString(),
      });

      await batch.commit();
      return created;
    },

    async deleteRegistration(registrationId, now) {
      const db = await getDb();
      const registrationRef = db.collection(REGISTRATIONS).doc(registrationId);

      return db.runTransaction(async (tx) => {
        const doc = await tx.get(registrationRef);
        if (!doc.exists) {
          throw new AppError("SESSION_NOT_FOUND", "That registration could not be found.");
        }
        const registration = { ...(doc.data() as Registration), id: doc.id };

        const sessionRef = db.collection(SESSIONS).doc(registration.sessionId);
        const uniqueRef = db
          .collection(UNIQUENESS)
          .doc(duplicateKey(registration.sessionId, registration.email));

        // Every read must precede every write in a Firestore transaction.
        const [sessionDoc, uniqueDoc] = await Promise.all([
          tx.get(sessionRef),
          tx.get(uniqueRef),
        ]);

        tx.delete(registrationRef);

        // Release the uniqueness key only if it still points at this record.
        if (uniqueDoc.exists && uniqueDoc.data()?.registrationId === registration.id) {
          tx.delete(uniqueRef);
        }

        if (sessionDoc.exists) {
          const session = sessionDoc.data() as TrainingSession;
          const registeredCount = Math.max(0, session.registeredCount - 1);
          tx.update(sessionRef, {
            registeredCount,
            status:
              session.status === "CANCELLED"
                ? "CANCELLED"
                : registeredCount >= session.maximumSeats
                  ? "FULL"
                  : "OPEN",
            updatedAt: now.toISOString(),
          });
        }

        return registration;
      });
    },

    async setPaymentStatus(registrationId, status, now) {
      const db = await getDb();
      const ref = db.collection(REGISTRATIONS).doc(registrationId);
      const doc = await ref.get();
      if (!doc.exists) {
        throw new AppError("SESSION_NOT_FOUND", "That registration could not be found.");
      }
      await ref.update({ paymentStatus: status, updatedAt: now.toISOString() });
      return {
        ...(doc.data() as Registration),
        id: doc.id,
        paymentStatus: status,
        updatedAt: now.toISOString(),
      };
    },

    async createInHouseRequest(input, now) {
      const db = await getDb();
      const year = now.getUTCFullYear();
      const counterRef = db.collection(COUNTERS).doc("inhouse-" + year);
      const requestRef = db.collection(IN_HOUSE).doc();

      // Transactional purely so two simultaneous requests cannot be given the
      // same reference number.
      return db.runTransaction(async (tx) => {
        const counter = await tx.get(counterRef);
        const sequence = ((counter.data()?.value as number | undefined) ?? 0) + 1;

        const request: InHouseRequest = {
          id: requestRef.id,
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

        tx.set(counterRef, { value: sequence, updatedAt: now.toISOString() });
        const { id: _id, ...rest } = request;
        tx.set(requestRef, rest);
        return request;
      });
    },

    async listInHouseRequests() {
      const db = await getDb();
      const snap = await db.collection(IN_HOUSE).orderBy("createdAt", "desc").get();
      return snap.docs.map((d) => ({ ...(d.data() as InHouseRequest), id: d.id }));
    },

    async updateInHouseRequestStatus(requestId, status, now) {
      const db = await getDb();
      const ref = db.collection(IN_HOUSE).doc(requestId);
      const doc = await ref.get();
      if (!doc.exists) throw new AppError("SESSION_NOT_FOUND", "That request could not be found.");
      await ref.update({ status, updatedAt: now.toISOString() });
      return { ...(doc.data() as InHouseRequest), id: doc.id, status, updatedAt: now.toISOString() };
    },

    async listContactEmails() {
      const db = await getDb();
      const [regs, reqs] = await Promise.all([
        db.collection(REGISTRATIONS).get(),
        db.collection(IN_HOUSE).get(),
      ]);
      // One entry per address, keeping the most recently seen name.
      const byEmail = new Map<string, { email: string; fullName: string }>();
      for (const d of regs.docs) {
        const r = d.data() as Registration;
        if (r.email?.includes("@")) byEmail.set(r.email.toLowerCase(), { email: r.email, fullName: r.fullName });
      }
      for (const d of reqs.docs) {
        const q = d.data() as InHouseRequest;
        if (q.email?.includes("@")) byEmail.set(q.email.toLowerCase(), { email: q.email, fullName: q.fullName });
      }
      return [...byEmail.values()];
    },

    async reset(sessions, counts) {
      const db = await getDb();
      for (const collection of [SESSIONS, REGISTRATIONS, UNIQUENESS, COUNTERS, IN_HOUSE]) {
        const snap = await db.collection(collection).get();
        const batch = db.batch();
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
      for (const input of sessions) {
        const session = materialiseSession(input);
        const seeded = counts?.[input.sessionName];
        if (typeof seeded === "number") {
          session.registeredCount = Math.min(seeded, session.maximumSeats);
          if (session.status !== "CANCELLED" && session.registeredCount >= session.maximumSeats) {
            session.status = "FULL";
          }
        }
        const { id, ...rest } = session;
        await db.collection(SESSIONS).doc(id).set(rest);
      }
    },
  };
}
