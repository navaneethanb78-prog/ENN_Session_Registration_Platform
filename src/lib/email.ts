/**
 * Email validation and normalisation.
 *
 * Deliberately stricter than `type="email"`: it requires a dot-separated,
 * multi-character TLD, so "abc@gmail", "abc@" and "abc@.com" are all rejected.
 */
const EMAIL_RE =
  /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

export function isValidEmail(raw: string): boolean {
  const value = (raw ?? "").trim();
  if (!value || value.length > 254) return false;
  if (value.includes("..")) return false;
  const [local] = value.split("@");
  if (!local || local.length > 64) return false;
  return EMAIL_RE.test(value);
}

/** Lower-cased and trimmed. This is the form stored and used for duplicate checks. */
export function normaliseEmail(raw: string): string {
  return (raw ?? "").trim().toLowerCase();
}
