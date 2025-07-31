// This is the root layout for the new (web) route group.
// It establishes the foundational client-side context for the new UI,
// including theme management and toast notifications, ensuring consistency
// with the deprecated application structure.
"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";

export default function WebRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
      <Toaster />
    </ThemeProvider>
  );
}
