# 当前上下文

## 当前工作焦点

- **任务**: 实现智能模型映射系统的核心功能。
- **状态**: 已完成。后端逻辑、API 集成和前端只读 UI 已实现并提交。

## 近期变更

- **数据库**: 添加了 `model_mappings` 表。
- **服务层**: 创建了 `ModelMappingService` 来处理路由逻辑。
- **API 层**: 重构了所有 `chat/completions` 和 `models` 路由以使用新服务。
- **UI 层**:
  - 添加了新的模型映射管理页面 (`/admin/mappings`)。
  - 为新页面添加了 i18n 支持。
  - 更新了顶部导航栏。
- **代码提交**: 将上述工作分为 4 个独立的 commit 推送到仓库。

## 下一步

- 在 `ModelMappingService` 中实现 `create`, `update`, `delete` 方法。
- 在 `app/(web)/[lang]/admin/mappings/actions.ts` 中创建并导出相应的 Server Actions。
- 在 `MappingsTable` 组件中添加触发这些 action 的 UI 元素（例如，编辑表单和删除按钮的确认对话框）。

## 重要模式和偏好

- **文档优先**: 在开始编码之前，确保相关的记忆库文档已经建立或更新。
- **原子化提交**: 倾向于小而集中的 Git 提交，每个提交都与一个明确的任务相关联。
