"use client";

import { useEffect, useState } from "react";
import { TRAINING_PROGRAMMES } from "@/lib/programmes";
import { Button, LinkButton } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

/**
 * Shown once a registration or request completes: the rest of what ENN offers.
 *
 * Deliberately opened on a short delay so it never competes with the
 * confirmation reference for attention — people need to read that first.
 */
export function ProgrammesPrompt({ delayMs = 1400 }: { delayMs?: number }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setOpen(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      title="What else can we run for you?"
      footer={
        <>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Maybe later
          </Button>
          <LinkButton href="/request" onClick={() => setOpen(false)}>
            Request a programme
          </LinkButton>
        </>
      }
    >
      <p>
        You are all set. ENN Consultancy runs more than 90 training programmes — any of them can be
        delivered at your own premises.
      </p>

      <div className="mt-4 flex flex-col gap-3">
        {TRAINING_PROGRAMMES.map((group) => (
          <div key={group.title}>
            <p className="text-[0.6875rem] font-semibold tracking-[0.1em] text-ink-400 uppercase">
              {group.title}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {group.items.map((item) => (
                <span
                  key={item}
                  className="rounded-md bg-brand-50 px-2 py-1 text-[0.8125rem] font-medium text-brand-800"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Dialog>
  );
}
