"use client";

import { useState } from "react";
import clsx from "clsx";
import { isValidEmail } from "@/lib/email";
import { normalisePhone } from "@/lib/phone";
import {
  TRAINING_MODE_DESCRIPTION,
  TRAINING_MODE_LABEL,
  TRAINING_PROGRAMMES,
  type TrainingMode,
} from "@/lib/programmes";
import { Button } from "@/components/ui/Button";
import { TextAreaField, TextField } from "@/components/ui/Field";
import { Alert, Card, DetailRow } from "@/components/ui/Primitives";
import { WhatsAppChoice } from "./WhatsAppChoice";

interface Values {
  fullName: string;
  companyName: string;
  designation: string;
  phoneNumber: string;
  whatsappAvailable: "yes" | "no" | "";
  whatsappNumber: string;
  email: string;
  programmes: string[];
  trainingMode: TrainingMode | "";
  participants: string;
  preferredTimeframe: string;
  venueName: string;
  venueAddress: string;
  venueCity: string;
  notes: string;
}

const EMPTY: Values = {
  fullName: "",
  companyName: "",
  designation: "",
  phoneNumber: "",
  whatsappAvailable: "",
  whatsappNumber: "",
  email: "",
  programmes: [],
  trainingMode: "",
  participants: "",
  preferredTimeframe: "",
  venueName: "",
  venueAddress: "",
  venueCity: "",
  notes: "",
};

function validate(v: Values): Record<string, string> {
  const e: Record<string, string> = {};
  if (v.fullName.trim().length < 2) e.fullName = "Please enter your full name.";
  if (v.companyName.trim().length < 2) e.companyName = "Please enter your company name.";
  if (v.designation.trim().length < 2) e.designation = "Please enter your designation.";

  const phone = normalisePhone(v.phoneNumber);
  if (!phone.ok) e.phoneNumber = phone.reason ?? "Please enter a valid phone number.";

  if (v.whatsappAvailable === "") {
    e.whatsappAvailable = "Please tell us whether this number is on WhatsApp.";
  } else if (v.whatsappAvailable === "no") {
    const wa = normalisePhone(v.whatsappNumber);
    if (!v.whatsappNumber.trim()) e.whatsappNumber = "Please enter your WhatsApp number.";
    else if (!wa.ok) e.whatsappNumber = wa.reason ?? "Please enter a valid WhatsApp number.";
  }

  if (!v.email.trim()) e.email = "Please enter your email address.";
  else if (!isValidEmail(v.email)) e.email = "Please enter a valid email address.";

  if (v.programmes.length === 0) e.programmes = "Please choose at least one programme.";
  const participants = Number(v.participants);
  if (!v.participants.trim() || !Number.isInteger(participants) || participants < 1) {
    e.participants = "Enter the approximate number of participants.";
  }
  if (v.preferredTimeframe.trim().length < 2) {
    e.preferredTimeframe = "Please tell us roughly when you need this.";
  }
  if (!v.trainingMode) {
    e.trainingMode = "Please choose how you would like the training delivered.";
  }
  // Venue detail is only meaningful when we travel to the client.
  if (v.trainingMode === "ON_SITE") {
    if (v.venueName.trim().length < 2) e.venueName = "Please tell us the site or company name.";
    if (v.venueAddress.trim().length < 5) e.venueAddress = "Please give us the address of the venue.";
    if (v.venueCity.trim().length < 2) e.venueCity = "Please tell us the city.";
  }
  return e;
}

