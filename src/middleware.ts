import { i18n } from "@/i18n-config";
import { match as matchLocale } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";
import { NextRequest, NextResponse } from "next/server";

function getLocale(request: NextRequest): string {
  // 1. Check for language preference in cookie
  const localeCookie = request.cookies.get("NEXT_LOCALE")?.value;
  if (
    localeCookie &&
    i18n.locales.includes(localeCookie as (typeof i18n.locales)[number])
  ) {
    return localeCookie;
  }

  // 2. Fallback to Accept-Language header
  const negotiatorHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => (negotiatorHeaders[key] = value));

  // @ts-expect-error locales are readonly
  const locales: string[] = i18n.locales;
  const languages = new Negotiator({ headers: negotiatorHeaders }).languages(
    locales
  );
  return matchLocale(languages, locales, i18n.defaultLocale);
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 1. Locale Redirection: Ensure every path has a locale.
  const pathnameIsMissingLocale = i18n.locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  );

  if (pathnameIsMissingLocale) {
    const locale = getLocale(request);
    return NextResponse.redirect(new URL(`/${locale}${pathname}`, request.url));
  }

  // 2. Homepage Redirect: Redirect from / or /zh to /zh/admin
  const locale = pathname.split("/")[1];
  if (pathname === `/${locale}`) {
    return NextResponse.redirect(new URL(`/${locale}/admin`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|health|gemini|openai|v1beta).*)",
  ],
};
