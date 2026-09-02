"use client";

import clsx from "clsx";
import type { PublicSessionDto } from "@/lib/sessions/dto";
import { formatSessionDate, formatTimeRange, timeZoneLabel } from "@/lib/time";
import { Button, LinkButton } from "@/components/ui/Button";
import { formatRupees } from "@/lib/payment";
import { SeatMeter, StatusBadge } from "./StatusBadge";
import { CalendarIcon, CheckIcon, ClockIcon, MODE_LABEL, PlaceIcon } from "./icons";

function actionLabelFor(status: PublicSessionDto["status"], selected: boolean): string {
  switch (status) {
    case "OPEN":
      return selected ? "Selected" : "Select Session";
    case "FULL":
      return "Registration Closed";
    case "COMPLETED":
      return "Not Available";
    case "CANCELLED":
      return "Cancelled";
    case "UPCOMING":
      return "Not Open Yet";
  }
}

export function SessionCard({
  session,
  selected = false,
  onSelect,
  onBlockedClick,
}: {
  session: PublicSessionDto;
  selected?: boolean;
  onSelect?: (session: PublicSessionDto) => void;
  onBlockedClick?: (session: PublicSessionDto) => void;
}) {
  const unavailable = !session.canRegister;
  const isPastOrGone = session.status === "COMPLETED" || session.status === "CANCELLED";

  return (
    <article
      aria-label={`${session.sessionName}, ${formatSessionDate(session.startAt, session.timezone)}, ${session.availabilityLabel}`}
      className={clsx(
        "group relative flex flex-col rounded-xl border bg-white p-5 transition-all duration-200",
        selected
          ? "border-brand-600 shadow-[var(--shadow-lift)] ring-1 ring-brand-600"
          : "border-ink-200/80 shadow-[var(--shadow-card)]",
        !unavailable &&
          !selected &&
          "hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]",
        isPastOrGone && "bg-ink-50/60 opacity-70 saturate-[0.4]",
      )}
    >
      {/*
        Badges sit on their own row above the title. Placing them beside it made
        the status pill compete for width in a narrow card, wrapping the session
        name onto one word per line.
      */}
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={session.status} />
        {/*
          A completed session shows only that it was paid, never the fee: the
          historical charge was a whole-engagement figure, not a per-seat price,
          and publishing it would misrepresent what an attendee paid. The same
          applies to any paid session with no published per-seat price.
        */}
        <span
          className={clsx(
            "rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
            session.isFree
              ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
              : "bg-brand-50 text-brand-800 ring-brand-200",
          )}
        >
          {session.isFree
            ? "Free"
            : isPastOrGone || session.price <= 0
              ? "Paid"
              : formatRupees(session.price)}
        </span>
      </div>

      <div className="mt-3">
        <h3
          className={clsx(
            "font-display text-base leading-snug font-semibold text-balance text-brand-950",
            isPastOrGone && "text-ink-500 line-through decoration-ink-300",
          )}
        >
          {session.sessionName}
        </h3>
        <p className="mt-1 text-[0.8125rem] text-ink-500">{session.topic}</p>
      </div>

      <dl className="mt-4 flex flex-col gap-2 text-[0.8125rem] text-ink-600">
        <div className="flex items-center gap-2">
          <CalendarIcon />
          <dt className="sr-only">Date</dt>
          <dd>{formatSessionDate(session.startAt, session.timezone)}</dd>
        </div>
        <div className="flex items-center gap-2">
          <ClockIcon />
          <dt className="sr-only">Time</dt>
          <dd className="tabular">
            {formatTimeRange(session.startAt, session.endAt, session.timezone)}{" "}
            <span className="text-ink-400">
              ({timeZoneLabel(session.timezone)})
            </span>
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <PlaceIcon mode={session.mode} />
          <dt className="sr-only">Location</dt>
          <dd>{session.location || MODE_LABEL[session.mode]}</dd>
        </div>
      </dl>

      <div className="mt-4">
        <SeatMeter
          registeredCount={session.registeredCount}
          maximumSeats={session.maximumSeats}
          remainingSeats={session.remainingSeats}
          occupiedRatio={session.occupiedRatio}
          availability={session.availability}
          status={session.status}
        />
      </div>

      <p
        className={clsx(
          "mt-3 text-[0.8125rem] font-medium",
          session.status === "OPEN"
            ? session.availability === "LOW"
              ? "text-amber-700"
              : "text-emerald-700"
            : "text-ink-500",
        )}
      >
        {session.status === "OPEN" && session.availability === "LOW"
          ? `Only ${session.remainingSeats} ${session.remainingSeats === 1 ? "seat" : "seats"} remaining`
          : session.availabilityLabel}
      </p>

      <div className="mt-4 pt-1">
        {/*
          With a selection handler the card is part of a picker. Without one
          (the landing page) it must still lead somewhere, so an open session
          links through to the registration page rather than presenting a
          button that does nothing.
        */}
        {!unavailable && !onSelect ? (
          <LinkButton href="/register" variant="secondary" fullWidth>
            Register for this session
          </LinkButton>
        ) : (
          <Button
            variant="secondary"
            fullWidth
            disabled={unavailable}
            aria-pressed={onSelect ? selected : undefined}
            onClick={() => (unavailable ? onBlockedClick?.(session) : onSelect?.(session))}
            icon={selected ? <CheckIcon /> : undefined}
            className={clsx(
              selected && "border-brand-600 bg-brand-900 text-white ring-0 hover:bg-brand-800",
            )}
          >
            {actionLabelFor(session.status, selected)}
          </Button>
        )}
        {unavailable && !isPastOrGone && session.blockedReason && (
          <p className="mt-2 text-center text-xs text-ink-400">{session.blockedReason}</p>
        )}
      </div>

      {isPastOrGone && onBlockedClick && (
        <button
          type="button"
          onClick={() => onBlockedClick(session)}
          className="absolute inset-0 rounded-xl"
          aria-label={`${session.sessionName} — ${
            session.status === "COMPLETED" ? "completed" : "cancelled"
          }. Show details.`}
        />
      )}
    </article>
  );
}

export function SessionCardSkeleton() {
  return (
    <div className="rounded-xl border border-ink-200/80 bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="skeleton h-5 w-3/4 rounded" />
      <div className="skeleton mt-2 h-3.5 w-1/2 rounded" />
      <div className="mt-5 flex flex-col gap-2.5">
        <div className="skeleton h-3.5 w-2/3 rounded" />
        <div className="skeleton h-3.5 w-1/2 rounded" />
        <div className="skeleton h-3.5 w-3/5 rounded" />
      </div>
      <div className="skeleton mt-5 h-1.5 w-full rounded-full" />
      <div className="skeleton mt-5 h-11 w-full rounded-lg" />
    </div>
  );
}
