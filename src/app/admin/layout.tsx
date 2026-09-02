import type { Metadata } from "next";

/** The administration area is never indexed by search engines. */
export const metadata: Metadata = {
  title: { default: "Administration", template: "%s | ENN Admin" },
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
