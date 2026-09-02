import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { toAppError } from "@/lib/errors";
import { cancelSession, deleteSession, updateSession } from "@/lib/sessions/admin-service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json().catch(() => null);

    // A cancellation is a distinct, explicit action rather than a field edit.
    if (body && typeof body === "object" && "action" in body && body.action === "cancel") {
      return NextResponse.json({ session: await cancelSession(id) });
    }
    return NextResponse.json({ session: await updateSession(id, body) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    await deleteSession(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}

function errorResponse(err: unknown) {
  const appError = toAppError(err);
  return NextResponse.json(
    {
      code: appError.code,
      message: appError.userMessage,
      ...(appError.fieldErrors ? { fieldErrors: appError.fieldErrors } : {}),
    },
    { status: appError.httpStatus },
  );
}
