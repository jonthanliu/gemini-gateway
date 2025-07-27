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
    Copy the example environment file. This is the single source of truth for your gateway's configuration.

    ```bash
    cp .env.example .env
    ```

    Now, edit the `.env` file. **All fields are mandatory.**

    ```env
    # --- Security (Mandatory) ---
    # This is the password for the web admin panel.
    AUTH_TOKEN="your_super_secret_admin_password"

    # A comma-separated list of tokens that your API clients will use for authentication.
    ALLOWED_TOKENS="client_token_1,client_token_2"

    # A strong, random secret for signing Web UI session tokens (JWT).
    # You can generate one here: https://www.uuidgenerator.net/
    WEB_JWT_SECRET="your_strong_and_random_jwt_secret"

    # --- Database (Do not change for Docker) ---
    DATABASE_URL="file:/app/data/prod.db"
    ```

3.  **Run with Docker Compose:**

    ```bash
    docker-compose up --build -d
    ```

4.  **Access the Admin Panel & Onboarding:**
    - Open your browser and navigate to `http://YOUR_SERVER_IP:3000`.
    - You will be prompted to log in. Use the password you set for `AUTH_TOKEN` in the `.env` file.
    - After logging in, you will be guided to add your first Gemini API Key.
    - Once the key is added, you will be redirected to the main dashboard.

Your gateway is now live and ready to serve requests!

### Using the Pre-built Docker Image (Easiest)

If you prefer not to build the image locally, you can directly use the latest image we build and publish automatically on `ghcr.io` via GitHub Actions.

1.  **Create a `docker-compose.yml` file:**
    On your server, create a file named `docker-compose.yml` and paste the following content. It will pull the latest `main` branch image.

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

2.  **Create and configure your `.env` file:**
    Just like the previous method, create an `.env` file and fill in your configuration.

    ```bash
    cp .env.example .env
    # Edit your .env file...
    ```

3.  **Start the service:**

    ```bash
    docker-compose up -d
    ```

    Docker will automatically pull the image from `ghcr.io` and start the service. This method skips the entire build process on your local machine, making deployment faster.

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
3.  Set the **API Key** to one of the tokens you defined in the `ALLOWED_TOKENS` list in your `.env` file.

### Anthropic-Compatible Clients

For tools that use the Anthropic SDK (e.g., `claude-code`), you can point to this gateway by setting environment variables.

```bash
# Set your gateway address
export ANTHROPIC_BASE_URL=http://<your_domain_or_server_ip>:3000

# Set one of the tokens from your ALLOWED_TOKENS list
export ANTHROPIC_API_KEY=<your_client_token>

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
3.  Set the **API Key** to one of the tokens from your `ALLOWED_TOKENS` list.
4.  Select a model name (e.g., `gemini-pro`) and start using it.

## ⚠️ Important Notes & Disclaimer

- **Password Recovery**: If you forget your admin password, simply edit the `AUTH_TOKEN` in your `.env` file and restart the container (`docker-compose restart`).
- **No More Cron Jobs**: The key health check mechanism has been refactored. The gateway now automatically disables failing keys for a short period. You no longer need to set up an external cron job.
- **AI-Generated Code**: This project was primarily developed by an AI assistant. While it is functional, it may contain unexpected behaviors.
- **Use at Your Own Risk**: This is an open-source project provided "as is". The authors and contributors are not responsible for any damages or losses resulting from its use, including but not to API key leakage or financial loss. Please review the code and security configurations carefully before deploying in a production environment.
- **Contributions Welcome**: We welcome pull requests! Please note that contributions will also be reviewed by an AI.

## 🙏 Acknowledgements

This project is inspired by and builds upon the great work of others in the open-source community.

- **[gemini-balance](https://github.com/snailyp/gemini-balance)** by **snailyp**: The original Python project that provided the core inspiration for this gateway.
- **[lemmy](https://github.com/badlogic/lemmy)** by **badlogic**: For demonstrating robust and scalable application architecture.
- **[gemini-balance-nextjs](https://github.com/jonthanliu/gemini-balance-nextjs)**: The predecessor to this project, which laid the groundwork for the current implementation.
- **[openai-gemini](https://github.com/PublicAffairs/openai-gemini.git)** by **PublicAffairs**: A project that provides OpenAI-compatible API for Gemini models.
