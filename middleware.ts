import { NextRequest, NextResponse } from "next/server";
import { i18n } from "./i18n-config";
import { match as matchLocale } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";
import { isAuthenticated } from "./lib/auth/auth";

function getLocale(request: NextRequest): string {
  const negotiatorHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => (negotiatorHeaders[key] = value));

  // @ts-expect-error locales are readonly
  const locales: string[] = i18n.locales;
  const languages = new Negotiator({ headers: negotiatorHeaders }).languages(locales);

  return matchLocale(languages, locales, i18n.defaultLocale);
}

async function handleApiAuth(req: NextRequest) {
  const authResult = await isAuthenticated(req);
  if (authResult) {
    return authResult; // Return the error response
  }
  return NextResponse.next(); // Authenticated
}

function handleWebAppAuth(req: NextRequest) {
  const token = req.cookies.get("auth_token")?.value;
  const { pathname } = req.nextUrl;
  const locale = pathname.split("/")[1];

  if (!token || token !== process.env.AUTH_TOKEN) {
    return NextResponse.redirect(new URL(`/${locale}/auth`, req.url));
  }
  return NextResponse.next();
}


export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Define path categories
  const isApiRoute = pathname.startsWith("/api/") || 
                     pathname.startsWith("/openai/") ||
                     pathname.startsWith("/anthropic/") ||
                     pathname.startsWith("/gemini/");

  const isPublicWebAppRoute = pathname.includes("/auth");

  // 2. Handle API routes
  if (isApiRoute) {
    return handleApiAuth(request);
  }

  // 3. Handle Web App routes
  const pathnameIsMissingLocale = i18n.locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  );

  if (pathnameIsMissingLocale) {
    const locale = getLocale(request);
    return NextResponse.redirect(new URL(`/${locale}${pathname.startsWith("/") ? "" : "/"}${pathname}`, request.url));
  }

  if(isPublicWebAppRoute) {
    return NextResponse.next();
  }

  return handleWebAppAuth(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - health (health check endpoint)
     */
    "/((?!_next/static|_next/image|favicon.ico|health).*)",
  ],
};
