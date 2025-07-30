# 实施计划：智能模型映射系统

**版本**: 2.0
**状态**: 待开始
**架构师**: Claude Code

## 1. 简介与目标

本文档为 "智能模型映射系统" 功能的详细实施计划，旨在为开发团队提供清晰的指引。其核心目标是将当前系统中硬编码的模型路由逻辑，重构为一个由数据库驱动、可通过后台动态配置的、灵活且可扩展的智能路由系统。

**本文档的核心目的**：作为项目实施的“蓝图”和“检查点”。如果开发工作因任何原因中断，任何团队成员都能依据此文档快速理解上下文、掌握技术细节，并无缝地继续推进工作。

---

## 2. 核心架构设计

新架构将围绕 **一个中心数据表 (`model_mappings`)** 和 **一个核心服务 (`ModelMappingService`)** 构建。

- **数据模型**: `model_mappings` 表是真理的唯一来源，定义了所有路由规则。
- **服务层**: `ModelMappingService` 封装了所有与路由决策相关的复杂逻辑。
- **API 层**: 所有 API 路由（Chat Completions, Models List 等）都将调用 `ModelMappingService` 来获取决策，自身不再包含路由逻辑。
- **UI 层**: 管理后台将通过 **Server Actions** 直接与 `ModelMappingService` 交互，实现对路由规则的实时管理。

![Architecture Diagram](https://i.imgur.com/example.png) _（这是一个占位符，示意图展示了请求如何通过服务层和数据表进行路由决策）_

---

## 3. 工作分解与核心实现细节

### **阶段一：后端基础与核心逻辑**

#### **任务 1.1: 数据库 Schema 定义**

**目标**: 建立 `model_mappings` 表的结构。

**文件**: `lib/db/schema.ts`

**核心实现**: 使用 Drizzle ORM 添加以下 schema 定义。我们采用单一 `source_name` 字段结合 `priority` 来处理精确和模板匹配，无需 `is_template` 字段。

```typescript
// lib/db/schema.ts

import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// ... other schemas

export const modelMappings = sqliteTable("model_mappings", {
  id: integer("id").primaryKey(),
  source_name: text("source_name").notNull(), // e.g., "gpt-4-*", "claude-3-opus-20240229", or "__DEFAULT__"
  source_protocol: text("source_protocol", {
    enum: ["openai", "anthropic", "gemini"],
  }).notNull(),
  priority: integer("priority").default(0).notNull(), // Higher number means higher priority for template matches

  target_name: text("target_name").notNull(), // e.g., "gemini-2.5-pro-latest"
  target_provider: text("target_provider", { enum: ["gemini"] })
    .default("gemini")
    .notNull(), // For future expansion
  target_endpoint: text("target_endpoint").notNull(), // e.g., "v1beta/models/{model}:streamGenerateContent"

  capabilities: text("capabilities", { mode: "json" }).$type<{
    vision: boolean;
    tool_calling: boolean;
    json_mode: boolean;
  }>(),
  constraints: text("constraints", { mode: "json" }).$type<{
    context_window: number;
    max_output_tokens: number;
  }>(),

  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(strftime('%s', 'now'))`
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(
    sql`(strftime('%s', 'now'))`
  ),
});
```

**后续步骤**:

1.  `pnpm db:generate`
2.  `pnpm db:migrate`

#### **任务 1.2: 核心映射服务 (`ModelMappingService`)**

**目标**: 封装所有路由查找和管理的逻辑。

**文件**: `lib/services/model-mapping.service.ts`

**核心实现**:

```typescript
// lib/services/model-mapping.service.ts
import { db } from "@/lib/db";
import { modelMappings } from "@/lib/db/schema";
import { and, eq, like, notLike, desc } from "drizzle-orm";

// Define a type for a mapping rule
export type ModelMapping = typeof modelMappings.$inferSelect;

