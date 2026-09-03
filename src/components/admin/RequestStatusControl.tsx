"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import type { InHouseRequestStatus } from "@/lib/db/types";

const OPTIONS: { value: InHouseRequestStatus; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "PLANNING", label: "Planning" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "REJECTED", label: "Rejected" },
];

export const REQUEST_STATUS_STYLE: Record<InHouseRequestStatus, string> = {
  PENDING: "border-ink-300 bg-ink-50 text-ink-700",
  PLANNING: "border-amber-300 bg-amber-50 text-amber-900",
  ACCEPTED: "border-emerald-300 bg-emerald-50 text-emerald-900",
  REJECTED: "border-rose-300 bg-rose-50 text-rose-900",
};

/**
 * Status for one on-site request.
 *
 * A select rather than four buttons: only one status applies at a time, the
 * control stays one line wide however many statuses exist, and it reads the
 * same on a phone as on a desktop.
 */
export function RequestStatusControl({
  requestId,
  status,
}: {
  requestId: string;
  status: InHouseRequestStatus;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState<InHouseRequestStatus>(status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function update(next: InHouseRequestStatus) {
    if (next === current) return;
    const previous = current;
    setCurrent(next);
    setBusy(true);
    setError(null);
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
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="sr-only" htmlFor={`status-${requestId}`}>
        Request status
      </label>
      <select
        id={`status-${requestId}`}
        value={current}
        disabled={busy}
        onChange={(e) => update(e.target.value as InHouseRequestStatus)}
        className={clsx(
          "h-9 w-full max-w-[10rem] rounded-lg border px-2.5 text-[0.8125rem] font-medium transition-colors disabled:opacity-60",
          REQUEST_STATUS_STYLE[current],
        )}
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && (
        <span role="alert" className="text-[0.6875rem] text-rose-600">
          {error}
        </span>
      )}
    </div>
  );
}
