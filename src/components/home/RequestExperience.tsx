"use client";

import { useState } from "react";
import { InHouseRequestForm } from "@/components/registration/InHouseRequestForm";
import { ProgrammesPrompt } from "@/components/registration/ProgrammesPrompt";

/**
 * The in-house request journey. Once a request lands we surface the wider
 * catalogue, since a company asking for one programme often needs several.
 */
export function RequestExperience() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <>
      <InHouseRequestForm onSubmitted={() => setSubmitted(true)} />
      {submitted && <ProgrammesPrompt />}
    </>
  );
}
