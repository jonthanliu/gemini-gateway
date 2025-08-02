import type {
  GenerateContentParameters,
  GenerateContentResponse,
  GenerationConfig,
  Tool,
  ToolConfig,
} from "@google/genai";

// The 'tools' and 'tool_config' properties are valid in the Gemini API,
// but might be missing from the specific version of the SDK's type definitions.
// We create a local, extended interface to handle this gracefully and type-safely.
interface ExtendedGenerationConfig extends GenerationConfig {
  tools?: Tool[];
  tool_config?: ToolConfig;
}

/**
 * Transforms a native Gemini request body for the GeminiClient.
 *
 * This function performs an explicit reconstruction of the request to ensure
 * that only valid and expected properties are passed downstream. This aligns
 * with the system design where adapters are responsible for sanitizing and
 * normalizing all incoming requests.
 *
 * @param model - The model name.
 * @param requestBody - The raw request body from the client.
 * @returns A promise that resolves to the new, sanitized request body.
 */
export function transformRequest(
  model: string,
  requestBody: GenerateContentParameters
): Promise<GenerateContentParameters> {
  // Explicitly reconstruct the request to sanitize it, abandoning the passthrough approach.
  const newRequest: GenerateContentParameters = {
    model,
    contents: requestBody.contents,
  };

  // Reconstruct generationConfig to filter out any unknown properties
  const newConfig: ExtendedGenerationConfig = {};
  const sourceConfig = requestBody.config as
    | ExtendedGenerationConfig
    | undefined;

  if (sourceConfig) {
    // Copy standard generation parameters
    if (sourceConfig.temperature)
      newConfig.temperature = sourceConfig.temperature;
    if (sourceConfig.topP) newConfig.topP = sourceConfig.topP;
    if (sourceConfig.topK) newConfig.topK = sourceConfig.topK;
    if (sourceConfig.maxOutputTokens)
      newConfig.maxOutputTokens = sourceConfig.maxOutputTokens;
    if (sourceConfig.stopSequences)
      newConfig.stopSequences = sourceConfig.stopSequences;

    // Explicitly carry over tools and tool_config if they exist
    if (sourceConfig.tools) {
      newConfig.tools = sourceConfig.tools;
    }
    if (sourceConfig.tool_config) {
      newConfig.tool_config = sourceConfig.tool_config;
    }
  }

  newRequest.config = newConfig;

  return Promise.resolve(newRequest);
}

/**
 * Creates a deep, plain object copy from a class instance or complex object.
 * This strips all methods and prototype information, ensuring that JSON.stringify
 * will perform a standard serialization without triggering any custom toJSON() methods.
 * @param original - The original object, possibly a class instance.
 * @returns A deep, plain JavaScript object.
 */
function toPlainObject(original: unknown): unknown {
  if (original === null || typeof original !== "object") {
    return original;
  }

  if (Array.isArray(original)) {
    return original.map(toPlainObject);
  }

  const plain: { [key: string]: unknown } = {};
  // Use `Object.keys` to iterate over own enumerable properties.
  // This is sufficient for data objects from the SDK and safer than `for...in`.
  if (typeof original === "object" && original !== null) {
    for (const key of Object.keys(original)) {
      plain[key] = toPlainObject((original as Record<string, unknown>)[key]);
    }
  }
  return plain;
}

/**
 * Transforms a non-streaming Gemini result for the client.
 * This function now creates a plain object copy to prevent any
 * unintended side effects from custom toJSON() methods on the response object.
 */
export function transformResponse(
  geminiResult: GenerateContentResponse
): GenerateContentResponse {
  // Although this is a "passthrough" adapter, we create a plain object
  // to ensure the final JSON response is clean and predictable.
  return toPlainObject(geminiResult) as GenerateContentResponse;
}

/**
 * Transforms a streaming Gemini result into a string generator
 * for the client, formatting each chunk as newline-delimited JSON.
 *
 * This function now performs a deep copy to a plain object before serialization
 * to safeguard against custom `toJSON()` methods on the SDK's response objects,
 * which might otherwise incorrectly serialize structured data like tool calls.
 */
export async function* transformStream(
  geminiStream: AsyncGenerator<GenerateContentResponse>
): AsyncGenerator<string> {
  for await (const chunk of geminiStream) {
    // By converting the chunk to a plain object, we ensure that JSON.stringify
    // behaves predictably and doesn't trigger any custom serialization logic.
    const plainChunk = toPlainObject(chunk);
    yield `data: ${JSON.stringify(plainChunk)}\n\n`;
  }
}
