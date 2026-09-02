import { NextResponse } from "next/server";
import { listPublicSessions } from "@/lib/sessions/service";
import { toAppError } from "@/lib/errors";

/**
 * Public session listing. Returns only presentation-safe fields — registrant
 * data is never included, and seat counts are aggregates.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sessions = await listPublicSessions(new Date());
    return NextResponse.json(
      { sessions },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (err) {
    const appError = toAppError(err);
    return NextResponse.json(
      { code: appError.code, message: appError.userMessage },
      { status: appError.httpStatus },
    );
  }
}
