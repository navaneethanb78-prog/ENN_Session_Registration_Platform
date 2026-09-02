"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { RegistrationRow } from "@/lib/sessions/admin-service";
import { formatPhoneForDisplay } from "@/lib/phone";
import { formatInZone, formatSessionDate } from "@/lib/time";
import { Button, LinkButton } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Dialog } from "@/components/ui/Dialog";
import { Alert, Card, EmptyState } from "@/components/ui/Primitives";
import { PaymentControl } from "./PaymentControl";

const COLUMNS = [
  "Reference",
  "Name",
  "Company",
  "Designation",
  "Phone",
  "WhatsApp",
  "Email",
  "Session",
  "Registered",
  "Payment",
  "",
];

function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
      <path
        d="M3 4.5h10M6.5 4.5V3.2A.7.7 0 0 1 7.2 2.5h1.6a.7.7 0 0 1 .7.7v1.3M4.4 4.5l.5 8a1 1 0 0 0 1 .9h4.2a1 1 0 0 0 1-.9l.5-8M6.8 7v4M9.2 7v4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function RegistrationsTable({
  registrations,
  sessions,
}: {
  registrations: RegistrationRow[];
  sessions: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [status, setStatus] = useState("");
  const [pendingDelete, setPendingDelete] = useState<RegistrationRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return registrations.filter((r) => {
      if (sessionId && r.sessionId !== sessionId) return false;
      if (status && r.registrationStatus !== status) return false;
      if (!q) return true;
      return [
        r.registrationReference,
        r.fullName,
        r.companyName,
        r.designation,
        r.email,
        r.phoneNumber,
        r.whatsappNumber,
        r.sessionName,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [registrations, query, sessionId, status]);

  const exportHref = sessionId
    ? `/api/admin/registrations/export?sessionId=${encodeURIComponent(sessionId)}`
    : "/api/admin/registrations/export";

  async function confirmDelete() {
    if (!pendingDelete) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/registrations/${pendingDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.message ?? "That participant could not be removed.");
        return;
      }
      setNotice(
        `${pendingDelete.fullName} was removed from ${pendingDelete.sessionName}. The seat is available again.`,
      );
      setPendingDelete(null);
      router.refresh();
    } catch {
      setError("That participant could not be removed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {notice && (
        <Alert tone="success" className="flex items-start justify-between gap-3">
          <span>{notice}</span>
        </Alert>
      )}

      <Card className="p-4 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
          <TextField
            label="Search"
            type="search"
            placeholder="Name, company, email, phone or reference"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="filter-session" className="text-sm font-medium text-ink-700">
              Session
            </label>
            <select
              id="filter-session"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="h-11 w-full rounded-lg border border-ink-200 bg-white px-3.5 text-[0.9375rem] text-ink-800"
            >
              <option value="">All sessions</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="filter-status" className="text-sm font-medium text-ink-700">
              Status
            </label>
            <select
              id="filter-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-11 w-full rounded-lg border border-ink-200 bg-white px-3.5 text-[0.9375rem] text-ink-800"
            >
              <option value="">All statuses</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <LinkButton href={exportHref} download variant="secondary" className="w-full lg:w-auto">
            Export CSV
          </LinkButton>
        </div>

        <p className="mt-4 text-[0.8125rem] text-ink-500" aria-live="polite">
          Showing {filtered.length} of {registrations.length} registration
          {registrations.length === 1 ? "" : "s"}
        </p>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          title="No registrations match"
          description={
            registrations.length === 0
              ? "No registrations have been received yet."
              : "Try a different search term or clear the filters."
          }
        />
      ) : (
        <>
          {/* Phones and small tablets: one card per participant, no sideways scroll. */}
          <ul className="flex list-none flex-col gap-3 lg:hidden">
            {filtered.map((r) => (
              <li key={r.id}>
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="tabular text-[0.8125rem] font-medium text-brand-700">
                        {r.registrationReference}
                      </p>
                      <p className="mt-0.5 font-medium break-words text-ink-900">{r.fullName}</p>
                      <p className="text-[0.8125rem] break-words text-ink-500">
                        {r.designation} · {r.companyName}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPendingDelete(r)}
                      aria-label={`Remove ${r.fullName}`}
                      className="shrink-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      icon={<TrashIcon />}
                    >
                      <span className="sr-only sm:not-sr-only">Remove</span>
                    </Button>
                  </div>

                  <dl className="mt-3 flex flex-col gap-1.5 border-t border-ink-100 pt-3 text-[0.8125rem]">
                    <div className="flex gap-2">
                      <dt className="w-20 shrink-0 text-ink-400">Phone</dt>
                      <dd className="tabular break-all text-ink-700">
                        {formatPhoneForDisplay(r.phoneNumber)}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-20 shrink-0 text-ink-400">WhatsApp</dt>
                      <dd className="tabular break-all text-ink-700">
                        {formatPhoneForDisplay(r.whatsappNumber)}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-20 shrink-0 text-ink-400">Email</dt>
                      <dd className="break-all text-ink-700">{r.email}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-20 shrink-0 text-ink-400">Session</dt>
                      <dd className="break-words text-ink-700">
                        {r.sessionName}
                        {r.sessionStartAt && (
                          <span className="block text-ink-400">
                            {formatSessionDate(r.sessionStartAt, r.sessionTimezone)}
                          </span>
                        )}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-20 shrink-0 text-ink-400">Registered</dt>
                      <dd className="tabular text-ink-700">
                        {formatInZone(r.registeredAt, "d MMM yyyy, HH:mm", r.sessionTimezone)}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-20 shrink-0 text-ink-400">Payment</dt>
                      <dd>
                        <PaymentControl
                          registrationId={r.id}
                          status={r.paymentStatus}
                          amountDue={r.amountDue}
                          paymentReference={r.paymentReference}
                        />
                      </dd>
                    </div>
                  </dl>
                </Card>
              </li>
            ))}
          </ul>

          {/* Wide screens: the full table. */}
          <Card className="hidden overflow-hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <caption className="sr-only">Registration records</caption>
                <thead>
                  <tr className="border-b border-ink-200 bg-ink-50/60">
                    {COLUMNS.map((h) => (
                      <th
                        key={h}
                        scope="col"
                        className="px-3 py-3 font-semibold whitespace-nowrap text-ink-600"
                      >
                        {h || <span className="sr-only">Actions</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-ink-100 last:border-0 hover:bg-ink-50/40"
                    >
                      <td className="tabular px-3 py-3 font-medium whitespace-nowrap text-brand-900">
                        {r.registrationReference}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-ink-800">{r.fullName}</td>
                      <td className="px-3 py-3 text-ink-600">{r.companyName}</td>
                      <td className="px-3 py-3 text-ink-600">{r.designation}</td>
                      <td className="tabular px-3 py-3 whitespace-nowrap text-ink-600">
                        {formatPhoneForDisplay(r.phoneNumber)}
                      </td>
                      <td className="tabular px-3 py-3 whitespace-nowrap text-ink-600">
                        {formatPhoneForDisplay(r.whatsappNumber)}
                        {!r.whatsappAvailable && (
                          <span className="ml-1.5 text-[0.6875rem] text-ink-400">(alt)</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-ink-600">{r.email}</td>
                      <td className="px-3 py-3 text-ink-600">
                        <p className="whitespace-nowrap">{r.sessionName}</p>
                        {r.sessionStartAt && (
                          <p className="mt-0.5 text-[0.75rem] whitespace-nowrap text-ink-400">
                            {formatSessionDate(r.sessionStartAt, r.sessionTimezone)}
                          </p>
                        )}
                      </td>
                      <td className="tabular px-3 py-3 whitespace-nowrap text-ink-500">
                        {formatInZone(r.registeredAt, "d MMM yyyy, HH:mm", r.sessionTimezone)}
                      </td>
                      <td className="px-3 py-3">
                        <PaymentControl
                          registrationId={r.id}
                          status={r.paymentStatus}
                          amountDue={r.amountDue}
                          paymentReference={r.paymentReference}
                        />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPendingDelete(r)}
                          aria-label={`Remove ${r.fullName}`}
                          className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          icon={<TrashIcon />}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <Dialog
        open={pendingDelete !== null}
        onClose={() => {
          setPendingDelete(null);
          setError(null);
        }}
        title="Remove this participant?"
        footer={
          <>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setPendingDelete(null);
                setError(null);
              }}
            >
              Keep participant
            </Button>
            <Button variant="danger" loading={busy} loadingText="Removing…" onClick={confirmDelete}>
              Remove participant
            </Button>
          </>
        }
      >
        {pendingDelete && (
          <>
            <p>
              <strong>{pendingDelete.fullName}</strong> ({pendingDelete.email}) will be permanently
              removed from <strong>{pendingDelete.sessionName}</strong>.
            </p>
            <p className="mt-3">
              Their seat is returned to the session immediately, so somebody else can take it, and
              they will be able to register again with the same email address. This cannot be
              undone.
            </p>
            {error && (
              <Alert tone="error" className="mt-4">
                {error}
              </Alert>
            )}
          </>
        )}
      </Dialog>
    </div>
  );
}
