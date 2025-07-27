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

// A placeholder for the header component, to be implemented later.
function Header() {
  return (
    <header className="bg-gray-800 text-white p-4">
      <h1 className="text-xl">Admin Dashboard V2</h1>
    </header>
  );
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Critical configuration check.
  // If the master token is not set, the application cannot run securely.
  if (!process.env.AUTH_TOKEN) {
    throw new Error(
      "FATAL: AUTH_TOKEN is not configured. The application cannot start securely."
    );
  }

  // 2. Check user authentication status.
  const isLoggedIn = await checkAuthState();

  // 3. Conditionally render the layout.
  // If the user is logged in, provide the full dashboard layout with a header.
  // Otherwise, render the children directly, which will be the login page.
  return (
    <div>
      {isLoggedIn ? (
        <>
          <Header />
          <main className="p-4">{children}</main>
        </>
      ) : (
        <>{children}</>
      )}
    </div>
  );
}
