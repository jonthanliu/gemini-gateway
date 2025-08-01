import logger from "@/lib/logger";
import {
  CircuitBreakerError,
  getNextWorkingKey,
  handleApiFailure,
  resetKeyStatus,
} from "@/lib/services/key.service";
import { logRequest } from "@/lib/services/logging.service";
import {
  GenerateContentParameters,
  GenerateContentResponse,
  GoogleGenAI,
} from "@google/genai";
import { getSettings } from "../config/settings";

// Custom error classes for specific failure scenarios
export class ServiceUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServiceUnavailableError";
  }
}

export class RequestTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RequestTimeoutError";
  }
}

export class GeminiClient {
  constructor() {
    // Constructor can be expanded later for dependency injection
  }

  public async generateContent(
    model: string,
    request: GenerateContentParameters
  ): Promise<GenerateContentResponse> {
    return this.executeRequest(
      model,
      request,
      false
    ) as Promise<GenerateContentResponse>;
  }

  public async streamGenerateContent(
    model: string,
    request: GenerateContentParameters
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    return this.executeRequest(model, request, true) as Promise<
      AsyncGenerator<GenerateContentResponse>
    >;
  }

  private async executeRequest(
    modelName: string,
    request: GenerateContentParameters,
    isStream: boolean
  ): Promise<
    GenerateContentResponse | AsyncGenerator<GenerateContentResponse>
  > {
    const { MAX_RETRY_DURATION_MS, RETRY_DELAY_MS } = await getSettings();
    const startTime = Date.now();

    while (Date.now() - startTime < MAX_RETRY_DURATION_MS) {
      let apiKey: string;
      try {
        apiKey = await getNextWorkingKey();
      } catch (error) {
        if (error instanceof CircuitBreakerError) {
          throw new ServiceUnavailableError("All API keys are in cooldown.");
        }
        throw new ServiceUnavailableError("No available API keys.");
      }

      const attemptStartTime = Date.now();
      try {
        const result = await this.attemptRequest(apiKey, request, isStream);
        await resetKeyStatus(apiKey);
        logRequest(apiKey, modelName, 200, true, Date.now() - attemptStartTime);
        return result;
      } catch (error) {
        logger.warn(
          { error, key: `...${apiKey.slice(-4)}` },
          "Request attempt failed."
        );
        await handleApiFailure(apiKey);
        logRequest(
          apiKey,
          modelName,
          500,
          false,
          Date.now() - attemptStartTime
        );

        if (Date.now() - startTime >= MAX_RETRY_DURATION_MS) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }

    throw new RequestTimeoutError("Request failed after all retries.");
  }

  private async attemptRequest(
    apiKey: string,
    request: GenerateContentParameters,
    isStream: boolean
  ): Promise<
    GenerateContentResponse | AsyncGenerator<GenerateContentResponse>
  > {
    await getSettings();

    const genAI = new GoogleGenAI({ apiKey });

    if (isStream) {
      return genAI.models.generateContentStream(request);
    } else {
      return genAI.models.generateContent(request);
    }
  }
}

export const geminiClient = new GeminiClient();
