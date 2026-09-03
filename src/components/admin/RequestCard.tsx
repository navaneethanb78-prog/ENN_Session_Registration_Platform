"use client";

import { useState } from "react";
import type { InHouseRequest } from "@/lib/db/types";
import { BRAND } from "@/lib/config";
import { formatPhoneForDisplay } from "@/lib/phone";
import { TRAINING_MODE_LABEL } from "@/lib/programmes";
import { formatInZone } from "@/lib/time";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Primitives";
import { RequestStatusControl } from "./RequestStatusControl";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-1.5">
      <dt className="w-28 shrink-0 text-[0.8125rem] text-ink-400">{label}</dt>
      <dd className="min-w-0 flex-1 text-[0.875rem] break-words text-ink-800">{value}</dd>
    </div>
  );
}

/**
 * One on-site request.
 *
 * A card rather than a table row: a request has a dozen fields including a full
 * address and a free-text note, which a table can only show by scrolling
 * sideways or truncating.
 */
export function RequestCard({ request }: { request: InHouseRequest }) {
  const [downloading, setDownloading] = useState(false);

  async function downloadPdf() {
    setDownloading(true);
    try {
      // Loaded on demand: the PDF library is only needed when someone asks for
      // a copy, so it stays out of the page's initial download.
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const left = 56;
      let y = 64;

      doc.setFontSize(16).setFont("helvetica", "bold");
      doc.text(BRAND.name, left, y);
      y += 18;
      doc.setFontSize(9).setFont("helvetica", "normal").setTextColor(120);
      doc.text(BRAND.tagline, left, y);
      y += 30;

      doc.setTextColor(20).setFontSize(13).setFont("helvetica", "bold");
      doc.text("On-site training request", left, y);
      y += 22;

      const rows: [string, string][] = [
        ["Reference", request.requestReference],
        ["Received", formatInZone(request.createdAt, "d MMMM yyyy, HH:mm")],
        ["Status", request.status],
        ["", ""],
        ["Contact", request.fullName],
        ["Designation", request.designation],
        ["Company", request.companyName],
        ["Phone", formatPhoneForDisplay(request.phoneNumber)],
        ["WhatsApp", formatPhoneForDisplay(request.whatsappNumber)],
        ["Email", request.email],
        ["", ""],
        ["Delivery", TRAINING_MODE_LABEL[request.trainingMode]],
        ["Participants", String(request.participants)],
        ["Preferred", request.preferredTimeframe],
      ];

      if (request.trainingMode === "ON_SITE") {
        rows.push(["Venue", request.venueName || "-"]);
        rows.push(["Address", request.venueAddress || "-"]);
        rows.push(["City", request.venueCity || "-"]);
      }

      doc.setFontSize(10);
      for (const [label, value] of rows) {
        if (!label && !value) {
          y += 8;
          continue;
        }
        doc.setFont("helvetica", "normal").setTextColor(120);
        doc.text(label, left, y);
        doc.setFont("helvetica", "bold").setTextColor(20);
        for (const line of doc.splitTextToSize(value, 330)) {
          doc.text(line, left + 110, y);
          y += 15;
        }
        y += 3;
      }

      y += 10;
      doc.setFont("helvetica", "normal").setTextColor(120).setFontSize(10);
      doc.text("Programmes requested", left, y);
      y += 16;
      doc.setTextColor(20);
      for (const programme of request.programmes) {
        for (const line of doc.splitTextToSize(`•  ${programme}`, 440)) {
          doc.text(line, left, y);
          y += 14;
        }
      }

      if (request.notes) {
        y += 14;
        doc.setTextColor(120);
        doc.text("Notes", left, y);
        y += 16;
        doc.setTextColor(20);
        for (const line of doc.splitTextToSize(request.notes, 440)) {
          doc.text(line, left, y);
          y += 14;
        }
      }

      doc.save(`${request.requestReference}.pdf`);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="tabular text-[0.8125rem] font-medium text-brand-700">
            {request.requestReference}
          </p>
          <p className="font-display mt-1 text-base font-semibold break-words text-brand-950">
            {request.companyName}
          </p>
          <p className="text-[0.8125rem] text-ink-500">
            {request.fullName} · {request.designation}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <RequestStatusControl requestId={request.id} status={request.status} />
          <Button
            variant="secondary"
            size="sm"
            onClick={downloadPdf}
            loading={downloading}
            loadingText="…"
          >
            PDF
          </Button>
        </div>
      </div>

      <dl className="mt-4 divide-y divide-ink-100 border-t border-ink-100 pt-1">
        <Row label="Received" value={formatInZone(request.createdAt, "d MMM yyyy, HH:mm")} />
        <Row label="Delivery" value={TRAINING_MODE_LABEL[request.trainingMode]} />
        <Row label="Participants" value={request.participants} />
        <Row label="Preferred" value={request.preferredTimeframe} />
        {request.trainingMode === "ON_SITE" && (
          <Row
            label="Venue"
            value={
              <>
                {request.venueName}
                {request.venueAddress && (
                  <span className="block text-ink-500">{request.venueAddress}</span>
                )}
                {request.venueCity && <span className="block text-ink-500">{request.venueCity}</span>}
              </>
            }
          />
        )}
        <Row
          label="Contact"
          value={
            <>
              <a href={`tel:${request.phoneNumber}`} className="tabular text-brand-700 hover:underline">
                {formatPhoneForDisplay(request.phoneNumber)}
              </a>
              <span className="block">
                <a href={`mailto:${request.email}`} className="text-brand-700 hover:underline">
                  {request.email}
                </a>
              </span>
            </>
          }
        />
        <Row
          label="Programmes"
          value={
            <ul className="flex list-none flex-wrap gap-1.5">
              {request.programmes.map((p) => (
                <li
                  key={p}
                  className="rounded-md bg-brand-50 px-2 py-1 text-[0.75rem] font-medium text-brand-800"
                >
                  {p}
                </li>
              ))}
            </ul>
          }
        />
        {request.notes && <Row label="Notes" value={request.notes} />}
      </dl>
    </Card>
  );
}
