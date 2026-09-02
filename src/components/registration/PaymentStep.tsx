"use client";

import { useEffect, useState } from "react";
import type { PublicSessionDto } from "@/lib/sessions/dto";
import { PAYMENT_CONFIG, buildUpiUri, formatRupees, isUpiConfigured } from "@/lib/payment";
import { TextField } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Primitives";

/**
 * Payment for a paid session.
 *
 * The registrant pays from their own banking app and reports the reference; an
 * administrator reconciles it against the bank statement afterwards. Nothing
 * here handles card details, and no payment credential passes through the site.
 *
 * The QR encodes payee, exact amount and a transaction note, so there is
 * nothing to mistype — which is what usually makes a UPI payment impossible to
 * match to a registrant.
 */
export function PaymentStep({
  session,
  reference,
  error,
  onReferenceChange,
}: {
  session: PublicSessionDto;
  reference: string;
  error?: string;
  onReferenceChange: (value: string) => void;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [qrFailed, setQrFailed] = useState(false);
  const note = `${session.sessionName}`.slice(0, 50);

  useEffect(() => {
    let cancelled = false;
    if (!isUpiConfigured()) return;

    // Rendered in the browser so the amount is always current with the session.
    import("qrcode")
      .then((mod) =>
        mod.default.toDataURL(buildUpiUri(session.price, note), {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 320,
          color: { dark: "#16314b", light: "#ffffff" },
        }),
      )
      .then((url) => {
        if (!cancelled) setQr(url);
      })
      .catch(() => {
        if (!cancelled) setQrFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [session.price, note]);

  const upiConfigured = isUpiConfigured();

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-medium text-brand-900">Amount payable</p>
          <p className="font-display text-2xl font-semibold tracking-tight text-brand-950">
            {formatRupees(session.price)}
          </p>
        </div>
        <p className="mt-1 text-[0.8125rem] text-brand-800/80">
          Per participant for {session.sessionName}.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start">
        <div className="flex flex-col items-center gap-3">
          {qr ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qr}
                alt={`UPI payment QR code for ${formatRupees(session.price)}`}
                width={200}
                height={200}
                className="rounded-xl border border-ink-200 bg-white p-2"
              />
              <a
                href={buildUpiUri(session.price, note)}
                className="rounded text-[0.8125rem] font-medium text-brand-600 underline-offset-2 hover:underline sm:hidden"
              >
                Open in a UPI app
              </a>
            </>
          ) : upiConfigured && !qrFailed ? (
            <div className="skeleton h-[216px] w-[216px] rounded-xl" />
          ) : (
            // No UPI ID configured: fall back to the uploaded QR image.
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={PAYMENT_CONFIG.staticQrPath}
              alt="Payment QR code"
              width={200}
              height={200}
              className="rounded-xl border border-ink-200 bg-white p-2"
            />
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-semibold text-ink-800">How to pay</h3>
            <ol className="mt-2 flex list-decimal flex-col gap-1.5 pl-5 text-[0.875rem] leading-relaxed text-ink-600">
              <li>Scan the code with any UPI app (GPay, PhonePe, Paytm, your bank app).</li>
              <li>
                The payee and the amount of {formatRupees(session.price)} are filled in for you —
                please do not change them.
              </li>
              <li>Complete the payment, then copy the transaction / UTR reference.</li>
              <li>Enter that reference below and confirm your registration.</li>
            </ol>
          </div>

          {upiConfigured && (
            <p className="text-[0.8125rem] text-ink-500">
              Paying manually? Send {formatRupees(session.price)} to{" "}
              <span className="font-medium text-ink-800">{PAYMENT_CONFIG.upiId}</span> (
              {PAYMENT_CONFIG.payeeName}).
            </p>
          )}

          <TextField
            label="Transaction / UTR reference"
            required
            placeholder="e.g. 431234567890"
            hint="From your payment confirmation. We use this to match your payment."
            value={reference}
            error={error}
            onChange={(e) => onReferenceChange(e.target.value)}
          />
        </div>
      </div>

      <Alert tone="info">
        Your seat is held as soon as you register. We confirm your payment against our bank
        statement, usually within one working day.
      </Alert>
    </div>
  );
}
