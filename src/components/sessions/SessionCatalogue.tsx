"use client";

import { useMemo, useState } from "react";
import type { PublicSessionDto } from "@/lib/sessions/dto";
import { completedSessionMessage } from "@/lib/sessions/status";
import { formatInZone, formatSessionDate } from "@/lib/time";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/Primitives";
import { SessionCalendar } from "./SessionCalendar";
import { SessionCard } from "./SessionCard";

interface MonthGroup {
  key: string;
  label: string;
  rows: PublicSessionDto[];
}

/**
 * Group sessions under a month heading.
 *
 * The month label is derived from the session's stored instant and its own
 * timezone with an explicit format pattern — never from the viewer's locale —
 * so the server and the client always produce the same text.
 */
function groupByMonth(rows: PublicSessionDto[], newestFirst = false): MonthGroup[] {
  const groups = new Map<string, MonthGroup>();

  for (const session of rows) {
    const key = formatInZone(session.startAt, "yyyy-MM", session.timezone);
    const existing = groups.get(key);
    if (existing) {
      existing.rows.push(session);
    } else {
      groups.set(key, {
        key,
        label: formatInZone(session.startAt, "MMMM yyyy", session.timezone),
        rows: [session],
      });
    }
  }

  const ordered = [...groups.values()].sort((a, b) =>
    newestFirst ? b.key.localeCompare(a.key) : a.key.localeCompare(b.key),
  );
  for (const group of ordered) {
    group.rows.sort((a, b) => {
      const diff = new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
      return newestFirst ? -diff : diff;
    });
  }
  return ordered;
}

