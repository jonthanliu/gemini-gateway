import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

if (!process.env.AUTH_TOKEN) {
  throw new Error(
    "FATAL: AUTH_TOKEN is not configured. The application cannot start securely."
  );
}

export const metadata = {
  title: "Gemini Gateway",
  description: "A simple Gemini API key balancer.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
