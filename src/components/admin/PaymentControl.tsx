"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import type { PaymentStatus } from "@/lib/db/types";
import { formatRupees } from "@/lib/payment";

/**
 * Payment verification for a paid registration.
 *
 * Confirming emails the registrant a receipt, so the control says so plainly
 * before it is clicked — an administrator should never be surprised by an
 * email going out.
 */
export function PaymentControl({
  registrationId,
  status,
  amountDue,
  paymentReference,
}: {
  registrationId: string;
  status: PaymentStatus;
  amountDue: number;
  paymentReference: string;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState<PaymentStatus>(status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Free sessions have nothing to reconcile.
  if (status === "NOT_REQUIRED") {
    return <span className="text-[0.75rem] text-ink-400">Free</span>;
  }

  async function set(next: PaymentStatus) {
    setBusy(true);
    setError(null);
    const previous = current;
    setCurrent(next);
    try {
      const res = await fetch(`/api/admin/registrations/${registrationId}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        setCurrent(previous);
        const data = await res.json().catch(() => null);
        setError(data?.message ?? "The payment status could not be updated.");
        return;
      }
      router.refresh();
    } catch {
      setCurrent(previous);
      setError("The payment status could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  const confirmed = current === "CONFIRMED";

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => set(confirmed ? "PENDING" : "CONFIRMED")}
        title={
          confirmed
            ? "Mark as unverified. No email is sent."
            : `Verify ${formatRupees(amountDue)} received and email a receipt.`
        }
        className={clsx(
          "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[0.75rem] font-medium ring-1 ring-inset transition-colors disabled:opacity-60",
          confirmed
            ? "bg-emerald-600 text-white ring-emerald-600 hover:bg-emerald-700"
            : "bg-white text-amber-800 ring-amber-300 hover:bg-amber-50",
        )}
      >
        {busy ? (
          "Working…"
        ) : confirmed ? (
          <>
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
              <path
                d="M3.5 8.5l3 3 6-6.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Verified
          </>
        ) : (
          "Mark verified"
        )}
      </button>

      <span className="tabular text-[0.6875rem] text-ink-400">
        {formatRupees(amountDue)}
        {paymentReference ? ` · ${paymentReference}` : " · no reference"}
      </span>

      {error && (
        <span role="alert" className="text-[0.6875rem] text-rose-600">
          {error}
        </span>
      )}
    </div>
  );
}
