# 下一阶段实施计划：架构对齐与技术债务偿还

**计划日期**: 2025 年 7 月 23 日
**制定人**: Cline, 系统分析师
**核心目标**: 解决《项目进度报告》中指出的三个核心架构偏差，使项目与 `CONTINUATION_GUIDE.md` 中定义的设计哲学完全对齐。

---

### 1. 总体策略

下一阶段的核心工作是**暂停所有新功能的开发**，集中资源进行架构重构，以偿还现有的技术债务。我们将按照“从外到内”的顺序解决问题：首先解决对用户影响最直接的 API 路径问题，然后是核心的数据库和服务层重构。

**执行原则**: 严格遵循 `CONTINUATION_GUIDE.md` 中定义的 TDD (测试驱动开发) 流程，确保每项重构都有对应的测试用例覆盖。

---

### 2. 任务清单与实施步骤

以下任务按优先级排序，必须依次完成。

#### **任务一：实现 API 路由兼容性 (P0 - 最高优先级)**

- **目标**: 解决“偏差三”，确保客户端可以无缝迁移。
- **实施步骤**:
  1.  **修改 `next.config.ts`**:
      - 在 `nextConfig` 对象中，添加 `rewrites` 函数。
      - 根据 `v2` 方案的规划，添加重写规则，将外部路径映射到内部 API 路由。
      ```javascript
      // next.config.ts
      const nextConfig = {
        // ... other configs
        async rewrites() {
          return [
            // OpenAI 兼容路由
            { source: "/v1/:path*", destination: "/api/openai/v1/:path*" },
            // Gemini 原生路由
            {
              source: "/gemini/v1beta/:path*",
              destination: "/api/gemini/v1beta/:path*",
            },
            // Gemini 别名路由
            {
              source: "/v1beta/:path*",
              destination: "/api/gemini/v1beta/:path*",
            },
          ];
        },
      };
      ```
  2.  **验证**:
      - 启动本地开发服务器。
      - 使用 `curl` 或 Postman 等工具，请求 `http://localhost:3000/v1/models`。
      - 确认该请求能被正确路由到 `src/app/api/openai/v1/models/route.ts` 并返回模型列表。
  3.  **编写测试**: 在测试框架中（如 Playwright 或 Vitest 的集成测试），添加针对路由重写的端到端测试用例。

---

#### **任务二：重构核心服务 (KeyManager) 为无状态模式 (P0 - 最高优先级)**

- **目标**: 解决“偏差一”，使系统适应 Serverless/Edge 环境。
- **实施步骤**:
  1.  **删除 `KeyManager` 单例**:
      - 移除 `src/lib/key-manager.ts` 中所有关于单例模式的代码（`globalWithKeyManager`, `getKeyManager`, `resetKeyManager`）。
      - 将 `KeyManager` 类本身改造为一个纯粹的、可被实例化的服务类，或者直接将其拆分为一组独立的、无状态的函数。
  2.  **创建无状态的密钥服务 (`key.service.ts`)**:
      - 创建一个新文件 `src/lib/services/key.service.ts` (或类似名称)。
      - **`getNextWorkingKey()`**:
        - **逻辑**: 从数据库中查询所有 `enabled: true` 且 `failCount < MAX_FAILURES` 的密钥。
        - **轮询策略**: 采用**最久未使用 (LRU)** 策略。使用 `orderBy: { lastUsed: 'asc' }` 查询出第一个结果。
        - **原子更新**: 获取到密钥后，**立即**在数据库中更新其 `lastUsed` 时间戳。
      - **`handleApiFailure(key)`**:
        - **逻辑**: 在数据库中对指定 `key` 的 `failCount` 字段执行原子自增操作 (`increment: 1`)。
      - **`resetKeyFailureCount(key)`**:
        - **逻辑**: 在数据库中将指定 `key` 的 `failCount` 重置为 0。
  3.  **移除 `itertools` 依赖**:
      - 在完成无状态改造后，内存轮询逻辑不再需要，执行 `pnpm remove itertools`。
  4.  **重构 API 路由**:
      - 修改所有调用旧 `getKeyManager` 的地方（如 `gemini-client.ts` 或 API 路由文件），改为直接调用新的、无状态的 `key.service.ts` 中的函数。
      - 确保重试逻辑（如 `withRetryHandling`）能正确地与新的无状态服务协作。
  5.  **编写/修改测试**:
      - 为 `key.service.ts` 中的每个函数编写独立的单元测试。
      - 确保模拟数据库操作，验证其逻辑的正确性（例如，LRU 是否正确选择了最旧的 Key，失败处理是否正确增加了计数值）。

