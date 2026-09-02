import type { Metadata } from "next";
import { listPublicSessions } from "@/lib/sessions/service";
import { DELIVERY_NOTICE } from "@/lib/programmes";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { PageHeading, Alert } from "@/components/ui/Primitives";
import { RegisterExperience } from "@/components/home/RegisterExperience";

/** Seat counts must never be cached: availability is the whole point. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Register for a session",
  description:
    "Reserve your place at an ENN Consultancy training session. Live seat availability, in-person delivery.",
};

export default async function RegisterPage() {
  const sessions = await listPublicSessions(new Date());

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <PageHeading
          eyebrow="Session registration"
          title="Reserve your place"
          description="Choose a session, give us your details, and we will confirm your seat by email straight away."
          className="mb-6"
        />
        <Alert tone="info" className="mb-8 max-w-2xl">
          <strong>All sessions are held in person.</strong> {DELIVERY_NOTICE}
        </Alert>
        <RegisterExperience sessions={sessions} />
      </main>
      <SiteFooter />
    </div>
  );
}
