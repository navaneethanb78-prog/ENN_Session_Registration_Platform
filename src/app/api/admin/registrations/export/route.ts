import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { toAppError } from "@/lib/errors";
import { listAdminRegistrations } from "@/lib/sessions/admin-service";
import { formatInZone } from "@/lib/time";

export const dynamic = "force-dynamic";

const COLUMNS = [
  "Reference",
  "Name",
  "Company",
  "Designation",
  "Phone",
  "WhatsApp",
  "Email",
  "Session",
  "Session date",
  "Registered at",
  "Status",
];

/** Quote a CSV cell, and neutralise spreadsheet formula injection. */
function cell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const sessionId = request.nextUrl.searchParams.get("sessionId") ?? undefined;
    const rows = await listAdminRegistrations(sessionId ? { sessionId } : undefined);

    const lines = [COLUMNS.map(cell).join(",")];
    for (const r of rows) {
      lines.push(
        [
          r.registrationReference,
          r.fullName,
          r.companyName,
          r.designation,
          r.phoneNumber,
          r.whatsappNumber,
          r.email,
          r.sessionName,
          r.sessionStartAt
            ? formatInZone(r.sessionStartAt, "yyyy-MM-dd HH:mm", r.sessionTimezone)
            : "",
          formatInZone(r.registeredAt, "yyyy-MM-dd HH:mm", r.sessionTimezone),
          r.registrationStatus,
        ]
          .map((v) => cell(String(v ?? "")))
          .join(","),
      );
    }

    const filename = `enn-registrations-${formatInZone(new Date(), "yyyy-MM-dd")}.csv`;
    return new NextResponse(lines.join("\r\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const appError = toAppError(err);
    return NextResponse.json(
      { code: appError.code, message: appError.userMessage },
      { status: appError.httpStatus },
    );
  }
}
