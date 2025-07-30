# 技术背景

## 技术栈

- **框架**: [Next.js](https.nextjs.org/) (App Router) - 用于构建全栈应用程序，包括 API 路由和 React 前端。
- **语言**: [TypeScript](https://www.typescriptlang.org/) - 为 JavaScript 添加了类型系统，提高了代码质量和可维护性。
- **数据库**: [PostgreSQL](https://www.postgresql.org/) - 一个功能强大的开源对象关系数据库系统。
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/) - 一个 TypeScript ORM，用于与数据库进行类型安全的交互。
- **UI**: [React](https://react.dev/) - 用于构建用户界面的 JavaScript 库。
- **样式**: [Tailwind CSS](https://tailwindcss.com/) - 一个实用工具优先的 CSS 框架，用于快速构建自定义设计。
- **UI 组件**: [shadcn/ui](https://ui.shadcn.com/) - 一套可重用的 UI 组件，可以轻松地复制和粘贴到你的应用中。
- **国际化 (i18n)**: `next-intl` - 用于在 Next.js 应用中实现国际化。

## 开发环境

- **包管理器**: [pnpm](https://pnpm.io/) - 快速、节省磁盘空间的包管理器。
- **运行脚本**: `package.json` 中的 `scripts` 部分定义了所有常用的开发任务，如 `dev`, `build`, `start`, `test`。
- **数据库迁移**: 使用 `drizzle-kit` 来生成和应用数据库迁移。
  - `pnpm drizzle:generate`: 生成迁移文件。
  - `pnpm drizzle:migrate`: 应用迁移。
- **测试**: [Vitest](https.vitest.dev/) - 一个由 Vite 驱动的极速单元测试框架。

## 工具使用模式

- **代码格式化**: [ESLint](https://eslint.org/) 和 [Prettier](https://prettier.io/) (通过 `eslint.config.mjs` 配置) 用于确保代码风格的一致性。
- **版本控制**: [Git](https://git-scm.com/)，代码托管在 GitHub 上。
- **容器化**: [Docker](https://www.docker.com/) 和 `docker-compose` 用于创建一致的开发和生产环境。
