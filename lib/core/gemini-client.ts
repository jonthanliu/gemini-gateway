import logger from "@/lib/logger";
import {
  CircuitBreakerError,
  getNextWorkingKey,
  handleApiFailure,
  resetKeyStatus,
} from "@/lib/services/key.service";
import { logError, logRequest } from "@/lib/services/logging.service";
import {
  EnhancedGenerateContentResponse,
  GenerateContentRequest,
  GenerateContentResult,
  GoogleGenerativeAI,
} from "@google/generative-ai";
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
    request: GenerateContentRequest
  ): Promise<GenerateContentResult> {
    return this.executeRequest(
      model,
      request,
      false
    ) as Promise<GenerateContentResult>;
  }

  public async streamGenerateContent(
    model: string,
    request: GenerateContentRequest
  ): Promise<AsyncGenerator<GenerateContentResult>> {
    return this.executeRequest(model, request, true) as Promise<
      AsyncGenerator<GenerateContentResult>
    >;
  }

  private async executeRequest(
    modelName: string,
    request: GenerateContentRequest,
    isStream: boolean
  ): Promise<GenerateContentResult | AsyncGenerator<GenerateContentResult>> {
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
      let isSuccess = false;
      let statusCode = 500; // Default to error status

      try {
        const result = await this.attemptRequest(
          apiKey,
          modelName,
          request,
          isStream
        );
        await resetKeyStatus(apiKey);
        isSuccess = true;
        statusCode = 200;
        return result;
      } catch (error) {
        logger.warn(
          { error, key: `...${apiKey.slice(-4)}` },
          "Request attempt failed."
        );
        await handleApiFailure(apiKey);
        const errorDetails =
          error instanceof Error ? error.stack : JSON.stringify(error);
        logError(
          apiKey,
          error instanceof Error ? error.name : "UnknownError",
          error instanceof Error ? error.message : "An unknown error occurred.",
          errorDetails
        );

        if (Date.now() - startTime >= MAX_RETRY_DURATION_MS) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      } finally {
        logRequest(
          apiKey,
          modelName,
          statusCode,
          isSuccess,
          Date.now() - attemptStartTime
        );
      }
    }

    throw new RequestTimeoutError("Request failed after all retries.");
  }

  private async attemptRequest(
    apiKey: string,
    model: string, // Add model parameter here
    request: GenerateContentRequest,
    isStream: boolean
  ): Promise<GenerateContentResult | AsyncGenerator<GenerateContentResult>> {
    await getSettings();

    const genAI = new GoogleGenerativeAI(apiKey);
    const generativeModel = genAI.getGenerativeModel({ model });

    if (isStream) {
      const streamResult = await generativeModel.generateContentStream(request);
      return this.transformStream(streamResult.stream);
    } else {
      return generativeModel.generateContent(request);
    }
  }

  private async *transformStream(
    stream: AsyncGenerator<EnhancedGenerateContentResponse>
  ): AsyncGenerator<GenerateContentResult> {
    for await (const chunk of stream) {
      yield { response: chunk };
    }
  }
}

export const geminiClient = new GeminiClient();
