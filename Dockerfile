# 1. Base Stage
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@latest --activate

# 2. Dependencies Stage (Install all dependencies)
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
# Use pnpm fetch to leverage Docker cache more effectively
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm fetch
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --recursive --prefer-offline

# 3. Builder Stage
FROM base AS builder
WORKDIR /app
# Copy only the necessary files for building
COPY . .
# Copy node_modules from the deps stage
COPY --from=deps /app/node_modules ./node_modules
# Set a temporary DB path for build-time and run migrations to create a valid DB schema.
ENV DATABASE_URL="file:./build-time.db"
RUN pnpm db:migrate:prod
# Now, run the build with a valid database schema.
RUN pnpm build

# 4. Runner Stage
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED 1

# Copy production dependencies
COPY --from=builder /app/node_modules ./node_modules
# Copy standalone output
COPY --from=builder /app/.next/standalone ./
# Copy public assets
COPY --from=builder /app/public ./public
# Copy static assets
COPY --from=builder /app/.next/static ./.next/static
# Copy migrations and scripts
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/scripts ./scripts

# Declare the volume for persistent data
VOLUME ["/app/data"]

EXPOSE 3000

# Start the application
CMD ["sh", "./scripts/run.sh"]
