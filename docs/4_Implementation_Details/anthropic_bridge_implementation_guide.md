# Anthropic-to-Gemini 协议桥接实现指南

## 1. 目标

本文档旨在为项目添加一个 Anthropic 协议兼容的 API 入口。该入口将接收来自标准 Anthropic 客户端（如 Claude Code、官方 SDK 等）的请求，将其无缝转换为 Google Gemini API 请求，通过项目现有的负载均衡器进行分发，并将 Gemini 返回的流式响应再转换回 Anthropic 兼容的流格式，最终返回给客户端。

最终实现的效果是，客户端只需将 API 的 `baseURL` 指向本服务，即可在不修改任何代码的情况下，将其对 Anthropic 的 API 调用转发至后端的 Gemini 模型。

## 2. 核心架构

我们将采用 Next.js 的 `rewrites` 功能来实现一个优雅且解耦的路由架构。

- **统一外部入口**: 客户端统一请求 `/v1/messages` 路径。
- **内部路由转发**: Next.js 服务器通过 `next.config.js` 中的重写规则，将 `/v1/messages` 的请求在内部转发到我们专门处理该逻辑的 API 文件，而不会改变浏览器地址栏的 URL。

这种方式保证了外部接口的规范性和内部实现的高度灵活性。

## 3. 实施步骤

### 步骤 3.1: 配置 Next.js 路由重写

在项目根目录的 `next.config.js` 文件中，向 `rewrites` 数组添加一条新规则，用于处理 Anthropic Messages API 的请求。

```javascript
// next.config.js

module.exports = {
  async rewrites() {
    return [
      // ... 其他已有的规则 ...

      // 新增：Anthropic Messages API 路由规则
      {
        source: "/v1/messages",
        destination: "/anthropic/v1/messages",
      },
    ];
  },
};
```

- **`source`**: 匹配客户端请求的、符合 Anthropic 官方规范的路径。
- **`destination`**: 指定处理该请求的、位于 `app` 目录下的内部 API 路由路径。

> **重要提示：关于路由顺序**
> Next.js 会**从上到下**检查 `rewrites` 数组。请求会由第一个匹配的规则处理。因此，请务必将**最具体的路由规则（如 `/v1/messages`）放在最宽泛的规则（如 `/v1/:path*`）之前**，以避免具体路由被宽泛规则错误拦截。

### 步骤 3.2: 创建 API 路由文件

根据上述 `destination` 路径，在项目中创建对应的文件：

`app/anthropic/v1/messages/route.ts`

这个文件将是我们实现协议转换和请求转发的核心。

### 步骤 3.3: 迁移必要的辅助代码

为了实现协议转换，我们需要复用 `lemmy` 项目中已经编写好的、用于处理协议细节的辅助函数。

将以下目录和文件从 `lemmy` 项目的 `apps/claude-bridge/src/` 复制到本项目的 `lib/` 目录下：

- `transforms/` (整个目录)
- `utils/sse.ts`
- `types.ts`

### 步骤 3.4: 实现核心协议转换器

在 `lib/transforms/` 目录下，创建两个新的 TypeScript 文件，这是整个功能的技术核心。

#### 3.4.1 `anthropic-to-gemini.ts`

该文件负责将接收到的 Anthropic 请求体转换为 Gemini API 所需的格式。

**关键转换逻辑**:

- **函数签名**: `export function convertAnthropicToGemini(request: Anthropic.MessageCreateParams): Gemini.GenerateContentRequest`
- **System Prompt**: `request.system` -> `geminiRequest.systemInstruction`
- **Messages**: 遍历 `request.messages`，进行角色和内容转换。
  - `role: 'user'` -> `role: 'user'`
  - `role: 'assistant'` -> `role: 'model'`
  - `content` 数组：将 Anthropic 的 `text`, `image`, `tool_result` 等内容块，转换为 Gemini 的 `parts` 数组。
