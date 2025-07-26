import logger from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

/**
 * Extracts the API key from the request headers or query parameters.
 * @param request - The NextRequest object.
 * @returns The API key string or null if not found.
 */
function getApiKey(request: NextRequest): string | null {
  // 1. Check for standard 'Authorization: Bearer <token>'
  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // 2. Check for 'key' in query parameters
  const keyFromQuery = request.nextUrl.searchParams.get("key");
  if (keyFromQuery) {
    return keyFromQuery;
  }

  // 3. Check for non-standard 'x-goog-api-key' header for Google SDK compatibility
  const googleHeader = request.headers.get("x-goog-api-key");
  if (googleHeader) {
    return googleHeader;
  }

  return null;
}

/**
 * Checks if the request is authenticated by validating the API key.
 * If the key is valid, it returns null.
 * If the key is invalid or missing, it returns a NextResponse object with a 401 status.
 * @param request - The NextRequest object.
 * @returns A promise that resolves to null or a NextResponse object.
 */
export async function isAuthenticated(
  request: NextRequest
): Promise<NextResponse | null> {
  const apiKey = getApiKey(request);

  if (!apiKey) {
    logger.warn("Authentication failed: No API key provided.");
    return new NextResponse(
      JSON.stringify({
        error: {
          message: "Unauthorized. Please provide an API key.",
          type: "authentication_error",
          code: "api_key_missing",
        },
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    const masterToken = process.env.AUTH_TOKEN || "";
    const allowedTokens = (process.env.ALLOWED_TOKENS || "").split(",")
      .map((t: string) => t.trim())
      .filter(Boolean);

    // The master token is always allowed.
    if (apiKey === masterToken) {
      return null;
    }

    if (!allowedTokens.includes(apiKey)) {
      logger.warn(
        `Authentication failed: Provided API key is not in the allowed list.`
      );
      return new NextResponse(
        JSON.stringify({
          error: {
            message:
              "Incorrect API key provided. The provided API key is not authorized for this service.",
            type: "invalid_request_error",
            code: "invalid_api_key",
          },
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // If we are here, the key is authorized to use the service.
    return null;
  } catch (error) {
    logger.error({ error }, "Database error during API key validation.");
    return new NextResponse(
      JSON.stringify({
        error: {
          message: "Internal server error during authentication.",
          type: "server_error",
          code: "auth_db_error",
        },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
