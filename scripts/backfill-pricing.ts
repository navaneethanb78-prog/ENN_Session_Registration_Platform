/**
 * Backfill isFree / price onto sessions created before those fields existed.
 *
 *   npm run backfill:pricing            # report what would change
 *   npm run backfill:pricing -- --apply # write the changes
 *
 * Sessions with no recorded fee are marked free, which is the safe direction:
 * it can never cause someone to be charged for a session that was not priced.
 */
import "./load-env";
import { activeStoreLabel } from "./load-env";
import { getDb } from "../src/lib/firebase/admin";
import { isFirebaseAdminConfigured } from "../src/lib/firebase/admin";

const APPLY = process.argv.includes("--apply");

async function main() {
  if (!isFirebaseAdminConfigured()) {
    console.error("\n  This backfill targets Firestore, but no Firebase Admin credentials are set.\n");
    process.exit(1);
  }

  console.log(`\n  Target: ${activeStoreLabel()}`);
  console.log(`  Mode:   ${APPLY ? "APPLY - changes will be written" : "dry run"}\n`);

  const db = await getDb();
  const snap = await db.collection("sessions").get();

  let changed = 0;
  for (const doc of snap.docs) {
    const data = doc.data() as { sessionName?: string; isFree?: unknown; price?: unknown };
    const missingPrice = typeof data.price !== "number";
    const missingIsFree = typeof data.isFree !== "boolean";
    if (!missingPrice && !missingIsFree) continue;

    const price = typeof data.price === "number" ? data.price : 0;
    const isFree = typeof data.isFree === "boolean" ? data.isFree : price <= 0;

    console.log(`  ${data.sessionName ?? doc.id}`);
    console.log(`     isFree -> ${isFree}   price -> ${price}`);

    if (APPLY) await doc.ref.update({ isFree, price, updatedAt: new Date().toISOString() });
    changed++;
  }

  if (changed === 0) {
    console.log("  Every session already has pricing. Nothing to do.\n");
  } else if (APPLY) {
    console.log(`\n  Updated ${changed} session(s).\n`);
  } else {
    console.log(`\n  ${changed} session(s) would be updated. Re-run with --apply to write.\n`);
  }
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
