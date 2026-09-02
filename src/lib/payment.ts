/**
 * Payment for paid sessions.
 *
 * ENN collects fees by UPI. The QR encodes the payee, the exact amount and a
 * transaction note, so the registrant does not have to type anything — which
 * removes the most common cause of unreconcilable payments.
 *
 * Nothing here touches card details or a payment gateway: the registrant pays
 * from their own banking app and reports the reference, and an administrator
 * reconciles it against the bank statement.
 */

export const PAYMENT_CONFIG = {
  upiId: process.env.NEXT_PUBLIC_UPI_ID ?? "",
  payeeName: process.env.NEXT_PUBLIC_UPI_PAYEE_NAME ?? "ENN Consultancy",
  /** Fallback image, used when no UPI ID is configured. */
  staticQrPath: "/payment-qr.png",
} as const;

export function isUpiConfigured(): boolean {
  return PAYMENT_CONFIG.upiId.includes("@");
}

/**
 * Format whole rupees for display: "₹4,500".
 *
 * Tolerates a missing or non-numeric amount rather than throwing: a formatting
 * helper should never be able to take down the page that calls it.
 */
export function formatRupees(amount: number | null | undefined): string {
  const value = typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
  return `₹${value.toLocaleString("en-IN")}`;
}

/**
 * Build the standard UPI deep link.
 * upi://pay?pa=<vpa>&pn=<name>&am=<amount>&cu=INR&tn=<note>
 */
export function buildUpiUri(amount: number, note: string): string {
  const params = new URLSearchParams({
    pa: PAYMENT_CONFIG.upiId,
    pn: PAYMENT_CONFIG.payeeName,
    am: String(amount),
    cu: "INR",
    tn: note.slice(0, 50),
  });
  return `upi://pay?${params.toString()}`;
}

/** Render the UPI link as a PNG data URI, for display and for emails. */
export async function buildUpiQrDataUri(amount: number, note: string): Promise<string | null> {
  if (!isUpiConfigured()) return null;
  const QRCode = (await import("qrcode")).default;
  return QRCode.toDataURL(buildUpiUri(amount, note), {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320,
    color: { dark: "#16314b", light: "#ffffff" },
  });
}
