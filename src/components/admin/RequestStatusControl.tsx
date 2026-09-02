"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import type { InHouseRequestStatus } from "@/lib/db/types";

const OPTIONS: { value: InHouseRequestStatus; label: string; active: string }[] = [
  { value: "PENDING", label: "Pending", active: "bg-ink-700 text-white ring-ink-700" },
  { value: "PLANNING", label: "Planning", active: "bg-amber-500 text-white ring-amber-500" },
  { value: "ACCEPTED", label: "Accepted", active: "bg-emerald-600 text-white ring-emerald-600" },
  { value: "REJECTED", label: "Rejected", active: "bg-rose-600 text-white ring-rose-600" },
];

export const REQUEST_STATUS_STYLE: Record<InHouseRequestStatus, string> = {
  PENDING: "bg-ink-100 text-ink-700 ring-ink-200",
  PLANNING: "bg-amber-50 text-amber-800 ring-amber-200",
  ACCEPTED: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  REJECTED: "bg-rose-50 text-rose-800 ring-rose-200",
};

/** Inline status switcher for a single on-site request. */
export function RequestStatusControl({
  requestId,
  status,
  compact = false,
}: {
  requestId: string;
  status: InHouseRequestStatus;
  compact?: boolean;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState<InHouseRequestStatus>(status);
  const [busy, setBusy] = useState<InHouseRequestStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function update(next: InHouseRequestStatus) {
    if (next === current) return;
    setBusy(next);
    setError(null);
    const previous = current;
    setCurrent(next); // optimistic

    try {
      const res = await fetch(`/api/admin/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        setCurrent(previous);
        const data = await res.json().catch(() => null);
        setError(data?.message ?? "The status could not be updated.");
        return;
      }
      router.refresh();
    } catch {
      setCurrent(previous);
      setError("The status could not be updated.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div
        className={clsx("inline-flex flex-wrap gap-1", compact && "gap-1")}
        role="group"
        aria-label="Request status"
      >
        {OPTIONS.map((option) => {
          const selected = current === option.value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={busy !== null}
              aria-pressed={selected}
              onClick={() => update(option.value)}
              className={clsx(
                "rounded-md px-2.5 py-1.5 text-[0.75rem] font-medium ring-1 ring-inset transition-colors disabled:opacity-60",
                selected
                  ? option.active
                  : "bg-white text-ink-500 ring-ink-200 hover:bg-ink-50 hover:text-ink-800",
              )}
            >
              {busy === option.value ? "…" : option.label}
            </button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-[0.75rem] text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}
