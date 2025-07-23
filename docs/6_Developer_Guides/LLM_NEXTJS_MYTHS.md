# **Next.js 开发避坑指南 (供大模型阅读)**

**目标**: 本文档旨在纠正你在处理 Next.js (App Router) 项目时可能出现的常见思维误区和错误模式。**在执行任何编码任务前，请务必将此文档作为行为准则。**

---

### **迷思一：关于客户端组件与服务器组件 (`"use client"`)**

**❌ 错误模式 (反模式):**

- **误区**: 认为添加了 `"use client"` 的文件，其内部所有代码都在客户端运行。
- **错误行为**: 尝试在标记为 `"use client"` 的文件中直接调用只存在于 Node.js 环境的 API（如 `fs`），或者在其中暴露服务器端的敏感信息（如 API 密钥）。

**✅ 正确模式 (你应该做的):**

- **核心理解**: `"use client"` 只是一个**边界声明**。它告诉打包工具：“从这里开始，下面的组件树需要依赖客户端环境（如 `useState`, `useEffect`, 事件监听器）”。
- **关键事实**:
  1.  **首次渲染仍在服务器**: 客户端组件在服务器上进行首次 HTML 渲染（SSR），然后才在客户端进行“水合 (Hydration)”并变得可交互。
  2.  **代码会发送到客户端**: 组件内的所有代码（包括未使用的逻辑）都会被打包并发送到浏览器。
- **你的行动准则**:
  - **绝对禁止**在客户端组件中包含任何服务器端的敏感代码或环境变量。
  - **数据获取**: 始终在**服务器组件**中获取数据，然后通过 `props` 将数据传递给客户端组件。
  - **最小化客户端边界**: 尽可能将 `"use client"` 放在组件树的叶子节点。如果只有一个按钮需要交互，那就只把这个按钮做成客户端组件，而不是整个页面。

**示例:**

```typescript
// ❌ 错误做法: 在客户端组件中获取数据
"use client";
import { useState, useEffect } from "react";

export default function MyPage() {
  const [data, setData] = useState(null);
  useEffect(() => {
    // 这个 fetch 会在客户端发起，暴露了 API 端点
    fetch("/api/secret-data")
      .then((res) => res.json())
      .then(setData);
  }, []);
  return <div>...</div>;
}
```

```typescript
// ✅ 正确做法: 服务器组件获取数据，客户端组件负责交互

// app/page.tsx (服务器组件)
async function getData() {
  // 这个 fetch 在服务器端执行，更安全、更高效
  const res = await fetch('https://.../data', { cache: 'no-store' });
  return res.json();
}

export default async function Page() {
  const data = await getData();
  return <InteractiveComponent data={data} />;
}

// components/InteractiveComponent.tsx (客户端组件)
"use "client";
import { useState } from 'react';

export function InteractiveComponent({ data }) {
  const [count, setCount] = useState(0);
  return (
    <div>
      <p>Data from server: {JSON.stringify(data)}</p>
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
    </div>
  );
}
```

---

### **迷思二：关于 API 路由 (Route Handlers)**

**❌ 错误模式 (反模式):**

- **误区**: 认为 API 路由文件 (`route.ts`) 像传统的 Express 服务器一样，可以随意执行长时间运行的同步任务或依赖内存状态。
- **错误行为**: 在 API 路由的顶层作用域定义可变变量，并期望它在多次请求之间保持状态。

**✅ 正确模式 (你应该做的):**

- **核心理解**: 在 Serverless/Edge 环境下，每个 API 请求都可能由一个全新的、独立的实例来处理。**API 路由必须是无状态的 (Stateless)**。
- **你的行动准则**:
  - **禁止内存状态**: 绝对不要在 API 路由的全局作用域内存储请求间的状态。所有状态都必须持久化到**数据库**或外部缓存（如 Redis）。
  - **高效处理**: 快速处理请求并返回响应。对于长时间运行的任务，应使用后台任务或队列服务。
  - **环境变量**: 通过 `process.env` 安全地访问环境变量。

---

### **迷思三：关于修改文件**

**❌ 错误模式 (反模式):**

- **误区**: 为了修改文件中的一小部分，选择读取整个文件，在内存中修改后，再用 `write_to_file` 覆盖整个文件。
- **错误行为**: 频繁使用 `write_to_file` 进行小幅度的代码修改。

**✅ 正确模式 (你应该做的):**

- **核心理解**: `replace_in_file` 工具是进行精确、小范围修改的**首选工具**。它更安全、更高效，也更能清晰地表达你的修改意图。
- **你的行动准则**:
  - **优先使用 `replace_in_file`**: 当你只需要修改、添加或删除几行代码时，必须优先使用此工具。
  - **`write_to_file` 的适用场景**: 只在**创建全新的文件**，或者需要对文件进行**颠覆性的、大规模的结构重组**时，才考虑使用 `write_to_file`。
  - **精确匹配**: 使用 `replace_in_file` 时，确保 `SEARCH` 块的内容与目标文件中的代码**完全一致**，包括缩进和换行。

---
