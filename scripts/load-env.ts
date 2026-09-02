/**
 * Load .env.local (and .env) exactly the way Next.js does, so command-line
 * scripts talk to the same database the running application does.
 *
 * Without this, a script run through tsx sees none of the Firebase Admin
 * variables and silently falls back to the local development store — writing
 * to a different database than the app reads from.
 *
 * Import this first, before anything that reads process.env.
 */
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

export function activeStoreLabel(): string {
  return process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
    ? `Firestore (project: ${process.env.FIREBASE_PROJECT_ID})`
    : "local development store";
}
