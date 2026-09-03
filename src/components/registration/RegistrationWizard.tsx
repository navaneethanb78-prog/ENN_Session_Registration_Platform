"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import type { PublicSessionDto } from "@/lib/sessions/dto";
import { registrationSchema, fieldErrorsFrom } from "@/lib/validation/schemas";
import { isValidEmail } from "@/lib/email";
import { normalisePhone } from "@/lib/phone";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Alert, Card } from "@/components/ui/Primitives";
import { SessionSelector } from "@/components/sessions/SessionSelector";
import { Stepper, type StepDef } from "./Stepper";
import { ReviewStep } from "./ReviewStep";
import type { ConfirmationPayload } from "./confirmation";
import { WhatsAppChoice } from "./WhatsAppChoice";
import { DELIVERY_NOTICE } from "@/lib/programmes";
import { PaymentStep } from "./PaymentStep";

const BASE_STEPS: StepDef[] = [
  { id: "about", label: "About You" },
  { id: "contact", label: "Contact" },
  { id: "session", label: "Choose Session" },
];

const PAYMENT_STEP: StepDef = { id: "payment", label: "Payment" };
const REVIEW_STEP: StepDef = { id: "review", label: "Review" };

/** Paid sessions gain a payment step between choosing and reviewing. */
function stepsFor(paid: boolean): StepDef[] {
  return paid ? [...BASE_STEPS, PAYMENT_STEP, REVIEW_STEP] : [...BASE_STEPS, REVIEW_STEP];
}

export interface FormState {
  fullName: string;
  companyName: string;
  designation: string;
  phoneNumber: string;
  whatsappAvailable: "yes" | "no" | "";
  whatsappNumber: string;
  email: string;
  sessionId: string;
  paymentReference: string;
  /** The in-person delivery notice must be acknowledged before continuing. */
  acceptedInPerson: boolean;
}

const EMPTY: FormState = {
  fullName: "",
  companyName: "",
  designation: "",
  phoneNumber: "",
  whatsappAvailable: "",
  whatsappNumber: "",
  email: "",
  sessionId: "",
  paymentReference: "",
  acceptedInPerson: false,
};

/**
 * Client-side validation, mirroring the shared Zod schema. This exists purely
 * for fast feedback — the server re-runs the same schema and is the authority.
 */
function validateStep(
  step: number,
  values: FormState,
  options: { paymentStepIndex: number } = { paymentStepIndex: -1 },
): Record<string, string> {
  const errors: Record<string, string> = {};
  // Only the text fields are length-checked; the booleans have their own rules.
  const need = (field: keyof FormState, message: string, min = 2) => {
    const value = values[field];
    if (typeof value !== "string" || value.trim().length < min) errors[field] = message;
  };

  if (step === 0) {
    need("fullName", "Please enter your full name.");
    need("companyName", "Please enter your company name.");
    need("designation", "Please enter your designation.");
  }

  if (step === 1) {
    const phone = normalisePhone(values.phoneNumber);
    if (!phone.ok) errors.phoneNumber = phone.reason ?? "Please enter a valid phone number.";

    if (values.whatsappAvailable === "") {
      errors.whatsappAvailable = "Please tell us whether this number is on WhatsApp.";
    } else if (values.whatsappAvailable === "no") {
      const wa = normalisePhone(values.whatsappNumber);
      if (!values.whatsappNumber.trim()) errors.whatsappNumber = "Please enter your WhatsApp number.";
      else if (!wa.ok) errors.whatsappNumber = wa.reason ?? "Please enter a valid WhatsApp number.";
    }

    if (!values.email.trim()) errors.email = "Please enter your email address.";
    else if (!isValidEmail(values.email)) errors.email = "Please enter a valid email address.";
  }

  if (step === 2) {
    if (!values.sessionId) errors.sessionId = "Please select a session to continue.";
    if (!values.acceptedInPerson) {
      errors.acceptedInPerson =
        "Please confirm you understand the session is delivered in person.";
    }
  }

  if (step === options.paymentStepIndex && !values.paymentReference.trim()) {
    errors.paymentReference = "Enter the UPI or transaction reference for your payment.";
  }

  return errors;
}

/** Shape the form state into the payload the API expects. */
export function toPayload(values: FormState) {
  return {
    sessionId: values.sessionId,
    fullName: values.fullName.trim(),
    companyName: values.companyName.trim(),
    designation: values.designation.trim(),
    phoneNumber: values.phoneNumber.trim(),
    whatsappAvailable: values.whatsappAvailable === "yes",
    whatsappNumber: values.whatsappAvailable === "no" ? values.whatsappNumber.trim() : undefined,
    email: values.email.trim(),
    paymentReference: values.paymentReference.trim(),
  };
}

