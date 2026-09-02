import { describe, expect, it } from "vitest";
import { isValidEmail, normaliseEmail } from "@/lib/email";
import { normalisePhone, formatPhoneForDisplay } from "@/lib/phone";
import { registrationSchema, sessionSchema } from "@/lib/validation/schemas";

const validBase = {
  sessionId: "s1",
  fullName: "John Doe",
  companyName: "ABC Industries",
  designation: "Quality Manager",
  phoneNumber: "9876543210",
  whatsappAvailable: true,
  email: "john@example.com",
};

describe("email validation", () => {
  it("rejects the malformed addresses called out in the spec", () => {
    for (const bad of ["abc", "abc@", "abc@gmail", "abc@.com", "", "a b@c.com", "a@@b.com"]) {
      expect(isValidEmail(bad), bad).toBe(false);
    }
  });

  it("accepts well-formed addresses", () => {
    for (const good of ["person@example.com", "a.b+tag@sub.domain.co.in", "x@y.io"]) {
      expect(isValidEmail(good), good).toBe(true);
    }
  });

  it("normalises to lower case", () => {
    expect(normaliseEmail("  John@Example.COM ")).toBe("john@example.com");
  });
});

describe("phone normalisation", () => {
  it("normalises Indian mobile formats to E.164", () => {
    for (const input of ["9876543210", "+91 98765 43210", "098765-43210", "919876543210"]) {
      const r = normalisePhone(input);
      expect(r.ok, input).toBe(true);
      expect(r.value, input).toBe("+919876543210");
    }
  });

  it("rejects invalid numbers", () => {
    for (const bad of ["12345", "1234567890", "abcdefghij", "", "98765432101234567"]) {
      expect(normalisePhone(bad).ok, bad).toBe(false);
    }
  });

  it("accepts explicit international numbers", () => {
    const r = normalisePhone("+14155552671");
    expect(r.ok).toBe(true);
    expect(r.value).toBe("+14155552671");
  });

  it("formats for display", () => {
    expect(formatPhoneForDisplay("+919876543210")).toBe("+91 98765 43210");
  });
});

describe("registration schema", () => {
  it("accepts a valid registration", () => {
    const r = registrationSchema.safeParse(validBase);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.phoneNumber).toBe("+919876543210");
      // WhatsApp available: the primary number is reused.
      expect(r.data.whatsappNumber).toBe("+919876543210");
    }
  });

  it("rejects an invalid email", () => {
    const r = registrationSchema.safeParse({ ...validBase, email: "abc@gmail" });
    expect(r.success).toBe(false);
  });

  it("rejects an invalid phone", () => {
    const r = registrationSchema.safeParse({ ...validBase, phoneNumber: "12345" });
    expect(r.success).toBe(false);
  });

  it("requires a WhatsApp number when WhatsApp is not available on the primary number", () => {
    const r = registrationSchema.safeParse({ ...validBase, whatsappAvailable: false });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("whatsappNumber"))).toBe(true);
    }
  });

  it("accepts and normalises a separate WhatsApp number", () => {
    const r = registrationSchema.safeParse({
      ...validBase,
      whatsappAvailable: false,
      whatsappNumber: "08123456789",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.whatsappNumber).toBe("+918123456789");
  });

  it("rejects empty required fields", () => {
    for (const field of ["fullName", "companyName", "designation", "sessionId"]) {
      const r = registrationSchema.safeParse({ ...validBase, [field]: "" });
      expect(r.success, field).toBe(false);
    }
  });
});

describe("session schema", () => {
  const base = {
    sessionName: "ISO 9001 Awareness",
    topic: "Quality Management",
    description: "",
    date: "2026-09-15",
    startTime: "10:00",
    endTime: "12:00",
    timezone: "Asia/Kolkata",
    location: "Online",
    mode: "ONLINE" as const,
    maximumSeats: 30,
    isFree: false,
    price: 4500,
    registrationDeadline: null,
    isActive: true,
  };

  it("accepts a valid session", () => {
    expect(sessionSchema.safeParse(base).success).toBe(true);
  });

  it("rejects an end time at or before the start time", () => {
    expect(sessionSchema.safeParse({ ...base, endTime: "10:00" }).success).toBe(false);
    expect(sessionSchema.safeParse({ ...base, endTime: "09:00" }).success).toBe(false);
  });

  it("rejects a non-positive capacity", () => {
    expect(sessionSchema.safeParse({ ...base, maximumSeats: 0 }).success).toBe(false);
    expect(sessionSchema.safeParse({ ...base, maximumSeats: -5 }).success).toBe(false);
    expect(sessionSchema.safeParse({ ...base, maximumSeats: 2.5 }).success).toBe(false);
  });

  it("rejects a paid session with no fee", () => {
    const r = sessionSchema.safeParse({ ...base, isFree: false, price: 0 });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("price"))).toBe(true);
    }
  });

  it("accepts a free session with no fee", () => {
    const r = sessionSchema.safeParse({ ...base, isFree: true, price: 0 });
    expect(r.success).toBe(true);
  });

  it("rejects a negative fee", () => {
    expect(sessionSchema.safeParse({ ...base, price: -100 }).success).toBe(false);
  });

  it("rejects a registration deadline after the session start", () => {
    const r = sessionSchema.safeParse({
      ...base,
      registrationDeadline: "2026-09-16T00:00:00.000Z",
    });
    expect(r.success).toBe(false);
  });

  it("accepts a registration deadline before the session start", () => {
    const r = sessionSchema.safeParse({
      ...base,
      registrationDeadline: "2026-09-14T00:00:00.000Z",
    });
    expect(r.success).toBe(true);
  });
});
