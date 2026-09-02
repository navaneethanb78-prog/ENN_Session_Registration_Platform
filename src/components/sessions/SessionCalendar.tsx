"use client";

import clsx from "clsx";
import { useMemo, useRef, useState } from "react";
import type { PublicSessionDto } from "@/lib/sessions/dto";
import { zonedDayKey, zonedParts } from "@/lib/time";
import { DEFAULT_TIMEZONE } from "@/lib/config";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface DayCell {
  key: string;
  day: number;
  inMonth: boolean;
  sessions: PublicSessionDto[];
}

/** Monday-first grid for the given month, padded to whole weeks. */
function buildMonthGrid(year: number, month: number, byDay: Map<string, PublicSessionDto[]>): DayCell[] {
  const first = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  // getUTCDay: 0=Sun. Shift so Monday is 0.
  const leading = (first.getUTCDay() + 6) % 7;

  const cells: DayCell[] = [];
  const prevMonthDays = new Date(Date.UTC(year, month, 0)).getUTCDate();

  for (let i = leading - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const key = keyOf(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1, d);
    cells.push({ key, day: d, inMonth: false, sessions: byDay.get(key) ?? [] });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const key = keyOf(year, month, d);
    cells.push({ key, day: d, inMonth: true, sessions: byDay.get(key) ?? [] });
  }
  while (cells.length % 7 !== 0) {
    const d = cells.length - leading - daysInMonth + 1;
    const key = keyOf(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1, d);
    cells.push({ key, day: d, inMonth: false, sessions: byDay.get(key) ?? [] });
  }
  return cells;
}

