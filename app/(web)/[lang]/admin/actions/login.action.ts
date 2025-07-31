"use server";

import { cookies } from "next/headers";
import { getSettings } from "@/lib/config/settings";
import { signJwtForWebApp } from "@/lib/auth/web_auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type FormState = {
  success: boolean;
  message: string;
};

const AUTH_COOKIE_NAME = "auth_token";

export async function login(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const password = formData.get("password");

  if (!password || typeof password !== "string") {
    return { success: false, message: "Password is required." };
  }

  const { AUTH_TOKEN } = await getSettings();

  // Important: Use a secure comparison method in a real application
  if (password !== AUTH_TOKEN) {
    return { success: false, message: "Invalid password." };
  }

  // Password is correct, create a JWT and set it as a cookie.
  try {
    const token = signJwtForWebApp({ user: "admin" });
    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });
    
    // Revalidate the admin path to immediately reflect the logged-in state
    revalidatePath("/admin");
    
    // While revalidatePath should trigger a refresh, redirecting ensures
    // the user is moved to the correct page, especially after the initial login.
    // The layout/page will then handle showing the dashboard.
    // We don't return state here because the redirect will interrupt the response.
    redirect("/admin");
    
  } catch {
    return {
      success: false,
      message: "An error occurred during login. Please try again.",
    };
  }
}
