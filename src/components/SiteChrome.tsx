import Link from "next/link";
import { BRAND } from "@/lib/config";
import { Logo } from "@/components/brand/Logo";

export function SiteHeader({ cta = true }: { cta?: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-ink-200/70 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="rounded-lg" aria-label={`${BRAND.name} home`}>
          <Logo />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
          <a
            href="/#programmes"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-100 hover:text-brand-900 sm:inline-block"
          >
            Programmes
          </a>
          <Link
            href="/request"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-100 hover:text-brand-900 sm:inline-block"
          >
            Request a programme
          </Link>
          {cta && (
            <Link
              href="/register"
              className="inline-flex h-10 items-center rounded-lg bg-brand-900 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-800"
            >
              Register
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-ink-200/70 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <Logo />
        </div>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
          <Link href="/" className="-my-2 rounded px-1 py-2 text-ink-500 transition-colors hover:text-brand-800">
            Home
          </Link>
          <a
            href="/#programmes"
            className="-my-2 rounded px-1 py-2 text-ink-500 transition-colors hover:text-brand-800"
          >
            Programmes
          </a>
          <Link
            href="/register"
            className="-my-2 rounded px-1 py-2 text-ink-500 transition-colors hover:text-brand-800"
          >
            Register
          </Link>
          <Link
            href="/request"
            className="-my-2 rounded px-1 py-2 text-ink-500 transition-colors hover:text-brand-800"
          >
            Request a programme
          </Link>

        </nav>
      </div>
      <div className="border-t border-ink-100">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-ink-400 sm:px-6">
          © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
