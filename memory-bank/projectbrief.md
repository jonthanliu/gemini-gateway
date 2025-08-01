# 项目简报：Gemini-Gateway

## 核心目标

`gemini-gateway` 是一个旨在提供统一 API 网关的项目，用于在不同的 AI 模型提供商（如 Google Gemini, OpenAI, Anthropic）之间进行转换和路由。其主要目标是简化开发人员在应用程序中集成和切换大型语言模型（LLM）的过程。

## 主要功能

1.  **API 统一化**：提供一个与 OpenAI API 兼容的端点，允许客户端应用无需修改代码即可使用 Gemini 或其他后端模型。
2.  **请求/响应适配**：在不同模型的 API 格式之间转换请求和响应体，确保无缝兼容。
3.  **智能路由（规划中）**：根据成本、性能或模型能力等因素，智能地将请求路由到最合适的模型。
4.  **密钥管理和日志记录**：提供一个管理界面来处理 API 密钥、监控使用情况和查看日志。

## 项目范围

- **输入**：接收来自客户端的、符合 OpenAI 或 Anthropic 格式的 API 请求。
- **输出**：将转换后的请求发送到目标模型（如 Gemini），并将模型的响应转换回原始格式返回给客户端。
- **包含**：API 路由、请求/响应转换逻辑、管理仪表板、数据库模式（用于密钥和日志）。
- **不包含**：模型微调、自定义模型训练、复杂的计费系统。
