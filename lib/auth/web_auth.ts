// This file contains authentication-related utility functions specifically for the WebApp.
// By separating this from `lib/auth/auth.ts`, we ensure that web UI authentication
// and API authentication can evolve independently without causing side effects.

import type { JwtPayload } from "jsonwebtoken";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import logger from "../logger";

const AUTH_COOKIE_NAME = "auth_token";
const JWT_SECRET = process.env.WEB_JWT_SECRET;

if (!JWT_SECRET) {
  if (process.env.NODE_ENV === "production") {
    logger.error(
      "CRITICAL: WEB_JWT_SECRET is not set in a production environment. Web authentication will be insecure. Please set this environment variable to a long, random string."
    );
    throw new Error("WEB_JWT_SECRET is not set in production.");
  } else {
    logger.warn(
      "WEB_JWT_SECRET is not set. Using a temporary, insecure key for development. Please set this environment variable for production use."
    );
  }
}
const effectiveJwtSecret =
  JWT_SECRET || "temp-dev-secret-key-that-is-not-secure";

/**
 * Signs a JWT token for the WebApp user.
 * @param payload - The payload to sign, typically { username: string }.
 * @returns {string} The signed JWT token.
 */
export function signJwtForWebApp(payload: object): string {
  return jwt.sign(payload, effectiveJwtSecret, { expiresIn: "7d" });
}

/**
 * Verifies a JWT token from the WebApp.
 * @param token - The JWT token to verify.
 * @returns {JwtPayload | null} The decoded payload if valid, otherwise null.
 */
export function verifyJwtForWebApp(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, effectiveJwtSecret) as JwtPayload;
  } catch (error) {
    logger.debug({ error }, "JWT verification failed");
    return null;
  }
}

/**
 * Checks the authentication state of the user for the WebApp.
 * It reads the auth_token cookie and validates it using JWT verification.
 *
 * @returns {Promise<boolean>} A promise that resolves to true if the user is authenticated, false otherwise.
 */
export async function checkAuthState(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return false;
  }

  const payload = verifyJwtForWebApp(token);
  return !!payload;
}
