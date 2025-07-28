# 重构计划：统一 API 适配器架构

**版本**: 1.0
**日期**: 2025-07-28

## 1. 目标

当前项目的 API 适配器存在两种不同的代码结构模式，且存在一个功能冗余的 `gemini-proxy` 模块。本次重构旨在统一项目中的适配器架构，消除代码冗余，降低认知负荷和维护成本，提升代码库的一致性和可扩展性。

**最终目标架构**:

*   **请求适配**: `lib/adapters/[External]-to-gemini.ts`
*   **响应适配**: `lib/adapters/gemini-to-[External].ts`
*   **统一客户端**: `lib/core/gemini-client.ts` 作为唯一的下游出口。
*   **消除代理**: 彻底移除 `lib/proxy/gemini-proxy.ts`。

## 2. 重构原则

*   **小步提交**: 每完成一个有意义的步骤，就创建一个 Git 提交。这便于回滚。
*   **持续验证**: 在关键步骤后，运行 `pnpm lint` 和 `pnpm test` (如果适用) 来确保没有破坏现有功能。
*   **谨慎删除**: 在确认一个文件或模块不再被任何地方引用之前，绝不删除它。

---

## 3. 重构阶段与步骤

### 阶段一：预备性重构 - 统一文件结构

此阶段主要进行非破坏性的文件移动和重命名，为核心重构做准备。

#### [DONE] 步骤 1.1: 统一 OpenAI 适配器结构

**目标**: 将 OpenAI 适配器拆分为请求和响应两个文件，与 Anthropic 模式对齐。

1.  **创建文件**: 在 `lib/adapters/` 目录下创建新文件 `gemini-to-openai.ts`。
2.  **迁移代码**:
    *   将 `lib/adapters/openai-to-gemini.ts` 文件中的 `transformGeminiResponseToOpenAI` 和 `streamGeminiToOpenAI` 两个函数**剪切**出来。
    *   将剪切的代码**粘贴**到新的 `gemini-to-openai.ts` 文件中。
    *   在 `gemini-to-openai.ts` 的文件顶部添加必要的 `import` 语句。
3.  **清理原文件**:
    *   现在 `lib/adapters/openai-to-gemini.ts` 文件应只包含 `transformOpenAIRequestToGemini` 函数及其相关逻辑。
4.  **更新引用**:
    *   打开 `app/(api)/openai/v1/chat/completions/route.ts` 文件。
    *   修改 `import` 语句，使其从新的 `gemini-to-openai.ts` 导入响应处理函数。
5.  **验证**:
    *   运行 `pnpm lint` 确保没有语法问题。
    *   (可选) 启动服务，通过 OpenAI 兼容的客户端测试 chat completions 功能（流式和非流式）。

**提交**: `git commit -m "refactor(adapters): separate openai response adapter"`

#### [DONE] 步骤 1.2: 重命名 `gemini_client.ts`

**目标**: 统一文件名格式（使用连字符 `-` 而不是下划线 `_`）。

1.  **重命名文件**:
    ```bash
    git mv lib/core/gemini_client.ts lib/core/gemini-client.ts
    ```
2.  **全局更新引用**:
    *   在整个项目中搜索 `lib/core/gemini_client`。
    *   将所有找到的 `import` 路径更新为 `lib/core/gemini-client`。
    *   **重点检查文件**:
        *   `app/(api)/anthropic/v1/messages/route.ts`
        *   `lib/adapters/openai-to-gemini.ts`
        *   `app/(api)/openai/v1/chat/completions/route.ts`
        *   `lib/proxy/gemini-proxy.ts` (此文件稍后会删除，但暂时先修正)
3.  **验证**:
    *   运行 `pnpm lint` 确保所有引用已更新。

**提交**: `git commit -m "refactor(core): rename gemini_client to gemini-client"`

### 阶段二：核心重构 - 移除 `gemini-proxy`

此阶段是本次重构的核心，将用标准的适配器模式替换掉代理模式。

#### 步骤 2.1: 创建 `gemini-to-gemini` 直通适配器

**目标**: 创建一个符合标准架构的、用于处理原生 Gemini 请求的适配器。

