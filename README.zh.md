# Gemini Gateway 🚀

[![构建状态](https://img.shields.io/github/actions/workflow/status/jonthanliu/gemini-gateway/docker-image.yml?branch=master)](https://github.com/jonthanliu/gemini-gateway/actions)
[![许可证: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![欢迎 PR](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/jonthanliu/gemini-gateway/pulls)

**[English](README.md) | [中文](README.zh.md)**

一个智能 AI 网关，通过为 Google Gemini 模型提供统一的 API，为您的应用程序提供强大动力，并配备负载均衡、故障转移和用户友好的管理仪表盘。

## ✨ 核心亮点

- **统一 API 接口**: 通过多种 API 格式访问 Gemini 模型，包括 **OpenAI**、**Anthropic** 和原生 **Gemini** 协议。
- **智能负载均衡**: 在 Gemini API 密钥池中智能分配请求，以最大化吞吐量。
- **自动故障转移**: 使用下一个可用密钥自动重试失败的请求，确保高可用性。
- **持久化与动态配置**: 通过 Web UI 动态管理 API 密钥、身份验证和配置，无需重启服务。
- **安全与可扩展**: 以安全为核心构建，可通过 Docker 进行生产环境部署。
- **管理仪表盘**: 一个简洁的仪表盘，用于实时监控使用情况、管理密钥和配置网关。

## 🛠️ 技术栈

- **框架**: Next.js (App Router)
- **语言**: TypeScript
- **数据库**: SQLite (使用 Drizzle ORM)
- **UI**: Tailwind CSS, Shadcn UI
- **容器化**: Docker

## 🚀 快速开始

### 使用 Docker 自行部署 (推荐)

使用 Docker 部署是启动并运行 Gemini Gateway 的最简单方法。

1.  **克隆仓库:**

    ```bash
    git clone https://github.com/jonthanliu/gemini-gateway.git
    cd gemini-gateway
    ```

2.  **配置您的环境:**
    创建一个 `.env` 文件并添加以下内容：

    ```env
    # 容器内生产数据库的路径
    DATABASE_URL="file:/app/data/prod.db"

    # (可选) 用于 cron 作业端点的安全密钥
    CRON_SECRET="一个非常安全的随机字符串"
    ```

3.  **使用 Docker Compose 运行:**

    ```bash
    docker-compose up --build -d
    ```

4.  **首次设置:**
    - 打开浏览器并访问 `http://你的服务器IP:3000/admin`。
    - 系统将提示您输入密码。**输入一个新的、强密码**以保护管理仪表盘。这将成为您的永久管理员密码。
    - 转到 **Keys** 标签页并添加您的 Gemini API 密钥。
    - 转到 **Configuration** 标签页并添加“允许的 API 令牌”。这些是您的客户端应用程序将用于身份验证的令牌。

您的网关现在已上线并准备好处理请求！

## 🔌 客户端使用示例

部署网关后，您可以配置您喜欢的客户端来使用它。为了获得最佳体验和安全性，**强烈建议您为网关配置自己的域名**。

### Gemini 原生客户端 (推荐)

对于支持 Google Gemini API 的客户端，这是最直接的配置方式。

#### VSCode (Cline) & CherryStudio

1.  在客户端的模型设置中，选择 **Gemini** 作为模型提供商。
2.  将 **API Base URL** 或 **Endpoint** 设置为您的网关地址：
    ```
    http://<你的域名或服务器IP>:3000
    ```
3.  将 **API Key** 设置为您在管理后台“允许的 API 令牌”中创建的令牌。

### Anthropic 兼容客户端

对于使用 Anthropic SDK 的工具（例如 `claude-code`），您可以通过设置环境变量来指向此网关。

```bash
# 设置您的网关地址
export ANTHROPIC_BASE_URL=http://<你的域名或服务器IP>:3000

# 设置您在管理后台创建的 API 令牌
export ANTHROPIC_API_KEY=<你设置的令牌>

# 现在运行您的工具
claude
```

### OpenAI 兼容客户端

对于 LobeChat、ChatGPT-Next-Web 等通用客户端，您可以使用 OpenAI 兼容接口。

1.  在客户端设置中，找到 **OpenAI-Compatible** 或 **自定义模型** 选项。
2.  将 **API Base URL** 或 **Endpoint** 设置为：
    ```
    http://<你的域名或服务器IP>:3000/openai/v1
    ```
3.  将 **API Key** 设置为您在管理后台创建的“允许的 API 令牌”之一。
4.  选择一个模型名称（例如 `gemini-pro`）并开始使用。

## ⚠️ 重要提示与免责声明

- **AI 生成的代码**: 本项目主要由 AI 助手开发。虽然功能可用，但可能包含意外行为。
- **风险自负**: 这是一个“按原样”提供的开源项目。作者和贡献者不对因使用本项目而导致的任何损害或损失负责，包括但不限于 API 密钥泄露或经济损失。在生产环境中部署前，请仔细审查代码和安全配置。
- **欢迎贡献**: 我们欢迎 Pull Request！请注意，贡献也将由 AI 进行审查。

## 🙏 致谢

本项目从开源社区的杰出作品中汲取灵感并以此为基础。

- **[gemini-balance](https://github.com/snailyp/gemini-balance)** by **snailyp**: 最初的 Python 项目，为本网关提供了核心灵感。
- **[lemmy](https://github.com/badlogic/lemmy)** by **badlogic**: 展示了健壮且可扩展的应用程序架构。
- **[gemini-balance-nextjs](https://github.com/jonthanliu/gemini-balance-nextjs)**: 本项目的前身，为当前的实现奠定了基础。
