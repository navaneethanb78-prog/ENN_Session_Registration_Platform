import type { Metadata } from "next";
import { BRAND } from "@/lib/config";
import { DELIVERY_NOTICE } from "@/lib/programmes";
import { listPublicSessions } from "@/lib/sessions/service";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { LinkButton } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Primitives";
import { TrainingProgrammes } from "@/components/home/TrainingProgrammes";
import { HomeSessions } from "@/components/home/HomeSessions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Awareness & Training Sessions",
};

/**
 * The entire visitor experience lives on this one page: the programme
 * catalogue, the session list and the registration form. There are no separate
 * pages to navigate between — the header links are in-page anchors.
 */
export default async function HomePage() {
  let sessions: Awaited<ReturnType<typeof listPublicSessions>> = [];
  let sessionsUnavailable = false;
  try {
    sessions = await listPublicSessions(new Date());
  } catch (error) {
    // The rest of the page is still worth showing; only the listing is missing.
    console.error("[enn] could not load sessions:", error);
    sessionsUnavailable = true;
  }
  const openCount = sessions.filter((s) => s.canRegister).length;
  const seatsAvailable = sessions
    .filter((s) => s.canRegister)
    .reduce((sum, s) => sum + s.remainingSeats, 0);

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main id="main" className="flex-1">
        <section className="bg-gradient-to-b from-brand-50/60 to-transparent">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="max-w-2xl">
              <p className="text-[0.6875rem] font-semibold tracking-[0.16em] text-brand-600 uppercase">
                {BRAND.tagline}
              </p>
              <h1 className="font-display mt-4 text-3xl leading-[1.15] font-semibold tracking-tight text-brand-950 sm:text-5xl">
                Management system training, delivered with rigour.
              </h1>
              <p className="mt-5 text-base leading-relaxed text-ink-600 sm:text-lg">
                {BRAND.name} runs awareness and practitioner sessions across the ISO management
                system standards — in person, at our venue or yours. Seats are limited and
                allocated in order of registration.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <LinkButton href="/register" size="lg" className="w-full sm:w-auto">
                  Register for a session
                </LinkButton>
                <LinkButton
                  href="/request"
                  variant="secondary"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  Request a programme
                </LinkButton>
              </div>

              <p className="mt-5 text-sm text-ink-500">
                {openCount > 0 ? (
                  <>
                    <span className="font-semibold text-emerald-700">
                      {openCount} {openCount === 1 ? "session" : "sessions"} open
                    </span>
                    <span className="text-ink-400"> · {seatsAvailable} seats available</span>
                  </>
                ) : (
                  "No sessions are open right now — new dates are announced regularly, and we can run any programme at your premises."
                )}
              </p>
              <p className="mt-2 text-[0.8125rem] text-ink-400">{DELIVERY_NOTICE}</p>
            </div>
          </div>
        </section>

        <TrainingProgrammes />
        {sessionsUnavailable && (
          <Alert tone="warning" className="mb-8">
            <strong>Sessions cannot be listed at the moment.</strong> This is a temporary problem
            at our end, not with your browser. Please try again shortly, or contact ENN
            Consultancy directly.
          </Alert>
        )}
        <HomeSessions sessions={sessions} />
      </main>

      <SiteFooter />
    </div>
  );
}
