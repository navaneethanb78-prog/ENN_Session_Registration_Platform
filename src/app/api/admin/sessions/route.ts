import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { toAppError } from "@/lib/errors";
import { createSession, listAdminSessions } from "@/lib/sessions/admin-service";
import { toPublicDto } from "@/lib/sessions/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const views = await listAdminSessions(new Date());
    return NextResponse.json({ sessions: views.map(toPublicDto) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const session = await createSession(await request.json().catch(() => null));
    return NextResponse.json({ session }, { status: 201 });
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
