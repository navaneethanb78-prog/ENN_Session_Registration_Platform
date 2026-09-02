"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Alert, Card } from "@/components/ui/Primitives";

export function LoginForm({ firebaseEnabled }: { firebaseEnabled: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      let idToken: string | undefined;

      // When Firebase Auth is configured, sign in client-side and hand the
      // resulting ID token to the server, which verifies it with the Admin SDK.
      if (firebaseEnabled) {
        try {
          const { signInForAdmin } = await import("@/lib/firebase/client");
          idToken = await signInForAdmin(email, password);
        } catch {
          setError("Incorrect email address or password.");
          setBusy(false);
          return;
        }
      }

      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, idToken }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message ?? "Incorrect email address or password.");
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setError("We couldn't sign you in right now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      id="main"
      className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-brand-50/70 to-transparent px-4 py-12"
    >
      <div className="w-full max-w-sm">
        <div className="mb-7 flex justify-center">
          <Logo />
        </div>

        <Card className="p-6 sm:p-7">
          <h1 className="font-display text-lg font-semibold tracking-tight text-brand-950">
            Administrator sign in
          </h1>
          <p className="mt-1 text-[0.8125rem] text-ink-500">
            This area manages sessions, capacity and registration records.
          </p>

          {error && (
            <Alert tone="error" className="mt-5">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
            <TextField
              label="Email address"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              label="Password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" size="lg" loading={busy} loadingText="Signing in…" fullWidth>
              Sign in
            </Button>
          </form>
        </Card>

        {!firebaseEnabled && (
          <p className="mt-5 text-center text-xs leading-relaxed text-ink-400">
            Firebase Authentication is not configured, so this deployment is using the
            environment-variable credentials described in the README.
          </p>
        )}
      </div>
    </main>
  );
}
