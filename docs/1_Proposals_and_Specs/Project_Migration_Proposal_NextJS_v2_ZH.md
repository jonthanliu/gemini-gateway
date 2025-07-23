# 项目迁移方案书：Gemini Balance on Next.js Edge

**版本**: 2.0
**日期**: 2025 年 7 月 22 日
**作者**: Cline，代码迁移专家
**目标平台**: Vercel / Cloudflare (Edge Runtime)
**核心技术栈**: Next.js (App Router), TypeScript, Tailwind CSS, Drizzle ORM
**核心存储方案**: Cloudflare D1 (默认推荐), 并通过 ORM 适配器兼容标准 Postgres (用于自托管)

---

### 1. 项目愿景与迁移目标

**项目愿景**:

将 `Gemini Balance` 从一个基于 Python FastAPI 的传统服务器应用，全面重构并迁移为一个部署在 **Next.js Edge Runtime** 上的、高性能、高可用的 **Serverless AI 网关**。新的实现将继承原项目的所有核心功能，并充分利用全球边缘网络的优势，为用户提供更低的延迟、更高的可扩展性以及更简化的部署和运维体验。

**迁移核心目标**:

1.  **平台原生 (Platform-Native)**: 采用 **Next.js (App Router)** 和 **TypeScript** 进行完全重写，以最大化地利用 Vercel/Cloudflare 边缘平台的性能和特性。
2.  **极致的“开箱即用”**: 对核心用户群体，实现零环境变量配置。用户只需一键部署到 Cloudflare，所有后续配置均可在首次访问时通过 Web UI 完成。
3.  **灵活且简化的存储**: **默认使用 Cloudflare D1** 作为统一的、零维护的数据库。同时，通过 Drizzle ORM 的适配器模式，为希望**自托管**的用户保留使用标准 **Postgres** 数据库的选项，实现架构的灵活性和可移植性。
4.  **无状态与分布式**: 改造原有的内存态 `KeyManager`，将密钥状态持久化到数据库中，以适应边缘计算的无状态、分布式环境。
5.  **Serverless 任务调度**: 使用 **Vercel Cron** 或 **Cloudflare Cron Triggers** 替代 `APScheduler`，以实现定时的密钥健康检查和自动恢复。
6.  **精确的 API 兼容性**: 通过 **Next.js Rewrites**，确保对外暴露的 API 路由与原项目 **100% 精确对齐**，保证客户端无缝迁移。
7.  **功能完备的现代 UI**: 构建一个基于 React 和 Tailwind CSS 的、功能对等甚至超越原项目的现代化管理后台。

---

### 2. 核心架构与项目结构

我们将采用 Next.js App Router 的标准结构，并进行逻辑分层。

```plaintext
/
├── app/
│   ├── api/                      # API 路由 (内部路径)
│   │   ├── v1/
│   │   │   ├── chat/completions/route.ts
│   │   │   ├── models/route.ts
│   │   │   └── ... (其他 OpenAI 兼容路由)
│   │   └── gemini/
│   │       └── v1beta/
│   │           └── models/[model]/generateContent/route.ts
│   │           └── ... (其他 Gemini 原生路由)
│   ├── (admin)/                  # 后台管理界面 (路由组)
│   │   ├── layout.tsx            # 管理后台的统一布局 (包含侧边栏导航)
│   │   ├── dashboard/page.tsx    # 仪表盘页面
│   │   ├── keys/page.tsx         # 密钥管理页面
│   │   ├── settings/page.tsx     # 配置管理页面
│   │   ├── logs/page.tsx         # 日志查看页面
│   │   └── components/           # 管理后台专用 React 组件
│   ├── (auth)/                   # 认证页面
│   │   ├── login/page.tsx
│   │   └── setup/page.tsx        # 首次启动设置页面
│   └── layout.tsx                # 根布局
├── lib/
│   ├── services/                 # 核心业务逻辑 (平台无关)
│   │   ├── chat.service.ts
│   │   └── key.service.ts
│   ├── db/                       # 数据库交互层 (平台相关)
│   │   ├── schema.ts             # Drizzle ORM 的表结构定义
│   │   └── queries.ts            # 数据库查询函数
│   ├── config.ts                 # 配置管理
│   └── utils.ts                  # 工具函数
├── middleware.ts                 # Next.js 中间件 (用于后台路由鉴权)
└── next.config.js                # Next.js 配置文件 (包含 Rewrites)
```

---

### 3. 对外 API 路由设计 (精确对齐)