export function InHouseRequestForm({ onSubmitted }: { onSubmitted?: () => void } = {}) {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ reference: string; programmes: string[] } | null>(null);

  function set<K extends keyof Values>(field: K, value: Values[K]) {
    setValues((v) => ({ ...v, [field]: value }));
    setErrors((e) => {
      if (!(field in e)) return e;
      const next = { ...e };
      delete next[field];
      return next;
    });
  }

  function toggleProgramme(value: string) {
    setValues((v) => ({
      ...v,
      programmes: v.programmes.includes(value)
        ? v.programmes.filter((p) => p !== value)
        : [...v.programmes, value],
    }));
    setErrors((e) => {
      if (!("programmes" in e)) return e;
      const next = { ...e };
      delete next.programmes;
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const found = validate(values);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setBusy(true);
    setFormError(null);
    try {
      const res = await fetch("/api/in-house-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: values.fullName.trim(),
          companyName: values.companyName.trim(),
          designation: values.designation.trim(),
          phoneNumber: values.phoneNumber.trim(),
          whatsappAvailable: values.whatsappAvailable === "yes",
          whatsappNumber:
            values.whatsappAvailable === "no" ? values.whatsappNumber.trim() : undefined,
          email: values.email.trim(),
          programmes: values.programmes,
          trainingMode: values.trainingMode,
          participants: Number(values.participants),
          preferredTimeframe: values.preferredTimeframe.trim(),
          venueName: values.venueName.trim(),
          venueAddress: values.venueAddress.trim(),
          venueCity: values.venueCity.trim(),
          notes: values.notes.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data?.fieldErrors) setErrors(data.fieldErrors);
        setFormError(data?.message ?? "We couldn't send your request. Please try again.");
        return;
      }
      setDone({
        reference: data.request.requestReference,
        programmes: data.request.programmes,
      });
      onSubmitted?.();
    } catch {
      setFormError("We couldn't reach the server. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Card className="p-6 sm:p-7">
        <p className="text-[0.6875rem] font-semibold tracking-[0.14em] text-brand-600 uppercase">
          Request received
        </p>
        <h3 className="font-display mt-2 text-xl font-semibold tracking-tight text-brand-950">
          Thank you, {values.fullName.split(" ")[0]}.
        </h3>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-600">
          Our team will contact you to agree a date, agenda and cost for running this programme at
          your premises.
        </p>
        <dl className="mt-5 flex flex-col gap-2.5 border-t border-ink-100 pt-5">
          <DetailRow label="Reference" value={<span className="tabular">{done.reference}</span>} />
          <DetailRow label="Programmes" value={done.programmes.join(", ")} />
          <DetailRow
            label="Delivery"
            value={
              values.trainingMode
                ? TRAINING_MODE_LABEL[values.trainingMode]
                : "To be confirmed"
            }
          />
          {values.trainingMode === "ON_SITE" && (
            <DetailRow label="Venue" value={`${values.venueName}, ${values.venueCity}`} />
          )}
          <DetailRow label="Participants" value={values.participants} />
        </dl>
        <p className="mt-5 text-[0.8125rem] text-ink-400">
          Please quote this reference in any correspondence.
        </p>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Card className="p-5 sm:p-7">
        <h3 className="font-display text-lg font-semibold tracking-tight text-brand-950">
          Request a session at your premises
        </h3>
        <p className="mt-1 text-[0.9375rem] text-ink-500">
          Tell us what you need and we will come to you. Nothing is booked at this stage — our team
          will contact you to agree the details.
        </p>

        {formError && (
          <Alert tone="error" className="mt-5">
            {formError}
          </Alert>
        )}

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <TextField
            label="Full name"
            required
            autoComplete="name"
            value={values.fullName}
            error={errors.fullName}
            onChange={(e) => set("fullName", e.target.value)}
          />
          <TextField
            label="Company name"
            required
            autoComplete="organization"
            value={values.companyName}
            error={errors.companyName}
            onChange={(e) => set("companyName", e.target.value)}
          />
          <TextField
            label="Designation"
            required
            autoComplete="organization-title"
            value={values.designation}
            error={errors.designation}
            onChange={(e) => set("designation", e.target.value)}
          />
          <TextField
            label="Email address"
            required
            type="email"
            autoComplete="email"
            value={values.email}
            error={errors.email}
            onChange={(e) => set("email", e.target.value)}
          />
          <TextField
            label="Phone number"
            required
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+91 98765 43210"
            value={values.phoneNumber}
            error={errors.phoneNumber}
            onChange={(e) => set("phoneNumber", e.target.value)}
          />
          <div className="sm:col-span-2">
            <WhatsAppChoice
              available={values.whatsappAvailable}
              number={values.whatsappNumber}
              errors={errors}
              onAvailableChange={(v) => set("whatsappAvailable", v)}
              onNumberChange={(v) => set("whatsappNumber", v)}
            />
          </div>

          <div className="sm:col-span-2">
            <fieldset>
              <legend className="text-sm font-medium text-ink-700">
                Which programmes are you interested in?
                <span className="ml-1 text-rose-600" aria-hidden="true">
                  *
                </span>
              </legend>
              <p className="mt-1 text-[0.8125rem] text-ink-400">
                Select as many as you need — we will quote for them together.
              </p>

              <div className="mt-3 flex flex-col gap-4">
                {TRAINING_PROGRAMMES.map((group) => (
                  <div key={group.title}>
                    <p className="text-[0.6875rem] font-semibold tracking-[0.1em] text-ink-400 uppercase">
                      {group.title}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {group.items.map((item) => {
                        const value =
                          group.items.length === 1 ? item : `${group.title} — ${item}`;
                        const checked = values.programmes.includes(value);
                        return (
                          <label
                            key={value}
                            className={clsx(
                              "inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-[0.8125rem] font-medium transition-colors",
                              checked
                                ? "border-brand-600 bg-brand-50 text-brand-900 ring-1 ring-brand-600"
                                : "border-ink-200 bg-white text-ink-700 hover:border-ink-300 hover:bg-ink-50",
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleProgramme(value)}
                              className="h-4 w-4 accent-brand-700"
                            />
                            {item}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {values.programmes.length > 0 && (
                <p className="mt-3 text-[0.8125rem] text-ink-500">
                  {values.programmes.length} selected
                </p>
              )}
              {errors.programmes && (
                <p role="alert" className="mt-2 text-[0.8125rem] text-rose-600">
                  {errors.programmes}
                </p>
              )}
            </fieldset>
          </div>
          <TextField
            label="Approximate participants"
            required
            type="number"
            min={1}
            placeholder="e.g. 20"
            value={values.participants}
            error={errors.participants}
            onChange={(e) => set("participants", e.target.value)}
          />
          <TextField
            label="Preferred timeframe"
            required
            placeholder="e.g. October 2026, or any weekday"
            value={values.preferredTimeframe}
            error={errors.preferredTimeframe}
            onChange={(e) => set("preferredTimeframe", e.target.value)}
          />
          <div className="sm:col-span-2">
            <fieldset>
              <legend className="text-sm font-medium text-ink-700">
                How would you like it delivered?
                <span className="ml-1 text-rose-600" aria-hidden="true">
                  *
                </span>
              </legend>
              <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
                {(["OPEN_HOUSE", "ON_SITE"] as const).map((mode) => (
                  <label
                    key={mode}
                    className={clsx(
                      "flex cursor-pointer flex-col gap-1 rounded-lg border p-4 transition-colors",
                      values.trainingMode === mode
                        ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600"
                        : "border-ink-200 bg-white hover:border-ink-300 hover:bg-ink-50",
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="trainingMode"
                        value={mode}
                        checked={values.trainingMode === mode}
                        onChange={() => set("trainingMode", mode)}
                        className="h-4 w-4 accent-brand-700"
                      />
                      <span className="text-[0.9375rem] font-medium text-ink-800">
                        {TRAINING_MODE_LABEL[mode]}
                      </span>
                    </span>
                    <span className="pl-[1.625rem] text-[0.8125rem] leading-relaxed text-ink-500">
                      {TRAINING_MODE_DESCRIPTION[mode]}
                    </span>
                  </label>
                ))}
              </div>
              {errors.trainingMode && (
                <p role="alert" className="mt-2 text-[0.8125rem] text-rose-600">
                  {errors.trainingMode}
                </p>
              )}
            </fieldset>
          </div>

          {/* Venue detail is asked for only when we are travelling to them. */}
          {values.trainingMode === "ON_SITE" && (
            <div className="animate-expand sm:col-span-2">
              <div className="rounded-lg border border-ink-200 bg-ink-50/50 p-4">
                <p className="text-sm font-medium text-ink-700">Venue details</p>
                <p className="mt-0.5 text-[0.8125rem] text-ink-500">
                  Where our trainer should come to.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <TextField
                    label="Site / company name"
                    required
                    placeholder="e.g. Barani Hydraulics — Unit 2"
                    value={values.venueName}
                    error={errors.venueName}
                    onChange={(e) => set("venueName", e.target.value)}
                  />
                  <TextField
                    label="City"
                    required
                    placeholder="e.g. Coimbatore"
                    value={values.venueCity}
                    error={errors.venueCity}
                    onChange={(e) => set("venueCity", e.target.value)}
                  />
                  <div className="sm:col-span-2">
                    <TextAreaField
                      label="Full address"
                      required
                      placeholder="Street, area, landmark and PIN code"
                      value={values.venueAddress}
                      error={errors.venueAddress}
                      onChange={(e) => set("venueAddress", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="sm:col-span-2">
            <TextAreaField
              label="Anything else we should know?"
              placeholder="Specific standards, current certification status, particular areas of concern"
              value={values.notes}
              error={errors.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
        </div>

        <div className="mt-7 flex justify-end border-t border-ink-100 pt-6">
          <Button type="submit" size="lg" loading={busy} loadingText="Sending...">
            Send request
          </Button>
        </div>
      </Card>
    </form>
  );
}
