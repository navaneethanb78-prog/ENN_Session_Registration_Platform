/**
 * Import the completed ISO 9001:2026 Transition Awareness session and its
 * registrants, as captured by the original Google Form.
 *
 *   npm run import:transition
 *
 * Runs against whichever store is active — the local development store, or
 * Firestore once the Admin credentials are configured. Safe to re-run: it
 * removes any previous copy of this session first.
 */
import { activeStoreLabel } from "./load-env";
import { createLocalStore } from "../src/lib/db/local";
import { isFirebaseAdminConfigured } from "../src/lib/firebase/admin";
import { normalisePhone } from "../src/lib/phone";
import { isValidEmail, normaliseEmail } from "../src/lib/email";
import { zonedDateTimeToUtc } from "../src/lib/time";
import type { CreateSessionInput, ImportRegistrationRow } from "../src/lib/db/types";

const TIMEZONE = "Asia/Kolkata";
const SESSION_DATE = "2026-08-29";

const SESSION: CreateSessionInput = {
  sessionName:
    "ENN's Two-Hour ISO 9001:2026 Transition Awareness & Readiness Session",
  topic: "ISO 9001:2026 Transition — Awareness & Readiness",
  description:
    "A two-hour briefing on the ISO 9001:2026 transition: what has changed from the 2015 edition, the revised clause structure, the transition timeline and certification deadlines, and a practical readiness assessment for existing certified organisations.",
  date: SESSION_DATE,
  startTime: "10:00",
  endTime: "12:00",
  timezone: TIMEZONE,
  location: "Coimbatore — ENN Consultancy",
  mode: "IN_PERSON",
  maximumSeats: 25,
  isFree: true,
  price: 0,
  registrationDeadline: null,
  isActive: true,
  status: "OPEN",
};

/**
 * Registrants exactly as submitted. Original form timestamps are preserved.
 *
 * The source form did not ask about WhatsApp, so `whatsappAvailable` is
 * recorded as the primary number with a note on each record, rather than
 * inventing an answer.
 */
const ROWS: {
  timestamp: string;
  name: string;
  company: string;
  designation: string;
  phone: string;
  email: string;
}[] = [
  ["8/21/2026 16:21:15", "Mari.E", "Geco Special Machiners", "QA Engineer", "9443875650", "docs@gecospl.com"],
  ["8/24/2026 13:02:42", "Ramya S", "Propel Industries Private Limited", "Quality Engineer", "9003719407", "Ramyaspurthi14@gmail.com"],
  ["8/24/2026 15:43:24", "Sreevidhya, A", "SchuF Speciality Valves India Private Limited", "MR & Sr. QA Manager", "09786752225", "asreevidhya@schuf-india.com"],
  ["8/24/2026 16:36:20", "Kathirvel", "Texmo Industries", "Manager", "95143 86064", "Kathirvel.ponnuraj@taropumps.com"],
  ["8/24/2026 17:37:44", "V E Hemalathaa", "Barani Hydraulics India Private Limited Unit 2", "Senior Manager - Group MR", "9080393493", "qmsunit2@bhipl.co.in"],
  ["8/24/2026 17:42:12", "M. SenthilMani", "Barani Hydraulics India Private Limited Unit I", "General Manager", "9894025908", "m.senthilmani@bhipl.in"],
  ["8/24/2026 17:45:02", "G. Marimuthu", "Barani Ferrocast Private Limited", "Assistant Manager - Quality", "9488170848", "qualityferro@barani.in"],
  ["8/24/2026 20:40:52", "M. Premkumar", "Propel Industries", "Assistant General Manager", "95009 30636", "premkumar@propelind.com"],
  ["8/24/2026 20:44:34", "Dinesh", "Propel Industries", "Assistant General Manager", "90435 18855", "dinesh.hse@propelind.com"],
  ["8/25/2026 8:57:14", "C Saravanakumar", "Bull Agro Implements", "Manager - QA", "9965311211", "quality1@bullagro.com"],
  ["8/25/2026 12:15:22", "Harish", "Krishna Iron and Steel Company", "Digital Marketing & Quality Management", "9087069777", "admin@kisco.co.in"],
  ["8/25/2026 12:20:05", "Eniyavaan J", "Bannari Amman Sugars Limited", "Process Chemist", "7305679878", "eniyavaannaveen666@gmail.com"],
  ["8/25/2026 12:22:13", "Loguprasath. N", "Bannari Amman Sugars Limited", "Quality Assurance", "9047283836", "logumicro836@gmail.com"],
  ["8/25/2026 16:02:40", "Mubarak Ali A", "Amex Alloys Pvt Ltd", "Engineer", "8807388803", "Mup"],
  ["8/25/2026 16:15:18", "S. Karthikeyan", "AKG India Private Limited", "Senior Manager Quality Assurance", "9585591351", "karthikeyan.sukumaran@akg-india.in"],
  ["8/28/2026 11:30:41", "D. Sriprakash", "Suguna Industries", "Quality Assurance / MR", "9244424980", "suguaal@gmail.com"],
  ["8/28/2026 11:39:42", "T. Rajalakshmi", "Orange Sorting Machines India Pvt Ltd", "Manager Systems and Standards", "9600819166", "t.rajalakshmi@orangesorter.com"],
  ["8/28/2026 14:06:13", "Sivagnanam R", "Archana Industries", "Production Manager & MR", "93448 50575", "archana. kalapaty@gmail.com"],
  ["8/28/2026 14:10:00", "Sekar S", "Archana Industries", "QC Manager", "9788110990", "archana. kalapaty@gmail.com"],
  ["8/28/2026 14:14:48", "Rajesh S", "Flow Link Systems Private Limited", "MR", "9789789605", "rajeshsankaran1982@gmail.com"],
  ["8/28/2026 17:15:30", "Deepanraj", "Lakshmi Electrical Drives Limited", "Senior Engineer - QAD", "9629722844", "iqa@ledl.in"],
  ["8/28/2026 17:36:47", "Mohan. D", "Sieger Spintech Equipment", "Senior Engineer", "09943952882", "senthil.g@siegerglobal.net"],
  ["8/28/2026 17:51:49", "Muniyappan. T", "Park Layer Pvt Ltd", "Head - QMS", "7094458408", "mr@parklayer.com"],
  ["8/28/2026 18:13:05", "Velusamy P", "Velan Valves India Private Limited", "Manager - Quality", "9944473140", "velusamy.palanisamy@velan.com"],
].map(([timestamp, name, company, designation, phone, email]) => ({
  timestamp: timestamp as string,
  name: name as string,
  company: company as string,
  designation: designation as string,
  phone: phone as string,
  email: email as string,
}));

