/**
 * Firebase client SDK, used only for administrator sign-in.
 *
 * These NEXT_PUBLIC_ values are the public web configuration; they are safe in
 * the browser. Access is governed by Firestore security rules and by
 * server-side verification of the resulting ID token — never by hiding this key.
 */
import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function app(): FirebaseApp {
  const existing = getApps();
  return existing[0] ?? initializeApp(config);
}

/** Sign in and return an ID token for the server to verify. */
export async function signInForAdmin(email: string, password: string): Promise<string> {
  const credential = await signInWithEmailAndPassword(getAuth(app()), email, password);
  return credential.user.getIdToken();
}
