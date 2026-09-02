import { z } from "zod";
import { isValidEmail, normaliseEmail } from "@/lib/email";
import { normalisePhone } from "@/lib/phone";
import { DEFAULT_TIMEZONE } from "@/lib/config";
import { zonedDateTimeToUtc } from "@/lib/time";

/**
 * Shared schemas. The same objects run on the client (for immediate feedback)
 * and on the server (as the authority). Client input is never trusted.
 */

const phoneField = z
  .string()
  .min(1, "Please enter a phone number.")
  .transform((v, ctx) => {
    const parsed = normalisePhone(v);
    if (!parsed.ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: parsed.reason ?? "Please enter a valid phone number." });
      return z.NEVER;
    }
    return parsed.value;
  });

export const emailField = z
  .string()
  .min(1, "Please enter your email address.")
  .refine((v) => isValidEmail(v), { message: "Please enter a valid email address." })
  .transform(normaliseEmail);

export const registrationSchema = z
  .object({
    sessionId: z.string().min(1, "Please select a session."),
    fullName: z
      .string()
      .trim()
      .min(2, "Please enter your full name.")
      .max(120, "Name is too long.")
      .refine((v) => /[A-Za-z]/.test(v), "Please enter your full name."),
    companyName: z
      .string()
      .trim()
      .min(2, "Please enter your company name.")
      .max(160, "Company name is too long."),
    designation: z
      .string()
      .trim()
      .min(2, "Please enter your designation.")
      .max(120, "Designation is too long."),
    phoneNumber: phoneField,
    whatsappAvailable: z.boolean(),
    whatsappNumber: z.string().optional(),
    email: emailField,
    paymentReference: z.string().trim().max(64).optional().default(""),
  })
  .superRefine((data, ctx) => {
    // The WhatsApp number is required only when the primary number is not on WhatsApp.
    if (data.whatsappAvailable) return;
    const raw = (data.whatsappNumber ?? "").trim();
    if (!raw) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["whatsappNumber"],
        message: "Please enter your WhatsApp number.",
      });
      return;
    }
    const parsed = normalisePhone(raw);
    if (!parsed.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["whatsappNumber"],
        message: parsed.reason ?? "Please enter a valid WhatsApp number.",
      });
    }
  })
  .transform((data) => ({
    ...data,
    // Resolve the effective WhatsApp number once, here, so downstream code
    // never repeats the branch.
    whatsappNumber: data.whatsappAvailable
      ? data.phoneNumber
      : normalisePhone(data.whatsappNumber ?? "").value,
  }));

export type RegistrationFormValues = z.input<typeof registrationSchema>;
export type ValidatedRegistration = z.output<typeof registrationSchema>;

/**
 * A request to run a programme at the client's own premises. Shares the contact
 * validation with seat registration, but claims no seat.
 */
