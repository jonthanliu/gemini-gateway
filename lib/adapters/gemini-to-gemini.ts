import type {
  GenerateContentParameters,
  GenerateContentResponse,
} from "@google/genai";

/**
 * Transforms a native Gemini request body for the GeminiClient.
 *
 * This is a pure passthrough function. It assumes the client is sending a
 * request body that is already 100% compliant with the @google/generative-ai SDK.
 * The sole purpose of this gateway for the Gemini protocol is key management.
 *
 * @param model - The model name.
 * @param requestBody - The raw request body from the client.
 * @returns A promise that resolves to the new request body including the model.
 */
export function transformRequest(
  model: string,
  requestBody: GenerateContentParameters
): Promise<GenerateContentParameters> {
  return Promise.resolve({ ...requestBody, model });
}

/**
 * Transforms a non-streaming Gemini result for the client.
 * This is a passthrough as no conversion is needed.
 */
export function transformResponse(
  geminiResult: GenerateContentResponse
): GenerateContentResponse {
  return geminiResult;
}

/**
 * Transforms a streaming Gemini result into a string generator
 * for the client, formatting each chunk as newline-delimited JSON.
 */
export async function* transformStream(
  geminiStream: AsyncGenerator<GenerateContentResponse>
): AsyncGenerator<string> {
  for await (const chunk of geminiStream) {
    // The new SDK directly returns the response object in the stream.
    yield `data: ${JSON.stringify(chunk)}\n\n`;
  }
}
