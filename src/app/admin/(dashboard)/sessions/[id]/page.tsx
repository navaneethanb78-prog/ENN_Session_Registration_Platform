import { notFound } from "next/navigation";
import { getAdminSession, listAdminRegistrations } from "@/lib/sessions/admin-service";
import { AppError } from "@/lib/errors";
import { PageHeading } from "@/components/ui/Primitives";
import { SessionForm } from "@/components/admin/SessionForm";
import { valuesFrom } from "@/components/admin/session-form-values";
import { SessionDangerZone } from "@/components/admin/SessionDangerZone";
import { AnnounceSession } from "@/components/admin/AnnounceSession";
import { StatusBadge } from "@/components/sessions/StatusBadge";

export const dynamic = "force-dynamic";

export default async function EditSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let view;
  try {
    view = await getAdminSession(id, new Date());
  } catch (err) {
    if (err instanceof AppError && err.code === "SESSION_NOT_FOUND") notFound();
    throw err;
  }

  const registrations = await listAdminRegistrations({ sessionId: id });

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeading
          eyebrow="Sessions"
          title={view.session.sessionName}
          description={`${view.session.registeredCount} of ${view.session.maximumSeats} seats taken · ${registrations.length} registration${registrations.length === 1 ? "" : "s"} on record.`}
        />
        <StatusBadge status={view.status} />
      </div>

      <SessionForm
        mode="edit"
        sessionId={view.session.id}
        initial={valuesFrom(view.session)}
        registeredCount={view.session.registeredCount}
      />

      <AnnounceSession
        sessionId={view.session.id}
        sessionName={view.session.sessionName}
        startAt={view.session.startAt}
        timezone={view.session.timezone}
        location={view.session.location}
      />

      <SessionDangerZone
        sessionId={view.session.id}
        sessionName={view.session.sessionName}
        cancelled={view.status === "CANCELLED"}
        registrationCount={registrations.length}
      />
    </div>
  );
}
