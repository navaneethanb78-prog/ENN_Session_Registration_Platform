import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { toAppError } from "@/lib/errors";
import { announceSession, announcementAudience } from "@/lib/email/announce";
import { isEmailConfigured } from "@/lib/email/mailer";

export const dynamic = "force-dynamic";

/** How many people an announcement would reach, so the UI can confirm first. */
export async function GET() {
  try {
    await requireAdmin();
    const audience = await announcementAudience();
    return NextResponse.json({ recipients: audience.length, emailConfigured: isEmailConfigured() });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = (await request.json().catch(() => null)) as { sessionId?: string } | null;
    if (!body?.sessionId) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "Choose a session to announce." },
        { status: 400 },
      );
    }
    const result = await announceSession(body.sessionId);
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}

function errorResponse(err: unknown) {
  const appError = toAppError(err);
  return NextResponse.json(
    { code: appError.code, message: appError.userMessage },
    { status: appError.httpStatus },
  );
}