- **Tools**: 将 Anthropic 的 `tools` 定义转换为 Gemini 的 `tools` 定义。
- **Parameters**:
  - `max_tokens` -> `generationConfig.maxOutputTokens`
  - `temperature` -> `generationConfig.temperature`
  - `top_p` -> `generationConfig.topP`
  - `top_k` -> `generationConfig.topK`

#### 3.4.2 `gemini-to-anthropic.ts`

该文件负责将 Gemini 返回的响应流，实时转换为 Anthropic 客户端期望的 SSE (Server-Sent Events) 流格式。**可以直接改编 `lemmy` 项目中的 `lemmy-to-anthropic.ts` 文件来实现**。

**关键转换逻辑**:

- **函数签名**: `export function streamGeminiToAnthropic(geminiStream: AsyncIterable<Gemini.GenerateContentResult>): ReadableStream<Uint8Array>`
- **SSE 事件序列**: 必须严格按照 Anthropic 规范生成事件流：
  1.  `event: message_start`: 在流开始时发送。
  2.  `event: content_block_start`: 每个内容块（文本或工具调用）开始时发送。
  3.  `event: content_block_delta`: 增量发送内容。对于文本，是 `text_delta`；对于工具调用，是 `input_json_delta`。
  4.  `event: content_block_stop`: 每个内容块结束时发送。
  5.  `event: message_delta`: 在所有内容块发送完毕后，更新最终状态（如 `stop_reason`）。
  6.  `event: message_stop`: 在流的末尾发送，标志着整个响应结束。
- **流式处理**: 使用 `for await...of` 循环处理输入的 `geminiStream`，并在循环中实时生成上述 SSE 事件，推入到输出的 `ReadableStream` 中。

### 步骤 3.5: 实现 API 路由主逻辑

现在，填充 `app/anthropic/v1/messages/route.ts` 的内容。

```typescript
// app/anthropic/v1/messages/route.ts
import { NextRequest, NextResponse } from "next/server";
import { convertAnthropicToGemini } from "@/lib/transforms/anthropic-to-gemini";
import { streamGeminiToAnthropic } from "@/lib/transforms/gemini-to-anthropic";
import { balancer } from "@/lib/balancer"; // 假设这是您项目现有的负载均衡器实例

export const runtime = "edge"; // 推荐使用 Edge Runtime 以获得最佳流式性能

export async function POST(req: NextRequest) {
  try {
    // 1. 获取并解析请求体
    const anthropicRequest = await req.json();

    // 2. 转换请求协议
    const geminiRequest = convertAnthropicToGemini(anthropicRequest);

    // 3. 通过负载均衡器获取 Gemini 响应流
    const geminiResponseStream = await balancer.requestStream(geminiRequest);

    // 4. 转换响应协议为 Anthropic SSE 流
    const anthropicStream = streamGeminiToAnthropic(geminiResponseStream);

    // 5. 返回一个完全兼容 Anthropic 的流式响应
    return new NextResponse(anthropicStream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "anthropic-version": "2023-06-01",
        "anthropic-request-id": `req_${Date.now()}`,
      },
    });
  } catch (error) {
    console.error("[Anthropic Bridge Error]:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    return NextResponse.json(
      {
        type: "error",
        error: {
          type: "internal_server_error",
          message: errorMessage,
        },
      },
      { status: 500 }
    );
  }
}
```

## 4. 测试策略

- **单元测试**: 为 `anthropic-to-gemini.ts` 和 `gemini-to-anthropic.ts` 编写单元测试，覆盖各种边界情况（如：无 `system` 消息、多条 `user` 消息、带工具调用、带图片附件等）。
- **端到端测试**: 使用 Postman 或一个简单的脚本，构造一个真实的 Anthropic API 请求（包含必要的请求头），发送到 `http://localhost:3000/v1/messages`。验证返回的响应头和 SSE 流格式是否完全符合 Anthropic 规范，并且内容是否与 Gemini 的预期输出一致。
