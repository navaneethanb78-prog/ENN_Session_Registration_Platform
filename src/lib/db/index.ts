import { isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import { createLocalStore } from "./local";
import type { SessionStore } from "./types";

/**
 * Adapter selection.
 *
 * Firestore is used whenever Firebase Admin credentials are present — that is
 * the production path, and it is what Vercel will run. The local file-backed
 * store exists so the application is fully functional (and testable, including
 * its concurrency behaviour) before a Firebase project has been provisioned.
 *
 * Both implement the same SessionStore port, so no business logic branches on
 * which one is active.
 */

let store: SessionStore | null = null;

export async function getStore(): Promise<SessionStore> {
  if (store) return store;

  if (isFirebaseAdminConfigured()) {
    const { createFirestoreStore } = await import("./firestore");
    store = createFirestoreStore();
  } else {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[enn] Firebase Admin credentials are not configured; falling back to the local " +
          "development store. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and " +
          "FIREBASE_PRIVATE_KEY for production use.",
      );
    }
    store = createLocalStore();
  }
  return store;
}

/** Which backend is active — surfaced in the admin dashboard. */
export async function activeStoreName(): Promise<"firestore" | "local"> {
  return (await getStore()).name;
}

/** Test support: force a specific store instance. */
export function __setStore(next: SessionStore | null) {
  store = next;
}

export type { SessionStore };
