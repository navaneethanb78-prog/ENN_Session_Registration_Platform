import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/auth/admin";
import { isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { LoginForm } from "@/components/admin/LoginForm";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await currentAdmin()) redirect("/admin");
  return <LoginForm firebaseEnabled={isFirebaseAdminConfigured()} />;
}
