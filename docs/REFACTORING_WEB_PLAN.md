# WebApp 重构计划与进度

本文档旨在追踪 Gemini Gateway WebApp 重构过程中的进度与架构决策。

## 第一阶段：奠定基础架构 (已完成)

本初始阶段的核心目标是为重构后的前端应用建立一个全新的、健壮的、且与旧代码完全隔离的开发环境。

### 1. 隔离旧代码
- **操作**: 将旧的路由组 `app/(webapp)` 重命名为 `app/(webapp)_deprecated`。
- **目的**: 此操作安全地停用了所有旧路由，避免了 URL 冲突，同时完整地保留了旧代码库，以供参考和渐进式迁移。

### 2. 建立新的 `(web)` 路由组
- **操作**: 创建了一个全新的、平行的路由组 `app/(web)`。
- **目的**: 为新的前端架构提供了一个干净、隔离的工作空间，确保不受旧实现的影响。

### 3. 分离 WebApp 认证逻辑
- **操作**: 创建了新文件 `lib/auth/web_auth.ts`，用于存放 WebApp 专属的认证逻辑。现有的 `lib/auth/auth.ts` 将只负责 API 认证。
- **目的**: 此举将两个关键的认证体系（WebApp 会话 与 API 令牌）解耦，使它们可以独立演进，避免潜在的副作用。

### 4. 构建新的 `admin` 架构
- **操作**: 在 `app/(web)/[lang]/admin` 下创建了新的、更有组织的目录结构，包括专用的 `actions` 和 `components` 子目录。
- **目的**: 与旧代码的扁平化布局相比，这种模块化的结构更具可扩展性和可维护性。

### 5. 实现服务端认证守卫
- **操作**: 为 `admin` 路由创建了一个新的 `layout.tsx`。
- **功能**: 这是一个**服务器组件**，充当了整个管理后台的中央安全门。它在渲染任何 UI 之前，**在服务器端**使用 `checkAuthState` 辅助函数验证用户登录状态。根据验证结果，它会条件性地渲染仪表盘的主布局（如包含页眉），或直接将未授权用户传递给页面（此时页面将渲染登录表单）。

### 6. 实现条件化页面渲染
- **操作**: 为 `admin` 路由创建了一个新的 `page.tsx`。
- **功能**: 这是一个**服务器组件**，充当了逻辑路由器的角色。它获取用户的认证状态和应用的状态（即是否已存在 API 密钥），然后根据这些信息渲染三个组件之一：
  1.  `LoginForm` (如果未登录)
  2.  `Onboarding` (如果已登录但无密钥)
  3.  `Dashboard` (如果已登录且有密钥)
- **目的**: 这种以服务器为中心的方法非常高效和安全，它避免了页面内容闪烁，并确保从首次渲染开始就向客户端提供正确的 UI。

### 7. 搭建新登录流程骨架
- **操作**: 创建了新的 `LoginForm` 客户端组件及其对应的 `login` Server Action 的骨架。
- **功能**: 这确立了使用 `useActionState` 和 `useFormStatus` 的现代化表单处理模式，无需传统的 API 端点，即可直接将客户端表单连接到服务端逻辑，提供了响应灵敏且友好的用户体验。

### 8. 实现安全登录流程
- **操作**:
  1.  添加 `jsonwebtoken` 依赖用于处理 JWT。
  2.  在 `lib/auth/web_auth.ts` 中实现了 JWT 的签发 (`signJwtForWebApp`) 和验证 (`verifyJwtForWebApp`) 逻辑，并确保 `WEB_JWT_SECRET` 仅通过环境变量配置，增强了安全性。
  3.  创建了 `login` Server Action (`app/(web)/[lang]/admin/actions/login.action.ts`)，负责处理用户密码验证、JWT 签发，并通过 `httpOnly` Cookie 安全地存储令牌。
  4.  在 `login` Action 成功后，使用 `revalidatePath` 和 `redirect` 来更新UI并导航到管理后台，确保了流畅的用户体验。
  5.  更新了 `LoginForm.tsx` 客户端组件，使其与 `login` Action 的状态和数据结构完全兼容。
- **目的**: 将原有的骨架升级为功能完整的、安全的、基于 JWT 的 WebApp 登录系统。