class ModelMappingService {
  /**
   * The core routing logic. Finds the best mapping rule for a given request.
   */
  async findMapping(
    protocol: string,
    modelName: string
  ): Promise<ModelMapping | null> {
    // 1. Exact Match First
    const exactMatch = await db.query.modelMappings.findFirst({
      where: and(
        eq(modelMappings.source_protocol, protocol),
        eq(modelMappings.source_name, modelName),
        notLike(modelMappings.source_name, "%*%") // Ensure it's not a template
      ),
    });
    if (exactMatch) return exactMatch;

    // 2. Template Match if no exact match is found
    const templateRules = await db.query.modelMappings.findMany({
      where: and(
        eq(modelMappings.source_protocol, protocol),
        like(modelMappings.source_name, "%*%")
      ),
      orderBy: [desc(modelMappings.priority)], // Highest priority first
    });

    for (const rule of templateRules) {
      const regex = new RegExp(
        "^" + rule.source_name.replace(/\*/g, ".*") + "$"
      );
      if (regex.test(modelName)) {
        return rule; // Return first matching template
      }
    }

    // 3. Fallback to Default if no other rule matches
    const defaultRule = await db.query.modelMappings.findFirst({
      where: and(
        eq(modelMappings.source_protocol, protocol),
        eq(modelMappings.source_name, "__DEFAULT__")
      ),
    });
    return defaultRule || null;
  }

  /**
   * Lists all configured source models for the /v1/models endpoint.
   */
  async listAvailableModels(
    protocol: string
  ): Promise<Pick<ModelMapping, "source_name">[]> {
    return db
      .select({ source_name: modelMappings.source_name })
      .from(modelMappings)
      .where(eq(modelMappings.source_protocol, protocol));
  }

  // Standard CRUD operations to be called by Server Actions
  async list() {
    /* ... */
  }
  async create(data: Omit<ModelMapping, "id" | "createdAt" | "updatedAt">) {
    /* ... */
  }
  async update(id: number, data: Partial<Omit<ModelMapping, "id">>) {
    /* ... */
  }
  async delete(id: number) {
    /* ... */
  }
}

export const modelMappingService = new ModelMappingService();
```

### **阶段二：适配器与 API 路由集成**

#### **任务 2.1: 实现动态 `v1/models` 路由**

**目标**: 让 `/v1/models` 接口动态返回当前网关支持的模型列表。

**文件**: `app/(api)/openai/v1/models/route.ts` (及其他协议的同名文件)

**核心实现**:

```typescript
// app/(api)/openai/v1/models/route.ts
import { modelMappingService } from "@/lib/services/model-mapping.service";
import { NextResponse } from "next/server";

export async function GET() {
  const availableMappings = await modelMappingService.listAvailableModels(
    "openai"
  );

  const modelsData = availableMappings
    .filter((m) => m.source_name !== "__DEFAULT__") // Don't advertise the default rule
    .map((mapping) => ({
      id: mapping.source_name,
      object: "model",
      created: Date.now() / 1000,
      owned_by: "gemini-gateway",
    }));

  return NextResponse.json({
    object: "list",
    data: modelsData,
  });
}
```

#### **任务 2.2 & 2.3: 重构适配器**

**目标**: 将所有协议的 `chat/completions` 路由中的硬编码逻辑替换为服务调用。

**文件**: `app/(api)/openai/v1/chat/completions/route.ts` (等)

**核心实现 (伪代码)**:

```typescript
// BEFORE
// const model = 'gemini-2.5-pro'; // Hardcoded
// const stream = req.stream;

// AFTER
import { modelMappingService } from "@/lib/services/model-mapping.service";
const body = await request.json();
const requestedModel = body.model;

const mapping = await modelMappingService.findMapping("openai", requestedModel);

if (!mapping) {
  return new NextResponse(
    JSON.stringify({ error: `Model not supported: ${requestedModel}` }),
    { status: 404 }
  );
}

// Use mapping to build the downstream request
const targetModel = mapping.target_name;
const targetEndpoint = mapping.target_endpoint; // This informs if it's streaming or not

