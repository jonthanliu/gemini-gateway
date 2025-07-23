import { isAuthenticated } from "@/lib/auth";
import { getNextWorkingKey } from "@/lib/services/key.service";
import { NextRequest, NextResponse } from "next/server";

// Define the expected type for a model from the API response
interface GeminiModel {
  name: string;
  version: string;
  displayName: string;
  description: string;
  inputTokenLimit: number;
  outputTokenLimit: number;
  supportedGenerationMethods: string[];
  temperature?: number;
  topP?: number;
  topK?: number;
}

export async function GET(request: NextRequest) {
  const authError = await isAuthenticated(request);
  if (authError) {
    return authError;
  }

  try {
    // Get a working API key using the stateless service
    const apiKey = await getNextWorkingKey();

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorBody = await response.json();
      console.error("Error fetching Gemini models from API:", errorBody);
      return NextResponse.json(
        { error: "Failed to fetch models from Google API", details: errorBody },
        { status: response.status }
      );
    }

    const data: { models: GeminiModel[] } = await response.json();

    // The data is already in the desired format, so we can return it directly.
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching Gemini models:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
