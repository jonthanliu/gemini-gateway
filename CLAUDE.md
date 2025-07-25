# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js application that acts as an intelligent AI gateway for Google's Gemini models. It provides a unified API interface with endpoints compatible with OpenAI, Anthropic, and native Gemini protocols. Key features include load balancing across multiple API keys, automatic failover, and a web-based admin dashboard for managing keys and configurations.

The application is built with the Next.js App Router, TypeScript, and uses Drizzle ORM with SQLite for the database.

## High-Level Architecture

*   **API Routes**: The core proxy logic is implemented as API routes within the `src/app` directory.
    *   OpenAI compatibility: `src/app/openai/v1/`
    *   Anthropic compatibility: `src/app/anthropic/v1/`
    *   Native Gemini: `src/app/gemini/v1/`
*   **Key Management**: The `src/lib/services/key.service.ts` is responsible for managing the pool of Gemini API keys, including selection, load balancing, and tracking failures.
*   **Configuration**: Application settings are managed through `src/lib/config/settings.ts` and can be configured dynamically via the admin dashboard.
*   **Database**: The project uses SQLite with Drizzle ORM. The schema is defined in `src/lib/db/schema.ts`, and migrations are handled by `drizzle-kit`.
*   **Admin Dashboard**: A React-based UI under `src/app/[lang]/admin/` allows for real-time management of API keys, settings, and viewing logs.
*   **Authentication**: Middleware at `src/middleware.ts` protects the admin routes and authenticates API requests.

## Common Development Commands

*   **Install dependencies**:
    ```bash
    pnpm install
    ```
*   **Run development server**:
    ```bash
    pnpm dev
    ```
*   **Run tests**:
    ```bash
    pnpm test
    ```
*   **Lint code**:
    ```bash
    pnpm lint
    ```
*   **Build for production**:
    ```bash
    pnpm build
    ```
*   **Start production server**:
    ```bash
    pnpm start
    ```
*   **Generate database migrations**:
    ```bash
    pnpm db:generate
    ```
*   **Apply database migrations (development)**:
    ```bash
    pnpm db:migrate
    ```
*   **Apply database migrations (production)**:
    ```bash
    pnpm db:migrate:prod
    ```
