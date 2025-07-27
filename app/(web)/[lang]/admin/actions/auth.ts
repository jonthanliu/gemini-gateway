// This file contains server actions related to user authentication for the WebApp.
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Handles the user login attempt.
 *
 * @param state - The previous state from the `useActionState` hook.
 * @param formData - The form data submitted by the user.
 * @returns An object with an error message on failure, or redirects on success.
 */
export async function login(
  state: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const submittedToken = (formData.get("token") as string) || "";
  const masterToken = process.env.AUTH_TOKEN;

  // 1. Validate the submitted token against the master token.
  if (!submittedToken || submittedToken !== masterToken) {
    return { error: "Invalid token. Please try again." };
  }

  // 2. On successful validation, create a session.
  // TODO: Replace this placeholder with JWT creation.
  // The token saved in the cookie should be a signed JWT, not the master token itself.
  const sessionToken = submittedToken; // Placeholder

  // 3. Set the secure, HttpOnly cookie.
  const cookieStore = await cookies();
  cookieStore.set("auth_token", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  // 4. Redirect to the admin page to complete the login cycle.
  redirect("./admin");
}
