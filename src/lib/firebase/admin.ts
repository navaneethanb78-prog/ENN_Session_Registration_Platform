import type { App } from "firebase-admin/app";
import type { Firestore } from "firebase-admin/firestore";

/**
 * Firebase Admin SDK bootstrap. Server-only: these credentials must never reach
 * the browser. On Vercel they come from encrypted environment variables.
 */

/**
 * Read the service-account private key, tolerating how it arrives.
 *
 * The key is pasted by hand into a deployment dashboard and reliably picks up
 * one of a few artefacts on the way:
 *   - wrapping double or single quotes, carried over from the .env line
 *   - escaped newlines, which is how Vercel stores a multi-line value
 *   - leading or trailing whitespace
 *
 * Any of these previously produced an opaque runtime failure on every page that
 * touches the database, so they are normalised here, and a malformed key is
 * reported by name rather than surfacing as a generic error.
 */
function readPrivateKey(): string | undefined {
  const raw = process.env.FIREBASE_PRIVATE_KEY;
  if (!raw) return undefined;

  const key = raw
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replace(/\\n/g, "\n")
    .trim();

  if (!key.startsWith("-----BEGIN") || !key.endsWith("PRIVATE KEY-----")) {
    console.error(
      "[enn] FIREBASE_PRIVATE_KEY does not look like a PEM private key. It must " +
        "start with -----BEGIN PRIVATE KEY----- and end with -----END PRIVATE KEY-----. " +
        "Check for a truncated or re-wrapped paste.",
    );
  }
  return key;
}

let appPromise: Promise<App> | null = null;

export function isFirebaseAdminConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY,
  );
}

async function getApp(): Promise<App> {
  if (!appPromise) {
    appPromise = (async () => {
      const { getApps, initializeApp, cert } = await import("firebase-admin/app");
      const existing = getApps();
      if (existing.length > 0 && existing[0]) return existing[0];

      return initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: readPrivateKey(),
        }),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    })();
  }
  return appPromise;
}

export async function getDb(): Promise<Firestore> {
  const { getFirestore } = await import("firebase-admin/firestore");
  return getFirestore(await getApp());
}

export async function getAdminAuth() {
  const { getAuth } = await import("firebase-admin/auth");
  return getAuth(await getApp());
}
