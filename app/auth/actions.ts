"use server";

import { getSettings, updateSetting } from "@/lib/config/settings";
import { hashToken, verifyToken } from "@/lib/crypto";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { getLocale } from "@/lib/i18n/get-locale";
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

  const settings = await getSettings();
  const storedAuthTokenHash = settings.AUTH_TOKEN;
  logger.info(`Stored auth token hash exists: ${!!storedAuthTokenHash}`);

  // Case 1: System is already configured with a hashed token.
  if (storedAuthTokenHash && storedAuthTokenHash !== "") {
    const isValid = await verifyToken(submittedToken, storedAuthTokenHash);
    if (!isValid) {
      logger.warn("Login failed: Invalid token.");
      return { error: t.error.invalidToken };
    }
  }
  // Case 2: Initial setup. The first submitted token sets the new hash.
  else {
    logger.info("Initial setup: Hashing new token...");
    const newHash = await hashToken(submittedToken);
    try {
      await updateSetting("AUTH_TOKEN", newHash);
      logger.info("AUTH_TOKEN has been set.");
    } catch (error) {
      logger.error({ error }, "Error calling updateSetting.");
      return { error: t.error.failedToSaveToken };
    }
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
