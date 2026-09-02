/**
 * Seed the active data store with realistic development data.
 *
 *   npm run seed
 *
 * Targets whichever store is configured — Firestore when Firebase Admin
 * credentials are present in .env.local, otherwise the local development store.
 */
import { activeStoreLabel } from "./load-env";
import { buildSeedPlan } from "../src/lib/db/seed";
import { createLocalStore } from "../src/lib/db/local";
import { isFirebaseAdminConfigured } from "../src/lib/firebase/admin";

async function main() {
  const plan = buildSeedPlan(new Date());
  const usingFirestore = isFirebaseAdminConfigured();

  // Seeding CLEARS every collection before writing. Harmless for a local
  // scratch file; against a real Firestore project it would destroy live
  // registrations, so it has to be asked for explicitly.
  if (usingFirestore && !process.argv.includes("--force")) {
    console.error(
      [
        "",
        `  Refusing to seed ${activeStoreLabel()}.`,
        "",
        "  Seeding DELETES all sessions, registrations and counters before",
        "  writing demo data. If that is genuinely what you want, re-run with:",
        "",
        "      npm run seed -- --force",
        "",
        "  To load demo data locally instead, remove the FIREBASE_* admin",
        "  variables from .env.local.",
        "",
      ].join("\n"),
    );
    process.exit(1);
  }

  const store = usingFirestore
    ? (await import("../src/lib/db/firestore")).createFirestoreStore()
    : createLocalStore();

  await store.reset(plan.sessions, plan.counts);

  const sessions = await store.listSessions();
  console.log(`\n  Seeded ${sessions.length} sessions into ${activeStoreLabel()}.\n`);
  for (const s of sessions) {
    const remaining = s.maximumSeats - s.registeredCount;
    console.log(
      `   ${s.date}  ${s.sessionName.padEnd(44)} ${String(s.registeredCount).padStart(3)}/${String(
        s.maximumSeats,
      ).padEnd(3)}  ${remaining === 0 ? "FULL" : `${remaining} free`}${
        s.status === "CANCELLED" ? "  (cancelled)" : ""
      }`,
    );
  }
  console.log("");
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
