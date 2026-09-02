import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { ADMIN_SESSION_COOKIE } from "@/lib/config";
import { AppError, toAppError } from "@/lib/errors";
import { authenticateAdmin, createSessionToken, sessionCookieOptions } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  email: z.string().min(1),
  password: z.string().optional(),
  idToken: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new AppError("UNAUTHORISED", "Incorrect email address or password.");

    const email = await authenticateAdmin(parsed.data);
    const response = NextResponse.json({ email });
    response.cookies.set(ADMIN_SESSION_COOKIE, createSessionToken(email), sessionCookieOptions());
    return response;
  } catch (err) {
    const appError = toAppError(err);
    return NextResponse.json(
      { code: appError.code, message: appError.userMessage },
      { status: appError.httpStatus },
    );
  }
}
