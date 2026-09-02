"use client";

import clsx from "clsx";
import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-900 text-white hover:bg-brand-800 active:bg-brand-950 disabled:hover:bg-brand-900 shadow-sm",
  secondary:
    "bg-white text-brand-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50 hover:ring-ink-300 active:bg-ink-100",
  ghost: "bg-transparent text-ink-600 hover:bg-ink-100 hover:text-ink-800",
  danger: "bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 shadow-sm",
};

const SIZES: Record<ButtonSize, string> = {
  // Comfortably above the 44px touch target on mobile.
  sm: "h-9 px-3.5 text-sm rounded-lg gap-1.5",
  md: "h-11 px-5 text-sm rounded-lg gap-2",
  lg: "h-12 px-6 text-[0.9375rem] rounded-xl gap-2",
};

/**
 * Shared button appearance, so a real <button> and a link that looks like a
 * button stay visually identical without one wrapping the other.
 *
 * Nesting a <button> inside an <a> (or a Next <Link>) is invalid HTML: the
 * button swallows the click and navigation silently fails. Use LinkButton for
 * anything that navigates, and Button for anything that acts.
 */
export function buttonClasses({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
} = {}): string {
  return clsx(
    "inline-flex items-center justify-center font-medium transition-colors duration-150",
    "disabled:cursor-not-allowed disabled:opacity-55",
    VARIANTS[variant],
    SIZES[size],
    fullWidth && "w-full",
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingText?: string;
  icon?: ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  loadingText,
  icon,
  fullWidth = false,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      {...props}
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, fullWidth, className })}
    >
      {loading ? (
        <>
          <Spinner />
          <span>{loadingText ?? "Working…"}</span>
        </>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  );
}

/** A navigation link that looks like a button. Renders a single <a>. */
export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  fullWidth = false,
  icon,
  className,
  children,
  ...props
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  icon?: ReactNode;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  const classes = buttonClasses({ variant, size, fullWidth, className });

  // Downloads and external targets need a plain anchor; Link is for in-app routes.
  const isPlainAnchor =
    "download" in props || href.startsWith("http") || href.startsWith("mailto:");

  if (isPlainAnchor) {
    return (
      <a href={href} className={classes} {...props}>
        {icon}
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes} {...props}>
      {icon}
      {children}
    </Link>
  );
}

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={clsx("animate-spin", className)} viewBox="0 0 24 24" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
        opacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
