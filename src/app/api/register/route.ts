import { NextResponse, type NextRequest } from "next/server";
import { createRegistration } from "@/lib/sessions/service";
import { AppError, toAppError } from "@/lib/errors";

/**
 * Registration endpoint.
 *
 * This is the authority: it re-validates every field with the shared schema and
 * claims the seat through the store's atomic transaction. Nothing the client
 * sends about availability is trusted.
 */
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new AppError("VALIDATION_ERROR", "The registration data could not be read.");
    }

    const { registration, session } = await createRegistration(body, new Date());

    return NextResponse.json(
      {
        registration: {
          id: registration.id,
          registrationReference: registration.registrationReference,
          fullName: registration.fullName,
          companyName: registration.companyName,
          designation: registration.designation,
          phoneNumber: registration.phoneNumber,
          whatsappNumber: registration.whatsappNumber,
          email: registration.email,
          registeredAt: registration.registeredAt,
        },
        session,
      },
      { status: 201 },
    );
  } catch (err) {
    const appError = toAppError(err);
    // Raw database errors are never returned; only mapped, user-safe messages.
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
