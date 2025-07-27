import { isAuthenticated } from "@/lib/auth/auth";
import logger from "@/lib/logger";
import { retryWithExponentialBackoff } from "@/lib/proxy/retry-handler";
import { NextRequest, NextResponse } from "next/server";

const BASE_URL = "https://generativelanguage.googleapis.com";
const API_VERSION = "v1beta";

async function proxyModelsRequest() {
  const { models } = await retryWithExponentialBackoff(
    async (apiKey: string) => {
      const response = await fetch(`${BASE_URL}/${API_VERSION}/models`, {
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    "gemini-2.5-pro" // Pass a placeholder model for key selection
  );

  const responseBody = {
    object: "list",
    data: models.map(({ name }: { name: string }) => ({
      id: name.replace("models/", ""),
      object: "model",
      created: 0,
      owned_by: "google",
      permission: [],
      root: name.replace("models/", ""),
      parent: null,
    })),
  };

  return NextResponse.json(responseBody, {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(req: NextRequest) {
  const authResponse = await isAuthenticated(req);
  if (authResponse) {
    return authResponse;
  }

  try {
    return await proxyModelsRequest();
  } catch (error) {
    logger.error(
      {
        error,
        errorMessage: error instanceof Error ? error.message : "N/A",
        errorStack: error instanceof Error ? error.stack : "N/A",
        errorConstructor: error?.constructor?.name,
        errorString: String(error),
      },
      "[Models Bridge Error]"
    );
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    return NextResponse.json(
      {
        error: {
          message: errorMessage,
          type: "internal_server_error",
        },
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "*",
      "Access-Control-Allow-Headers": "*",
    },
  });
}
