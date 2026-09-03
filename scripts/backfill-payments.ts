/**
 * Backfill payment fields on registrations written before those fields existed,
 * and correct any whose status contradicts the session they belong to.
 *
 *   npm run backfill:payments
 *   npm run backfill:payments -- --apply
 *
 * A registration on a free session can never owe anything, so it is set to
 * NOT_REQUIRED regardless of what is stored.
 */
import { activeStoreLabel } from "./load-env";
import { getDb, isFirebaseAdminConfigured } from "../src/lib/firebase/admin";
import type { Registration, TrainingSession } from "../src/lib/db/types";

const APPLY = process.argv.includes("--apply");

async function main() {
  if (!isFirebaseAdminConfigured()) {
    console.error("\n  No Firebase Admin credentials; nothing to back-fill.\n");
    process.exit(1);
  }
  console.log(`\n  Target: ${activeStoreLabel()}`);
  console.log(`  Mode:   ${APPLY ? "APPLY" : "dry run"}\n`);

  const db = await getDb();
  const [regSnap, sessionSnap] = await Promise.all([
    db.collection("registrations").get(),
    db.collection("sessions").get(),
  ]);

  const sessions = new Map(
    sessionSnap.docs.map((d) => [d.id, d.data() as TrainingSession]),
  );

  let changed = 0;
  for (const doc of regSnap.docs) {
    const r = doc.data() as Registration;
    const session = sessions.get(r.sessionId);
    const free = session?.isFree !== false;

    const wanted = {
      paymentStatus: free ? "NOT_REQUIRED" : (r.paymentStatus ?? "PENDING"),
      paymentReference: free ? "" : (r.paymentReference ?? ""),
      amountDue: free ? 0 : (typeof r.amountDue === "number" ? r.amountDue : (session?.price ?? 0)),
    };

    const differs =
      r.paymentStatus !== wanted.paymentStatus ||
      r.paymentReference !== wanted.paymentReference ||
      r.amountDue !== wanted.amountDue;
    if (!differs) continue;

    console.log(
      `  ${r.registrationReference}  ${String(r.fullName).padEnd(18)} ` +
        `${String(r.paymentStatus)} -> ${wanted.paymentStatus}, due ${String(r.amountDue)} -> ${wanted.amountDue}`,
    );
    if (APPLY) await doc.ref.update({ ...wanted, updatedAt: new Date().toISOString() });
    changed++;
  }

  if (changed === 0) console.log("  Nothing to change.\n");
  else if (APPLY) console.log(`\n  Updated ${changed} registration(s).\n`);
  else console.log(`\n  ${changed} would change. Re-run with --apply.\n`);
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
