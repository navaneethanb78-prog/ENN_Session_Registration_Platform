/**
 * Post-deployment verification.
 *
 * Exercises the live HTTP surface of a running deployment: session listing,
 * registration, every rejection path, and — when administrator credentials are
 * supplied — the admin API and sign-out behaviour.
 *
 *   node scripts/verify-deployment.mjs
 *   BASE_URL=https://your-app.vercel.app node scripts/verify-deployment.mjs
 *
 * The registration checks create real records, so run this against a staging or
 * preview deployment, or immediately after seeding.
 *
 * Optional environment variables:
 *   BASE_URL         default http://localhost:3000
 *   ADMIN_EMAIL      enables the administrator checks
 *   ADMIN_PASSWORD
 */

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const results = [];

function check(name, pass, detail) {
  results.push({ name, pass });
  console.log(`${pass ? "  PASS" : "  FAIL"}  ${String(name).padEnd(52)} ${detail ?? ""}`);
}

function section(title) {
  console.log(`\n${title}`);
}

let cookie = "";
async function call(path, options = {}) {
  const res = await fetch(BASE + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
      ...options.headers,
    },
    redirect: "manual",
  });
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body, headers: res.headers };
}

const stamp = Date.now();
const applicant = (n, over = {}) => ({
  fullName: `Verification ${n}`,
  companyName: "Deployment Check Ltd",
  designation: "Quality Manager",
  phoneNumber: "9876543210",
  whatsappAvailable: true,
  email: `verify.${n}.${stamp}@example.com`,
  ...over,
});

console.log(`\nVerifying ${BASE}`);

// --- Public surface ----------------------------------------------------------
section("Public pages");
for (const [path, label] of [
  ["/", "home page responds"],
  ["/register", "registration page responds"],
  ["/register/success", "success page responds"],
  ["/admin/login", "admin login page responds"],
]) {
  const res = await fetch(BASE + path);
  check(label, res.ok, `HTTP ${res.status}`);
}

section("Session listing");
const listing = await call("/api/sessions");
const sessions = listing.body?.sessions ?? [];
check(
  "session API responds",
  listing.status === 200 && Array.isArray(sessions),
  `${sessions.length} sessions`,
);
check(
  "no registrant data is exposed publicly",
  !JSON.stringify(sessions).match(/email|phoneNumber|fullName/i),
);

const open = sessions.find((s) => s.canRegister && s.remainingSeats > 1);
const full = sessions.find((s) => s.status === "FULL");
const completed = sessions.find((s) => s.status === "COMPLETED");
const cancelled = sessions.find((s) => s.status === "CANCELLED");

// --- Registration ------------------------------------------------------------
if (!open) {
  check("an open session is available to test registration", false, "none found — seed data first");
} else {
  section("Registration");
  const before = open.remainingSeats;
  const created = await call("/api/register", {
    method: "POST",
    body: JSON.stringify({ ...applicant(1), sessionId: open.id }),
  });
  const reference = created.body?.registration?.registrationReference ?? "";
  check("valid registration succeeds", created.status === 201 && /^ENN-\d{4}-\d{5}$/.test(reference), reference);
  check("phone normalised to E.164", Boolean(created.body?.registration?.phoneNumber?.startsWith("+")));
  check("a seat was consumed", created.body?.session?.remainingSeats === before - 1);

  const duplicate = await call("/api/register", {
    method: "POST",
    body: JSON.stringify({ ...applicant(1), sessionId: open.id }),
  });
  check("duplicate registration refused", duplicate.body?.code === "DUPLICATE_REGISTRATION");

  section("Validation is enforced server-side");
  const cases = [
    ["invalid email refused", { email: "abc@gmail" }, "email"],
    ["invalid phone refused", { phoneNumber: "12345" }, "phoneNumber"],
    ["missing name refused", { fullName: "" }, "fullName"],
    ["WhatsApp number required when not on WhatsApp", { whatsappAvailable: false }, "whatsappNumber"],
  ];
  for (const [label, over, field] of cases) {
    const r = await call("/api/register", {
      method: "POST",
      body: JSON.stringify({ ...applicant(Math.random()), ...over, sessionId: open.id }),
    });
    check(label, r.body?.code === "VALIDATION_ERROR" && Boolean(r.body?.fieldErrors?.[field]));
  }

  section("Unavailable sessions refuse registration");
  const unavailable = [
    ["full session refused", full, "SESSION_FULL"],
    ["completed session refused", completed, "SESSION_COMPLETED"],
    ["cancelled session refused", cancelled, "SESSION_CANCELLED"],
  ];
  for (const [label, session, expected] of unavailable) {
    if (!session) {
      console.log(`  SKIP  ${String(label).padEnd(52)} no such session in this deployment`);
      continue;
    }
    const r = await call("/api/register", {
      method: "POST",
      body: JSON.stringify({ ...applicant(Math.random()), sessionId: session.id }),
    });
    check(label, r.body?.code === expected, r.body?.message);
  }

  const unknown = await call("/api/register", {
    method: "POST",
    body: JSON.stringify({ ...applicant(Math.random()), sessionId: "no-such-session" }),
  });
  check("unknown session refused", unknown.body?.code === "SESSION_NOT_FOUND");
  check(
    "no raw database detail leaks in errors",
    !JSON.stringify(unknown.body).match(/firestore|firebase|stack|ENOENT/i),
  );
}

// --- Administrator -----------------------------------------------------------
section("Administrator access control");
for (const path of [
  "/api/admin/sessions",
  "/api/admin/registrations",
  "/api/admin/registrations/export",
]) {
  const r = await call(path);
  check(`${path} closed when signed out`, r.status === 401, `HTTP ${r.status}`);
}
const adminPage = await fetch(BASE + "/admin", { redirect: "manual" });
check(
  "/admin redirects to sign-in when signed out",
  adminPage.status === 307 || adminPage.status === 302,
  `HTTP ${adminPage.status}`,
);

if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
  section("Administrator session");
  const bad = await call("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({
      email: process.env.ADMIN_EMAIL,
      password: "definitely-not-the-password",
    }),
  });
  check("wrong password refused", bad.status === 401);
  cookie = "";

  const login = await call("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    }),
  });
  check("administrator can sign in", login.status === 200, login.body?.email);

  const adminSessions = await call("/api/admin/sessions");
  check("administrator can read sessions", adminSessions.status === 200);

  const adminRegs = await call("/api/admin/registrations");
  check(
    "administrator can read registrations",
    adminRegs.status === 200,
    `${adminRegs.body?.registrations?.length} records`,
  );

  const csv = await call("/api/admin/registrations/export");
  check("CSV export works", csv.status === 200 && String(csv.body).startsWith('"Reference"'));

  await call("/api/admin/logout", { method: "POST" });
  const afterLogout = await call("/api/admin/registrations");
  check("sign-out closes admin access again", afterLogout.status === 401);
} else {
  console.log("\n  Set ADMIN_EMAIL and ADMIN_PASSWORD to include the administrator checks.");
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed\n`);
if (failed.length > 0) {
  for (const f of failed) console.log(`  failed: ${f.name}`);
  process.exit(1);
}