function keyOf(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Month calendar of sessions.
 *
 * Fully keyboard operable: arrow keys move between days (roving tabindex),
 * Home/End jump to the ends of a week, PageUp/PageDown change month, and
 * Enter or Space activates the focused day. Days whose sessions have all
 * completed are rendered muted and are announced as unavailable.
 */
export function SessionCalendar({
  sessions,
  selectedId,
  onPickSession,
  onPickUnavailable,
  timeZone = DEFAULT_TIMEZONE,
}: {
  sessions: PublicSessionDto[];
  selectedId?: string | null;
  onPickSession: (session: PublicSessionDto) => void;
  onPickUnavailable: (session: PublicSessionDto) => void;
  timeZone?: string;
}) {
  const byDay = useMemo(() => {
    const map = new Map<string, PublicSessionDto[]>();
    for (const s of sessions) {
      const key = zonedDayKey(s.startAt, s.timezone || timeZone);
      const list = map.get(key);
      if (list) list.push(s);
      else map.set(key, [s]);
    }
    return map;
  }, [sessions, timeZone]);

  // Open on the month of the first session that can still be registered for.
  const initial = useMemo(() => {
    const target = sessions.find((s) => s.canRegister) ?? sessions[0];
    const at = target ? zonedParts(target.startAt, target.timezone || timeZone) : zonedParts(new Date(), timeZone);
    return { year: at.year, month: at.month };
  }, [sessions, timeZone]);

  const [cursor, setCursor] = useState(initial);
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const cells = useMemo(
    () => buildMonthGrid(cursor.year, cursor.month, byDay),
    [cursor, byDay],
  );

  const firstActiveKey =
    cells.find((c) => c.inMonth && c.sessions.some((s) => s.canRegister))?.key ??
    cells.find((c) => c.inMonth && c.sessions.length > 0)?.key ??
    cells.find((c) => c.inMonth)?.key ??
    null;

  const rovingKey = focusedKey && cells.some((c) => c.key === focusedKey) ? focusedKey : firstActiveKey;

  function shiftMonth(delta: number) {
    setCursor((c) => {
      const m = c.month + delta;
      return { year: c.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
    });
    setFocusedKey(null);
  }

  function moveFocus(fromKey: string, delta: number) {
    const index = cells.findIndex((c) => c.key === fromKey);
    if (index === -1) return;
    const next = cells[index + delta];
    if (!next) {
      shiftMonth(delta > 0 ? 1 : -1);
      return;
    }
    setFocusedKey(next.key);
    requestAnimationFrame(() => {
      gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${next.key}"]`)?.focus();
    });
  }

  function handleKeyDown(event: React.KeyboardEvent, key: string) {
    const map: Record<string, number> = {
      ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7,
    };
    if (key in map || event.key in map) {
      const delta = map[event.key];
      if (delta !== undefined) {
        event.preventDefault();
        moveFocus(key, delta);
        return;
      }
    }
    if (event.key === "PageUp") {
      event.preventDefault();
      shiftMonth(-1);
    } else if (event.key === "PageDown") {
      event.preventDefault();
      shiftMonth(1);
    }
  }

  function activate(cell: DayCell) {
    const open = cell.sessions.find((s) => s.canRegister);
    if (open) {
      onPickSession(open);
      return;
    }
    const first = cell.sessions[0];
    if (first) onPickUnavailable(first);
  }

  const monthLabel = `${MONTHS[cursor.month]} ${cursor.year}`;

  return (
    <div className="rounded-xl border border-ink-200/80 bg-white p-4 shadow-[var(--shadow-card)] sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800"
          aria-label="Previous month"
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
            <path d="M10 3.5 5.5 8l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <p aria-live="polite" className="font-display text-sm font-semibold text-brand-950">
          {monthLabel}
        </p>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800"
          aria-label="Next month"
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
            <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1" aria-hidden="true">
        {WEEKDAYS.map((d) => (
          <div key={d} className="pb-1 text-center text-[0.6875rem] font-medium tracking-wide text-ink-400">
            {d.charAt(0)}
            <span className="sr-only">{d}</span>
          </div>
        ))}
      </div>

      <div ref={gridRef} role="grid" aria-label={`Sessions in ${monthLabel}`} className="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const hasSessions = cell.sessions.length > 0;
          const openSession = cell.sessions.find((s) => s.canRegister);
          const allUnavailable = hasSessions && !openSession;
          const isSelected = cell.sessions.some((s) => s.id === selectedId);
          const dominant = openSession ?? cell.sessions[0];

          return (
            <button
              key={cell.key}
              type="button"
              role="gridcell"
              data-day={cell.key}
              tabIndex={cell.key === rovingKey ? 0 : -1}
              disabled={!hasSessions}
              aria-selected={isSelected || undefined}
              aria-disabled={allUnavailable || undefined}
              aria-label={
                hasSessions && dominant
                  ? `${cell.day} ${MONTHS[cursor.month]}: ${dominant.sessionName}, ${dominant.availabilityLabel}`
                  : `${cell.day} ${MONTHS[cursor.month]}, no sessions`
              }
              onFocus={() => setFocusedKey(cell.key)}
              onKeyDown={(e) => handleKeyDown(e, cell.key)}
              onClick={() => activate(cell)}
              className={clsx(
                "relative flex aspect-square flex-col items-center justify-center rounded-lg text-[0.8125rem] transition-colors",
                !cell.inMonth && "text-ink-300",
                cell.inMonth && !hasSessions && "text-ink-400",
                hasSessions && !allUnavailable && "font-semibold text-brand-900 hover:bg-brand-50",
                // Completed / cancelled days: muted, struck through, not selectable.
                allUnavailable && "cursor-not-allowed text-ink-300 line-through decoration-ink-300 opacity-60",
                isSelected && "bg-brand-900 text-white hover:bg-brand-900",
                hasSessions && !isSelected && !allUnavailable && "ring-1 ring-inset ring-brand-200",
              )}
            >
              <span>{cell.day}</span>
              {hasSessions && (
                <span
                  aria-hidden="true"
                  className={clsx(
                    "absolute bottom-1.5 h-1 w-1 rounded-full",
                    isSelected
                      ? "bg-white"
                      : allUnavailable
                        ? "bg-ink-300"
                        : dominant?.availability === "LOW"
                          ? "bg-amber-500"
                          : "bg-emerald-500",
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      <ul className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-ink-100 pt-3 text-[0.6875rem] text-ink-500">
        <li className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" /> Seats available
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" /> Filling fast
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-ink-300" aria-hidden="true" />
          <span className="line-through decoration-ink-300">Completed</span>
        </li>
      </ul>
    </div>
  );
}