1.  **创建文件**: 在 `lib/adapters/` 目录下创建 `gemini-to-gemini.ts`。
2.  **实现适配器**: 在文件中添加类似下面的 `geminiPassthroughAdapter` 函数。此函数遵循适配器规范，但逻辑上仅做透传。

    ```typescript
    // lib/adapters/gemini-to-gemini.ts
    import { geminiClient } from "@/lib/core/gemini-client";
    import { NextRequest, NextResponse } from "next/server";
    
    export async function geminiPassthroughAdapter(request: NextRequest, model: string) {
      const requestBody = await request.json();
      const isStream = request.url.includes("streamGenerateContent");
    
      const geminiResponse = await geminiClient.generateContent(
        model,
        requestBody,
        isStream
      );
    
      if (!geminiResponse.ok) {
        return new NextResponse(geminiResponse.body, { status: geminiResponse.status });
      }
    
      return new NextResponse(geminiResponse.body, {
        status: 200,
        headers: {
          "Content-Type": geminiResponse.headers.get("Content-Type") || "application/json",
        },
      });
    }
    ```

#### 步骤 2.2: 增强 `gemini-client.ts`

**目标**: 将 `gemini-proxy.ts` 中有用的功能（如 HTTP 代理）合并到统一的客户端中。

1.  **分析 `gemini-proxy.ts`**: 仔细阅读 `proxyRequest` 函数，识别出除 "获取 key" 和 "fetch" 之外的附加逻辑。主要是 `https-proxy-agent` 的使用。
2.  **迁移逻辑**:
    *   修改 `lib/core/gemini-client.ts` 中的 `fetchWithRetries` (或其调用的地方)。
    *   在 `fetch` 的 `options` 中加入 `https-proxy-agent` 的逻辑，使其依赖于 `getSettings()` 的 `PROXY_URL` 配置。

#### 步骤 2.3: 更新 Gemini API 路由

**目标**: 让原生 Gemini 路由使用新的标准适配器。

1.  **修改路由文件**: 打开 `app/(api)/gemini/v1/[...model]/route.ts`。
2.  **替换实现**:
    *   移除对 `proxyRequest` 的 `import` 和调用。
    *   导入新的 `geminiPassthroughAdapter`。
    *   修改 `handler` 函数，让它调用 `geminiPassthroughAdapter`。

    ```typescript
    // app/(api)/gemini/v1/[...model]/route.ts (示意代码)
    import { isAuthenticated } from "@/lib/auth/auth";
    import { geminiPassthroughAdapter } from "@/lib/adapters/gemini-to-gemini"; // 新的 import
    import { NextRequest } from "next/server";
    
    async function handler(request: NextRequest, { params }: { params: { model: string[] }}) {
      const authError = await isAuthenticated(request);
      if (authError) {
        return authError;
      }
      const modelName = params.model.join("/"); // 提取 model
      return geminiPassthroughAdapter(request, modelName); // 新的调用
    }
    
    export const POST = handler;
    // ... (GET, etc.)
    ```
3.  **验证**:
    *   启动服务，使用原生 Gemini 客户端或 `curl` 测试 Gemini 端点，确保功能正常。

**提交**: `git commit -m "feat(adapters): replace gemini-proxy with standard adapter"`

### 阶段三：清理与收尾

#### 步骤 3.1: **谨慎**删除多余文件

**目标**: 安全地移除不再被使用的 `gemini-proxy.ts`。

1.  **最终确认**: 在整个项目中进行全局搜索，关键字为 `gemini-proxy`。
2.  **检查结果**: 确认搜索结果中，**没有任何代码文件** (`.ts`, `.tsx`, `.js`) 仍然在 `import` 或引用 `lib/proxy/gemini-proxy`。
3.  **执行删除**: 在确认安全后，执行删除命令。
    ```bash
    git rm lib/proxy/gemini-proxy.ts
    ```
4.  **删除空目录**: 如果 `lib/proxy` 目录已空，也一并删除。
    ```bash
    rmdir lib/proxy
    git add lib
    ```

**提交**: `git commit -m "chore: remove dead code gemini-proxy"`

## 4. 最终验证

1.  **完整测试**: 对所有三个协议端点 (OpenAI, Anthropic, Gemini) 都进行一次完整的端到端测试，包括流式和非流式请求。
2.  **代码审查**: 通读所有修改过的文件，确保代码风格一致，逻辑清晰。
3.  **合并**: 在确认一切正常后，将包含所有重构提交的分支合并到主分支。