---

#### **任务三：迁移 ORM 从 Prisma 到 Drizzle，并实现多数据库动态支持 (P1 - 高优先级)**

- **核心目标**: 解决“偏差二”，使项目技术栈与设计哲学完全对齐。最终实现一套代码，根据环境无缝支持三种数据库目标：**本地 SQLite 文件**、**自托管 PostgreSQL** 和 **Cloudflare D1**。
- **实施步骤**:
  1.  **安装 Drizzle 核心及驱动依赖**:
      - `pnpm add drizzle-orm`
      - `pnpm add pg @types/pg` (或 `postgres` 驱动)
      - `pnpm add better-sqlite3 @types/better-sqlite3`
      - `pnpm add -D drizzle-kit`
  2.  **定义统一 Schema**:
      - 在 `src/lib/db/schema.ts` 中，使用 Drizzle 的语法，重新定义 `Settings`, `ApiKeys`, `RequestLogs`, `ErrorLogs` 等所有表结构。
  3.  **实现动态数据库客户端 (`src/lib/db.ts`)**:
      - 创建一个 `db.ts` 文件，作为全项目唯一的数据库访问入口。
      - 在该文件中，编写条件化逻辑：
        - **如果 `process.env.D1` 存在**，则初始化并导出 D1 客户端。
        - **否则，如果 `process.env.DATABASE_URL` 存在**，则初始化并导出 PostgreSQL 客户端。
        - **否则（默认）**，则初始化并导出连接到本地 `local.db` 文件的 SQLite 客户端。
  4.  **重写所有数据库查询**:
      - 这是工作量最大的部分。将项目中所有使用 `Prisma Client` 的地方 (`prisma.apiKey.findMany`, etc.)，全部重写为从 `src/lib/db.ts` 导入统一的 `db` 对象，并使用 Drizzle 的语法进行查询。
      - 重点关注 `key.service.ts`, `settings.ts` 以及管理后台的 `actions.ts`。
  5.  **配置迁移工具 (`drizzle.config.ts`)**:
      - 配置 `drizzle-kit`，使其能够分别为 SQLite 和 PostgreSQL 生成不同的迁移文件。
  6.  **移除 Prisma**:
      - 在所有代码都迁移完成后，可以安全地卸载 `prisma` 和 `@prisma/client` 依赖，并删除 `prisma` 目录。
  7.  **编写/修改测试**:
      - 更新所有与数据库交互相关的测试用例，将 Prisma 的模拟替换为 Drizzle 的模拟，并确保可以针对不同的数据库后端进行测试。

---

#### **任务四：清理与优化依赖 (P1 - 高优先级)**

- **目标**: 移除与项目设计哲学冲突的二进制或非必要依赖。
- **实施步骤**:
  1.  **替换 `bcrypt`**:
      - **任务**: 将 `bcrypt` 替换为原生的 **Web Crypto API** (`crypto.subtle`)。
      - **位置**: 修改 `src/lib/auth.ts` (或相关认证逻辑文件)。
      - **实现**: 使用 `crypto.subtle.digest` 对 `AUTH_TOKEN` 进行哈希处理和验证。
      - **收益**: 移除一个重量级的二进制依赖，提升 Edge 兼容性。
  2.  **移除 `tw-animate-css` (P2 - 中等优先级)**:
      - **任务**: 移除该依赖，并使用原生 Tailwind CSS 功能重写所有动画。
      - **位置**: 修改 `tailwind.config.mjs`，在 `theme.extend.keyframes` 和 `theme.extend.animation` 中定义所需动画。
      - **收益**: 减少一个前端依赖，使样式配置更内聚。

---

### 3. 预期成果

完成以上核心任务后，项目将：

1.  **架构对齐**: 完全符合 `CONTINUATION_GUIDE.md` 中定义的无状态、轻量、Edge-First 的设计哲学。
2.  **性能提升**: 在边缘环境中的性能和可靠性将得到根本性改善。
3.  **路径兼容**: 对外 API 路径与原项目完全兼容，方便社区用户迁移。
4.  **技术债务清零**: 移除了所有主要的架构性技术债务，为后续的健康发展铺平道路。

只有在完成这些重构之后，团队才应该继续进行新功能的开发或优化工作。
