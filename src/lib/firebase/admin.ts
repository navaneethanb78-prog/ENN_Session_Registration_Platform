import type { App } from "firebase-admin/app";
import type { Firestore } from "firebase-admin/firestore";

/**
 * Firebase Admin SDK bootstrap. Server-only: these credentials must never reach
 * the browser. On Vercel they come from encrypted environment variables.
 */

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
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
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
