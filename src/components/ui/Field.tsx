"use client";

import clsx from "clsx";
import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";

/**
 * Accessible form controls.
 *
 * Every control is labelled, errors are wired via aria-describedby and announced
 * with role="alert", and invalid state is marked with aria-invalid rather than
 * colour alone.
 */

interface FieldShellProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: (ids: { inputId: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
}

export function Field({ label, hint, error, required, children }: FieldShellProps) {
  const base = useId();
  const inputId = `${base}-input`;
  const hintId = `${base}-hint`;
  const errorId = `${base}-error`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-ink-700">
        {label}
        {required && (
          <span className="ml-1 text-rose-600" aria-hidden="true">
            *
          </span>
        )}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      {hint && (
        <p id={hintId} className="text-[0.8125rem] text-ink-400">
          {hint}
        </p>
      )}
      {children({ inputId, describedBy, invalid: Boolean(error) })}
      {error && (
        <p id={errorId} role="alert" className="flex items-start gap-1.5 text-[0.8125rem] text-rose-600">
          <svg viewBox="0 0 16 16" className="mt-px h-4 w-4 shrink-0" aria-hidden="true">
            <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 4.5v4.2M8 11.2v.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

const CONTROL =
  "w-full rounded-lg border bg-white px-3.5 text-[0.9375rem] text-ink-800 transition-colors " +
  "placeholder:text-ink-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 " +
  "disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400";

export function TextField({
  label,
  hint,
  error,
  required,
  className,
  ...props
}: { label: string; hint?: string; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      {({ inputId, describedBy, invalid }) => (
        <input
          {...props}
          id={inputId}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={clsx(
            CONTROL,
            "h-11",
            invalid
              ? "border-rose-400 focus-visible:border-rose-500 focus-visible:ring-rose-500/30"
              : "border-ink-200 focus-visible:border-brand-500",
            className,
          )}
        />
      )}
    </Field>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  required,
  className,
  ...props
}: { label: string; hint?: string; error?: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      {({ inputId, describedBy, invalid }) => (
        <textarea
          {...props}
          id={inputId}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={clsx(
            CONTROL,
            "min-h-24 resize-y py-2.5 leading-relaxed",
            invalid ? "border-rose-400" : "border-ink-200 focus-visible:border-brand-500",
            className,
          )}
        />
      )}
    </Field>
  );
}

export function SelectField({
  label,
  hint,
  error,
  required,
  options,
  className,
  ...props
}: {
  label: string;
  hint?: string;
  error?: string;
  options: { value: string; label: string }[];
} & InputHTMLAttributes<HTMLSelectElement>) {
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      {({ inputId, describedBy, invalid }) => (
        <select
          {...(props as object)}
          id={inputId}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={clsx(
            CONTROL,
            "h-11 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22 fill=%22none%22 stroke=%22%23667080%22 stroke-width=%221.5%22><path d=%22M4 6.5 8 10.5l4-4%22/></svg>')] bg-[length:16px] bg-[position:right_0.85rem_center] bg-no-repeat pr-10",
            invalid ? "border-rose-400" : "border-ink-200 focus-visible:border-brand-500",
            className,
          )}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}
