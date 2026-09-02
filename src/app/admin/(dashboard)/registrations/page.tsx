import { listAdminRegistrations, listAdminSessions } from "@/lib/sessions/admin-service";
import { PageHeading } from "@/components/ui/Primitives";
import { RegistrationsTable } from "@/components/admin/RegistrationsTable";

export const dynamic = "force-dynamic";

export default async function AdminRegistrationsPage() {
  const [registrations, sessions] = await Promise.all([
    listAdminRegistrations(),
    listAdminSessions(new Date()),
  ]);

  return (
    <div className="flex flex-col gap-7">
      <PageHeading
        eyebrow="Registrations"
        title="Registration records"
        description="Search and filter every registration received across all sessions."
      />
      <RegistrationsTable
        registrations={registrations}
        sessions={sessions.map((v) => ({ id: v.session.id, name: v.session.sessionName }))}
      />
    </div>
  );
}