export const inHouseRequestSchema = z
  .object({
    fullName: z.string().trim().min(2, "Please enter your full name.").max(120),
    companyName: z.string().trim().min(2, "Please enter your company name.").max(160),
    designation: z.string().trim().min(2, "Please enter your designation.").max(120),
    phoneNumber: phoneField,
    whatsappAvailable: z.boolean(),
    whatsappNumber: z.string().optional(),
    email: emailField,
    programmes: z
      .array(z.string().trim().min(1))
      .min(1, "Please choose at least one programme.")
      .max(20, "Please select fewer programmes."),
    participants: z
      .number({ invalid_type_error: "Enter the approximate number of participants." })
      .int("Enter a whole number of participants.")
      .min(1, "There must be at least one participant.")
      .max(1000, "Please contact us directly for groups this large."),
    trainingMode: z.enum(["OPEN_HOUSE", "ON_SITE"], {
      errorMap: () => ({ message: "Please choose how you would like the training delivered." }),
    }),
    preferredTimeframe: z.string().trim().min(2, "Please tell us roughly when you need this."),
    venueName: z.string().trim().max(160).optional().default(""),
    venueAddress: z.string().trim().max(500).optional().default(""),
    venueCity: z.string().trim().max(160).optional().default(""),
    notes: z.string().trim().max(2000).optional().default(""),
  })
  .superRefine((data, ctx) => {
    // Venue detail matters only when we are travelling to the client.
    if (data.trainingMode === "ON_SITE") {
      if (!data.venueName.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["venueName"],
          message: "Please tell us the site or company name.",
        });
      }
      if (!data.venueAddress.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["venueAddress"],
          message: "Please give us the address of the venue.",
        });
      }
      if (!data.venueCity.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["venueCity"],
          message: "Please tell us the city.",
        });
      }
    }

    if (data.whatsappAvailable) return;
    const raw = (data.whatsappNumber ?? "").trim();
    if (!raw) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["whatsappNumber"],
        message: "Please enter your WhatsApp number.",
      });
      return;
    }
    const parsed = normalisePhone(raw);
    if (!parsed.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["whatsappNumber"],
        message: parsed.reason ?? "Please enter a valid WhatsApp number.",
      });
    }
  })
  .transform((data) => ({
    ...data,
    whatsappNumber: data.whatsappAvailable
      ? data.phoneNumber
      : normalisePhone(data.whatsappNumber ?? "").value,
  }));

export type InHouseFormValues = z.input<typeof inHouseRequestSchema>;

const timeField = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a 24-hour time such as 10:00.");

export const sessionSchema = z
  .object({
    sessionName: z.string().trim().min(3, "Please enter a session name.").max(160),
    topic: z.string().trim().min(2, "Please enter a topic.").max(160),
    description: z.string().trim().max(2000).default(""),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please choose a valid date."),
    startTime: timeField,
    endTime: timeField,
    timezone: z.string().min(1).default(DEFAULT_TIMEZONE),
    location: z.string().trim().max(160).default(""),
    mode: z.enum(["ONLINE", "IN_PERSON", "HYBRID"]),
    maximumSeats: z
      .number({ invalid_type_error: "Enter the maximum number of seats." })
      .int("Seats must be a whole number.")
      .min(1, "Maximum seats must be at least 1.")
      .max(10000, "That capacity looks too large."),
    isFree: z.boolean().default(false),
    price: z
      .number({ invalid_type_error: "Enter the fee in rupees." })
      .int("Enter a whole number of rupees.")
      .min(0, "The fee cannot be negative.")
      .max(1000000, "That fee looks too large.")
      .default(0),
    registrationDeadline: z.string().nullable().default(null),
    isActive: z.boolean().default(true),
    status: z.enum(["OPEN", "FULL", "COMPLETED", "CANCELLED"]).optional(),
  })
  .superRefine((data, ctx) => {
    const start = zonedDateTimeToUtc(data.date, data.startTime, data.timezone);
    const end = zonedDateTimeToUtc(data.date, data.endTime, data.timezone);
    if (end.getTime() <= start.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endTime"],
        message: "End time must be after the start time.",
      });
    }
    // A fee is required only for a session that can still be booked. Historical
    // records are imported as paid with no per-seat price, which is correct:
    // the charge was for the whole engagement, not per attendee.
    const alreadyEnded = zonedDateTimeToUtc(data.date, data.endTime, data.timezone) < new Date();
    if (!data.isFree && data.price <= 0 && !alreadyEnded) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["price"],
        message: "Enter a fee, or mark the session as free.",
      });
    }
    if (data.registrationDeadline) {
      const deadline = new Date(data.registrationDeadline);
      if (Number.isNaN(deadline.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["registrationDeadline"],
          message: "Please enter a valid registration deadline.",
        });
      } else if (deadline.getTime() > start.getTime()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["registrationDeadline"],
          message: "The registration deadline cannot be after the session starts.",
        });
      }
    }
  });

export type SessionFormValues = z.input<typeof sessionSchema>;
export type ValidatedSession = z.output<typeof sessionSchema>;

export const adminLoginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Please enter your password."),
});

/** Flatten a ZodError into { field: message } for form display. */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
