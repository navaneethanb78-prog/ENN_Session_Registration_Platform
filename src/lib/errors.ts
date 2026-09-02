/**
 * Domain errors. Every user-visible failure maps to one of these codes, so raw
 * database errors are never surfaced to the browser.
 */
export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "SESSION_NOT_FOUND"
  | "SESSION_FULL"
  | "SESSION_COMPLETED"
  | "SESSION_CANCELLED"
  | "REGISTRATION_CLOSED"
  | "DUPLICATE_REGISTRATION"
  | "UNAUTHORISED"
  | "INTERNAL_ERROR";

const USER_MESSAGES: Record<AppErrorCode, string> = {
  VALIDATION_ERROR: "Please check the highlighted fields and try again.",
  SESSION_NOT_FOUND: "That session could not be found. Please choose another session.",
  SESSION_FULL:
    "Unfortunately, this session just became full. Please choose another available session.",
  SESSION_COMPLETED: "This session has already been completed.",
  SESSION_CANCELLED: "This session has been cancelled. Please choose another session.",
  REGISTRATION_CLOSED: "Registration for this session has closed. Please choose another session.",
  DUPLICATE_REGISTRATION: "You are already registered for this session.",
  UNAUTHORISED: "You do not have permission to perform this action.",
  INTERNAL_ERROR: "We couldn't complete your registration right now. Please try again.",
};

const STATUS_CODES: Record<AppErrorCode, number> = {
  VALIDATION_ERROR: 400,
  SESSION_NOT_FOUND: 404,
  SESSION_FULL: 409,
  SESSION_COMPLETED: 409,
  SESSION_CANCELLED: 409,
  REGISTRATION_CLOSED: 409,
  DUPLICATE_REGISTRATION: 409,
  UNAUTHORISED: 401,
  INTERNAL_ERROR: 500,
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly fieldErrors?: Record<string, string>;

  constructor(code: AppErrorCode, message?: string, fieldErrors?: Record<string, string>) {
    super(message ?? USER_MESSAGES[code]);
    this.name = "AppError";
    this.code = code;
    this.fieldErrors = fieldErrors;
  }

  get userMessage(): string {
    return this.message || USER_MESSAGES[this.code];
  }

  get httpStatus(): number {
    return STATUS_CODES[this.code];
  }
}

export function userMessageFor(code: AppErrorCode): string {
  return USER_MESSAGES[code];
}

/** Convert any thrown value into a safe AppError, logging the original server-side. */
export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  console.error("[enn] unexpected error:", err);
  return new AppError("INTERNAL_ERROR");
}
