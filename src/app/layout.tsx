import type { Metadata, Viewport } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import { BRAND } from "@/lib/config";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const display = Source_Serif_4({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://enn-consultancy.vercel.app";
const TITLE = `${BRAND.name} | Awareness & Training Sessions`;
const DESCRIPTION =
  "Register for ENN Consultancy awareness and professional training sessions. Live seat availability for ISO 9001, ISO 14001, ISO 45001 and other management-system programmes.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: `%s | ${BRAND.name}` },
  description: DESCRIPTION,
  applicationName: BRAND.name,
  keywords: [
    "ENN Consultancy",
    "ISO training",
    "ISO 9001 awareness",
    "ISO 14001",
    "ISO 45001",
    "quality management training",
    "session registration",
  ],
  authors: [{ name: BRAND.name }],
  openGraph: {
    type: "website",
    siteName: BRAND.name,
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    // The admin area is excluded from indexing by its own route metadata.
  },
  icons: {
    icon: [{ url: "/enn-logo.svg", type: "image/svg+xml" }],
    apple: [{ url: "/enn-logo.svg" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#16314b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${inter.variable} ${display.variable}`}>
      {/*
        suppressHydrationWarning covers this element's own attributes only, one
        level deep — children are still fully hydration-checked. Browser
        extensions (Grammarly, password managers, dark-mode tools) inject
        attributes into <body> before React hydrates, which would otherwise be
        reported as a mismatch the app cannot control.
      */}
      <body className="min-h-dvh antialiased" suppressHydrationWarning>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-brand-900 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
