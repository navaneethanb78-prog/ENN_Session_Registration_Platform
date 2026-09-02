import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { getStore } from "@/lib/db";
import { toAppError } from "@/lib/errors";
import type { InHouseRequestStatus } from "@/lib/db/types";

export const dynamic = "force-dynamic";

const ALLOWED: InHouseRequestStatus[] = ["PENDING", "PLANNING", "ACCEPTED", "REJECTED"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as { status?: string } | null;
    const status = body?.status as InHouseRequestStatus | undefined;

    if (!status || !ALLOWED.includes(status)) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "That is not a valid request status." },
        { status: 400 },
      );
    }

    const store = await getStore();
    const updated = await store.updateInHouseRequestStatus(id, status, new Date());
    return NextResponse.json({ request: updated });
  } catch (err) {
    const appError = toAppError(err);
    return NextResponse.json(
      { code: appError.code, message: appError.userMessage },
      { status: appError.httpStatus },
    );
  }
}