// ... continue with request transformation and sending to Gemini
```

### **阶段三：管理后台界面**

#### **任务 3.1: 模型映射管理 UI (采用 Server Actions)**

**目标**: 提供一个完整的 CRUD 界面，无需独立的 API 路由。

**文件**: `app/(webapp)/[lang]/admin/mappings/page.tsx`

**核心实现**:

1.  **页面组件 (数据展示)**:

    ```tsx
    // app/(webapp)/[lang]/admin/mappings/page.tsx
    import { modelMappingService } from "@/lib/services/model-mapping.service";
    import { MappingsTable } from "./_components/mappings-table";

    export default async function MappingsPage() {
      const mappings = await modelMappingService.list();
      return (
        <div>
          <h1>Model Mappings</h1>
          <MappingsTable data={mappings} />
        </div>
      );
    }
    ```

2.  **表单操作 (Server Action)**:

    ```typescript
    // app/(webapp)/[lang]/admin/mappings/actions.ts
    "use server";
    import { modelMappingService } from "@/lib/services/model-mapping.service";
    import { revalidatePath } from "next/cache";

    export async function createMappingAction(formData: FormData) {
      const data = {
        /* extract from formData */
      };
      // Perform validation
      await modelMappingService.create(data);
      revalidatePath("/admin/mappings"); // Refresh the page
    }
    // ... similar actions for update and delete
    ```

3.  **表单组件**:

    ```tsx
    // In a client component, e.g., a modal form
    import { createMappingAction } from "./actions";

    <form action={createMappingAction}>
      {/* Form inputs for source_name, priority, target_name, etc. */}
      <button type="submit">Save</button>
    </form>;
    ```

### **阶段四：测试与文档**

#### **任务 4.1 & 4.2: 测试**

**目标**: 确保新逻辑的正确性和健壮性。

**核心测试用例**:

- **单元测试 `ModelMappingService`**:
  - `findMapping` 能正确返回精确匹配。
  - `findMapping` 在无精确匹配时，能返回优先级最高的模板匹配。
  - `findMapping` 在无任何匹配时，能返回 `__DEFAULT__` 规则。
  - `findMapping` 在连 `__DEFAULT__` 都没有时，返回 `null`。
- **E2E 测试**:
  - `GET /openai/v1/models` 返回的列表与数据库配置一致。
  - `POST /openai/v1/chat/completions`
    - 使用模型 `gpt-4o` (精确匹配) -> 路由到其指定的目标。
    - 使用模型 `gpt-4-turbo-2024-04-09` (模板匹配 `gpt-4-*`) -> 路由到模板指定的目标。
    - 使用模型 `unconfigured-model` (无匹配) -> 路由到 `__DEFAULT__` 规则的目标。
    - 使用不存在的模型且无 `__DEFAULT__` 规则 -> 返回 404 错误。

### **阶段五：部署与上线**

#### **任务 5.1: 初始化生产数据**

**目标**: 确保系统上线后立即可用，避免服务中断。

**核心实现**: 准备一个 SQL 脚本或在部署流程中加入一个种子文件，插入至少一条默认规则。

```sql
INSERT INTO model_mappings (source_name, source_protocol, priority, target_name, target_provider, target_endpoint)
VALUES ('__DEFAULT__', 'openai', 0, 'gemini-2.5-flash-latest', 'gemini', 'v1beta/models/gemini-2.5-flash-latest:streamGenerateContent');

INSERT INTO model_mappings (source_name, source_protocol, priority, target_name, target_provider, target_endpoint)
VALUES ('__DEFAULT__', 'anthropic', 0, 'gemini-2.5-flash-latest', 'gemini', 'v1beta/models/gemini-2.5-flash-latest:streamGenerateContent');
```

**(注意: `target_endpoint` 需根据实际情况确认)**

---

这份文档提供了从设计到部署的完整路径和技术细节，足以指导任何开发者完成此项任务。
