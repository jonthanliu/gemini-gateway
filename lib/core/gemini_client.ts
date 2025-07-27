import { getNextWorkingKey, handleApiFailure, resetKeyStatus } from "@/lib/services/key.service";
import logger from "@/lib/logger";

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

async function fetchWithRetries(
  url: string,
  options: RequestInit
): Promise<Response> {
  let lastError: Error | null = null;
  let attempts = 0;

  while (attempts < MAX_RETRIES) {
    const apiKey = await getNextWorkingKey();
    const urlWithKey = `${url}${url.includes("?") ? "&" : "?"}key=${apiKey}`;
    
    try {
      const response = await fetch(urlWithKey, options);

      if (response.ok) {
        await resetKeyStatus(apiKey);
        return response;
      }

      // If response is not ok, we treat it as a failure for this key
      logger.warn(
        { 
          status: response.status, 
          key: `...${apiKey.slice(-4)}` 
        },
        `Request failed with status ${response.status}. Marking key for cooldown.`
      );
      await handleApiFailure(apiKey);
      lastError = new Error(`Request failed with status ${response.status}`);

    } catch (error) {
      if (error instanceof TypeError && error.message.includes("fetch failed")) {
        logger.warn(
          { 
            error: error.message,
            key: `...${apiKey.slice(-4)}`
          },
          "Fetch failed, likely a network error. Marking key for cooldown."
        );
        await handleApiFailure(apiKey);
        lastError = error;
      } else {
        // Not a retryable error, so rethrow
        throw error;
      }
    }
    
    // If we are here, it means the request failed and we are about to retry
    attempts++;
    if (attempts < MAX_RETRIES) {
       const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempts - 1);
       logger.info(`Retrying request... Attempt ${attempts + 1}/${MAX_RETRIES}. Waiting for ${delay}ms.`);
       await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error("Request failed after multiple retries.");
}


export const geminiClient = {
  async generateContent(
    model: string,
    body: unknown,
    isStream: boolean = false
  ): Promise<Response> {
    const GOOGLE_API_HOST = process.env.GOOGLE_API_HOST || "https://generativelanguage.googleapis.com";
    const url = `${GOOGLE_API_HOST}/v1beta/models/${model}:${isStream ? "streamGenerateContent" : "generateContent"}`;

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
