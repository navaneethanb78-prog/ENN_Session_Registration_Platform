"use client";

import type { PublicSessionDto } from "@/lib/sessions/dto";
import { DELIVERY_NOTICE } from "@/lib/programmes";
import { Alert } from "@/components/ui/Primitives";
import { SessionCatalogue } from "@/components/sessions/SessionCatalogue";

/**
 * The session listing on the landing page. Selection happens on /register —
 * here the cards simply lead there, so there is one place a booking is made.
 */
export function HomeSessions({ sessions }: { sessions: PublicSessionDto[] }) {
  return (
    <section id="sessions" className="scroll-mt-20 border-t border-ink-200/60 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-brand-950 sm:text-3xl">
          Sessions
        </h2>
        <p className="mt-2 max-w-2xl leading-relaxed text-ink-600">
          Open sessions are listed first. Completed sessions remain below for reference.
        </p>
        <Alert tone="info" className="mt-5 max-w-2xl">
          <strong>All sessions are held in person.</strong> {DELIVERY_NOTICE}
        </Alert>

        <div className="mt-8">
          <SessionCatalogue sessions={sessions} />
        </div>
      </div>
    </section>
  );
}
