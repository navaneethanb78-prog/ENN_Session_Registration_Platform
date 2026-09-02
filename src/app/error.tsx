"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

/** Route-level error boundary. Internal error detail is never shown to users. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[enn] route error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-brand-950">
        Something went wrong
      </h1>
      <p className="mt-2 text-[0.9375rem] text-ink-500">
        We couldn&rsquo;t load this page right now. Please try again in a moment.
      </p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
