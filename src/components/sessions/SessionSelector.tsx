"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import type { PublicSessionDto } from "@/lib/sessions/dto";
import { completedSessionMessage } from "@/lib/sessions/status";
import { formatSessionDate } from "@/lib/time";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/Primitives";
import { SessionCalendar } from "./SessionCalendar";
import { SessionCard, SessionCardSkeleton } from "./SessionCard";

type Filter = "AVAILABLE" | "ALL";

export function SessionSelector({
  sessions,
  selectedId,
  onSelect,
  loading = false,
}: {
  sessions: PublicSessionDto[];
  selectedId: string | null;
  onSelect: (session: PublicSessionDto) => void;
  loading?: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("AVAILABLE");
  const [blocked, setBlocked] = useState<PublicSessionDto | null>(null);

  const visible = useMemo(() => {
    if (filter === "ALL") return sessions;
    // The default view stays uncluttered: future sessions only, including full
    // ones so people can see demand, but not a long tail of completed ones.
    return sessions.filter((s) => s.status !== "COMPLETED" && s.status !== "CANCELLED");
  }, [sessions, filter]);

  const availableCount = sessions.filter((s) => s.canRegister).length;

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <SessionCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="lg:w-[19rem] lg:shrink-0">
          <SessionCalendar
            sessions={sessions}
            selectedId={selectedId}
            onPickSession={onSelect}
            onPickUnavailable={setBlocked}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[0.8125rem] text-ink-500" aria-live="polite">
              {availableCount === 0
                ? "No sessions are currently open for registration."
                : `${availableCount} ${availableCount === 1 ? "session is" : "sessions are"} open for registration`}
            </p>
            <div
              className="inline-flex rounded-lg border border-ink-200 bg-white p-0.5"
              role="group"
              aria-label="Filter sessions"
            >
              {(
                [
                  ["AVAILABLE", "Upcoming"],
                  ["ALL", "Include past"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  aria-pressed={filter === value}
                  className={clsx(
                    "rounded-md px-3 py-1.5 text-[0.8125rem] font-medium transition-colors",
                    filter === value
                      ? "bg-brand-900 text-white"
                      : "text-ink-500 hover:bg-ink-50 hover:text-ink-700",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <EmptyState
              title="No sessions to show"
              description="There are no sessions scheduled in this view yet. Please check back shortly, or contact ENN Consultancy for the next available dates."
            />
          ) : (
            <ul className="grid list-none gap-4 sm:grid-cols-2">
              {visible.map((session) => (
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
                : "Registration Not Open"
        }
        footer={
          <Button variant="primary" onClick={() => setBlocked(null)}>
            Choose another session
          </Button>
        }
      >
        {blocked && (
          <p>
            {blocked.status === "COMPLETED"
              ? completedSessionMessage(
                  { sessionName: blocked.sessionName, topic: blocked.topic } as never,
                  formatSessionDate(blocked.startAt, blocked.timezone),
                )
              : blocked.status === "FULL"
                ? `${blocked.sessionName} on ${formatSessionDate(blocked.startAt, blocked.timezone)} has reached its maximum capacity of ${blocked.maximumSeats} seats. Please choose another available session.`
                : (blocked.blockedReason ??
                  "This session is not available for registration.")}
          </p>
        )}
      </Dialog>
    </div>
  );
}
