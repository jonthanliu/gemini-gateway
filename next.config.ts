import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/*": ["./drizzle/**/*"],
  },
  async rewrites() {
    return [
      // Anthropic Messages API 路由规则
      {
        source: "/v1/messages",
        destination: "/anthropic/v1/messages",
      },
      // OpenAI 兼容路由
      { source: "/v1/:path*", destination: "/openai/v1/:path*" },
      // Gemini 原生路由 (no rewrite needed as they're already at the correct path)
      // Gemini 别名路由 - map /v1beta/... to /gemini/v1beta/...
      {
        source: "/v1beta/:path*",
        destination: "/gemini/v1beta/:path*",
      },
    ];
  },
};

export default nextConfig;
