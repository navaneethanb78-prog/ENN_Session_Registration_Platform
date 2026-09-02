"use client";

import type { PublicSessionDto } from "@/lib/sessions/dto";
import { formatPhoneForDisplay, normalisePhone } from "@/lib/phone";
import { formatSessionDate, formatTimeRange, timeZoneLabel } from "@/lib/time";
import { DetailRow } from "@/components/ui/Primitives";
import { SeatMeter, StatusBadge } from "@/components/sessions/StatusBadge";
import type { FormState } from "./RegistrationWizard";

function SectionHeader({ title, onEdit }: { title: string; onEdit: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-ink-100 pb-2">
      <h3 className="text-[0.8125rem] font-semibold tracking-[0.08em] text-ink-500 uppercase">
        {title}
      </h3>
      <button
        type="button"
        onClick={onEdit}
        className="rounded text-[0.8125rem] font-medium text-brand-600 underline-offset-2 transition-colors hover:text-brand-800 hover:underline"
      >
        Edit<span className="sr-only"> {title.toLowerCase()}</span>
      </button>
    </div>
  );
}

export function ReviewStep({
  values,
  session,
  onEditStep,
}: {
  values: FormState;
  session: PublicSessionDto;
  onEditStep: (step: number) => void;
}) {
  return (
    <div className="flex flex-col gap-7">
      <section>
        <SectionHeader title="Your details" onEdit={() => onEditStep(0)} />
        <dl className="mt-3 flex flex-col gap-2.5">
          <DetailRow label="Name" value={values.fullName} />
          <DetailRow label="Company" value={values.companyName} />
          <DetailRow label="Designation" value={values.designation} />
        </dl>
      </section>

      <section>
        <SectionHeader title="Contact" onEdit={() => onEditStep(1)} />
        <dl className="mt-3 flex flex-col gap-2.5">
          <DetailRow label="Phone" value={displayPhone(values.phoneNumber)} />
          <DetailRow
            label="WhatsApp"
            value={
              values.whatsappAvailable === "yes" ? (
                <span>
                  {displayPhone(values.phoneNumber)}
                  <span className="ml-2 text-[0.8125rem] font-normal text-ink-400">
                    (same as phone)
                  </span>
                </span>
              ) : (
                displayPhone(values.whatsappNumber)
              )
            }
          />
          <DetailRow label="Email" value={values.email} />
        </dl>
      </section>

      <section>
        <SectionHeader title="Selected session" onEdit={() => onEditStep(2)} />
        <div className="mt-3 rounded-lg border border-ink-200 bg-ink-50/50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display font-semibold text-brand-950">{session.sessionName}</p>
              <p className="mt-0.5 text-[0.8125rem] text-ink-500">{session.topic}</p>
            </div>
            <StatusBadge status={session.status} className="shrink-0" />
          </div>
          <dl className="mt-4 flex flex-col gap-2.5">
            <DetailRow
              label="Date"
              value={formatSessionDate(session.startAt, session.timezone)}
            />
            <DetailRow
              label="Time"
              value={
                <span className="tabular">
                  {formatTimeRange(session.startAt, session.endAt, session.timezone)}{" "}
                  <span className="font-normal text-ink-400">
                    ({timeZoneLabel(session.timezone)})
                  </span>
                </span>
              }
            />
            <DetailRow label="Location" value={session.location || session.mode} />
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
        </div>
      </section>
    </div>
  );
}

function displayPhone(raw: string): string {
  const parsed = normalisePhone(raw);
  return parsed.ok ? formatPhoneForDisplay(parsed.value) : raw;
}
