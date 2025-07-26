"use server";

import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import logger from "@/lib/logger";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function login(
  state: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const locale = await getLocale();
  const dictionary = await getDictionary(locale);
  const t = dictionary.loginForm;

  const submittedToken = (formData.get("token") as string) || "";

  if (submittedToken === "") {
    logger.warn("Login failed: Token was empty.");
    return { error: t.error.emptyToken };
  }

  const masterToken = process.env.AUTH_TOKEN;

  // Since we have a startup check, masterToken is guaranteed to be set.
  if (submittedToken !== masterToken) {
    logger.warn("Login failed: Invalid token.");
    return { error: t.error.invalidToken };
  }

  logger.info("Login successful. Setting cookie and redirecting.");
  // If we reach here, login is successful.
  // Store the raw token in the cookie for subsequent requests validation.
  const cookieStore = await cookies();
  cookieStore.set("auth_token", submittedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  redirect("/admin");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("auth_token");
  redirect("/");
}
