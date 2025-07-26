import logger from "@/lib/logger";
import { retryWithExponentialBackoff } from "@/lib/proxy/retry-handler";
import { NextRequest, NextResponse } from "next/server";

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com";

async function proxyOpenAIRequest(req: NextRequest) {
  const path = req.nextUrl.pathname
    .replace("/openai/v1/", "/v1beta/")
    .replace("/v1/", "/v1beta/");
  const url = `${GEMINI_BASE_URL}${path}${req.nextUrl.search}`;

  console.log({ url });

  const body = await req.json();
  if (body.service_tier) {
    delete body.service_tier;
  }
  // Standardize the model to the one supported by our backend, as confirmed by the user.
  body.model = "gemini-2.5-pro";

  return retryWithExponentialBackoff(
    async (apiKey: string) => {
      const headers = new Headers(req.headers);
      headers.set("Authorization", `Bearer ${apiKey}`);
      headers.delete("content-length");

      const geminiResponse = await fetch(url, {
        method: req.method,
        headers,
        body: JSON.stringify(body),
        // @ts-expect-error - duplex is a valid option in Node.js fetch
        duplex: "half",
      });

      if (!geminiResponse.ok) {
        const errorBody = await geminiResponse.text();
        logger.error(
          { status: geminiResponse.status, errorBody },
          "Error from Gemini"
        );
        // Re-create the response since we consumed the body
        return new Response(errorBody, {
          status: geminiResponse.status,
          headers: geminiResponse.headers,
        });
      }

      return geminiResponse;
    },
    path
  );
}

async function handler(req: NextRequest) {
  try {
    return await proxyOpenAIRequest(req);
  } catch (error) {
    logger.error(
      {
        error,
        errorMessage: error instanceof Error ? error.message : "N/A",
        errorStack: error instanceof Error ? error.stack : "N/A",
        errorConstructor: error?.constructor?.name,
        errorString: String(error),
      },
      "Critical error in OpenAI compatibility proxy."
    );
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export { handler as GET, handler as POST };
