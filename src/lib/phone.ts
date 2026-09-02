/**
 * Phone normalisation to E.164.
 *
 * Indian numbers are the primary case, so a bare 10-digit number starting 6-9 is
 * accepted and given the +91 country code. Numbers written with an explicit "+"
 * are accepted for any country, subject to E.164 length rules.
 */

export const DEFAULT_COUNTRY_CODE = "91";

export interface PhoneParseResult {
  ok: boolean;
  /** E.164 without spaces, e.g. "+919876543210". */
  value: string;
  reason?: string;
}

export function normalisePhone(raw: string, defaultCountryCode = DEFAULT_COUNTRY_CODE): PhoneParseResult {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return { ok: false, value: "", reason: "Please enter a phone number." };

  const hasPlus = trimmed.startsWith("+");
  // Strip everything that is not a digit (spaces, dashes, brackets, dots).
  const digits = trimmed.replace(/\D/g, "");

  if (!digits) return { ok: false, value: "", reason: "Please enter a valid phone number." };

  if (hasPlus) {
    // E.164 allows a maximum of 15 digits including the country code.
    if (digits.length < 8 || digits.length > 15) {
      return { ok: false, value: "", reason: "Please enter a valid phone number." };
    }
    if (digits.startsWith(DEFAULT_COUNTRY_CODE) && digits.length === 12) {
      return validateIndianSubscriber(digits.slice(2));
    }
    return { ok: true, value: `+${digits}` };
  }

  // No "+": interpret against the default country.
  if (defaultCountryCode === DEFAULT_COUNTRY_CODE) {
    // Tolerate a leading 0 (STD prefix) or a 91 country prefix typed without "+".
    let subscriber = digits;
    if (subscriber.length === 11 && subscriber.startsWith("0")) subscriber = subscriber.slice(1);
    if (subscriber.length === 12 && subscriber.startsWith("91")) subscriber = subscriber.slice(2);
    if (subscriber.length === 13 && subscriber.startsWith("091")) subscriber = subscriber.slice(3);
    return validateIndianSubscriber(subscriber);
  }

  if (digits.length < 8 || digits.length > 15) {
    return { ok: false, value: "", reason: "Please enter a valid phone number." };
  }
  return { ok: true, value: `+${defaultCountryCode}${digits}` };
}

function validateIndianSubscriber(subscriber: string): PhoneParseResult {
  if (!/^[6-9]\d{9}$/.test(subscriber)) {
    return {
      ok: false,
      value: "",
      reason: "Please enter a valid 10-digit Indian mobile number, or include the country code.",
    };
  }
  return { ok: true, value: `+${DEFAULT_COUNTRY_CODE}${subscriber}` };
}

/** Presentation only: "+91 98765 43210". */
export function formatPhoneForDisplay(e164: string): string {
  if (e164.startsWith(`+${DEFAULT_COUNTRY_CODE}`) && e164.length === 13) {
    const s = e164.slice(3);
    return `+${DEFAULT_COUNTRY_CODE} ${s.slice(0, 5)} ${s.slice(5)}`;
  }
  return e164;
}

/** Mask for display in summaries: "+91 98765 XXXXX". */
export function maskPhone(e164: string): string {
  const shown = formatPhoneForDisplay(e164);
  return shown.replace(/\d(?=\d{4}$)/g, "X");
}
