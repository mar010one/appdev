import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "App Manager Pro",
  description: "Ultimate dashboard for managing developer accounts and apps.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
