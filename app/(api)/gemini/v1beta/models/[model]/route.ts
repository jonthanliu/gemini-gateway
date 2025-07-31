import {
  transformRequest,
  transformResponse,
  transformStream,
} from "@/lib/adapters/gemini-to-gemini";
import { isAuthenticated } from "@/lib/auth/auth";
import {
  geminiClient,
  RequestTimeoutError,
  ServiceUnavailableError,
} from "@/lib/core/gemini-client";
import { iteratorToStream } from "@/lib/stream-utils";
import { NextRequest, NextResponse } from "next/server";

async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ model: string }> }
) {
  const authError = await isAuthenticated(request);
  if (authError) {
    return authError;
  }

  // The model path is now passed differently, let's adjust
  const { model } = await params;
  const modelNameWithAction = model;
  const isStream = modelNameWithAction.endsWith(":streamGenerateContent");
  const modelName = modelNameWithAction.split(":")[0];

  try {
    const requestBody = await request.json();
    const geminiRequest = await transformRequest(modelName, requestBody);

    if (isStream) {
      const geminiStream = await geminiClient.streamGenerateContent(
        modelName,
        geminiRequest
      );

      const responseStream = transformStream(geminiStream);
      const readableStream = iteratorToStream(responseStream);
      //   console.log({ geminiStream, readableStream });
      return new Response(readableStream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } else {
      const geminiResult = await geminiClient.generateContent(
        modelName,
        geminiRequest
      );
      const responseBody = transformResponse(geminiResult);
      return NextResponse.json(responseBody);
    }
  } catch (error) {
    if (error instanceof ServiceUnavailableError) {
      return NextResponse.json(
        { error: "Service Unavailable", details: error.message },
        { status: 503 }
      );
    }
    if (error instanceof RequestTimeoutError) {
      return NextResponse.json(
        { error: "Request Timeout", details: error.message },
        { status: 504 }
      );
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }
    console.error("Unhandled error in Gemini route:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export const POST = handler;

// import { isAuthenticated } from "@/lib/auth/auth";
// import { proxyRequest } from "@/lib/proxy/gemini-proxy";
// import { NextRequest } from "next/server";

// async function handler(request: NextRequest) {
//   const authError = await isAuthenticated(request);
//   if (authError) {
//     return authError;
//   }
//   const response = await proxyRequest(request, "/gemini/");
//   return response;
// }

// export const GET = handler;
// export const POST = handler;
// export const PUT = handler;
// export const DELETE = handler;
