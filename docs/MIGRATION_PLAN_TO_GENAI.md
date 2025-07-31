# 迁移工作清单：从 @google/generative-ai 到 @google/genai (深度分析版)

核心问题在于，新旧 SDK 在**数据结构和类型定义**上存在根本差异，这会沿着数据流影响到项目的多个层面。

---

### **1. 依赖管理与类型探索 (准备阶段)**

- [ ] **替换依赖**: 在 `package.json` 中，将 `@google/generative-ai` 替换为 `@google/genai`，并运行 `pnpm install`。
- [ ] **关键：类型探索**: 在修改任何代码之前，首先深入研究 `@google/genai` 的类型定义文件 (`index.d.ts`)。必须明确以下新类型：
  - `generateContent` 方法的完整参数对象结构，特别是 `contents` 和 `config` 的类型。
  - `generateContent` 方法的同步返回结果类型。
  - `generateContentStream` 方法返回的异步迭代器中，每个 `chunk` 的确切类型。

### **2. 适配器层重构 (`lib/adapters/`) - [核心工作]**

这是受影响最严重的区域，因为它们是请求和响应数据的生产者和消费者。

- [ ] **请求构建重构 (`*-to-gemini.ts`)**:
  - **目标**: 修改所有将请求转换为 Gemini 格式的适配器。
  - **任务**: 必须重写其逻辑，不能再生成一个单一的 `GenerateContentRequest` 对象。而是需要根据源请求（如 OpenAI 请求），分别构建出符合新 SDK 签名的 `contents` 和 `config` 对象。
- [ ] **响应处理重构 (`gemini-to-*.ts`)**:
  - **目标**: 修改所有处理 Gemini 响应的适配器。
  - **任务**: 必须重写其逻辑，以正确处理来自新 SDK 的、结构已改变的响应对象和流式 `chunk`。

### **3. 核心客户端重构 (`lib/core/gemini-client.ts`)**

在适配器层准备好提供新格式的数据后，再修改客户端。

- [ ] **更新方法签名**: 更改 `generateContent` 和 `streamGenerateContent` 的方法签名。它们不再接受旧的 `GenerateContentRequest`，而是接受由适配器层准备好的、符合新 SDK 需求的新参数（例如 `contents` 和 `config`）。
- [ ] **更新内部实现**:
  - 在 `attemptRequest` 中，使用 `new GoogleGenAI({ apiKey })` 创建实例。
  - 调用 `ai.models.generateContent(...)` 或 `ai.models.generateContentStream(...)`，传入新的参数。
  - 更新 `transformStream` 的实现，以正确处理和 `yield` 新的 `chunk` 类型。

### **4. 测试验证**

- [ ] **全面更新测试**:
  - 重写 `__tests__/lib/core/gemini-client.test.ts`。
  - 重写所有依赖 Gemini 适配器的单元测试和集成测试。
  - **关键**: Mock 的请求数据和响应数据结构必须完全更新，以匹配新 SDK 的格式。
- [ ] **执行完整测试**: 运行所有相关测试，确保端到端逻辑无误。

### **5. 文档同步**

- [ ] **更新技术栈**: 在 `memory-bank/techContext.md` 中更新 Google AI SDK 的包名。
- [ ] **跟踪进展**: 在 `memory-bank/activeContext.md` 和 `progress.md` 中创建新条目来记录此迁移任务。
