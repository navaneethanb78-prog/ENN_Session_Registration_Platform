import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { getStore } from "@/lib/db";
import { toAppError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const store = await getStore();
    return NextResponse.json({ requests: await store.listInHouseRequests() });
  } catch (err) {
    const appError = toAppError(err);
    return NextResponse.json(
      { code: appError.code, message: appError.userMessage },
      { status: appError.httpStatus },
    );
  }
}
