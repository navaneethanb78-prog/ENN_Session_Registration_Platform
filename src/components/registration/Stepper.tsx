"use client";

import clsx from "clsx";

export interface StepDef {
  id: string;
  label: string;
}

export function Stepper({
  steps,
  current,
  onJump,
  furthest,
}: {
  steps: StepDef[];
  current: number;
  furthest: number;
  onJump?: (index: number) => void;
}) {
  return (
    <nav aria-label="Registration progress">
      <ol className="flex list-none items-center gap-1 sm:gap-2">
        {steps.map((step, index) => {
          const state = index < current ? "done" : index === current ? "current" : "todo";
          const reachable = index <= furthest && onJump;

          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
              <button
                type="button"
                disabled={!reachable}
                onClick={() => reachable && onJump(index)}
                aria-current={state === "current" ? "step" : undefined}
                className={clsx(
                  "flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-1.5 text-left transition-colors sm:px-2",
                  reachable && "hover:bg-ink-50",
                  !reachable && "cursor-default",
                )}
              >
                <span
                  aria-hidden="true"
                  className={clsx(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.6875rem] font-semibold transition-colors",
                    state === "done" && "bg-brand-900 text-white",
                    state === "current" && "bg-brand-900 text-white ring-4 ring-brand-100",
                    state === "todo" && "bg-ink-100 text-ink-400",
                  )}
                >
                  {state === "done" ? (
                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
                      <path
                        d="M3.5 8.5l3 3 6-6.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={clsx(
                    "hidden truncate text-[0.8125rem] font-medium sm:block",
                    state === "todo" ? "text-ink-400" : "text-brand-900",
                  )}
                >
                  {step.label}
                </span>
                <span className="sr-only">
                  Step {index + 1} of {steps.length}: {step.label}
                  {state === "done" ? " (completed)" : ""}
                </span>
              </button>
              {index < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className={clsx(
                    "h-px flex-1 transition-colors sm:max-w-8",
                    index < current ? "bg-brand-300" : "bg-ink-200",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
