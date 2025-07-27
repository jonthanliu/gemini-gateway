# Gemini Gateway 🚀

[![Build Status](https://img.shields.io/github/actions/workflow/status/jonthanliu/gemini-gateway/deploy.yml?branch=main)](https://github.com/jonthanliu/gemini-gateway/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/jonthanliu/gemini-gateway/pulls)

**[English](README.md) | [中文](README.zh.md)**

An intelligent AI gateway that supercharges your applications by providing a unified API for Google's Gemini models, complete with load balancing, failover, and a user-friendly management dashboard.

## ✨ Key Features

- **Unified API Interface**: Access Gemini models through multiple API formats, including **OpenAI**, **Anthropic**, and native **Gemini** protocols.
- **Smart Load Balancing**: Intelligently distributes requests across a pool of Gemini API keys to maximize throughput.
- **Automatic Failover**: Automatically retries failed requests with the next available key, ensuring high availability.
- **Persistent & Dynamic**: Manage API keys, authentication, and configurations on-the-fly through a web UI without service restarts.
- **Secure & Scalable**: Built with security in mind, ready for production deployment with Docker.
- **Management Dashboard**: A sleek dashboard to monitor usage, manage keys, and configure the gateway in real-time.

## 🛠️ Tech Stack

- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Database**: SQLite (with Drizzle ORM)
- **UI**: Tailwind CSS, Shadcn UI
- **Containerization**: Docker

## 🚀 Getting Started

### Self-Hosting with Docker (Recommended)

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/jonthanliu/gemini-gateway.git
    cd gemini-gateway
    ```

2.  **Configure your environment:**
    Copy the example environment file and edit it with your settings.
    ```bash
    cp .env.example .env
    ```
    Now, edit the `.env` file:
    ```env
    # --- Security (Mandatory) ---
    # Set a strong, random password here for the admin panel.
    AUTH_TOKEN="your_super_secret_admin_token"

    # A comma-separated list of tokens your clients will use.
    ALLOWED_TOKENS="client_token_1,client_token_2"

    # --- Database (Do not change for Docker) ---
    DATABASE_URL="file:/app/data/prod.db"
    ```

3.  **Run with Docker Compose:**
    ```bash
    docker-compose up --build -d
    ```

4.  **Access the Admin Panel:**
    - Open your browser and navigate to `http://YOUR_SERVER_IP:3000/admin`.
    - Log in using the `AUTH_TOKEN` you set in the `.env` file.
    - Go to the **Keys** tab and add your Gemini API keys.

Your gateway is now live and ready to serve requests!

## 🔌 Client Usage Examples

Once your gateway is deployed, you can configure your favorite clients to use it. For the best experience and security, **it is highly recommended to configure your own domain name for the gateway**.

### Native Gemini Clients (Recommended)

For clients that support the Google Gemini API, this is the most direct way to configure.

#### VSCode (Cline) & CherryStudio

1.  In your client's model settings, select **Gemini** as the model provider.
2.  Set the **API Base URL** or **Endpoint** to your gateway address:
    ```
    http://<your_domain_or_server_ip>:3000
    ```
3.  Set the **API Key** to a token you created in the "Allowed API Tokens" section of the admin dashboard.

### Anthropic-Compatible Clients

For tools that use the Anthropic SDK (e.g., `claude-code`), you can point to this gateway by setting environment variables.

```bash
# Set your gateway address
export ANTHROPIC_BASE_URL=http://<your_domain_or_server_ip>:3000

# Set the API token you created in the admin dashboard
export ANTHROPIC_API_KEY=<your_token>

# Now run your tool
claude
```

### OpenAI-Compatible Clients

For general-purpose clients like LobeChat or ChatGPT-Next-Web, you can use the OpenAI-compatible interface.

1.  In your client's settings, find the **OpenAI-Compatible** or **Custom Model** option.
2.  Set the **API Base URL** or **Endpoint** to:
    ```
    http://<your_domain_or_server_ip>:3000/openai/v1
    ```
3.  Set the **API Key** to one of the "Allowed API Tokens" you created in the admin dashboard.
4.  Select a model name (e.g., `gemini-pro`) and start using it.

## ⚠️ Important Notes & Disclaimer

- **Password Recovery**: If you forget your admin password, you can edit the `AUTH_TOKEN` in your `.env` file and restart the container.
- **AI-Generated Code**: This project was primarily developed by an AI assistant. While it is functional, it may contain unexpected behaviors.
- **Use at Your Own Risk**: This is an open-source project provided "as is". The authors and contributors are not responsible for any damages or losses resulting from its use, including but not to API key leakage or financial loss. Please review the code and security configurations carefully before deploying in a production environment.
- **Contributions Welcome**: We welcome pull requests! Please note that contributions will also be reviewed by an AI.

## 🙏 Acknowledgements

This project is inspired by and builds upon the great work of others in the open-source community.

- **[gemini-balance](https://github.com/snailyp/gemini-balance)** by **snailyp**: The original Python project that provided the core inspiration for this gateway.
- **[lemmy](https://github.com/badlogic/lemmy)** by **badlogic**: For demonstrating robust and scalable application architecture.
- **[gemini-balance-nextjs](https://github.com/jonthanliu/gemini-balance-nextjs)**: The predecessor to this project, which laid the groundwork for the current implementation.
