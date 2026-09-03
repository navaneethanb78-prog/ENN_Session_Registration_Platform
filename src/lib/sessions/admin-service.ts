import { getStore } from "@/lib/db";
import type { InHouseRequest, Registration, TrainingSession } from "@/lib/db/types";
import { AppError } from "@/lib/errors";
import { fieldErrorsFrom, sessionSchema } from "@/lib/validation/schemas";
import { bySessionStart, computeSessionView, type SessionView } from "./status";

/** Admin-side operations. Every caller must already have passed requireAdmin(). */

export interface AdminSessionRow extends SessionView {
  registrationCount: number;
}

/**
 * Sessions for the administration area, most recent first.
 *
 * The public catalogue leads with what is bookable; an administrator is nearly
 * always working on the newest session, and with several years of history the
 * oldest-first order buried it at the bottom of the page.
 */
export async function listAdminSessions(now: Date = new Date()): Promise<SessionView[]> {
  const store = await getStore();
  const sessions = await store.listSessions();
  return sessions
    .sort((a, b) => -bySessionStart(a, b))
    .map((s) => computeSessionView(s, now));
}

export async function getAdminSession(id: string, now: Date = new Date()): Promise<SessionView> {
  const store = await getStore();
  const session = await store.getSession(id);
  if (!session) throw new AppError("SESSION_NOT_FOUND");
  return computeSessionView(session, now);
}

function parseSession(raw: unknown) {
  const parsed = sessionSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Please correct the highlighted fields.",
      fieldErrorsFrom(parsed.error),
    );
  }
  return parsed.data;
}

export async function createSession(raw: unknown): Promise<TrainingSession> {
  const store = await getStore();
  return store.createSession(parseSession(raw));
}

export async function updateSession(id: string, raw: unknown): Promise<TrainingSession> {
  const store = await getStore();
  return store.updateSession(id, parseSession(raw));
}

/** Cancelling preserves the record and its registrations; deleting removes both. */
export async function cancelSession(id: string): Promise<TrainingSession> {
  const store = await getStore();
  return store.updateSession(id, { status: "CANCELLED", isActive: false });
}

export async function deleteSession(id: string): Promise<void> {
  const store = await getStore();
  await store.deleteSession(id);
}

export interface RegistrationRow extends Registration {
  sessionName: string;
  sessionDate: string;
  sessionStartAt: string;
  sessionTimezone: string;
}

export async function listAdminRegistrations(filter?: {
  sessionId?: string;
}): Promise<RegistrationRow[]> {
  const store = await getStore();
  const [registrations, sessions] = await Promise.all([
    store.listRegistrations(filter),
    store.listSessions(),
  ]);
  const byId = new Map(sessions.map((s) => [s.id, s]));

  return registrations
    .map((r) => {
      const session = byId.get(r.sessionId);
      return {
        ...r,
        sessionName: session?.sessionName ?? "Deleted session",
        sessionDate: session?.date ?? "",
        sessionStartAt: session?.startAt ?? "",
        sessionTimezone: session?.timezone ?? "Asia/Kolkata",
      };
    })
    .sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime());
}

export async function listAdminInHouseRequests(): Promise<InHouseRequest[]> {
  const store = await getStore();
  return store.listInHouseRequests();
}

export interface DashboardStats {
  totalSessions: number;
  upcomingSessions: number;
  totalRegistrations: number;
  seatsFilledPercent: number;
  totalCapacity: number;
  totalSeatsTaken: number;
  nextSession: SessionView | null;
  perSession: { id: string; name: string; registered: number; capacity: number }[];
}

export async function dashboardStats(now: Date = new Date()): Promise<DashboardStats> {
  const views = await listAdminSessions(now);
  const store = await getStore();
  const registrations = await store.listRegistrations();

  const live = views.filter((v) => v.status !== "CANCELLED");
  // listAdminSessions returns newest first for the tables; "next session" and
  // the utilisation chart need the opposite, so they are re-sorted here rather
  // than depending on the list's order.
  const upcoming = live.filter((v) => !v.isPast).sort((a, b) => bySessionStart(a.session, b.session));

  // Utilisation is measured against sessions that are still relevant, so a long
  // history of past events does not distort the figure.
  const totalCapacity = upcoming.reduce((sum, v) => sum + v.session.maximumSeats, 0);
  const totalSeatsTaken = upcoming.reduce((sum, v) => sum + v.session.registeredCount, 0);

  return {
    totalSessions: views.length,
    upcomingSessions: upcoming.length,
    totalRegistrations: registrations.length,
    seatsFilledPercent: totalCapacity > 0 ? Math.round((totalSeatsTaken / totalCapacity) * 100) : 0,
    totalCapacity,
    totalSeatsTaken,
    nextSession: upcoming.find((v) => v.canRegister) ?? upcoming[0] ?? null,
    perSession: upcoming.slice(0, 8).map((v) => ({
      id: v.session.id,
      name: v.session.sessionName,
      registered: v.session.registeredCount,
      capacity: v.session.maximumSeats,
    })),
  };
}
