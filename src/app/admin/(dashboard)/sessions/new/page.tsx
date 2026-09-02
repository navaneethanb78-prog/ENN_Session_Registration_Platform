import { PageHeading } from "@/components/ui/Primitives";
import { SessionForm } from "@/components/admin/SessionForm";
import { emptyValues } from "@/components/admin/session-form-values";

export const dynamic = "force-dynamic";

export default function NewSessionPage() {
  return (
    <div className="flex flex-col gap-7">
      <PageHeading
        eyebrow="Sessions"
        title="Create a session"
        description="Publish a new date. Registrations open as soon as the session is active."
      />
      <SessionForm mode="create" initial={emptyValues()} />
    </div>
  );
}
