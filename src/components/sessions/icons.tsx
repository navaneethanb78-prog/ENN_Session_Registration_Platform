import type { PublicSessionDto } from "@/lib/sessions/dto";

export const MODE_LABEL: Record<PublicSessionDto["mode"], string> = {
  ONLINE: "Online",
  IN_PERSON: "In person",
  HYBRID: "Hybrid",
};

const ICON = "h-4 w-4 shrink-0 text-ink-400";

export function CalendarIcon() {
  return (
    <svg viewBox="0 0 16 16" className={ICON} aria-hidden="true">
      <rect x="2" y="3.5" width="12" height="10.5" rx="2" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2 6.75h12M5.5 2v3M10.5 2v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function ClockIcon() {
  return (
    <svg viewBox="0 0 16 16" className={ICON} aria-hidden="true">
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 4.75V8l2.25 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function PlaceIcon({ mode }: { mode: PublicSessionDto["mode"] }) {
  if (mode === "ONLINE") {
    return (
      <svg viewBox="0 0 16 16" className={ICON} aria-hidden="true">
        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <path d="M2 8h12M8 2c1.8 2 1.8 10 0 12M8 2C6.2 4 6.2 12 8 14" fill="none" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" className={ICON} aria-hidden="true">
      <path d="M8 14s4.5-4 4.5-7.5a4.5 4.5 0 1 0-9 0C3.5 10 8 14 8 14Z" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="8" cy="6.5" r="1.75" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path d="M3.5 8.5l3 3 6-6.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
