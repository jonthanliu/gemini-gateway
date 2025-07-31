#!/bin/sh
set -e

# The container now runs as a non-root user, so we don't need to manage permissions.
# The volume mount permissions should be handled on the host.

echo "Running database migrations..."
pnpm db:migrate:prod

echo "Starting application..."
exec node server.js
