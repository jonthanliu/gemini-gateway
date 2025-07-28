import { GenerateContentResult } from "@google/generative-ai";

export async function* streamToAsyncIterable(
  stream: ReadableStream<Uint8Array>
): AsyncIterable<GenerateContentResult> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        if (buffer.trim().length > 0) {
          try {
            const jsonArray = JSON.parse(buffer);
            for (const item of jsonArray) {
              yield { response: item };
            }
          } catch (e) {
            console.error(
              "Failed to parse final stream content:",
              (e as Error).message,
              buffer
            );
          }
        }
        return;
      }
      buffer += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}

export function iteratorToStream(
  iterator: AsyncGenerator<string>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await iterator.next();
      if (done) {
        controller.close();
      } else {
        const chunk = typeof value === "string" ? value : JSON.stringify(value);
        controller.enqueue(encoder.encode(chunk));
      }
    },
  });
}
