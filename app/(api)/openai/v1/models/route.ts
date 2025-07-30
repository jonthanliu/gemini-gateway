import { isAuthenticated } from "@/lib/auth/auth";
import logger from "@/lib/logger";
import { modelMappingService } from "@/lib/services/model-mapping.service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const authResponse = await isAuthenticated(req);
  if (authResponse) {
    return authResponse;
  }

  try {
    const availableMappings = await modelMappingService.listAvailableModels(
      "openai"
    );

    const modelsData = availableMappings
      .filter((m) => m.source_name !== "__DEFAULT__") // Don't advertise the default rule
      .map((mapping) => ({
        id: mapping.source_name,
        object: "model",
        created: Math.floor(Date.now() / 1000),
        owned_by: "gemini-gateway",
      }));

    return NextResponse.json({
      object: "list",
      data: modelsData,
    });
  } catch (error) {
    logger.error(
      {
        error,
        errorMessage: error instanceof Error ? error.message : "N/A",
      },
      "[v1/models] Error fetching available models"
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