/** "8/21/2026 16:21:15" in IST -> absolute UTC instant. */
function parseFormTimestamp(value: string): string {
  const [datePart, timePart = "00:00:00"] = value.split(" ");
  const [month, day, year] = (datePart ?? "").split("/").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const hhmm = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  return zonedDateTimeToUtc(iso, hhmm, TIMEZONE).toISOString();
}

async function main() {
  console.log(`
  Target: ${activeStoreLabel()}`);

  const store = isFirebaseAdminConfigured()
    ? (await import("../src/lib/db/firestore")).createFirestoreStore()
    : createLocalStore();

  // Re-runnable: drop any previous copy of this session and its registrations.
  const existing = await store.listSessions();
  for (const s of existing) {
    if (s.sessionName === SESSION.sessionName) {
      await store.deleteSession(s.id);
      console.log("  Removed an earlier copy of this session.");
    }
  }

  const session = await store.createSession(SESSION);

  const warnings: string[] = [];
  const seenEmails = new Map<string, string>();

  const rows: ImportRegistrationRow[] = ROWS.map((row) => {
    // Emails: normalise case and strip stray internal spaces, which are a
    // transcription artefact rather than part of the address.
    const cleanedEmail = normaliseEmail(row.email).replace(/\s+/g, "");
    if (cleanedEmail !== normaliseEmail(row.email)) {
      warnings.push(`${row.name}: removed a space from the email -> ${cleanedEmail}`);
    }
    if (!isValidEmail(cleanedEmail)) {
      warnings.push(
        `${row.name} (${row.company}): email "${row.email}" is not a valid address; ` +
          "imported verbatim so the record is not lost — please obtain the correct address.",
      );
    }
    const previous = seenEmails.get(cleanedEmail);
    if (previous) {
      warnings.push(
        `${row.name} shares the email ${cleanedEmail} with ${previous}; both records kept.`,
      );
    } else {
      seenEmails.set(cleanedEmail, row.name);
    }

    const phone = normalisePhone(row.phone);
    if (!phone.ok) warnings.push(`${row.name}: phone "${row.phone}" could not be normalised.`);
    const phoneNumber = phone.ok ? phone.value : row.phone.replace(/\s+/g, "");

    return {
      fullName: row.name,
      companyName: row.company,
      designation: row.designation,
      phoneNumber,
      // The source form did not capture WhatsApp availability.
      whatsappAvailable: true,
      whatsappNumber: phoneNumber,
      email: cleanedEmail,
      registeredAt: parseFormTimestamp(row.timestamp),
      notes: "Imported from the original registration form. WhatsApp availability not captured.",
    };
  });

  const created = await store.importRegistrations(session.id, rows);
  const stored = await store.getSession(session.id);

  console.log(`\n  ${SESSION.sessionName}`);
  console.log(`  ${SESSION.date}  ${SESSION.startTime}-${SESSION.endTime} IST  ${SESSION.location}`);
  console.log(
    `  Imported ${created.length} registrations into the "${store.name}" store — ` +
      `${stored?.registeredCount}/${stored?.maximumSeats} seats filled, ` +
      `${(stored?.maximumSeats ?? 0) - (stored?.registeredCount ?? 0)} remaining.`,
  );
  console.log(
    `  References ${created[0]?.registrationReference} – ${created[created.length - 1]?.registrationReference}\n`,
  );

  if (warnings.length > 0) {
    console.log("  Data notes:");
    for (const w of warnings) console.log(`    - ${w}`);
    console.log("");
  }
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
