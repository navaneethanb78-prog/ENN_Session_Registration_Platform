import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { LinkButton } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="main" className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <p className="text-[0.6875rem] font-semibold tracking-[0.16em] text-brand-600 uppercase">
          Page not found
        </p>
        <h1 className="font-display mt-3 text-2xl font-semibold tracking-tight text-brand-950 sm:text-3xl">
          We couldn&rsquo;t find that page
        </h1>
        <p className="mt-2 max-w-md text-[0.9375rem] text-ink-500">
          The page you were looking for may have been moved, or the session may no longer be listed.
        </p>
        <LinkButton href="/#sessions" size="lg" className="mt-7">
          View available sessions
        </LinkButton>
      </main>
      <SiteFooter />
    </div>
  );
}
