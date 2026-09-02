import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/auth/admin";
import { activeStoreName } from "@/lib/db";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

/**
 * Every page inside this route group is gated here. Unauthenticated visitors
 * are redirected before any admin data is fetched or rendered.
 */
export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const email = await currentAdmin();
  if (!email) redirect("/admin/login");

  return (
    <AdminShell email={email} store={await activeStoreName()}>
      {children}
    </AdminShell>
  );
}
