# 1. Base Stage
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat su-exec
RUN corepack enable && corepack prepare pnpm@latest --activate

# 2. Dependencies Stage
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm fetch
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prefer-offline

# 3. Builder Stage
FROM base AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
ENV DATABASE_URL="file:./build-time.db"
RUN pnpm db:migrate:prod
RUN pnpm build

# 4. Runner Stage
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED 1

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001 -G nodejs

# Copy necessary files from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/entrypoint.sh ./entrypoint.sh

# Ensure the entrypoint is executable
RUN chmod +x ./entrypoint.sh

# Set ownership for the app directory
RUN chown -R nextjs:nodejs /app

# Switch to the non-root user
USER nextjs

EXPOSE 3000

# Use ENTRYPOINT to run the start script
ENTRYPOINT ["./entrypoint.sh"]
