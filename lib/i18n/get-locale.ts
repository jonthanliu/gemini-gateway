import { i18n, Locale } from "@/i18n-config";
import { headers } from "next/headers";

export async function getLocale(): Promise<Locale> {
  const headersList = await headers();
  const locale = headersList.get("x-ui-locale");

  if (locale && i18n.locales.includes(locale as Locale)) {
    return locale as Locale;
  }

  return i18n.defaultLocale;
}
