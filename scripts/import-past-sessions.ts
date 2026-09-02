/**
 * Import the historical delivery record from the training-programmes
 * spreadsheet as completed sessions.
 *
 *   npm run import:past            # dry run, prints what would be created
 *   npm run import:past -- --apply # write to the active store
 *
 * Re-runnable: an existing imported session with the same programme and date is
 * replaced rather than duplicated.
 *
 * Two deliberate choices about what is published:
 *
 *  - Client names are NOT written to any public field. The spreadsheet records
 *    which company each in-house programme was delivered for; publishing that
 *    list without checking could breach a confidentiality expectation, so the
 *    public record says only whether it was Open House or in-house.
 *  - Paid sessions are imported with no per-seat price. The recorded charge was
 *    for the whole engagement, not per attendee, so showing it as a fee would
 *    misrepresent what an attendee paid. The card shows "Paid".
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { activeStoreLabel } from "./load-env";
import { createLocalStore } from "../src/lib/db/local";
import { isFirebaseAdminConfigured } from "../src/lib/firebase/admin";
import { parseConductedOn } from "./lib/parse-conducted-on";
import type { CreateSessionInput } from "../src/lib/db/types";

const APPLY = process.argv.includes("--apply");
const TIMEZONE = "Asia/Kolkata";

interface Row {
  quarter: string;
  organisation: string;
  sector: string;
  wing: string;
  topic: string;
  conductedOn: string;
  conductedBy: string;
  participants: number;
  charges: number;
  mandays: number;
}

function isOpenHouse(row: Row): boolean {
  return /open house/i.test(row.organisation);
}

function buildSession(row: Row): CreateSessionInput | null {
  const parsed = parseConductedOn(row.conductedOn);
  if (!parsed) return null;

  const year = parsed.date.getUTCFullYear();
  if (year < 2015 || year > 2035) return null;

  const date = parsed.date.toISOString().slice(0, 10);
  const days = Math.max(1, Math.round(row.mandays || 1));
  const seats = Math.max(1, Math.round(row.participants || 1));
  const openHouse = isOpenHouse(row);

  const descriptionParts = [
    days > 1 ? `${days}-day programme.` : "One-day programme.",
    openHouse
      ? "Delivered as an Open House session at ENN Consultancy."
      : "Delivered in house at the client's premises.",
    row.conductedBy ? `Trainer: ${row.conductedBy}.` : "",
    `${seats} participants attended.`,
  ].filter(Boolean);

  return {
    sessionName: row.topic.trim(),
    topic: openHouse ? "Open House programme" : "In-house programme",
    description: descriptionParts.join(" "),
    date,
    // The spreadsheet does not record times; a standard training day is used.
    startTime: "09:30",
    endTime: "17:00",
    timezone: TIMEZONE,
    location: openHouse ? "ENN Consultancy, Coimbatore" : "Client site",
    mode: "IN_PERSON",
    maximumSeats: seats,
    // The programme ran and was attended, so it reads as fully taken.
    registeredCount: seats,
    // Charges were per engagement, not per seat, so no fee is published.
    isFree: (row.charges || 0) <= 0,
    price: 0,
    registrationDeadline: null,
    // Historical records are never open for registration.
    isActive: false,
    status: "OPEN",
  };
}

async function main() {
  const raw = readFileSync(join(process.cwd(), "data", "past-sessions.json"), "utf8");
  const rows = JSON.parse(raw) as Row[];

  const store = isFirebaseAdminConfigured()
    ? (await import("../src/lib/db/firestore")).createFirestoreStore()
    : createLocalStore();

  console.log(`\n  Target: ${activeStoreLabel()}`);
  console.log(`  Mode:   ${APPLY ? "APPLY - sessions will be written" : "dry run"}`);
  console.log(`  Source: ${rows.length} rows\n`);

  const planned: CreateSessionInput[] = [];
  const skipped: { row: Row; why: string }[] = [];

  for (const row of rows) {
    if (!row.topic?.trim()) {
      skipped.push({ row, why: "no programme name" });
      continue;
    }
    const session = buildSession(row);
    if (!session) {
      skipped.push({ row, why: `could not read the date "${row.conductedOn}"` });
      continue;
    }
    planned.push(session);
  }

  planned.sort((a, b) => a.date.localeCompare(b.date));

  const free = planned.filter((s) => s.isFree).length;
  const openHouse = planned.filter((s) => s.topic === "Open House programme").length;
  const attendees = planned.reduce((sum, s) => sum + s.maximumSeats, 0);
  const first = planned[0]?.date;
  const last = planned[planned.length - 1]?.date;

  console.log(`  ${planned.length} sessions ready`);
  console.log(`     ${first} to ${last}`);
  console.log(`     ${openHouse} Open House, ${planned.length - openHouse} in-house`);
  console.log(`     ${free} free, ${planned.length - free} paid`);
  console.log(`     ${attendees} participants in total\n`);

  if (skipped.length > 0) {
    console.log(`  ${skipped.length} row(s) skipped:`);
    for (const s of skipped) console.log(`     ${s.why} - "${s.row.topic}"`);
    console.log("");
  }

  console.log("  First five:");
  for (const s of planned.slice(0, 5)) {
    console.log(
      `     ${s.date}  ${s.isFree ? "free" : "paid"}  ${String(s.maximumSeats).padStart(3)} seats  ${s.sessionName}`,
    );
  }

  if (!APPLY) {
    console.log("\n  Dry run. Re-run with --apply to write these sessions.\n");
    return;
  }

  // Replace any previous import of the same programme on the same date, so the
  // script can be run again without creating duplicates.
  const existing = await store.listSessions();
  const key = (name: string, date: string) => `${name.toLowerCase()}|${date}`;
  const existingByKey = new Map(existing.map((s) => [key(s.sessionName, s.date), s]));

  let created = 0;
  let replaced = 0;
  for (const session of planned) {
    const previous = existingByKey.get(key(session.sessionName, session.date));
    if (previous) {
      await store.deleteSession(previous.id);
      replaced++;
    }
    await store.createSession(session);
    created++;
  }

  console.log(`\n  Wrote ${created} sessions (${replaced} replaced an earlier import).\n`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