### 9. 重构 Onboarding 和密钥添加流程
- **策略**: 采用可复用组件的思路，避免代码重复。
- **操作**:
  1.  创建了一个核心的、与布局无关的 `KeyForm.tsx` 组件，封装了所有 API 密钥输入的表单逻辑，并支持 i18n。
  2.  创建了一个统一的 Server Action `key.action.ts`，用于处理密钥的添加和验证。
  3.  重构了 `Onboarding.tsx` 组件，使其作为一个简单的页面容器，包裹 `KeyForm`，用于初始设置流程。
  4.  创建了新的 `AddKeyDialog.tsx` 组件，它将 `KeyForm` 包裹在一个对话框中，用于未来在仪表盘上添加密钥。
  5.  更新了 `admin/page.tsx`，确保在需要时能正确渲染新的 `Onboarding` 组件，并传递 i18n 字典。
- **目的**: 实现了一个健壮、可维护、可复用的密钥添加流程，同时服务于初始引导和后续的密钥管理。

---

至此，基础架构搭建工作已全部完成。新架构现已准备就绪，可以开始进行功能迁移。

---

## 第二阶段：核心功能迁移 (已完成)

本阶段的目标是将旧 `(webapp)_deprecated` 中的核心管理功能迁移到新的 `(web)` 架构中。

### 1. 迁移仪表盘 (Dashboard)
- **策略**: 采用服务端组件 (`RSC`) 优先的原则，将数据获取和业务逻辑尽可能地放在服务器端。
- **操作**:
  1. 创建了新的 `Dashboard.tsx` 异步服务器组件，负责在内部并行获取所有密钥 (`getAllKeys`) 和系统统计数据 (`getSystemApiCallStats`)。
  2. 重构了 `DashboardStats.tsx`，使其同时展示密钥统计和系统调用统计，并恢复了点击弹出详情的功能。
  3. 迁移并重构了 `KeyList.tsx`, `KeyTable.tsx`, `KeyUsageDetail.tsx`, `KeyStatsDetail.tsx`, `ApiCallStatsDetail.tsx` 等一系列子组件，确保它们与新的数据流和类型定义兼容。
  4. 调整了 `admin/page.tsx`，使其在用户登录且已配置密钥后，直接渲染自包含的 `Dashboard` 组件。
- **目的**: 实现了一个性能更优、逻辑更内聚的仪表盘，将数据获取的责任从页面层下移到了组件层。

### 2. 迁移配置页面 (Config)
- **策略**: 将数据库操作严格限制在服务层，Action 层只做调用和处理 HTTP 相关的逻辑。
- **操作**:
  1. 创建了新的 `config.service.ts` 服务，封装了所有与配置读写相关的数据库逻辑。
  2. 创建了新的 `config.action.ts`，其中的 `updateSettingsAction` 只负责调用服务并触发缓存失效 (`revalidatePath`)。
  3. 创建了新的 `config/page.tsx` 路由，负责获取初始设置并传递给表单。
  4. 迁移了 `ConfigForm.tsx` 和 `DynamicListInput.tsx` 组件，并改进了其类型安全。
- **目的**: 建立了清晰的逻辑分层，使配置管理功能更健壮、更易于维护。

### 3. 迁移日志页面 (Logs)
- **策略**: 遵循与配置页面相同的分层原则。
- **操作**:
  1. 创建了新的 `log.service.ts` 服务，封装了所有日志查询、删除的数据库逻辑。
  2. 创建了新的 `log.action.ts`，为服务函数提供 wrappers。
  3. 创建了新的 `logs/page.tsx` 路由，负责解析 URL 查询参数并发起初始的日志数据请求。
  4. 迁移了 `LogViewer.tsx` 及其所有子组件 (`FilterBar.tsx`, `LogTable.tsx`, `LogDetailsDialog.tsx`)，并修复了其中所有的类型错误和未使用的变量。
- **目的**: 完成了日志查看功能的现代化改造，使其与新的架构完全集成。

### 4. 修复与重构
- 在整个迁移过程中，修复了大量的 `eslint` 错误、`TypeScript` 类型错误、运行时错误和逻辑缺陷。
- 重构了 `key.service.ts` 和 `key.action.ts`，统一了数据库操作的出口，并大大增强了 `addApiKeys` 等核心功能的健壮性。

