import { GenerateContentResult } from "@google/generative-ai";

export async function* streamToAsyncIterable(stream: ReadableStream<Uint8Array>): AsyncIterable<GenerateContentResult> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        return;
      }
      const text = decoder.decode(value);
      // This is a simplified assumption. Real implementation may need to handle chunking correctly for multiple JSON objects in one chunk.
      try {
        const parsed = JSON.parse(text); 
        yield { response: parsed };
      } catch {
        console.error("Failed to parse stream chunk:", text);
      }
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
        const chunk = typeof value === 'string' ? value : JSON.stringify(value);
        controller.enqueue(encoder.encode(chunk));
      }
    },
  });
}