为了确保客户端无需任何修改即可迁移，我们将通过 `next.config.js` 中的路由重写规则，实现与原项目完全一致的对外 API 路径。

**`next.config.js` 配置**:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: "/v1/:path*", destination: "/api/v1/:path*" },
      { source: "/hf/v1/:path*", destination: "/api/v1/:path*" },
      {
        source: "/gemini/v1beta/:path*",
        destination: "/api/gemini/v1beta/:path*",
      },
      { source: "/v1beta/:path*", destination: "/api/gemini/v1beta/:path*" },
    ];
  },
};

module.exports = nextConfig;
```

**对外暴露的 API 端点**:

| HTTP Method | 路由 (Path)                                           | 描述                  |
| :---------- | :---------------------------------------------------- | :-------------------- |
| `POST`      | `/v1/chat/completions`                                | OpenAI 兼容聊天接口   |
| `GET`       | `/v1/models`                                          | OpenAI 兼容模型列表   |
| `POST`      | `/v1/embeddings`                                      | OpenAI 兼容文本嵌入   |
| `POST`      | `/v1/images/generations`                              | OpenAI 兼容图像生成   |
| `POST`      | `/v1/audio/speech`                                    | OpenAI 兼容文本转语音 |
| `POST`      | `/gemini/v1beta/models/{model}:generateContent`       | Gemini 原生非流式聊天 |
| `POST`      | `/gemini/v1beta/models/{model}:streamGenerateContent` | Gemini 原生流式聊天   |
| `GET`       | `/gemini/v1beta/models`                               | Gemini 原生模型列表   |

---

### 4. 管理后台功能细化

管理后台将是一个功能完备的单页应用 (SPA-like)，提供比原项目更强大、更流畅的体验。所有管理后台专用的内部 API 将位于 `/api/admin/...` 路径下。

#### 4.1 认证与首次设置

- **路由**: `/login`, `/setup`
- **逻辑**:
  1.  用户访问任何管理页面时，`middleware.ts` 会检查其 `cookie` 中是否包含有效的 `auth_token`。
  2.  如果无效，则重定向到 `/login`。
  3.  在 `/login` 页面，会先从数据库检查 `auth_token` 是否已设置。
  4.  如果数据库中**不存在**，则自动重定向到 `/setup` 页面。
  5.  在 `/setup` 页面，用户可以设置初始的 `AUTH_TOKEN` 和 `API_KEYS`。保存后，数据写入数据库，并重定向回 `/login`。
  6.  用户使用设置好的 `AUTH_TOKEN` 登录，成功后 `token` 被写入 `HttpOnly` `cookie`，并跳转到 `/dashboard`。

#### 4.2 仪表盘 (`/dashboard`)

- **功能**: 系统的核心健康状况概览。
- **实现**:
  - **API 调用统计**: 以图表形式展示过去 24 小时、过去 1 小时的 API 调用总数、成功率。数据源于对数据库 `request_logs` 表的聚合查询。
  - **密钥健康度**: 显示有效密钥和无效密钥的数量及百分比。
  - **错误日志概览**: 显示最近 1 小时内新增的错误日志数量，并高亮显示最常见的错误类型。

#### 4.3 密钥管理 (`/keys`)

- **功能**: 对所有 API Key 进行精细化的生命周期管理。
- **实现**:
  - **数据展示**: 使用 React TanStack Table 组件，以表格形式展示所有 Key。列包括：Key (部分隐藏)、状态 (有效/无效)、失败次数、总调用次数、最后使用时间。
  - **实时过滤与搜索**: 提供输入框，可以按 Key 的片段进行实时过滤/后端搜索。
  - **批量操作**: 提供复选框，允许用户选择多个 Key，并执行**批量验证**、**批量重置失败计数**、**批量删除**等操作。
  - **内部管理 API**:
    - `POST /api/admin/keys/verify`: 接收 Key 数组，并发测试并返回结果。
    - `POST /api/admin/keys/reset`: 接收 Key 数组，将其 `failure_count` 重置为 0。
    - `DELETE /api/admin/keys`: 接收 Key 数组，从数据库中删除。

#### 4.4 配置管理 (`/settings`)\*\*

- **功能**: 提供一个类型安全的、可视化的界面来管理所有应用配置。
- **实现**:
  - **分组展示**: 使用标签页 (Tabs) 将配置项分为“通用设置”、“模型设置”、“安全设置”等类别。
  - **类型安全的表单**: 使用 `react-hook-form` 和 `zod` 来构建表单，确保数据完整性。
  - **动态数组管理**: 为 `API_KEYS`, `ALLOWED_TOKENS` 等列表提供动态添加/删除/批量导入功能。
  - **热更新**: 点击“保存”后，通过 `POST /api/admin/settings` 将所有配置项更新到数据库。由于 API 路由是无状态的，下一次请求会自然地从数据库读取到最新的配置。

#### 4.5 日志查看器 (`/logs`)

- **功能**: 提供强大的日志查询和诊断能力。
- **实现**:
  - **数据源**: 直接查询数据库的 `error_logs` 和 `request_logs` 表。
  - **高级筛选**: 提供多维度筛选，如：时间范围、`model_name`、`api_key`、`status_code` 等。
  - **分页与排序**: 查询结果使用服务端分页，并可按任意列排序。
  - **详情钻取**: 点击任意日志，在模态框中以格式化的 JSON 展示完整日志内容，并提供一键复制。

---

### 5. 数据库设计 (Drizzle ORM)

我们将使用 Drizzle ORM 来定义统一的表结构。通过使用不同的驱动，这套 Schema 可以同时工作在 Cloudflare D1 (SQLite 兼容) 和标准的 Postgres 数据库上。

**`lib/db/schema.ts`**:

```typescript
// lib/db/schema.ts
import { sqliteTable, text, integer, int } from "drizzle-orm/sqlite-core"; // D1/SQLite 驱动
// import { pgTable, text, integer, serial } from "drizzle-orm/pg-core"; // Postgres 驱动

