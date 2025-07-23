#!/bin/sh
set -e

# This script is now run as root, as the 'USER' instruction was removed from the Dockerfile.

# 1. Set ownership of the data directory at runtime.
# This is crucial because the volume is mounted by Coolify as root, especially on first run.
# Running this every time is safe and ensures permissions are always correct.
echo "Ensuring correct ownership of /app/data..."
chown -R nextjs:nodejs /app/data

# 2. Run migrations and the application as the non-root 'nextjs' user.
# This drops root privileges for the long-running application process, which is a security best practice.
echo "Running database migrations as nextjs user..."
su-exec nextjs:nodejs pnpm db:migrate

# Ensure the created database file and the directory itself have the correct ownership,
# which is crucial for SQLite to be able to create journal files for write operations.
echo "Finalizing ownership of /app/data to prevent locking issues..."
chown -R nextjs:nodejs /app/data

echo "Starting application as nextjs user..."
exec su-exec nextjs:nodejs node server.js
