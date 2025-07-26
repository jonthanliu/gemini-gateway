import logger from "@/lib/logger";
import { retryWithExponentialBackoff } from "@/lib/proxy/retry-handler";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const DEFAULT_EMBEDDINGS_MODEL = "text-embedding-004";

async function proxyEmbeddingsRequest(req: NextRequest) {
  const {
    model: requestedOpenAIModel = "text-embedding-ada-002",
    input,
    dimensions,
  } = await req.json();

  const modelMap: Record<string, string> = {
    "text-embedding-ada-002": "text-embedding-004",
    "text-embedding-3-small": "text-embedding-004",
    "text-embedding-3-large": "text-embedding-004",
  };

  const geminiModelName =
    modelMap[requestedOpenAIModel] || DEFAULT_EMBEDDINGS_MODEL;

  if (!input) {
    return NextResponse.json(
      { error: "Missing input parameter" },
      { status: 400 }
    );
  }

  const inputs = Array.isArray(input) ? input : [input];

  const { embeddings } = await retryWithExponentialBackoff(
    async (apiKey: string) => {
      const genAI = new GoogleGenerativeAI(apiKey);
      const embeddingModel = genAI.getGenerativeModel({
        model: geminiModelName,
      });
      return embeddingModel.batchEmbedContents({
        requests: inputs.map((text: string) => ({
          model: `models/${geminiModelName}`,
          content: { role: "user", parts: [{ text }] },
          outputDimensionality: dimensions,
        })),
      });
    },
    geminiModelName
  );

  const responseBody = {
    object: "list",
    data: embeddings.map(({ values }: { values: number[] }, index: number) => ({
      object: "embedding",
      index,
      embedding: values,
    })),
    model: requestedOpenAIModel, // Return the original requested model name
  };

  return NextResponse.json(responseBody, {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: NextRequest) {
  try {
    return await proxyEmbeddingsRequest(req);
  } catch (error) {
    logger.error(
      {
        error,
        errorMessage: error instanceof Error ? error.message : "N/A",
        errorStack: error instanceof Error ? error.stack : "N/A",
        errorConstructor: error?.constructor?.name,
        errorString: String(error),
      },
      "[Embeddings Bridge Error]"
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
