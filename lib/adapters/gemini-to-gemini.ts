import type {
  EnhancedGenerateContentResponse,
  GenerateContentRequest,
  GenerateContentResult,
} from "@google/generative-ai";

/**
 * Transforms a native Gemini request body for the GeminiClient.
 *
 * This is a pure passthrough function. It assumes the client is sending a
 * request body that is already 100% compliant with the @google/generative-ai SDK.
 * The sole purpose of this gateway for the Gemini protocol is key management.
 *
 * @param _model - The model name (unused).
 * @param requestBody - The raw request body from the client.
 * @returns A promise that resolves to the original request body.
 */
export function transformRequest(
  _model: string,
  requestBody: GenerateContentRequest
): Promise<GenerateContentRequest> {
  return Promise.resolve(requestBody);
}

/**
 * Transforms a non-streaming Gemini result for the client.
 * This is a passthrough as no conversion is needed.
 */
export function transformResponse(
  geminiResult: GenerateContentResult
): EnhancedGenerateContentResponse {
  return geminiResult.response;
}

/**
 * Transforms a streaming Gemini result into a string generator
 * for the client, formatting each chunk as newline-delimited JSON.
 */
export async function* transformStream(
  geminiStream: AsyncGenerator<GenerateContentResult>
): AsyncGenerator<string> {
  for await (const chunk of geminiStream) {
    yield `data: ${JSON.stringify(chunk.response)}\n\n`;
  }
}
