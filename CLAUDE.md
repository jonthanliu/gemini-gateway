# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js application that acts as an intelligent AI gateway for Google's Gemini models. It provides a unified API interface with endpoints compatible with OpenAI, Anthropic, and native Gemini protocols. Key features include load balancing across multiple API keys, automatic failover, and a web-based admin dashboard for managing keys and configurations.

The application is built with the Next.js App Router, TypeScript, and uses Drizzle ORM with SQLite for the database. The project structure has been flattened, and there is no `src` directory.

## High-Level Architecture

- **API Routes**: The core proxy logic is implemented as API routes within the `app/(api)` route group.
  - OpenAI compatibility: `app/(api)/openai/v1/`
  - Anthropic compatibility: `app/(api)/anthropic/v1/`
  - Native Gemini: `app/(api)/gemini/v1/`
- **WebApp Routes**: The frontend admin dashboard is located under the `app/(webapp)` route group. All WebApp routes are automatically prefixed with a language code (e.g., `/en/...`) by the middleware.
- **Key Management**: The `lib/services/key.service.ts` is responsible for managing the pool of Gemini API keys, including selection, load balancing, and tracking failures.
- **Configuration**: Application settings are managed through `lib/config/settings.ts` and can be configured dynamically via the admin dashboard.
- **Database**: The project uses SQLite with Drizzle ORM. The schema is defined in `lib/db/schema.ts`, and migrations are handled by `drizzle-kit`.
- **Admin Dashboard**: A React-based UI under `app/(webapp)/[lang]/admin/` allows for real-time management of API keys, settings, and viewing logs.
- **Authentication**: A central middleware at `./middleware.ts` protects all non-public routes. It handles both API token validation and WebApp cookie-based authentication.

## Common Development Commands

- **Install dependencies**:
  ```bash
  pnpm install
  ```
- **Run development server**:
  ```bash
  pnpm dev
  ```
- **Run tests**:
  ```bash
  pnpm test
  ```
- **Lint code**:
  ```bash
  pnpm lint
  ```
- **Build for production**:
  ```bash
  pnpm build
  ```
- **Start production server**:
  ```bash
  pnpm start
  ```
- **Generate database migrations**:
  ```bash
  pnpm db:generate
  ```
- **Apply database migrations (development)**:
  ```bash
  pnpm db:migrate
  ```
- **Apply database migrations (production)**:
  ```bash
  pnpm db:migrate:prod
  ```

## 项目简介

本项目是一个把 OpenAI、anthropic 和 Gemini 大语言模型协议转发到 Gemini 池的开源应用服务。具体的工作流程是：

1. 接到上游大模型 API 发来的请求，
2. 根据路由确定是哪家模型，
3. 解析请求数据，
4. 选定合适的下游大模型（目前仅支持 gemini-2.5-pro，所有请求都在此模型处理），
5. 组合下游大模型数据，
6. 根据调度选定 Gemini 的 key，
7. 向下游 API 发送 数据，
8. 获取数据，
9. 转换成上游可识别的响应（流式或非流式），
10. 向上游大模型发送响应。

## 一些知识点

- middleware：https://nextjs.org/docs/app/api-reference/file-conventions/middleware
- async params：https://nextjs.org/docs/messages/sync-dynamic-apis

## **2. 你的标准作业流程 (SOP) - 必须严格遵守**

你必须按照以下步骤，一步一步地、有条不紊地开展工作。**禁止跳过任何步骤**。

**第 1 步：确定当前任务**

- **行动**: 读取并分析项目的工作清单文件。
- **输出**: 识别出**优先级最高**的、尚未完成的**第一个任务**。在思考过程中明确说出你将要执行的任务名称。

**第 2 步：理解任务细节**

- **行动**: 仔细阅读任务描述，分析需要修改或创建哪些文件。不要对项目的实现做预设假定，遇到需要选择的问题必须停下来等待确认方可继续。如果需要，回顾相关的评估报告以加深理解。
- **输出**: 在思考过程中，简要陈述你对任务的理解和计划采用的技术方案。

**第 3 步：执行任务 (编码与修改)**

- **行动**: 使用 `read_file`, `write_to_file`, `replace_in_file` 等工具，对项目文件进行必要的修改。
- **原则**:
  - **小步快跑**: 每次只做一个小的、逻辑上完整的修改。例如，先修改一个文件，然后验证，再修改下一个。
  - **代码质量**: 确保你的代码风格与项目现有代码保持一致，清晰、简洁、可读。
  - **测试驱动 (TDD)**: 如果任务涉及核心逻辑变更，你应该先思考或编写测试用例（即使在当前环境下无法直接运行测试，也要在思考中体现出测试的意图）。

**第 4 步：验证与测试**

- **行动**: 在完成一个任务的所有修改后，进行自我验证和测试思考。
- **输出**:
  - 思考并确认你的修改是否完全达成了任务目标。
  - 思考并确认你的修改是否引入了新的问题或副作用。
  - 根据 `CONTINUATION_GUIDE.md` 的 TDD 要求，思考并设计相应的单元测试或集成测试用例。
  - 如果任务是移除依赖，请使用 `execute_command` 工具执行 `pnpm remove [package-name]`。

**第 4.5 步：创建 Git 提交**

- **背景**: 此步骤遵循 `docs/CONTINUATION_GUIDE.md` 中定义的质量保证流程。
- **行动**:
  1.  使用 `execute_command` 执行 `git add .` 来暂存所有已修改的文件。
  2.  使用 `execute_command` 执行 `git commit -m "..."` 来提交更改。
- **原则**:
  - **提交规范**: 严格遵循**约定式提交 (Conventional Commits)** 规范撰写提交信息 (例如: `feat(orm): implement feature X`)。
  - **自动化检查**: 已知项目中配置了 `pre-commit` 钩子，提交时会自动运行 Linter 和测试。如果检查失败，必须修复问题后才能重新提交。

**第 5 步：任务完成，循环开始**

- **行动**: 在**成功创建 Git 提交**后，你应该**立即回到第 1 步**，重新读取工作计划，开始下一个任务。
- **原则**: 严格按照计划清单的优先级顺序执行，不要自行决定任务顺序。