export function SessionCatalogue({
  sessions,
  selectedId = null,
  onSelect,
}: {
  sessions: PublicSessionDto[];
  selectedId?: string | null;
  onSelect?: (session: PublicSessionDto) => void;
}) {
  const [blocked, setBlocked] = useState<PublicSessionDto | null>(null);
  const [showPast, setShowPast] = useState(false);

  const { forthcoming, cancelled, past, openCount, seatsAvailable } = useMemo(() => {
    // Grouping keys off the derived status only — no clock reads during render,
    // which would risk a server/client mismatch.
    const forth = sessions.filter(
      (s) => s.status === "OPEN" || s.status === "FULL" || s.status === "UPCOMING",
    );
    const open = forth.filter((s) => s.status === "OPEN");
    return {
      forthcoming: groupByMonth(forth),
      cancelled: sessions.filter((s) => s.status === "CANCELLED"),
      past: groupByMonth(
        sessions.filter((s) => s.status === "COMPLETED"),
        true,
      ),
      openCount: open.length,
      seatsAvailable: open.reduce((sum, s) => sum + s.remainingSeats, 0),
    };
  }, [sessions]);

  const pastCount = past.reduce((n, g) => n + g.rows.length, 0);

  function Cards({ rows }: { rows: PublicSessionDto[] }) {
    return (
      <ul className="grid list-none gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((session) => (
          <li key={session.id}>
            <SessionCard
              session={session}
              selected={session.id === selectedId}
              onSelect={onSelect}
              onBlockedClick={setBlocked}
            />
          </li>
        ))}
      </ul>
    );
  }

  function MonthSections({ groups }: { groups: MonthGroup[] }) {
    return (
      <div className="flex flex-col gap-8">
        {groups.map((group) => (
          <section key={group.key} aria-label={group.label}>
            <div className="mb-4 flex items-center gap-3">
              <h4 className="font-display text-[0.9375rem] font-semibold text-brand-900">
                {group.label}
              </h4>
              <span className="h-px flex-1 bg-ink-200" aria-hidden="true" />
              <span className="tabular text-[0.75rem] text-ink-400">
                {group.rows.length} {group.rows.length === 1 ? "session" : "sessions"}
              </span>
            </div>
            <Cards rows={group.rows} />
          </section>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-8 xl:grid-cols-[19rem_minmax(0,1fr)] xl:items-start">
        <div className="xl:sticky xl:top-24">
          <SessionCalendar
            sessions={sessions}
            selectedId={selectedId}
            onPickSession={(session) => (onSelect ? onSelect(session) : setBlocked(session))}
            onPickUnavailable={setBlocked}
          />
        </div>

        <div className="min-w-0">
          {sessions.length === 0 ? (
            <EmptyState
              title="No sessions published yet"
              description="New training dates are announced regularly. Please check back shortly, or ask us to run a programme at your premises."
            />
          ) : (
            <div className="flex flex-col gap-12">
              <section aria-labelledby="upcoming-heading">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h3
                    id="upcoming-heading"
                    className="font-display text-xl font-semibold tracking-tight text-brand-950"
                  >
                    Upcoming sessions
                  </h3>
                  {openCount > 0 && (
                    <p className="text-[0.8125rem] text-ink-500">
                      <span className="font-semibold text-emerald-700">
                        {openCount} open
                      </span>
                      <span className="text-ink-400"> · {seatsAvailable} seats available</span>
                    </p>
                  )}
                </div>

                <div className="mt-5">
                  {forthcoming.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-ink-200 bg-white/60 px-5 py-8 text-center">
                      <p className="font-medium text-brand-950">No upcoming sessions scheduled</p>
                      <p className="mx-auto mt-1 max-w-md text-[0.9375rem] text-ink-500">
                        New dates are announced regularly. In the meantime, we can run any
                        programme at your own premises.
                      </p>
                    </div>
                  ) : (
                    <MonthSections groups={forthcoming} />
                  )}
                </div>
              </section>

              {cancelled.length > 0 && (
                <section aria-labelledby="cancelled-heading">
                  <h3
                    id="cancelled-heading"
                    className="font-display text-xl font-semibold tracking-tight text-brand-950"
                  >
                    Cancelled
                  </h3>
                  <p className="mt-1 text-[0.9375rem] text-ink-500">
                    These sessions will not take place as scheduled.
                  </p>
                  <div className="mt-5">
                    <Cards rows={cancelled} />
                  </div>
                </section>
              )}

              {pastCount > 0 && (
                <section aria-labelledby="past-heading">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                    <div>
                      <h3
                        id="past-heading"
                        className="font-display text-xl font-semibold tracking-tight text-brand-950"
                      >
                        Past sessions
                      </h3>
                      <p className="mt-1 text-[0.9375rem] text-ink-500">
                        Already delivered to registered delegates. Listed for reference only.
                      </p>
                    </div>
                    {/* Collapsed by default so history never buries what is bookable. */}
                    <Button
                      variant="secondary"
                      size="sm"
                      aria-expanded={showPast}
                      aria-controls="past-sessions"
                      onClick={() => setShowPast((v) => !v)}
                    >
                      {showPast ? "Hide" : `Show ${pastCount} past ${pastCount === 1 ? "session" : "sessions"}`}
                    </Button>
                  </div>

                  {showPast && (
                    <div id="past-sessions" className="mt-6 animate-fade-up">
                      <MonthSections groups={past} />
                    </div>
                  )}
                </section>
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={blocked !== null}
        onClose={() => setBlocked(null)}
        title={
          blocked?.status === "COMPLETED"
            ? "Session Completed"
            : blocked?.status === "CANCELLED"
              ? "Session Cancelled"
              : blocked?.status === "FULL"
                ? "Session Full"
                : (blocked?.sessionName ?? "Session")
        }
        footer={<Button onClick={() => setBlocked(null)}>Close</Button>}
      >
        {blocked && (
          <p>
            {blocked.status === "COMPLETED"
              ? completedSessionMessage(
                  { sessionName: blocked.sessionName, topic: blocked.topic } as never,
                  formatSessionDate(blocked.startAt, blocked.timezone),
                )
              : blocked.status === "FULL"
                ? `${blocked.sessionName} on ${formatSessionDate(blocked.startAt, blocked.timezone)} has reached its maximum capacity of ${blocked.maximumSeats} seats.`
                : (blocked.blockedReason ?? "This session is not available for registration.")}
          </p>
        )}
      </Dialog>
    </div>
  );
}
