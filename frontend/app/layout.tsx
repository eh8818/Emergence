import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Emergence | Demo", description: "Canadian medication evidence and population-context research demonstration" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
