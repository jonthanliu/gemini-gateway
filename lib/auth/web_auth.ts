// This file contains authentication-related utility functions specifically for the WebApp.
// By separating this from `lib/auth/auth.ts`, we ensure that web UI authentication
// and API authentication can evolve independently without causing side effects.

import { cookies } from "next/headers";

/**
 * Checks the authentication state of the user for the WebApp.
 * It reads the auth_token cookie and validates it.
 *
 * TODO: Implement full JWT verification.
 * Currently, this is a placeholder that compares the cookie value directly
 * with the AUTH_TOKEN environment variable. This is insecure and should be updated.
 *
 * @returns {Promise<boolean>} A promise that resolves to true if the user is authenticated, false otherwise.
 */
export async function checkAuthState(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    return false;
  }

  // Placeholder logic for bootstrapping the UI.
  // Replace with JWT verification logic that uses `jose` or `jsonwebtoken`.
  return token === process.env.AUTH_TOKEN;
}
