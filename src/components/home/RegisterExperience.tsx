"use client";

import { useCallback, useRef, useState } from "react";
import type { PublicSessionDto } from "@/lib/sessions/dto";
import { SessionCatalogue } from "@/components/sessions/SessionCatalogue";
import { RegistrationWizard } from "@/components/registration/RegistrationWizard";
import { SuccessPanel } from "@/components/registration/SuccessPanel";
import { ProgrammesPrompt } from "@/components/registration/ProgrammesPrompt";
import type { ConfirmationPayload } from "@/components/registration/confirmation";

/**
 * The registration journey: browse sessions, then register for the one chosen.
 * Selecting a session fills the form below and scrolls to it, so there is never
 * a second copy of the session list to keep in step.
 */
export function RegisterExperience({ sessions }: { sessions: PublicSessionDto[] }) {
  const [sessionId, setSessionId] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationPayload | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const scrollToForm = useCallback(() => {
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const chooseSession = useCallback(
    (session: PublicSessionDto) => {
      setSessionId(session.id);
      scrollToForm();
    },
    [scrollToForm],
  );

  if (confirmation) {
    return (
      <div ref={formRef}>
        <div className="mx-auto max-w-2xl">
          <SuccessPanel
            confirmation={confirmation}
            onRegisterAnother={() => {
              setConfirmation(null);
              setSessionId("");
            }}
          />
        </div>
        {/* Once they are registered, show them the rest of what we run. */}
        <ProgrammesPrompt />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-12">
      <section aria-label="Available sessions">
        <SessionCatalogue sessions={sessions} selectedId={sessionId || null} onSelect={chooseSession} />
      </section>

      <section ref={formRef} aria-label="Registration form" className="scroll-mt-20">
        <div className="mx-auto max-w-3xl">
          <RegistrationWizard
            sessions={sessions}
            sessionId={sessionId}
            onSessionIdChange={setSessionId}
            onComplete={(payload) => {
              setConfirmation(payload);
              scrollToForm();
            }}
          />
        </div>
      </section>
    </div>
  );
}
