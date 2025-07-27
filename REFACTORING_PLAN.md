# Gemini Gateway 重构计划 (Refactoring Plan)

**目标:** 系统性地解决 `CODE_REVIEW.md` 中发现的所有问题，将项目提升至生产级质量。
**跟踪方式:** 完成一项任务后，在对应的 `[ ]` 中填入 `x`。

---

## 阶段零：基础结构迁移 (Phase 0: Foundational Structure Migration)

**目标:** 在所有大规模重构开始前，先将项目的文件结构调整为团队偏好的扁平化风格。

- **优先级:** **最高 (Highest)** - 必须首先完成

- [x] **任务 Z1: 移除 `src` 目录**
    - [x] **Z1.1:** 将 `src` 目录下的所有内容 (`app`, `lib`, `components`, `middleware.ts` 等) 移动到项目根目录。
    - [x] **Z1.2:** 修改 `tsconfig.json`，将 `compilerOptions.paths` 中的别名 `@/*` 的路径从 `"./src/*"` 更新为 `"./*"` (如果使用 `baseUrl`，则相应调整)。
    - [x] **Z1.3:** 修改 `tailwind.config.mjs`，更新 `content` 字段中的所有路径，移除 `src/` 前缀。
    - [x] **Z1.4:** 检查其他配置文件 (如 `eslint.config.mjs`)，确保没有硬编码的 `src/` 路径。
    - [x] **Z1.5:** 运行 `pnpm lint --fix` 和 `pnpm build` 以验证所有路径引用都已更正，并修复潜在问题。
    - [x] **Z1.6:** 删除空的 `src` 目录。

---

## 阶段一：紧急安全与配置修复 (Phase 1: Urgent Security & Configuration Fixes)

**目标:** 堵上所有高风险漏洞，确保项目在任何环境下都能安全、正确地启动。此阶段任务必须最优先完成。

- **优先级:** **关键 (Critical)**

- [x] **任务 A1: 修复认证配置漏洞**
    - [x] **A1.1:** 更新 `.env.example` 文件，加入 `AUTH_TOKEN` 和 `ALLOWED_TOKENS` 两个必需的配置项，并附上清晰的注释说明。
    - [x] **A1.2:** 在应用启动逻辑中（建议在根 `layout.tsx` 的服务器端部分）加入强制检查，如果 `AUTH_TOKEN` 未设置，则抛出错误并阻止应用启动。
    - [x] **A1.3:** 移除所有“首次登录设置密码”的相关前端和后端逻辑。

- [x] **任务 A2: 强化中间件安全**
    - [x] **A2.1:** 修改 `middleware.ts` 中的 `matcher`，使其默认拦截所有未经明确排除的请求。
    - [x] **A2.2:** 重写中间件逻辑，采用“白名单”模式，明确定义公共路径、API 路径和受保护的前端路径，并对它们应用各自的认证策略。

- [x] **任务 A3: 清理生产依赖**
    - [x] **A3.1:** 将 `drizzle-kit` 从 `package.json` 的 `dependencies` 移动到 `devDependencies`。

---

## 阶段二：核心架构重构 (Phase 2: Core Architecture Refactoring)

**目标:** 重新设计系统的核心数据处理流水线和密钥管理机制，解决并发问题，建立清晰的、可扩展的架构。

- **优先级:** **高 (High)**

- [x] **任务 B1: 重构密钥管理 (Key Management)**
    - [x] **B1.1:** 修改数据库 `schema.ts`，从 `apiKeys` 表中删除 `failCount` 字段，增加 `disabledUntil` (DateTime) 字段。
    - [x] **B1.2:** 生成并应用新的数据库迁移。
    - [x] **B1.3:** 在 `key.service.ts` (或重命名为 `key_manager.ts`) 中，重写 `getNextWorkingKey` 以使用 `disabledUntil` 进行查询。
    - [x] **B1.4:** 重写 `handleApiFailure`，使其在失败时设置 `disabledUntil`，而不是增加计数器。
    - [x] **B1.5:** 删除不再需要的 `checkAndReactivateKeys` 函数及其相关的所有调用（包括 CRON 任务）。

- [x] **任务 B2: 建立清晰的适配器与核心层**
    - [x] **B2.1:** 创建 `(adapters)` 目录，并将 `transforms` 中的所有转换逻辑移动至此，按协议（如 `openai.adapter.ts`）重新组织。
    - [x] **B2.2:** 创建 `(core)` 目录，用于存放新的核心逻辑。
    - [x] **B2.3:** 在 `(core)` 中创建 `gemini_client.ts`，封装所有对 Gemini API 的 `fetch` 调用、重试逻辑，并集成新的密钥管理器（任务 B1 的产物）。

- [x] **任务 B3: 重构 API 路由**
    - [x] **B3.1:** 逐一重构 `/openai`、`/anthropic` 下的所有 API 路由。
    - [x] **B3.2:** 在路由中，严格遵循 `认证 -> 请求适配 -> 调用核心客户端 -> 响应适配 -> 返回` 的处理流程。
    - [x] **B3.3:** 确保所有路由都不再直接处理 `fetch`、重试或密钥选择，这些都应由 `gemini_client.ts` 负责。

---

## 阶段三：项目结构与部署体验优化 (Phase 3: Structure & Deployment Experience)

**目标:** 优化项目的文件结构和 Docker 部署流程，让新贡献者和用户都能轻松上手。

- **优先级:** **中 (Medium)**

- [x] **任务 C1: 调整项目目录结构 (采用路由组)**
    - [x] **C1.1:** 在 `app` 目录下创建 `(api)` 和 `(webapp)` 两个路由组文件夹。
    - [x] **C1.2:** 将所有 API 相关的路由（`openai`, `anthropic`, `gemini` 等）移动到 `app/(api)` 目录下。
    - [x] **C1.3:** 将所有面向用户的前端页面（`[lang]` 目录等）移动到 `app/(webapp)` 目录下。
    - [x] **C1.4:** 审查并调整根 `layout.tsx` 和 `(webapp)/layout.tsx`，确保 API 路由不会被不必要的前端布局包裹。

- [ ] **任务 C2: 彻底简化 Docker 部署**
    - [ ] **C2.1:** 整理 `docker-compose.yml`，统一数据库路径和卷挂载，并使用 `env_file` 来加载 `.env`。
    - [ ] **C2.2:** 修正 `Dockerfile` 中的 `CMD` 指令，使其正确指向 `scripts/run.sh`。
    - [ ] **C2.3:** 确保 `run.sh` 脚本被赋予可执行权限 (`chmod +x`)。
    - [ ] **C2.4:** 更新 `README.md`，提供清晰、简单、 foolproof 的 Docker 启动指令。

---

## 阶段四：体验打磨 (Phase 4: Polishing & User Experience)

**目标:** 解决剩余的开发者体验 (DX) 和用户体验 (UX) 问题。

- **优先级:** **低 (Low)**

- [ ] **任务 D1: 优化开发脚本**
    - [ ] **D1.1:** 在 `package.json` 中提供 `dev` 和 `dev:pretty` 两个脚本。

- [ ] **任务 D2: 完善首次使用引导**
    - [ ] **D2.1:** 在登录页面增加明确的文本提示，告知用户使用 `AUTH_TOKEN` 登录。
    - [ ] **D2.2:** 在 Admin 后台主页增加逻辑判断：如果用户已登录，但系统中没有任何 API Keys，则显示一个欢迎和引导组件，指导用户添加并自动验证他们的第一个 Key。
