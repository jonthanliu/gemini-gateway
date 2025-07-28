import { getSettings } from "../config/settings";
import logger from "@/lib/logger";
import {
  CircuitBreakerError,
  getNextWorkingKey,
  handleApiFailure,
  resetKeyStatus,
} from "@/lib/services/key.service";
import { Agent } from "http";
import { HttpsProxyAgent } from "https-proxy-agent";

interface FetchOptions extends RequestInit {
  agent?: Agent;
  duplex?: "half";
}


const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

async function fetchWithRetries(
  url: string,
  options: FetchOptions
): Promise<Response> {
  let apiKey: string;
  try {
    apiKey = await getNextWorkingKey();
  } catch (error) {
    if (error instanceof CircuitBreakerError) {
      throw new Error("Service unavailable: All API keys are in cooldown.");
    }
    throw new Error("Service unavailable: No API keys available.");
  }

  const urlWithKey = `${url}${url.includes("?") ? "&" : "?"}key=${apiKey}`;
  let lastError: Error | null = null;

  const settings = await getSettings();
  if (settings.PROXY_URL) {
    options.agent = new HttpsProxyAgent(settings.PROXY_URL);
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(urlWithKey, options);

      if (response.ok) {
        await resetKeyStatus(apiKey);
        return response;
      }

      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        let cooldownSeconds;
        if (retryAfter) {
          const retryAfterSeconds = parseInt(retryAfter, 10);
          if (!isNaN(retryAfterSeconds)) {
            cooldownSeconds = retryAfterSeconds;
          } else {
            const retryAfterDate = new Date(retryAfter);
            if (!isNaN(retryAfterDate.getTime())) {
              cooldownSeconds = Math.ceil(
                (retryAfterDate.getTime() - Date.now()) / 1000
              );
            }
          }
        }
        logger.warn(
          {
            key: `...${apiKey.slice(-4)}`,
            status: 429,
            retryAfter: retryAfter || "N/A",
          },
          "Rate limit on key. Cooling down."
        );
        await handleApiFailure(apiKey, cooldownSeconds);
        throw new Error(
          `Request failed with status 429. Please retry your request.`
        );
      }

      lastError = new Error(`Request failed with status ${response.status}`);
      logger.warn(
        {
          status: response.status,
          key: `...${apiKey.slice(-4)}`,
          attempt: attempt + 1,
        },
        `Attempt ${attempt + 1} failed. Status: ${response.status}.`
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes("429")) {
        throw error;
      }
      lastError = error as Error;
      logger.warn(
        {
          error: lastError.message,
          key: `...${apiKey.slice(-4)}`,
          attempt: attempt + 1,
        },
        `Attempt ${attempt + 1} failed with error: ${lastError.message}.`
      );
    }

    if (attempt < MAX_RETRIES - 1) {
      const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
      logger.info(`Waiting for ${delay}ms before retrying...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // If the loop completes, all retries for this key have failed.
  await handleApiFailure(apiKey);
  throw new Error(
    "Request failed after all retries. Please retry your request."
  );
}

export const geminiClient = {
  async generateContent(
    model: string,
    body: unknown,
    isStream: boolean = false
  ): Promise<Response> {
    const GOOGLE_API_HOST =
      process.env.GOOGLE_API_HOST ||
      "https://generativelanguage.googleapis.com";
    const url = `${GOOGLE_API_HOST}/v1beta/models/${model}:${
      isStream ? "streamGenerateContent" : "generateContent"
    }`;

    const options: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    };

    return fetchWithRetries(url, options);
  },
};
