import { NextResponse, type NextRequest } from "next/server";
import { getStore } from "@/lib/db";
import { AppError, toAppError } from "@/lib/errors";
import { fieldErrorsFrom, inHouseRequestSchema } from "@/lib/validation/schemas";
import { sendEmailInBackground } from "@/lib/email/mailer";
import { inHouseRequestEmail, internalNotification } from "@/lib/email/templates";

/**
 * On-site training requests. Claims no seat, so there is no capacity
 * transaction — but validation is still re-run server-side.
 */
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = inHouseRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Please check the highlighted fields and try again.",
        fieldErrorsFrom(parsed.error),
      );
    }

    const store = await getStore();
    const created = await store.createInHouseRequest(parsed.data, new Date());

    // Acknowledged immediately; delivery never blocks the response.
    sendEmailInBackground(inHouseRequestEmail(created));
    const internal = internalNotification(`New training request - ${created.companyName}`, [
      `Reference:    ${created.requestReference}`,
      `Name:         ${created.fullName} (${created.designation})`,
      `Company:      ${created.companyName}`,
      `Phone:        ${created.phoneNumber}`,
      `Email:        ${created.email}`,
      `Programmes:   ${created.programmes.join(", ")}`,
      `Participants: ${created.participants}`,
      `Location:     ${created.venueCity}`,
      `Timeframe:    ${created.preferredTimeframe}`,
      created.notes ? `Notes:        ${created.notes}` : "",
    ]);
    if (internal) sendEmailInBackground(internal);

    return NextResponse.json(
      {
        request: {
          requestReference: created.requestReference,
          fullName: created.fullName,
          companyName: created.companyName,
          programmes: created.programmes,
          participants: created.participants,
          preferredTimeframe: created.preferredTimeframe,
          venueCity: created.venueCity,
          email: created.email,
          phoneNumber: created.phoneNumber,
        },
      },
      { status: 201 },
    );
  } catch (err) {
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
}
