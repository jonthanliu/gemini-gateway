// This server component acts as the main conditional router for the admin dashboard.
// Based on the user's authentication status and whether they have completed the
// initial setup (i.e., added at least one API key), it renders the appropriate
// UI: LoginForm, Onboarding, or the main Dashboard.

import { checkAuthState } from "@/lib/auth/web_auth";
import { hasApiKeys } from "@/lib/services/key.service";
import { Dashboard } from "./components/Dashboard";
import { LoginForm } from "./components/LoginForm";
import { Onboarding } from "./components/Onboarding";

import { Locale } from "@/i18n-config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

interface AdminPageProps {
  params: {
    lang: Locale;
  };
}

export default async function AdminPage({ params }: AdminPageProps) {
  // This page is the core logic gate for the admin panel.
  // It orchestrates the display of different states of the application
  // based on two critical pieces of information:
  // 1. Is the user logged in?
  // 2. Are there any API keys configured in the system?
  const { lang } = await params;
  const dictionary = await getDictionary(lang);
  const isLoggedIn = await checkAuthState();

  // If the user is not logged in, the only possible action is to show the login form.
  if (!isLoggedIn) {
    return <LoginForm />;
  }

  // If the user is logged in, we then check if the system has been onboarded.
  const hasKeys = await hasApiKeys();

  // If there are no keys, the user must be guided to add their first key.
  if (!hasKeys) {
    return <Onboarding dictionary={dictionary.admin} />;
  }

  // If the user is logged in and keys exist, show the main dashboard.
  return <Dashboard dictionary={dictionary.admin} />;
}
