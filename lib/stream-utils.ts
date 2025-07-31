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
