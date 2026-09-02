"use client";

import { formatPhoneForDisplay } from "@/lib/phone";
import { formatSessionDate, formatTimeRange, timeZoneLabel } from "@/lib/time";
import { Button } from "@/components/ui/Button";
import { Card, DetailRow } from "@/components/ui/Primitives";
import type { ConfirmationPayload } from "./confirmation";

function SuccessMark() {
  return (
    <span className="animate-ring flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 ring-1 ring-emerald-200">
      <svg viewBox="0 0 32 32" className="animate-check h-7 w-7 text-emerald-600" aria-hidden="true">
        <path
          d="M8 16.5l5.5 5.5L24 11"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

/** Build a downloadable .ics so the session lands in the registrant's calendar. */
function buildCalendarFile(payload: ConfirmationPayload): string {
  const stamp = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  // RFC 5545 requires backslash, semicolon, comma and newline to be escaped.
  const BACKSLASH = String.fromCharCode(92);
  const escape = (value: string) =>
    value
      .split(BACKSLASH)
      .join(BACKSLASH + BACKSLASH)
      .split(";")
      .join(BACKSLASH + ";")
      .split(",")
      .join(BACKSLASH + ",")
      .split("\n")
      .join(BACKSLASH + "n");
  const s = payload.session;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ENN Consultancy//Session Registration//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${payload.reference}@enn-consultancy`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(s.startAt)}`,
    `DTEND:${stamp(s.endAt)}`,
    `SUMMARY:${escape(s.sessionName)}`,
    `DESCRIPTION:${escape(`${s.topic}\nRegistration reference: ${payload.reference}`)}`,
    `LOCATION:${escape(s.location || s.mode)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function SuccessPanel({
  confirmation,
  onRegisterAnother,
}: {
  confirmation: ConfirmationPayload;
  onRegisterAnother: () => void;
}) {
  const payload = confirmation;
  const s = payload.session;

  function downloadCalendar() {
    if (!payload) return;
    const blob = new Blob([buildCalendarFile(payload)], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${payload.reference}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center text-center">
        <SuccessMark />
        <h1 className="font-display mt-5 text-2xl font-semibold tracking-tight text-brand-950 sm:text-3xl">
          Registration Confirmed
        </h1>
        <p className="mt-2 max-w-md text-[0.9375rem] leading-relaxed text-ink-600">
          Thank you, {payload.fullName.split(" ")[0]}. Your place at the session below is secured.
        </p>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-ink-100 bg-brand-50/50 px-5 py-4 sm:px-6">
          <p className="text-[0.6875rem] font-semibold tracking-[0.14em] text-brand-600 uppercase">
            Registration reference
          </p>
          <p className="tabular font-display mt-1 text-2xl font-semibold tracking-tight text-brand-950">
            {payload.reference}
          </p>
          <p className="mt-1.5 text-[0.8125rem] text-ink-500">
            Please save this registration reference for your records.
          </p>
        </div>

        <div className="px-5 py-5 sm:px-6">
          <h2 className="font-display text-base font-semibold text-brand-950">{s.sessionName}</h2>
          <p className="mt-0.5 text-[0.8125rem] text-ink-500">{s.topic}</p>
          <dl className="mt-4 flex flex-col gap-2.5">
            <DetailRow label="Date" value={formatSessionDate(s.startAt, s.timezone)} />
            <DetailRow
              label="Time"
              value={
                <span className="tabular">
                  {formatTimeRange(s.startAt, s.endAt, s.timezone)}{" "}
                  <span className="font-normal text-ink-400">
                    ({timeZoneLabel(s.timezone)})
                  </span>
                </span>
              }
            />
            <DetailRow label="Location" value={s.location || s.mode} />
          </dl>
        </div>

        <div className="border-t border-ink-100 px-5 py-5 sm:px-6">
          <h3 className="text-[0.6875rem] font-semibold tracking-[0.14em] text-ink-400 uppercase">
            Registered details
          </h3>
          <dl className="mt-3 flex flex-col gap-2.5">
            <DetailRow label="Name" value={payload.fullName} />
            <DetailRow label="Company" value={payload.companyName} />
            <DetailRow label="Designation" value={payload.designation} />
            <DetailRow label="Phone" value={formatPhoneForDisplay(payload.phoneNumber)} />
            <DetailRow label="WhatsApp" value={formatPhoneForDisplay(payload.whatsappNumber)} />
            <DetailRow label="Email" value={payload.email} />
          </dl>
        </div>
      </Card>

      <div className="no-print flex flex-col gap-3 sm:flex-row">
        <Button variant="secondary" onClick={downloadCalendar} fullWidth>
          Add to calendar
        </Button>
        <Button variant="secondary" onClick={() => window.print()} fullWidth>
          Download confirmation
        </Button>
      </div>

      <p className="no-print text-center text-[0.8125rem] text-ink-400">
        <button
          type="button"
          onClick={onRegisterAnother}
          className="rounded text-brand-600 underline-offset-2 hover:underline"
        >
          Register another delegate
        </button>
      </p>
    </div>
  );
}
