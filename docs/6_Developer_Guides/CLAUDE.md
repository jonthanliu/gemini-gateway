# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js implementation of an intelligent AI gateway that functions as a proxy for Google's Gemini models. It supports multiple API formats including OpenAI-compatible endpoints and provides features like API key management, load balancing, and a web-based admin dashboard.

The project is designed to run on edge platforms like Vercel or Cloudflare, with a focus on serverless deployment and global distribution.

## Key Architecture Components

1. **API Proxy Layer** (`src/lib/gemini-proxy.ts`): Handles incoming requests and forwards them to Google's Gemini API
2. **Key Management** (`src/lib/key-manager.ts`): Manages a pool of API keys with round-robin selection and failure tracking
3. **Authentication** (`src/lib/auth.ts`, `src/middleware.ts`): Handles both admin dashboard and API endpoint authentication
4. **Configuration** (`src/lib/settings.ts`): Manages application settings stored in the database
5. **Admin Dashboard** (`src/app/[lang]/admin/`): Provides a web UI for managing keys, settings, and viewing logs
6. **Database Layer** (`src/lib/db.ts`, `prisma/schema.prisma`): Uses Prisma with SQLite for data persistence

## Current Architecture Issues

The project currently has several architectural issues that need to be addressed:

1. **Stateful KeyManager**: The KeyManager is implemented as a stateful singleton, which is not suitable for serverless/edge environments
2. **Prisma ORM**: Uses Prisma which is not optimal for edge deployments and conflicts with the project's design philosophy
3. **Missing API Route Rewrites**: Lacks the route rewrites needed for API compatibility with the original project

## Planned Architecture Improvements

According to the project documentation, the next phase should focus on:

1. **Implement API Route Compatibility**: Add route rewrites to ensure client compatibility
2. **Refactor KeyManager to Stateless Mode**: Make the key management service stateless for serverless environments
3. **Migrate ORM from Prisma to Drizzle**: Replace Prisma with Drizzle for better edge compatibility
4. **Clean up Dependencies**: Remove heavy binary dependencies like bcrypt

## Common Development Commands

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Run linting
pnpm lint

# Run database migrations
pnpm db:migrate
```

## Database Schema

The project uses Prisma with SQLite and has the following models:
- `ApiKey`: Stores API keys with failure tracking
- `Setting`: Key-value store for application configuration
- `RequestLog`: Logs of API requests with status and latency
- `ErrorLog`: Detailed error logs for debugging

## Key Implementation Details

1. **API Key Rotation**: The KeyManager provides round-robin selection of API keys and automatically handles failures
2. **Authentication**: Supports multiple authentication methods (Bearer token, query parameter, custom headers)
3. **Admin Protection**: Admin routes are protected by middleware that checks for valid auth tokens
4. **Configuration**: All settings are stored in the database and can be modified via the admin UI
5. **Health Checks**: Provides an external endpoint for checking and reactivating failed API keys
6. **Internationalization**: Supports both English and Chinese interfaces

## Deployment

The application is designed for Docker deployment with:
- Persistent data storage in a mounted volume
- Automated database migrations on startup
- Support for external cron jobs to check key health
- Configuration via environment variables or admin UI

## Testing

The project uses the Next.js testing framework. Tests can be run with:
```bash
pnpm test
```