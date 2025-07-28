import { isAuthenticated } from "@/lib/auth/auth";
import { geminiPassthroughAdapter } from "@/lib/adapters/gemini-to-gemini";
import { NextRequest } from "next/server";

async function handler(
  request: NextRequest,
  { params }: { params: { model: string[] } }
) {
  const authError = await isAuthenticated(request);
  if (authError) {
    return authError;
  }
  
  // Reconstruct the model path, including any suffixes like ":generateContent"
  const modelPath = params.model.join("/");
  
  // Extract only the model identifier for the adapter, e.g., "gemini-1.5-pro-latest"
  const modelName = modelPath.split(":")[0];
  
  return geminiPassthroughAdapter(request, modelName);
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
