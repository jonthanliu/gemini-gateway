# Gemini Gateway 🚀

[![构建状态](https://img.shields.io/github/actions/workflow/status/jonthanliu/gemini-gateway/deploy.yml?branch=main)](https://github.com/jonthanliu/gemini-gateway/actions)
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

1.  **克隆仓库:**

    ```bash
    git clone https://github.com/jonthanliu/gemini-gateway.git
    cd gemini-gateway
    ```

2.  **配置您的环境:**
    复制示例环境文件。这是您的网关配置的唯一真实来源。

    ```bash
    cp .env.example .env
    ```

    现在，编辑 `.env` 文件。**所有字段都是必填项。**

    ```env
    # --- 安全设置 (必填) ---
    # 这是 Web 管理后台的登录密码。
    AUTH_TOKEN="your_super_secret_admin_password"

    # 您的 API 客户端将用于身份验证的令牌列表，以逗号分隔。
    ALLOWED_TOKENS="client_token_1,client_token_2"

    # 用于签署 Web UI 会话令牌 (JWT) 的强随机密钥。
    # 您可以在这里生成一个: https://www.uuidgenerator.net/
    WEB_JWT_SECRET="your_strong_and_random_jwt_secret"

    # --- 数据库 (Docker部署时无需更改) ---
    DATABASE_URL="file:/app/data/prod.db"
    ```

3.  **使用 Docker Compose 运行:**

    ```bash
    docker-compose up --build -d
    ```

4.  **访问管理后台与初始设置:**
    - 打开浏览器并访问 `http://你的服务器IP:3000`。
    - 系统将提示您登录。请使用您在 `.env` 文件中为 `AUTH_TOKEN` 设置的密码。
    - 登录后，系统将引导您添加第一个 Gemini API 密钥。
    - 添加密钥后，您将被重定向到主仪表盘。

您的网关现在已上线并准备好处理请求！

### 使用预构建的 Docker 镜像 (最简单)

如果您不想在本地构建镜像，可以直接使用我们通过 GitHub Actions 自动构建并发布在 `ghcr.io` 上的最新镜像。

1.  **创建 `docker-compose.yml` 文件:**
    在您的服务器上，创建一个名为 `docker-compose.yml` 的文件，并填入以下内容。它会直接拉取最新的 `main` 分支镜像。

    ```yaml
    version: "3.8"

    services:
      app:
        image: ghcr.io/jonthanliu/gemini-gateway:main
        restart: always
        ports:
          - "3000:3000"
        volumes:
          - ./data:/app/data
        env_file:
          - .env
    ```

2.  **创建并配置 `.env` 文件:**
    和之前的步骤一样，创建 `.env` 文件并填入您的配置。

    ```bash
    cp .env.example .env
    # 编辑 .env 文件...
    ```

3.  **启动服务:**

    ```bash
    docker-compose up -d
    ```

    Docker 将会自动从 `ghcr.io` 拉取镜像并启动服务。这种方法跳过了在您本地机器上的整个构建过程，部署起来更快。

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
3.  将 **API Key** 设置为您在 `.env` 文件的 `ALLOWED_TOKENS` 列表中定义的令牌之一。

### Anthropic 兼容客户端

对于使用 Anthropic SDK 的工具（例如 `claude-code`），您可以通过设置环境变量来指向此网关。

```bash
# 设置您的网关地址
export ANTHROPIC_BASE_URL=http://<你的域名或服务器IP>:3000

# 设置您 ALLOWED_TOKENS 列表中的一个令牌
export ANTHROPIC_API_KEY=<你的客户端令牌>

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
3.  将 **API Key** 设置为您 `ALLOWED_TOKENS` 列表中的令牌之一。
4.  选择一个模型名称（例如 `gemini-pro`）并开始使用。

## ⚠️ 重要提示与免责声明

- **密码恢复**: 如果您忘记了管理员密码，只需编辑 `.env` 文件中的 `AUTH_TOKEN` 并重启容器 (`docker-compose restart`) 即可。
- **不再需要 Cron 作业**: 密钥健康检查机制已被重构。网关现在会自动将失败的密钥禁用一小段时间。您不再需要设置外部 cron 作业。
- **AI 生成的代码**: 本项目主要由 AI 助手开发。虽然功能可用，但可能包含意外行为。
- **风险自负**: 这是一个“按原样”提供的开源项目。作者和贡献者不对因使用本项目而导致的任何损害或损失负责，包括但不限于 API 密钥泄露或经济损失。在生产环境中部署前，请仔细审查代码和安全配置。
- **欢迎贡献**: 我们欢迎 Pull Request！请注意，贡献也将由 AI 进行审查。

## 🙏 致谢

本项目从开源社区的杰出作品中汲取灵感并以此为基础。

- **[gemini-balance](https://github.com/snailyp/gemini-balance)** by **snailyp**: 最初的 Python 项目，为本网关提供了核心灵感。
- **[lemmy](https://github.com/badlogic/lemmy)** by **badlogic**: 展示了健壮且可扩展的应用程序架构。
- **[gemini-balance-nextjs](https://github.com/jonthanliu/gemini-balance-nextjs)**: 本项目的前身，为当前的实现奠定了基础。
- **[openai-gemini](https://github.com/PublicAffairs/openai-gemini.git)** by **PublicAffairs**: 一个为 Gemini 模型提供 OpenAI 兼容 API 的项目。
