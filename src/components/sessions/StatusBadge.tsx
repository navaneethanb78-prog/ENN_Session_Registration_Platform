import clsx from "clsx";
import type { EffectiveSessionStatus } from "@/lib/db/types";
import type { AvailabilityLevel } from "@/lib/sessions/status";
import { STATUS_LABEL } from "@/lib/sessions/status";

/**
 * Status is communicated three ways at once — shape, text and colour — so it
 * remains legible to colour-blind users and in monochrome print.
 */

const STATUS_STYLES: Record<EffectiveSessionStatus, string> = {
  OPEN: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  UPCOMING: "bg-brand-50 text-brand-800 ring-brand-200",
  FULL: "bg-rose-50 text-rose-800 ring-rose-200",
  COMPLETED: "bg-ink-100 text-ink-600 ring-ink-200",
  CANCELLED: "bg-ink-100 text-ink-600 ring-ink-200",
};

const DOT_STYLES: Record<EffectiveSessionStatus, string> = {
  OPEN: "bg-emerald-500",
  UPCOMING: "bg-brand-500",
  FULL: "bg-rose-500",
  COMPLETED: "bg-ink-400",
  CANCELLED: "bg-ink-400",
};

export function StatusBadge({
  status,
  className,
}: {
  status: EffectiveSessionStatus;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        STATUS_STYLES[status],
        className,
      )}
    >
      <StatusGlyph status={status} />
      {STATUS_LABEL[status]}
    </span>
  );
}

/** A distinct shape per status, so colour is never the only cue. */
function StatusGlyph({ status }: { status: EffectiveSessionStatus }) {
  if (status === "FULL") {
    return (
      <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
        <circle cx="6" cy="6" r="5" className="fill-rose-500" />
        <path d="M4 4l4 4M8 4l-4 4" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }
  if (status === "COMPLETED") {
    return (
      <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
        <circle cx="6" cy="6" r="5" className="fill-ink-400" />
        <path d="M3.8 6.2l1.6 1.6 2.8-3.2" stroke="white" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      </svg>
    );
  }
  if (status === "CANCELLED") {
    return (
      <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
        <circle cx="6" cy="6" r="5" fill="none" className="stroke-ink-400" strokeWidth="1.5" />
        <path d="M3.5 8.5l5-5" className="stroke-ink-400" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  return <span className={clsx("h-2 w-2 rounded-full", DOT_STYLES[status])} aria-hidden="true" />;
}

const AVAILABILITY_TEXT: Record<AvailabilityLevel, string> = {
  GOOD: "text-emerald-700",
  MODERATE: "text-amber-700",
  LOW: "text-amber-700",
  NONE: "text-rose-700",
};

const AVAILABILITY_BAR: Record<AvailabilityLevel, string> = {
  GOOD: "bg-emerald-500",
  MODERATE: "bg-amber-500",
  LOW: "bg-amber-500",
  NONE: "bg-rose-500",
};

/**
 * Seat meter: a labelled progress bar plus an explicit count. The bar is
 * decorative (aria-hidden) because the same information is in the text beside
 * it, which screen readers announce directly.
 */
export function SeatMeter({
  registeredCount,
  maximumSeats,
  remainingSeats,
  occupiedRatio,
  availability,
  status,
  compact = false,
}: {
  registeredCount: number;
  maximumSeats: number;
  remainingSeats: number;
  occupiedRatio: number;
  availability: AvailabilityLevel;
  status: EffectiveSessionStatus;
  compact?: boolean;
}) {
  const muted = status === "COMPLETED" || status === "CANCELLED";
  const percent = Math.round(occupiedRatio * 100);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="tabular text-[0.8125rem] text-ink-500">
          {registeredCount} / {maximumSeats} registered
        </span>
        {!compact && !muted && (
          <span className={clsx("text-[0.8125rem] font-semibold", AVAILABILITY_TEXT[availability])}>
            {remainingSeats === 0
              ? "Session Full"
              : `${remainingSeats} ${remainingSeats === 1 ? "seat" : "seats"} left`}
          </span>
        )}
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100"
        role="img"
        aria-label={`${registeredCount} of ${maximumSeats} seats taken, ${percent} percent full`}
      >
        <div
          className={clsx(
            "h-full rounded-full transition-[width] duration-500 ease-out",
            muted ? "bg-ink-300" : AVAILABILITY_BAR[availability],
          )}
          style={{ width: `${Math.max(percent, registeredCount > 0 ? 3 : 0)}%` }}
        />
      </div>
    </div>
  );
}