// 存储所有配置项，如 auth_token, max_failures 等
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

// 存储 API 密钥及其状态
export const apiKeys = sqliteTable("api_keys", {
  key: text("key").primaryKey(),
  failureCount: integer("failure_count").default(0).notNull(),
  lastUsedAt: int("last_used_at", { mode: "timestamp" }),
  isEnabled: int("is_enabled", { mode: "boolean" }).default(true).notNull(),
});

// 请求日志
export const requestLogs = sqliteTable("request_logs", {
  id: integer("id").primaryKey(),
  apiKey: text("api_key").notNull(),
  modelName: text("model_name"),
  isSuccess: int("is_success", { mode: "boolean" }).default(true).notNull(),
  statusCode: integer("status_code"),
  latencyMs: integer("latency_ms"),
  createdAt: int("created_at", { mode: "timestamp" }).defaultNow().notNull(),
});

// 错误日志
export const errorLogs = sqliteTable("error_logs", {
  id: integer("id").primaryKey(),
  apiKey: text("api_key"),
  modelName: text("model_name"),
  errorCode: integer("error_code"),
  errorMessage: text("error_message"),
  requestBody: text("request_body"), // 存储 JSON 字符串
  createdAt: int("created_at", { mode: "timestamp" }).defaultNow().notNull(),
});
```

---

### 6. 核心业务逻辑实现详解 (Next.js 版本)

本章节是迁移方案的核心，旨在为后续接手的开发者或大模型提供一份无需参考原 Python 项目即可开始工作的、详尽的、可执行的实现指南。

#### 6.1 负载均衡与密钥轮询

此逻辑确保请求被均匀分发到健康的 API 密钥上。

- **原项目实现**: 内存中的 `KeyManager` 类，使用 `itertools.cycle` 进行轮询，并通过内存字典跟踪失败计数。
- **Next.js 实现 (`lib/services/key.service.ts`)**:
  1.  **数据模型**: 依赖 `lib/db/schema.ts` 中定义的 `apiKeys` 表，该表包含 `key`, `failureCount`, `lastUsedAt`, `isEnabled` 字段。
  2.  **获取可用密钥 (`getNextWorkingKey`)**:
      a. 从数据库中查询所有 `isEnabled: true` 且 `failureCount < MAX_FAILURES` 的密钥。
      b. **轮询策略**: 为适应无状态的边缘环境，采用**最久未使用 (Least Recently Used - LRU)** 策略是最佳实践。从上一步筛选出的有效密钥中，选择 `lastUsedAt` 时间戳最早的一个。如果没有 `lastUsedAt` 记录（例如新 Key），则随机选择一个。
      c. **更新状态**: 在返回选中的密钥后，**立即**更新其在数据库中的 `lastUsedAt` 为当前时间戳。`UPDATE api_keys SET last_used_at = NOW() WHERE key = ?`。
  3.  **随机选择 (备选策略)**: 如果 LRU 实现复杂，一个简单可靠的备选方案是从有效密钥池中进行**随机选择**。这在统计上也能实现负载均衡。

#### 6.2 故障转移与熔断机制

此逻辑确保在单个密钥失效时，系统能够自动切换并重试，并在密钥持续失败后将其“熔断”。

- **原项目实现**: `@RetryHandler` 装饰器，在捕获异常后调用 `KeyManager.handle_api_failure`。
- **Next.js 实现 (高阶函数)**:
  1.  创建一个高阶函数 `withRetryHandling(handler)`，用于包装所有需要调用外部 API 的路由处理器。
  2.  在 `withRetryHandling` 内部：
      a. 使用一个 `for` 循环，从 `0` 迭代到 `MAX_RETRIES`。
      b. **循环内部**:
      i. 调用 `keyService.getNextWorkingKey()` 获取一个健康的密钥。
      ii. 在 `try...catch` 块中，使用此密钥执行核心业务逻辑（例如 `chatService.createCompletion(...)`）。
      iii. 如果 `try` 成功，则 `break` 循环并返回成功响应。
      iv. 如果 `catch` 到异常，则调用 `keyService.handleApiFailure(apiKey)`。此函数会通过原子的数据库操作 `UPDATE api_keys SET failure_count = failure_count + 1 WHERE key = ?` 来增加失败计数。
      c. 如果循环完成后仍未成功，则向客户端返回最终的错误响应。

#### 6.3 协议转换 (OpenAI-to-Gemini)

这是项目的核心价值所在，确保了 API 的兼容性。

- **原项目实现**: `OpenAIMessageConverter`, `_build_payload`, `OpenAIResponseHandler`。
- **Next.js 实现 (`lib/services/chat.service.ts`)**:
  1.  **请求转换**:
      - 创建一个 `convertOpenAIMessagesToGemini(messages)` 函数，负责：
        - 将 `role: "system"` 的消息提取为独立的 `systemInstruction` 对象。
        - 将 `role: "assistant"` 映射为 `role: "model"`。
        - 将多模态内容（如 `image_url`）转换为 Gemini 支持的 `inline_data` 格式。
      - 创建一个 `buildGeminiPayload(openaiRequest)` 函数，负责：
        - 调用 `convertOpenAIMessagesToGemini`。
        - 映射核心参数 (`temperature` -> `generationConfig.temperature`, `max_tokens` -> `generationConfig.maxOutputTokens` 等)。
        - 调用下述的“动态衍生模型”逻辑来构建 `tools` 字段。
  2.  **响应转换**:
      - 创建一个 `convertGeminiResponseToOpenAI(geminiResponse)` 函数，负责：
        - 将 `id`, `object`, `created` 等字段填充为 OpenAI 格式。
        - 将 `geminiResponse.candidates` 数组映射为 `choices` 数组。
        - 将 `candidates[0].content.parts[0].text` 提取为 `choices[0].message.content`。
        - 将 `geminiResponse.usageMetadata` 映射为 `usage` 对象。

#### 6.4 流式响应处理

- **原项目实现**: FastAPI `StreamingResponse` 和异步生成器。
- **Next.js 实现 (Web Standards)**:
  1.  API 路由处理器返回一个标准的 `Response` 对象，其 body 是一个 `ReadableStream`。
  2.  在 `chat.service.ts` 中，使用 `fetch` 调用 Gemini 的流式 API，并获取其响应的 `ReadableStream`。
  3.  使用 `.pipeThrough(new TransformStream({...}))` 来处理这个流。
  4.  在 `TransformStream` 的 `transform(chunk, controller)` 方法中：
      a. 将从 Gemini 收到的 `chunk` (Buffer) 解码为字符串。
      b. 解析 SSE `data:` 行，得到 Gemini 的 JSON chunk。
      c. 调用 `convertGeminiResponseToOpenAI` 的流式版本，将其转换为 OpenAI 格式的 JSON chunk。
      d. 将转换后的 OpenAI chunk 字符串编码后 `controller.enqueue()` 到输出流。
  5.  在流的末尾，`enqueue` 一个 `data: [DONE]\n\n` 字符串。

#### 6.5 动态衍生模型

此逻辑为用户提供了超越原生 API 的增强功能。

- **原项目实现**: 在 `list_models` 路由中，获取上游模型列表后，在内存中动态修改并添加新模型。
- **Next.js 实现 (`/api/v1/models/route.ts`)**:
  1.  从数据库中读取 `SEARCH_MODELS`, `IMAGE_MODELS` 等配置。
  2.  调用 `chat.service.ts` 中的一个函数，向 Gemini API 请求基础模型列表。
  3.  在路由处理器中，遍历配置的模型列表（如 `SEARCH_MODELS`）。
  4.  对于列表中的每个模型名称（如 `gemini-1.5-pro`），在从 Gemini 获取的基础模型列表中找到对应的对象。
  5.  深拷贝（`JSON.parse(JSON.stringify(...))`）这个基础模型对象。
  6.  修改其 `name` 和 `displayName` 字段，添加后缀（如 `gemini-1.5-pro-search`）。
  7.  将这个新的衍生模型对象推入要返回的模型列表中。
  8.  最终将这个增强后的完整模型列表返回给客户端。

---

### 7. 用户使用与部署路径

为了满足不同用户的需求，我们提供两种清晰的部署路径。

#### **路径一：边缘平台一键部署 (推荐)**

此路径专为追求简单、高效的个人和小型团队设计。

1.  **平台**: Cloudflare Pages。
2.  **数据库**: Cloudflare D1。
3.  **部署步骤**:
    a. 克隆项目。
    b. 在 Cloudflare 控制台，执行 `wrangler d1 create gemini_balance_db` 创建数据库。
    c. 将生成的数据库绑定信息填入 `wrangler.toml`。
    d. 执行 `wrangler deploy`。
    e. 访问应用 URL，通过 Web UI 完成首次设置。
4.  **优点**: 零运维成本，配置最少，享受全球加速。

#### **路径二：自托管部署 (高级)**

此路径专为需要完全控制环境或希望集成到现有设施的用户设计。

1.  **平台**: 任何支持 Docker 的服务器。
2.  **数据库**: 用户自行准备的 Postgres 数据库。
3.  **部署步骤**:
    a. 克隆项目。
    b. 准备 `docker-compose.yml`，其中包含 Next.js 应用服务和一个 Postgres 服务。
    c. 在 `.env` 文件中，设置 `DATABASE_URL` 环境变量，指向 Postgres 数据库。
    d. 执行 `docker-compose up -d`。
    e. 访问应用 URL，完成首次设置。
4.  **优点**: 平台无关，数据私有，完全控制。

### 8. 迁移风险与应对策略

- **风险**: 数据库在高并发下的写入性能（尤其是在记录请求日志时）。
  - **应对**: 对于 D1，其本身为高并发设计。对于自托管 Postgres，用户需自行保证其性能。在应用层，我们可以实现对日志写入的异步处理或批量处理。
- **风险**: 密钥状态管理在分布式环境下的原子性。
  - **应对**: 数据库操作应尽可能设计为原子操作。例如，更新失败计数可以使用 `UPDATE api_keys SET failure_count = failure_count + 1 WHERE key = ?` 这样的 SQL 语句，而不是“读-改-写”模式。Drizzle ORM 支持构建此类原生 SQL 查询。
- **风险**: 前端 UI 重写工作量较大。
  - **应对**: 采用成熟的 React 组件库（如 Shadcn/UI, MUI）来加速开发。优先实现核心功能，迭代完善。

---

### 附录 A：Admin Dashboard 设计详解

本附录详细描述了管理后台的 UI/UX 设计，旨在为前端开发提供清晰的实现蓝图。我们将采用以 **Shadcn/UI** 组件库为基础的现代化、简洁、功能驱动的设计风格。

#### **A.1 整体布局 (`(admin)/layout.tsx`)**

- **结构**: 采用经典的“侧边栏导航 + 主内容区”布局。
- **侧边栏 (Sidebar)**:
  - 始终固定在页面左侧。
  - 顶部包含项目 Logo 和名称。
  - 导航链接列表，包含：
    - `仪表盘` (链接到 `/dashboard`)
    - `密钥管理` (链接到 `/keys`)
    - `配置设置` (链接到 `/settings`)
    - `日志查看` (链接到 `/logs`)
  - 当前激活的链接会有明显的视觉高亮（例如，不同的背景色或文字颜色）。
  - 底部包含一个“退出登录”按钮。
- **主内容区 (Main Content)**:
  - 页面右侧区域，用于渲染具体页面的内容。
  - 顶部会有一个 `PageHeader` 组件，显示当前页面的标题和一些页面级别的操作按钮（例如，“添加密钥”）。

#### **A.2 页面详解**

##### **仪表盘 (`/dashboard/page.tsx`)**

- **布局**: 采用网格布局 (Grid)，展示多个统计卡片。
- **核心组件**:
  1.  **统计卡片 (`StatCard`)**:
      - **API 调用统计 (4 个卡片)**: 分别显示“过去 1 分钟”、“过去 1 小时”、“过去 24 小时”和“总计”的 API 调用次数。每个卡片都包含一个标题、一个大的数字和一个与上一周期相比的百分比变化（例如 `+5%`）。
      - **密钥健康度 (2 个卡片)**: 分别显示“有效密钥”和“无效密钥”的数量。
  2.  **近期请求列表 (`RecentRequestsTable`)**:
      - 一个简洁的表格，显示最近的 10 条 API 请求记录 (`request_logs`)。
      - 列：时间、模型、状态码、延迟。
  3.  **近期错误列表 (`RecentErrorsTable`)**:
      - 一个简洁的表格，显示最近的 5 条错误日志 (`error_logs`)。
      - 列：时间、模型、错误信息。

##### **密钥管理 (`/keys/page.tsx`)**

- **布局**: 顶部是操作栏，下方是数据表格。
- **核心组件**:
  1.  **操作栏 (Action Bar)**:
      - **添加密钥按钮**: 点击后会弹出一个 `AddKeyDialog` 模态框，允许用户输入一个或多个（通过文本区域批量粘贴）新的 API Key。
      - **搜索框 (`Input` with Debouncing)**: 用于实时按 Key 的片段搜索。
      - **批量操作按钮 (`DropdownMenu`)**: 当用户在表格中选中至少一个 Key 后，此按钮变为可用。下拉菜单中包含“批量验证”、“批量重置失败计数”、“批量删除”等选项。
  2.  **数据表格 (`DataTable` using TanStack Table)**:
      - **列**:
        - `复选框`: 用于批量选择。
        - `API Key`: 显示部分 Key (例如 `sk-..ab12`)，鼠标悬浮时显示完整 Key。
        - `状态`: 一个徽章 (`Badge`)，根据 `isEnabled` 和 `failureCount` 显示“有效”、“无效”或“已禁用”。
        - `失败次数`: `failureCount` 的数值。
        - `最后使用时间`: `lastUsedAt` 的格式化时间。
        - `操作`: 一个 `DropdownMenu`，包含针对单行的“验证”、“重置”、“禁用/启用”、“删除”等操作。

##### **配置管理 (`/settings/page.tsx`)**

- **布局**: 使用标签页 (`Tabs`) 组件将配置项分组。
- **核心组件**:
  1.  **标签页 (`Tabs`)**:
      - `通用设置`: `AUTH_TOKEN`, `ALLOWED_TOKENS`, `MAX_RETRIES` 等。
      - `模型设置`: `SEARCH_MODELS`, `IMAGE_MODELS` 等。
      - `日志设置`: `AUTO_DELETE_LOGS_DAYS` 等。
  2.  **表单 (`Form` using React Hook Form + Zod)**:
      - 每个标签页的内容都是一个表单。
      - **动态数组输入 (`DynamicArrayInput`)**: 用于 `API_KEYS`, `ALLOWED_TOKENS` 等列表。这是一个自定义组件，内部包含一个输入框列表，以及“添加”和“删除”按钮。
      - **开关 (`Switch`)**: 用于布尔类型的配置。
      - **输入框 (`Input`)**: 用于字符串和数字类型的配置。
  3.  **保存按钮**: 页面底部有一个固定的“保存”按钮，点击后会触发表单验证和 API 提交。

##### **日志查看器 (`/logs/page.tsx`)**

- **布局**: 与密钥管理页面类似，顶部是筛选器，下方是数据表格。
- **核心组件**:
  1.  **筛选栏 (Filter Bar)**:
      - **日期范围选择器 (`DatePicker` with Range)**: 用于选择查询的时间范围。
      - **输入框**: 用于按 `apiKey`, `modelName`, `errorMessage` 等进行关键词搜索。
      - **下拉选择框 (`Select`)**: 用于按 `statusCode` 或 `isSuccess` 进行筛选。
  2.  **数据表格 (`DataTable`)**:
      - **列**: 时间、API Key、模型、状态码、延迟、错误信息（截断）。
      - **行展开/详情**: 点击每一行，可以展开该行的详细视图 (`Collapsible` or `Dialog`)，以格式化的 JSON 形式显示完整的 `requestBody` 和 `errorMessage`。

---

这份方案书为将 `Gemini Balance` 迁移到 Next.js Edge 平台提供了详尽的、可执行的蓝图。它不仅旨在复现现有功能，更致力于利用 Serverless 平台的优势，打造一个更现代化、更易于维护和扩展的全新产品。
