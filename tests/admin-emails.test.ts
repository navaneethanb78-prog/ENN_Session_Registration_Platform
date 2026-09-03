import { afterEach, describe, expect, it } from "vitest";
import { allowedEmails } from "@/lib/auth/admin";

/**
 * ADMIN_EMAILS is typed into a hosting dashboard, where a pasted .env line can
 * keep its surrounding quotes. A quoted value silently matched nothing, which
 * locked every administrator out with a message that gave no clue why.
 */
describe("allowedEmails", () => {
  const original = process.env.ADMIN_EMAILS;
  afterEach(() => {
    process.env.ADMIN_EMAILS = original;
  });

  const set = (v: string | undefined) => {
    if (v === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = v;
  };

  it("reads a plain address", () => {
    set("admin@ennconsultancy.com");
    expect(allowedEmails()).toEqual(["admin@ennconsultancy.com"]);
  });

  it("tolerates a value wrapped in double quotes", () => {
    set('"admin@ennconsultancy.com"');
    expect(allowedEmails()).toEqual(["admin@ennconsultancy.com"]);
  });

  it("tolerates single quotes and whitespace", () => {
    set("  'Admin@ENNConsultancy.com'  ");
    expect(allowedEmails()).toEqual(["admin@ennconsultancy.com"]);
  });

  it("splits a list and strips each entry", () => {
    set('"a@x.com", \'b@y.com\' , c@z.com');
    expect(allowedEmails()).toEqual(["a@x.com", "b@y.com", "c@z.com"]);
  });

  it("returns nothing when unset", () => {
    set(undefined);
    const previous = process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_EMAIL;
    expect(allowedEmails()).toEqual([]);
    if (previous !== undefined) process.env.ADMIN_EMAIL = previous;
  });
});
