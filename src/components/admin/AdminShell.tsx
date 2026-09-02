"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { Logo } from "@/components/brand/Logo";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/sessions", label: "Sessions" },
  { href: "/admin/registrations", label: "Registrations" },
  { href: "/admin/requests", label: "On-site requests" },
];

export function AdminShell({
  email,
  store,
  children,
}: {
  email: string;
  store: "firestore" | "local";
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh flex-col bg-ink-50/40">
      <header className="border-b border-ink-200/70 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="rounded-lg">
              <Logo tagline={false} />
            </Link>
            <span className="hidden rounded-md bg-ink-100 px-2 py-0.5 text-[0.6875rem] font-semibold tracking-wide text-ink-500 uppercase sm:inline">
              Administration
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-[0.8125rem] text-ink-500 sm:inline">{email}</span>
            <button
              type="button"
              onClick={signOut}
              className="rounded-lg px-3 py-1.5 text-[0.8125rem] font-medium text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-900"
            >
              Sign out
            </button>
          </div>
        </div>

        <nav aria-label="Administration" className="mx-auto max-w-7xl px-4 sm:px-6">
          <ul className="-mb-px flex list-none gap-1 overflow-x-auto">
            {NAV.map((item) => {
              const active =
                item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={clsx(
                      "inline-block border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                      active
                        ? "border-brand-700 text-brand-900"
                        : "border-transparent text-ink-500 hover:border-ink-300 hover:text-ink-800",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      {store === "local" && (
        <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-[0.8125rem] text-amber-900 sm:px-6">
          Running on the local development store. Configure Firebase Admin credentials to use
          Firestore.
        </p>
      )}

      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
