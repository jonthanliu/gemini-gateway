import { isAuthenticated } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getNextWorkingKey } from "@/lib/services/key.service";

export async function GET(request: NextRequest) {
  const authError = await isAuthenticated(request);
  if (authError) {
    return authError;
  }

  try {
    // Get a working API key using the stateless service
    const apiKey = await getNextWorkingKey();
    
    // Initialize the Google Generative AI client
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // List available models
    const models = await genAI.listModels();
    
    // Format the response to match the expected structure
    const formattedModels = {
      models: models.map((model: any) => ({
        name: model.name,
        version: model.version,
        displayName: model.displayName,
        description: model.description,
        inputTokenLimit: model.inputTokenLimit,
        outputTokenLimit: model.outputTokenLimit,
        supportedGenerationMethods: model.supportedGenerationMethods,
        temperature: model.temperature,
        topP: model.topP,
        topK: model.topK,
      })),
    };
    
    return NextResponse.json(formattedModels);
  } catch (error) {
    console.error("Error fetching Gemini models:", error);
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 }
    );
  }
}