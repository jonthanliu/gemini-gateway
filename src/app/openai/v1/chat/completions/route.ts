import logger from "@/lib/logger";
import { retryWithExponentialBackoff } from "@/lib/proxy/retry-handler";
import {
  streamGeminiToOpenAI,
  transformGeminiResponseToOpenAI,
  transformOpenAIRequestToGemini,
} from "@/lib/transforms/openai-to-gemini";
import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
  type EnhancedGenerateContentResponse,
  type GenerateContentResult,
} from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

async function proxyOpenAIRequest(req: NextRequest) {
  const openaiRequest = await req.json();

  const modelMap: Record<string, string> = {
    "gpt-3.5-turbo": "gemini-2.5-flash",
    "gpt-4": "gemini-2.5-pro",
    "gpt-4-turbo": "gemini-2.5-pro",
    "gpt-4o": "gemini-2.5-pro",
    "gemini-1.5-pro-latest": "gemini-2.5-pro",
    "gemini-1.5-flash-latest": "gemini-2.5-flash",
    "gemini-2.5-pro-latest": "gemini-2.5-pro",
    "gemini-2.5-flash-latest": "gemini-2.5-flash",
  };
  const requestedOpenAIModel = openaiRequest.model || "gpt-3.5-turbo";
  const geminiModelName = modelMap[requestedOpenAIModel] || "gemini-2.5-flash";

  const geminiRequest = transformOpenAIRequestToGemini(openaiRequest);

  logger.info(
    {
      geminiRequest,
      model: { requested: requestedOpenAIModel, mapped: geminiModelName },
    },
    "[OpenAI Bridge] Transformed request to Gemini format"
  );

  const result = await retryWithExponentialBackoff(async (apiKey: string) => {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: geminiModelName,
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
    });

    if (openaiRequest.stream) {
      return model.generateContentStream(geminiRequest);
    } else {
      return model.generateContent(geminiRequest);
    }
  }, geminiModelName);

  if (openaiRequest.stream) {
    if (!("stream" in result)) {
      const errorMessage =
        "Expected a stream result, but got a non-stream result.";
      logger.error({ result }, errorMessage);
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
    // Adapt the stream to match the expected type
    async function* adaptStream(
      sourceStream: AsyncGenerator<EnhancedGenerateContentResponse>
    ): AsyncIterable<GenerateContentResult> {
      for await (const chunk of sourceStream) {
        yield { response: chunk };
      }
    }

    const adaptedStream = adaptStream(result.stream);
    const openaiStream = streamGeminiToOpenAI(adaptedStream, geminiModelName);

    function iteratorToStream(
      iterator: AsyncGenerator<string>
    ): ReadableStream<Uint8Array> {
      const encoder = new TextEncoder();
      return new ReadableStream({
        async pull(controller) {
          const { value, done } = await iterator.next();
          if (done) {
            controller.close();
          } else {
            controller.enqueue(encoder.encode(value));
          }
        },
      });
    }

    const readableStream = iteratorToStream(openaiStream);

    return new NextResponse(readableStream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } else {
    if ("stream" in result) {
      const errorMessage =
        "Expected a non-stream result, but got a stream result.";
      logger.error({ result }, errorMessage);
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
    const openaiResponse = transformGeminiResponseToOpenAI(
      result,
      geminiModelName
    );
    return NextResponse.json(openaiResponse, {
      status: 200,
    });
  }
}

export async function POST(req: NextRequest) {
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
      "[OpenAI Bridge Error]"
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
