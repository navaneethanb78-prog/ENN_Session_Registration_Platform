import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { toAppError } from "@/lib/errors";
import { listAdminRegistrations } from "@/lib/sessions/admin-service";

/** Registration records are never exposed without a valid admin session. */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const sessionId = request.nextUrl.searchParams.get("sessionId") ?? undefined;
    const registrations = await listAdminRegistrations(sessionId ? { sessionId } : undefined);
    return NextResponse.json({ registrations });
  } catch (err) {
    const appError = toAppError(err);
    return NextResponse.json(
      { code: appError.code, message: appError.userMessage },
      { status: appError.httpStatus },
    );
  }
}
