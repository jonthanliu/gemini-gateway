import { expect, test } from "vitest";
import nextConfig from "../next.config";

test("Next.js config rewrites", async () => {
  if (!nextConfig.rewrites) {
    throw new Error("Rewrites config is not defined");
  }
  const rewrites = await nextConfig.rewrites();

  expect(rewrites).toEqual([
    // OpenAI 兼容路由
    { source: "/v1/:path*", destination: "/openai/v1/:path*" },
    // Gemini 别名路由
    {
      source: "/v1beta/:path*",
      destination: "/gemini/v1beta/:path*",
    },
  ]);
});
