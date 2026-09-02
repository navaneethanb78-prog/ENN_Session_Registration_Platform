"use client";

import clsx from "clsx";
import { TextField } from "@/components/ui/Field";

/**
 * The WhatsApp question and its conditional number field, shared by seat
 * registration and on-site training requests so the two behave identically.
 */
export function WhatsAppChoice({
  available,
  number,
  errors,
  onAvailableChange,
  onNumberChange,
}: {
  available: "yes" | "no" | "";
  number: string;
  errors: Record<string, string>;
  onAvailableChange: (value: "yes" | "no") => void;
  onNumberChange: (value: string) => void;
}) {
  return (
    <>
      <fieldset>
        <legend className="text-sm font-medium text-ink-700">
          Is this phone number available on WhatsApp?
          <span className="ml-1 text-rose-600" aria-hidden="true">
            *
          </span>
        </legend>
        <div className="mt-2.5 flex gap-3">
          {(["yes", "no"] as const).map((option) => (
            <label
              key={option}
              className={clsx(
                "flex flex-1 cursor-pointer items-center gap-2.5 rounded-lg border px-4 py-3 transition-colors",
                available === option
                  ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600"
                  : "border-ink-200 bg-white hover:border-ink-300 hover:bg-ink-50",
              )}
            >
              <input
                type="radio"
                name="whatsappAvailable"
                value={option}
                checked={available === option}
                onChange={() => onAvailableChange(option)}
                aria-describedby={errors.whatsappAvailable ? "wa-error" : undefined}
                className="h-4 w-4 accent-brand-700"
              />
              <span className="text-[0.9375rem] font-medium text-ink-800">
                {option === "yes" ? "Yes" : "No"}
              </span>
            </label>
          ))}
        </div>
        {errors.whatsappAvailable && (
          <p id="wa-error" role="alert" className="mt-2 text-[0.8125rem] text-rose-600">
            {errors.whatsappAvailable}
          </p>
        )}
      </fieldset>

      {/* Revealed only when the primary number is not on WhatsApp. */}
      {available === "no" && (
        <div className="animate-expand">
          <TextField
            label="Please enter your WhatsApp number"
            required
            type="tel"
            inputMode="tel"
            placeholder="+91 98765 43210"
            value={number}
            error={errors.whatsappNumber}
            onChange={(e) => onNumberChange(e.target.value)}
          />
        </div>
      )}
    </>
  );
}
