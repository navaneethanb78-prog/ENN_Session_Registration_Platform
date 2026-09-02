import clsx from "clsx";
import type { ReactNode } from "react";

export function Card({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "li";
}) {
  return (
    <Tag
      className={clsx(
        "rounded-xl border border-ink-200/80 bg-white shadow-[var(--shadow-card)]",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "success" | "warning" | "error";
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const tones = {
    info: "border-brand-200 bg-brand-50 text-brand-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
    error: "border-rose-200 bg-rose-50 text-rose-900",
  } as const;

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={clsx("rounded-lg border px-4 py-3 text-sm", tones[tone], className)}
    >
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={clsx(title && "mt-1", "leading-relaxed")}>{children}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("skeleton rounded-md", className)} aria-hidden="true" />;
}

export function PageHeading({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={clsx("max-w-2xl", className)}>
      {eyebrow && (
        <p className="text-[0.6875rem] font-semibold tracking-[0.16em] text-brand-600 uppercase">
          {eyebrow}
        </p>
      )}
      <h1 className="font-display mt-2 text-2xl font-semibold tracking-tight text-brand-950 sm:text-3xl">
        {title}
      </h1>
      {description && <p className="mt-2 leading-relaxed text-ink-500">{description}</p>}
    </div>
  );
}

/** Definition-list row used in summaries and detail panels. */
export function DetailRow({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("flex flex-col gap-0.5 sm:flex-row sm:gap-4", className)}>
      <dt className="text-[0.8125rem] text-ink-400 sm:w-40 sm:shrink-0">{label}</dt>
      <dd className="text-[0.9375rem] font-medium break-words text-ink-800">{value}</dd>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-ink-200 bg-white/60 px-6 py-12 text-center">
      <p className="font-display text-lg font-semibold text-brand-950">{title}</p>
      {description && <p className="mx-auto mt-1.5 max-w-md text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
