import type { PublicSessionDto } from "@/lib/sessions/dto";

/**
 * The confirmation payload is handed to the success page through sessionStorage
 * rather than the URL, so no personal data ends up in a query string, browser
 * history or a server log. If it is missing (a direct visit, or a new tab) the
 * success page degrades gracefully.
 */
export const CONFIRMATION_STORAGE_KEY = "enn.registration.confirmation";

export interface ConfirmationPayload {
  reference: string;
  fullName: string;
  companyName: string;
  designation: string;
  phoneNumber: string;
  whatsappNumber: string;
  email: string;
  session: PublicSessionDto;
}

export function storeConfirmation(payload: ConfirmationPayload) {
  try {
    sessionStorage.setItem(CONFIRMATION_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Private browsing or disabled storage: the success page falls back.
  }
}

export function readConfirmation(): ConfirmationPayload | null {
  try {
    const raw = sessionStorage.getItem(CONFIRMATION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ConfirmationPayload) : null;
  } catch {
    return null;
  }
}
