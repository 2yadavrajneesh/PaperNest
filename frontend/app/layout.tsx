import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "PaperNest — A simpler PDF workspace",
  description: "Merge, convert, compress, organize, and edit PDFs with PaperNest's practical online tools.",
  applicationName: "PaperNest",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body><SiteHeader />{children}</body></html>;
}
