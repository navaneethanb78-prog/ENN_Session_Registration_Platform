"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Alert } from "@/components/ui/Primitives";

/**
 * Cancelling keeps the session and its registrations on record and stops
 * further sign-ups. Deleting removes the session and every registration
 * attached to it, so it is confirmed separately.
 */
export function SessionDangerZone({
  sessionId,
  sessionName,
  cancelled,
  registrationCount,
}: {
  sessionId: string;
  sessionName: string;
  cancelled: boolean;
  registrationCount: number;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<"cancel" | "delete" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: "cancel" | "delete") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}`, {
        method: action === "cancel" ? "PATCH" : "DELETE",
        headers: { "Content-Type": "application/json" },
        ...(action === "cancel" ? { body: JSON.stringify({ action: "cancel" }) } : {}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message ?? "That action could not be completed.");
        return;
      }
      setConfirming(null);
      if (action === "delete") router.push("/admin/sessions");
      router.refresh();
    } catch {
      setError("That action could not be completed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-rose-200 bg-rose-50/40 p-5 sm:p-6">
      <h2 className="font-display text-base font-semibold text-rose-900">Cancel or remove</h2>
      <p className="mt-1 text-[0.8125rem] leading-relaxed text-rose-800/80">
        Cancelling stops new registrations and shows the session as cancelled, keeping all
        {" "}{registrationCount} registration{registrationCount === 1 ? "" : "s"} on record.
        Deleting removes the session and its registrations permanently.
      </p>

      {error && (
        <Alert tone="error" className="mt-4">
          {error}
        </Alert>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Button
          variant="secondary"
          disabled={cancelled}
          onClick={() => setConfirming("cancel")}
        >
          {cancelled ? "Already cancelled" : "Cancel session"}
        </Button>
        <Button variant="danger" onClick={() => setConfirming("delete")}>
          Delete session
        </Button>
      </div>

      <Dialog
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        title={confirming === "delete" ? "Delete this session?" : "Cancel this session?"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(null)} disabled={busy}>
              Keep session
            </Button>
            <Button
              variant={confirming === "delete" ? "danger" : "primary"}
              loading={busy}
              loadingText="Working…"
              onClick={() => confirming && run(confirming)}
            >
              {confirming === "delete" ? "Delete permanently" : "Cancel session"}
            </Button>
          </>
        }
      >
        {confirming === "delete" ? (
          <p>
            <strong>{sessionName}</strong> and its {registrationCount} registration
            {registrationCount === 1 ? "" : "s"} will be permanently removed. This cannot be undone.
          </p>
        ) : (
          <p>
            <strong>{sessionName}</strong> will stop accepting registrations and will be shown as
            cancelled. Existing registrations are kept.
          </p>
        )}
      </Dialog>
    </section>
  );
}