export function RegistrationWizard({
  sessions,
  sessionId,
  onSessionIdChange,
  onComplete,
}: {
  sessions: PublicSessionDto[];
  /** Controlled by the page, so choosing from the catalogue above fills it in. */
  sessionId: string;
  onSessionIdChange: (id: string) => void;
  onComplete: (payload: ConfirmationPayload) => void;
}) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const values: FormState = { ...form, sessionId };
  const selectedSession = sessions.find((s) => s.id === sessionId) ?? null;
  const requiresPayment = Boolean(selectedSession && !selectedSession.isFree);
  const STEPS = stepsFor(requiresPayment);
  const paymentStepIndex = requiresPayment ? 3 : -1;
  const reviewStepIndex = STEPS.length - 1;
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [liveSessions, setLiveSessions] = useState(sessions);
  const headingRef = useRef<HTMLDivElement>(null);

  const selected = liveSessions.find((s) => s.id === values.sessionId) ?? null;

  const set = useCallback(
    <K extends keyof FormState>(field: K, value: FormState[K]) => {
      // The session lives on the page so the catalogue and the wizard agree.
      if (field === "sessionId") onSessionIdChange(value as string);
      else setForm((v) => ({ ...v, [field]: value }));

      // Clear a field error as soon as the user starts correcting it.
      setErrors((e) => {
        if (!(field in e)) return e;
        const next = { ...e };
        delete next[field];
        return next;
      });
    },
    [onSessionIdChange],
  );

  // Move focus to the step heading on change, so screen-reader and keyboard
  // users land in the right place rather than at the top of the document.
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  function goTo(next: number) {
    setFormError(null);
    setStep(next);
    setFurthest((f) => Math.max(f, next));
  }

  function handleNext() {
    const stepErrors = validateStep(step, values, { paymentStepIndex });
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    goTo(Math.min(step + 1, STEPS.length - 1));
  }

  /** Re-fetch seat counts so the review step shows current availability. */
  const refreshSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { sessions: PublicSessionDto[] };
      setLiveSessions(data.sessions);
    } catch {
      // A refresh failure is not fatal: the server re-validates on submit.
    }
  }, []);

  useEffect(() => {
    if (step === 2 || step === 3) void refreshSessions();
  }, [step, refreshSessions]);

  async function handleSubmit() {
    // Validate every step again before sending.
    for (let i = 0; i < STEPS.length; i++) {
      const stepErrors = validateStep(i, values, { paymentStepIndex });
      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        goTo(i);
        return;
      }
    }

    const parsed = registrationSchema.safeParse(toPayload(values));
    if (!parsed.success) {
      setErrors(fieldErrorsFrom(parsed.error));
      goTo(0);
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(values)),
      });
      const data = await res.json();

      if (!res.ok) {
        // The session filled up, completed or was cancelled while the user was
        // filling in the form: refresh availability and send them back to pick again.
        if (
          data?.code === "SESSION_FULL" ||
          data?.code === "SESSION_COMPLETED" ||
          data?.code === "SESSION_CANCELLED" ||
          data?.code === "REGISTRATION_CLOSED" ||
          data?.code === "SESSION_NOT_FOUND"
        ) {
          await refreshSessions();
          set("sessionId", "");
          setFormError(data.message);
          goTo(2);
          return;
        }
        if (data?.code === "VALIDATION_ERROR" && data.fieldErrors) {
          setErrors(data.fieldErrors);
          setFormError(data.message);
          goTo(0);
          return;
        }
        setFormError(data?.message ?? "We couldn't complete your registration right now. Please try again.");
        return;
      }

      const chosen = liveSessions.find((x) => x.id === sessionId) ?? data.session;
      onComplete({
        reference: data.registration.registrationReference ?? "",
        fullName: data.registration.fullName ?? "",
        companyName: data.registration.companyName ?? "",
        designation: data.registration.designation ?? "",
        phoneNumber: data.registration.phoneNumber ?? "",
        whatsappNumber: data.registration.whatsappNumber ?? "",
        email: data.registration.email ?? "",
        session: data.session ?? chosen,
      });
    } catch {
      setFormError("We couldn't reach the server. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Stepper steps={STEPS} current={step} furthest={furthest} onJump={goTo} />

      <Card className="p-5 sm:p-7">
        <div ref={headingRef} tabIndex={-1} className="outline-none">
          <h2 className="font-display text-lg font-semibold tracking-tight text-brand-950">
            {STEP_HEADINGS[STEPS[step]?.id ?? "about"]?.title}
          </h2>
          <p className="mt-1 text-[0.9375rem] text-ink-500">
            {STEP_HEADINGS[STEPS[step]?.id ?? "about"]?.description}
          </p>
        </div>

        {formError && (
          <Alert tone="error" className="mt-5">
            {formError}
          </Alert>
        )}

        <div className="mt-6 animate-fade-up" key={`panel-${step}`}>
          {step === 0 && (
            <div className="flex max-w-lg flex-col gap-5">
              <TextField
                label="Full name"
                required
                autoComplete="name"
                placeholder="e.g. Priya Raghavan"
                value={values.fullName}
                error={errors.fullName}
                onChange={(e) => set("fullName", e.target.value)}
              />
              <TextField
                label="Company name"
                required
                autoComplete="organization"
                placeholder="e.g. ABC Industries Pvt Ltd"
                value={values.companyName}
                error={errors.companyName}
                onChange={(e) => set("companyName", e.target.value)}
              />
              <TextField
                label="Designation"
                required
                autoComplete="organization-title"
                placeholder="e.g. Quality Manager"
                hint="Your role — for example Managing Director, HR Manager or Operations Manager."
                value={values.designation}
                error={errors.designation}
                onChange={(e) => set("designation", e.target.value)}
              />
            </div>
          )}

          {step === 1 && (
            <div className="flex max-w-lg flex-col gap-5">
              <TextField
                label="Phone number"
                required
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+91 98765 43210"
                hint="Indian mobile numbers may be entered without the country code."
                value={values.phoneNumber}
                error={errors.phoneNumber}
                onChange={(e) => set("phoneNumber", e.target.value)}
              />

              <WhatsAppChoice
                available={values.whatsappAvailable}
                number={values.whatsappNumber}
                errors={errors}
                onAvailableChange={(v) => set("whatsappAvailable", v)}
                onNumberChange={(v) => set("whatsappNumber", v)}
              />

              <TextField
                label="Email address"
                required
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={values.email}
                error={errors.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
          )}

          {step === 2 && (
            <div>
              {/*
                Acknowledged rather than merely displayed. Attendance is at a
                physical venue and travel is at the registrant's cost, so it
                should not be possible to book without having read that.
              */}
              <div
                className={clsx(
                  "mb-5 rounded-lg border p-4 transition-colors",
                  errors.acceptedInPerson
                    ? "border-rose-300 bg-rose-50"
                    : values.acceptedInPerson
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-brand-200 bg-brand-50",
                )}
              >
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={values.acceptedInPerson}
                    onChange={(e) => set("acceptedInPerson", e.target.checked)}
                    aria-describedby={errors.acceptedInPerson ? "in-person-error" : undefined}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-brand-700"
                  />
                  <span className="text-[0.875rem] leading-relaxed text-ink-800">
                    <strong className="block">
                      I understand this session is delivered in person.
                    </strong>
                    {DELIVERY_NOTICE} Please check the venue and date on the session before
                    selecting it — attendance is at the stated venue, and travel is at your own
                    cost.
                  </span>
                </label>
                {errors.acceptedInPerson && (
                  <p
                    id="in-person-error"
                    role="alert"
                    className="mt-2 pl-7 text-[0.8125rem] text-rose-600"
                  >
                    {errors.acceptedInPerson}
                  </p>
                )}
              </div>
              {errors.sessionId && (
                <Alert tone="warning" className="mb-4">
                  {errors.sessionId}
                </Alert>
              )}
              <SessionSelector
                sessions={liveSessions}
                selectedId={values.sessionId || null}
                onSelect={(s) => {
                  set("sessionId", s.id);
                  setFormError(null);
                }}
              />
            </div>
          )}

          {step === paymentStepIndex && selected && (
            <PaymentStep
              session={selected}
              reference={values.paymentReference}
              error={errors.paymentReference}
              onReferenceChange={(v) => set("paymentReference", v)}
            />
          )}

          {step === reviewStepIndex && selected && (
            <ReviewStep values={values} session={selected} onEditStep={goTo} />
          )}

          {step === reviewStepIndex && !selected && (
            <Alert tone="warning">
              Your selected session is no longer available. Please choose another session.
            </Alert>
          )}
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-ink-100 pt-6 sm:flex-row sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => goTo(Math.max(0, step - 1))}
            disabled={step === 0 || submitting}
            className={clsx(step === 0 && "invisible")}
          >
            Back
          </Button>

          {step < reviewStepIndex ? (
            <Button onClick={handleNext} size="lg" className="sm:min-w-40">
              Continue
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              size="lg"
              loading={submitting}
              loadingText="Registering…"
              disabled={!selected}
              className="sm:min-w-52"
            >
              Confirm Registration
            </Button>
          )}
        </div>
      </Card>

      <p className="text-center text-[0.8125rem] text-ink-400">
        Your details are used only to manage your place at this session.
      </p>
    </div>
  );
}

const STEP_HEADINGS: Record<string, { title: string; description: string }> = {
  about: { title: "About you", description: "Tell us who you are and where you work." },
  contact: { title: "How we reach you", description: "We use these details to confirm your place." },
  session: { title: "Choose your session", description: "Select an available session below." },
  payment: {
    title: "Payment",
    description: "Pay the session fee, then enter your transaction reference.",
  },
  review: {
    title: "Review your registration",
    description: "Please check everything is correct before confirming.",
  },
};

