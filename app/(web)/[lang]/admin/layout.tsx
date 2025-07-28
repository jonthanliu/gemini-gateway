// This layout component serves as the authentication gatekeeper for the entire admin dashboard.
// It checks for the existence of the master AUTH_TOKEN to ensure the application is configured.
// It then verifies the user's authentication status using a server-side utility.
//
// Architectural Decision:
// Based on the authentication status, it conditionally renders the main layout structure,
// including a header for authenticated users. Unauthenticated users are passed through
// directly to the page component (which will render the LoginForm), providing a clean
// separation of concerns between layout and page-level content.

import { checkAuthState } from "@/lib/auth/web_auth";
import { Topbar } from "./components/Topbar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Critical configuration check.
  if (!process.env.AUTH_TOKEN) {
    throw new Error(
      "FATAL: AUTH_TOKEN is not configured. The application cannot start securely."
    );
  }

  // 2. Check user authentication status.
  const isLoggedIn = await checkAuthState();

  // 3. Conditionally render the layout.
  return (
    <div>
      {isLoggedIn ? (
        <div className="flex min-h-screen w-full flex-col">
          <Topbar />
          <main className="flex flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
            <div className="mx-auto grid w-full max-w-6xl items-start gap-6">
              <div className="grid gap-6">{children}</div>
            </div>
          </main>
        </div>
      ) : (
        <>{children}</>
      )}
    </div>
  );
}
