"use client";

import { useEffect, useState } from "react";
import { formatSessionDate } from "@/lib/time";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Alert, Card } from "@/components/ui/Primitives";

/**
 * Announce a session to everyone on record.
 *
 * A bulk send cannot be undone, so it is gated behind an explicit tick and a
 * confirmation that states the exact recipient count. The audience is loaded
 * before the dialog opens, so nobody is ever asked to approve an unknown number
 * of emails.
 */
export function AnnounceSession({
  sessionId,
  sessionName,
  startAt,
  timezone,
  location,
}: {
  sessionId: string;
  sessionName: string;
  startAt: string;
  timezone: string;
  location: string;
}) {
  const [armed, setArmed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [audience, setAudience] = useState<number | null>(null);
  const [emailConfigured, setEmailConfigured] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/announce")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setAudience(d.recipients);
        setEmailConfigured(d.emailConfigured);
      })
      .catch(() => undefined);
  }, []);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/announce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.message ?? "The announcement could not be sent.");
        return;
      }
      setResult({ sent: data.sent, failed: data.failed });
      setConfirming(false);
      setArmed(false);
    } catch {
      setError("The announcement could not be sent. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="font-display text-base font-semibold text-brand-950">
        Announce this session
      </h2>
      <p className="mt-1 text-[0.8125rem] leading-relaxed text-ink-500">
        Emails everyone who has previously registered for, or enquired about, an ENN programme,
        telling them about this session and inviting them to register.
      </p>

      {!emailConfigured && (
        <Alert tone="warning" className="mt-4">
          Email is not configured on this deployment, so nothing can be sent. Set SMTP_HOST,
          SMTP_USER and SMTP_PASSWORD.
        </Alert>
      )}

      {result && (
        <Alert tone={result.failed > 0 ? "warning" : "success"} className="mt-4">
          Announcement sent to {result.sent} {result.sent === 1 ? "person" : "people"}
          {result.failed > 0 ? `, ${result.failed} could not be delivered.` : "."}
        </Alert>
      )}

      {error && (
        <Alert tone="error" className="mt-4">
          {error}
        </Alert>
      )}

      <label className="mt-5 flex items-start gap-3">
        <input
          type="checkbox"
          checked={armed}
          disabled={!emailConfigured || audience === 0}
          onChange={(e) => setArmed(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-brand-700"
        />
        <span>
          <span className="block text-sm font-medium text-ink-700">Send mail to all</span>
          <span className="block text-[0.8125rem] text-ink-500">
            {audience === null
              ? "Checking how many people are on record…"
              : audience === 0
                ? "There are no contacts on record yet."
                : `${audience} ${audience === 1 ? "person" : "people"} would receive this.`}
          </span>
        </span>
      </label>

      <div className="mt-5">
        <Button
          disabled={!armed || !emailConfigured || !audience}
          onClick={() => setConfirming(true)}
        >
          Review and send
        </Button>
      </div>

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Send this announcement?"
        footer={
          <>
            <Button variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button loading={busy} loadingText="Sending…" onClick={send}>
              Send to {audience} {audience === 1 ? "person" : "people"}
            </Button>
          </>
        }
      >
        <p>
          <strong>{audience}</strong> {audience === 1 ? "person" : "people"} will be emailed about{" "}
          <strong>{sessionName}</strong> on{" "}
          <strong>{formatSessionDate(startAt, timezone)}</strong>
          {location ? ` at ${location}` : ""}, with a link to register.
        </p>
        <p className="mt-3">
          Sending cannot be undone, and each person receives one message. Please check the session
          name, date and venue above are correct before continuing.
        </p>
      </Dialog>
    </Card>
  );
}
