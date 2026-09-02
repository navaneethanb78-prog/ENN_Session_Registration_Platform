import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { getStore } from "@/lib/db";
import { toAppError } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * Remove a participant. The store returns the freed seat to the session in the
 * same transaction, so a session that had filled becomes open again.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const store = await getStore();
    const removed = await store.deleteRegistration(id, new Date());

    return NextResponse.json({
      removed: {
        id: removed.id,
        registrationReference: removed.registrationReference,
        fullName: removed.fullName,
        sessionId: removed.sessionId,
      },
    });
  } catch (err) {
    const appError = toAppError(err);
    return NextResponse.json(
      { code: appError.code, message: appError.userMessage },
      { status: appError.httpStatus },
    );
  }
}
