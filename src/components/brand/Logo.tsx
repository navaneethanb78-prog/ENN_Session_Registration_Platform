import Image from "next/image";
import { BRAND } from "@/lib/config";

/**
 * The ENN Consultancy mark.
 *
 * Served from /public/enn-logo.svg so the artwork can be replaced without
 * touching any component — drop a new file at that path and every usage
 * updates. See README for swapping in the original raster asset.
 */
export function LogoMark({
  className = "h-9 w-9",
  size = 40,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <Image
      src="/enn-logo.svg"
      alt=""
      width={size}
      height={size}
      className={className}
      priority
      aria-hidden="true"
    />
  );
}

export function Logo({
  className = "",
  tagline = true,
  inverted = false,
}: {
  className?: string;
  tagline?: boolean;
  inverted?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span
          className={`font-display text-[1.0625rem] font-semibold tracking-tight ${
            inverted ? "text-white" : "text-brand-950"
          }`}
        >
          {BRAND.name}
        </span>
        {tagline && (
          <span
            className={`mt-1 text-[0.6875rem] font-medium tracking-[0.14em] uppercase ${
              inverted ? "text-brand-200" : "text-ink-400"
            }`}
          >
            {BRAND.tagline}
          </span>
        )}
      </span>
    </span>
  );
}
