import LoginForm from "@/app/[lang]/auth/LoginForm";
import { Locale } from "@/i18n-config";
import { verifyToken } from "@/lib/crypto";
import { getDictionary } from "@/lib/get-dictionary";
import { getSettings } from "@/lib/settings";
import { cookies } from "next/headers";
import AdminClientLayout from "./AdminClientLayout";

export default async function AdminLayout({
  children,
  params: paramsPromise,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: Locale }>;
}) {
  const { lang } = await paramsPromise;
  const dictionary = await getDictionary(lang);

  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  const { AUTH_TOKEN: storedHash } = await getSettings();

  // On initial setup, storedHash will be empty.
  // In this case, any non-empty token is considered valid for the first time.
  const isInitialSetup = !storedHash || storedHash.length === 0;

  let isAuthorized = false;
  if (isInitialSetup) {
    // During initial setup, we just need any token to proceed.
    // The actual hashing and saving happens in the login action.
    isAuthorized = !!token && token.length > 0;
  } else {
    // For subsequent logins, we verify the token against the stored hash.
    isAuthorized = !!token && (await verifyToken(token, storedHash));
  }

  if (!isAuthorized) {
    // If not authorized, render the login form directly within the admin layout.
    // This avoids all redirect issues.
    return <LoginForm dictionary={dictionary.loginForm} />;
  }

  // If authorized, render the main admin layout and its children.
  return (
    <AdminClientLayout dictionary={dictionary} lang={lang}>
      {children}
    </AdminClientLayout>
  );
}
