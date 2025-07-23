# 项目交接摘要 (2025-07-23)

本文档旨在为新接手 `Gemini Balance Next.js` 项目的开发人员提供一个全面、深入的背景介绍。文档总结了近期完成的关键重构工作、项目的核心设计理念、标准作业流程 (SOP) 以及当前的已知问题。

---

## 1. 项目概述

`Gemini Balance Next.js` 是一个旨在为大型语言模型（LLM）提供负载均衡和密钥管理服务的开源项目。其核心功能包括：

- **多密钥轮询**: 通过轮询机制管理多个 LLM API 密钥，以分摊请求负载。
- **失败重试**: 自动处理 API 请求失败，并尝试使用下一个可用密钥。
- **统一 API 端点**: 提供与 OpenAI 和 Gemini API 兼容的端点，方便客户端集成。
- **管理后台**: 提供一个用于监控密钥状态、查看日志和管理系统配置的 Web UI。

---

## 2. 核心设计哲学

所有开发工作都应严格遵循以下核心理念，这些理念是项目架构决策的基石：

- **开源优先**: 代码必须易于理解、部署和贡献。
- **简化配置**: 追求“零环境变量”的开箱即用体验，最大程度减少用户的部署负担。
- **减少依赖**: 审慎引入外部依赖，优先使用平台原生能力（如 Web Standards API, Next.js 功能）而非第三方库。
- **灵活部署 (Edge-First)**: 架构首要为 Vercel/Cloudflare 等边缘计算平台优化，同时必须保留在标准 Node.js/Docker 环境中通过 PostgreSQL 自托管的能力。

---

## 3. 近期关键重构工作总结

在本次交接之前，项目完成了一项大规模的架构重构，以偿还技术债务并使项目与上述设计哲学完全对齐。主要工作包括：

### a. ORM 从 Prisma 迁移到 Drizzle

- **目标**: 解决 Prisma 二进制依赖与 Edge 环境不兼容的问题。
- **实施**:
  - 项目中的所有数据库查询已从 Prisma Client 重写为 Drizzle ORM 的语法。
  - `prisma` 依赖已从项目中完全移除。
  - 迁移文件目录已从 `prisma/migrations` 重命名并移动到 `drizzle/migrations`，以避免混淆。
  - `drizzle.config.ts` 和 `next.config.ts` 已更新，以反映新的目录结构和多数据库（PostgreSQL, SQLite）支持。

### b. 核心服务无状态重构

- **目标**: 移除有状态的单例 `KeyManager`，使其适应 Serverless/Edge 环境。
- **实施**:
  - 创建了 `src/lib/services/key.service.ts`，这是一个无状态的服务，所有操作（如获取下一个可用密钥、记录失败）都直接与数据库交互。
  - 密钥选择策略从内存中的轮询（依赖 `itertools`）改为基于数据库的“最久未使用”（LRU）策略。
  - `itertools` 依赖已被移除。

### c. 认证系统 `bcrypt` 替换为 Web Crypto API

- **目标**: 移除 `bcrypt` 这个与 Node.js 绑定的二进制依赖，以实现完全的 Edge 兼容性。
- **技术选型**:
  - 经过对 `bcryptjs`, `bcrypt-ts` 和 Web Crypto API 的综合评估，最终选择了 **Web Crypto API**。
  - **原因**: 它是零依赖的 Web 标准，由平台原生实现，性能最高，最符合项目的设计哲学。
- **实施**:
  - 创建了 `src/lib/crypto.ts` 模块，其中包含使用 `PBKDF2` 算法进行哈希生成 (`hashToken`) 和验证 (`verifyToken`) 的函数。
  - 项目中所有使用 `bcrypt` 的地方（主要在管理后台的登录和设置更新流程中）都已替换为调用新的 `crypto.ts` 模块。
  - 为新的 `crypto.ts` 模块编写了全面的单元测试 (`__tests__/lib/crypto.test.ts`)。
  - `bcrypt` 和 `@types/bcrypt` 依赖已从项目中完全移除。

### d. 其他依赖与配置清理

- **`tw-animate-css`**: 这个非必要的动画库已被移除。
- **Cloudflare D1 支持**: 在评估过程中，暂时放弃了对 D1 的直接支持，以简化当前配置。相关代码和依赖已清理。

---

## 4. 标准作业流程 (SOP)

为了保证代码质量和开发效率，所有后续工作都必须遵循以下流程：

1.  **任务驱动**: 所有开发任务都来源于 `docs/3_Development_Plans/` 目录下的计划文件。
2.  **测试驱动开发 (TDD)**: 在编写或修改任何核心逻辑之前，必须先在 `__tests__/` 目录下为其编写或更新单元测试。
3.  **原子化提交**: 每个 Git 提交应只包含一个逻辑上完整的任务及其相关测试。
4.  **自动化质量门禁**: 项目已配置 Husky `pre-commit` 钩子。在每次 `git commit` 时，会自动运行 Linter 和 Vitest 测试。**任何失败都会导致提交被中止**，必须修复所有问题后才能重新提交。

---

## 5. 当前已知问题与下一步工作

**当前状态**: 上述所有重构工作已完成并通过了所有单元测试。代码已暂存，并准备好进行一次最终的、干净的提交。

**已知问题**:

- **PostCSS 构建错误**: 在尝试运行 `next dev` 或 `next build` 时，会出现一个与 PostCSS 相关的错误：`Error: A PostCSS Plugin was passed as a function using require(), but it must be provided as a string.`
- **问题根源分析**: 这很可能是因为项目中缺少一个标准的 `tailwind.config.js` 文件。虽然 `tailwindcss` 是项目的依赖，但它没有被正确初始化和配置。

**建议的下一步**:

1.  **解决 PostCSS 问题**:
    - 在项目根目录创建一个 `tailwind.config.js` 文件。
    - 在该文件中，至少配置 `content` 字段，以告知 Tailwind 要扫描哪些文件来生成 CSS。推荐配置：
      ```javascript
      /** @type {import('tailwindcss').Config} */
      module.exports = {
        content: [
          "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
          "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
          "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
        ],
        theme: {
          extend: {},
        },
        plugins: [],
      };
      ```
    - 修改 `postcss.config.mjs` 为更标准的格式，例如：
      ```javascript
      module.exports = {
        plugins: {
          tailwindcss: {},
          autoprefixer: {},
        },
      };
      ```
      (这可能需要先执行 `pnpm add -D autoprefixer`)
2.  **创建最终提交**: 在解决了构建问题后，创建一个最终的 Git 提交，以包含所有已完成的重构工作。
