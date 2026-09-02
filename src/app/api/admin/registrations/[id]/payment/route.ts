import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { getStore } from "@/lib/db";
import { AppError, toAppError } from "@/lib/errors";
import { sendEmailInBackground } from "@/lib/email/mailer";
import { paymentConfirmedEmail } from "@/lib/email/templates";
import type { PaymentStatus } from "@/lib/db/types";

export const dynamic = "force-dynamic";

const ALLOWED: PaymentStatus[] = ["PENDING", "CONFIRMED"];

/**
 * Verify (or un-verify) a payment.
 *
 * Confirming emails the registrant a receipt. Reverting to pending does not —
 * telling someone their confirmed payment has been undone is a conversation to
 * have directly, not by automated mail.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as { status?: string } | null;
    const status = body?.status as PaymentStatus | undefined;

    if (!status || !ALLOWED.includes(status)) {
      throw new AppError("VALIDATION_ERROR", "That is not a valid payment status.");
    }

    const store = await getStore();
    const updated = await store.setPaymentStatus(id, status, new Date());

    if (status === "CONFIRMED") {
      const session = await store.getSession(updated.sessionId);
      if (session) sendEmailInBackground(paymentConfirmedEmail(updated, session));
    }

    return NextResponse.json({
      registration: {
        id: updated.id,
        paymentStatus: updated.paymentStatus,
        registrationReference: updated.registrationReference,
      },
      emailed: status === "CONFIRMED",
    });
  } catch (err) {
    const appError = toAppError(err);
    return NextResponse.json(
      { code: appError.code, message: appError.userMessage },
      { status: appError.httpStatus },
    );
  }
}
