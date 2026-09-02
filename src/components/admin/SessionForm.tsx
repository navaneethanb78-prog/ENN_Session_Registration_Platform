"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SessionMode, TrainingSession } from "@/lib/db/types";
import { zonedDateTimeToUtc } from "@/lib/time";
import { sessionSchema, fieldErrorsFrom } from "@/lib/validation/schemas";
import { Button } from "@/components/ui/Button";
import { SelectField, TextAreaField, TextField } from "@/components/ui/Field";
import { Alert, Card } from "@/components/ui/Primitives";
import { SessionCard } from "@/components/sessions/SessionCard";
import { toPublicDto } from "./preview";
import {
  toSessionPayload,
  type SessionFormValues,
} from "./session-form-values";

// Re-exported for convenience so pages can import both from one place.
export { emptyValues, valuesFrom } from "./session-form-values";
export type { SessionFormValues };

const MODE_OPTIONS = [
  { value: "ONLINE", label: "Online" },
  { value: "IN_PERSON", label: "In person" },
  { value: "HYBRID", label: "Hybrid" },
];

export function SessionForm({
  mode,
  sessionId,
  initial,
  registeredCount = 0,
}: {
  mode: "create" | "edit";
  sessionId?: string;
  initial: SessionFormValues;
  registeredCount?: number;
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof SessionFormValues>(field: K, value: SessionFormValues[K]) {
    setValues((v) => ({ ...v, [field]: value }));
    setErrors((e) => {
      if (!(field in e)) return e;
      const next = { ...e };
      delete next[field];
      return next;
    });
  }

  /** Live preview, rendered with the public SessionCard component. */
  const preview = useMemo(() => {
    if (!values.date || !values.sessionName) return null;
    try {
      const startAt = zonedDateTimeToUtc(values.date, values.startTime, values.timezone);
      const endAt = zonedDateTimeToUtc(values.date, values.endTime, values.timezone);
      const session: TrainingSession = {
        id: sessionId ?? "preview",
        sessionName: values.sessionName,
        topic: values.topic || "Topic",
        description: values.description,
        date: values.date,
        startTime: values.startTime,
        endTime: values.endTime,
        timezone: values.timezone,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        location: values.location,
        mode: values.mode,
        maximumSeats: Math.max(1, Number(values.maximumSeats) || 1),
        registeredCount,
        isFree: values.isFree,
        price: values.isFree ? 0 : Number(values.price) || 0,
        status: "OPEN",
        registrationDeadline: values.registrationDeadline
          ? new Date(values.registrationDeadline).toISOString()
          : null,
        isActive: values.isActive,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return toPublicDto(session);
    } catch {
      return null;
    }
  }, [values, sessionId, registeredCount]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const payload = toSessionPayload(values);
    const parsed = sessionSchema.safeParse(payload);
    if (!parsed.success) {
      setErrors(fieldErrorsFrom(parsed.error));
      return;
    }
    if (payload.maximumSeats < registeredCount) {
      setErrors({ maximumSeats: `Cannot be lower than the ${registeredCount} already registered.` });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(
        mode === "create" ? "/api/admin/sessions" : `/api/admin/sessions/${sessionId}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (data?.fieldErrors) setErrors(data.fieldErrors);
        setFormError(data?.message ?? "The session could not be saved.");
        return;
      }
      router.push("/admin/sessions");
      router.refresh();
    } catch {
      setFormError("We couldn't save this session. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex flex-col gap-6">
        {formError && <Alert tone="error">{formError}</Alert>}

        <Card className="p-5 sm:p-6">
          <h2 className="font-display text-base font-semibold text-brand-950">Session details</h2>
          <div className="mt-5 flex flex-col gap-5">
            <TextField
              label="Session name"
              required
              placeholder="e.g. ISO 9001 Awareness Session"
              value={values.sessionName}
              error={errors.sessionName}
              onChange={(e) => set("sessionName", e.target.value)}
            />
            <TextField
              label="Topic"
              required
              placeholder="e.g. Quality Management Systems"
              value={values.topic}
              error={errors.topic}
              onChange={(e) => set("topic", e.target.value)}
            />
            <TextAreaField
              label="Description"
              placeholder="What delegates will cover, and who the session suits."
              value={values.description}
              error={errors.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="font-display text-base font-semibold text-brand-950">Schedule</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <TextField
              label="Date"
              type="date"
              required
              value={values.date}
              error={errors.date}
              onChange={(e) => set("date", e.target.value)}
            />
            <TextField
              label="Timezone"
              required
              hint="IANA name, e.g. Asia/Kolkata."
              value={values.timezone}
              error={errors.timezone}
              onChange={(e) => set("timezone", e.target.value)}
            />
            <TextField
              label="Start time"
              type="time"
              required
              value={values.startTime}
              error={errors.startTime}
              onChange={(e) => set("startTime", e.target.value)}
            />
            <TextField
              label="End time"
              type="time"
              required
              value={values.endTime}
              error={errors.endTime}
              onChange={(e) => set("endTime", e.target.value)}
            />
            <TextField
              label="Registration deadline"
              type="datetime-local"
              hint="Optional. Cannot be after the session starts."
              value={values.registrationDeadline}
              error={errors.registrationDeadline}
              onChange={(e) => set("registrationDeadline", e.target.value)}
            />
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="font-display text-base font-semibold text-brand-950">
            Capacity &amp; location
          </h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <TextField
              label="Maximum seats"
              type="number"
              min={Math.max(1, registeredCount)}
              required
              value={values.maximumSeats}
              error={errors.maximumSeats}
              hint={
                registeredCount > 0
                  ? `${registeredCount} seats are already taken and cannot be released.`
                  : undefined
              }
              onChange={(e) => set("maximumSeats", e.target.value)}
            />
            <SelectField
              label="Mode"
              options={MODE_OPTIONS}
              value={values.mode}
              error={errors.mode}
              onChange={(e) =>
                set("mode", (e.target as HTMLSelectElement).value as SessionMode)
              }
            />
            <div className="sm:col-span-2">
              <TextField
                label="Location"
                placeholder="e.g. Online (Microsoft Teams) or Chennai — ENN Training Centre"
                value={values.location}
                error={errors.location}
                onChange={(e) => set("location", e.target.value)}
              />
            </div>
            <label className="flex items-start gap-3 sm:col-span-2">
              <input
                type="checkbox"
                checked={values.isFree}
                onChange={(e) => set("isFree", e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-brand-700"
              />
              <span>
                <span className="block text-sm font-medium text-ink-700">
                  This is a free session
                </span>
                <span className="block text-[0.8125rem] text-ink-500">
                  Registrants skip the payment step entirely.
                </span>
              </span>
            </label>

            {!values.isFree && (
              <div className="sm:col-span-2">
                <TextField
                  label="Fee per participant (INR)"
                  type="number"
                  min={0}
                  required
                  hint="Shown on the session card, and encoded into the payment QR code."
                  value={values.price}
                  error={errors.price}
                  onChange={(e) => set("price", e.target.value)}
                />
              </div>
            )}

            <label className="flex items-start gap-3 sm:col-span-2">
              <input
                type="checkbox"
                checked={values.isActive}
                onChange={(e) => set("isActive", e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-brand-700"
              />
              <span>
                <span className="block text-sm font-medium text-ink-700">
                  Open for registration
                </span>
                <span className="block text-[0.8125rem] text-ink-500">
                  Uncheck to list the session publicly without accepting registrations yet.
                </span>
              </span>
            </label>
          </div>
        </Card>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={() => router.back()} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" size="lg" loading={busy} loadingText="Saving…">
            {mode === "create" ? "Create session" : "Save changes"}
          </Button>
        </div>
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <p className="text-[0.6875rem] font-semibold tracking-[0.12em] text-ink-400 uppercase">
          Live preview
        </p>
        <p className="mt-1.5 mb-4 text-[0.8125rem] text-ink-500">
          Exactly how this session will appear to registrants.
        </p>
        {preview ? (
          <SessionCard session={preview} />
        ) : (
          <div className="rounded-xl border border-dashed border-ink-200 px-5 py-10 text-center text-[0.8125rem] text-ink-400">
            Enter a session name and date to see the preview.
          </div>
        )}
      </aside>
    </form>
  );
}
