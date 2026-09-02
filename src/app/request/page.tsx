import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { PageHeading } from "@/components/ui/Primitives";
import { RequestExperience } from "@/components/home/RequestExperience";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Request a training programme",
  description:
    "Ask ENN Consultancy to deliver any of our 90+ training programmes at your own premises. Select as many programmes as you need.",
};

export default function RequestPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <PageHeading
          eyebrow="In-house training"
          title="Request a programme at your premises"
          description="Tell us which programmes you need and roughly when. We will contact you to agree the date, agenda and cost, then schedule a session your team can register for."
          className="mb-8"
        />
        <RequestExperience />
      </main>
      <SiteFooter />
    </div>
  );
}
