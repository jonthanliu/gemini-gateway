import { Toaster } from "@/components/ui/sonner";
import { i18n } from "@/i18n-config";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import "../globals.css";

export async function generateStaticParams() {
  return i18n.locales.map((locale) => ({ lang: locale }));
}

export const metadata: Metadata = {
  title: "Gemini Gateway - High-Performance AI Gateway",
  description:
    "A Next.js implementation of the Gemini Gateway project, serving as an intelligent AI gateway.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
      {children}
      <Toaster />
    </div>
  );
}
