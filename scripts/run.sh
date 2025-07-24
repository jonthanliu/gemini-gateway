#!/usr/bin/env sh
set -e

# A flag to indicate the first-time migration has been completed.
# This file will be created in the persistent volume.
FIRST_TIME_MIGRATION_FLAG="/app/data/migration_completed"

# Check if the migration has been run before.
if [ ! -f "$FIRST_TIME_MIGRATION_FLAG" ]; then
  echo "First time startup detected. Running database migrations..."

  # Run the migration script.
  pnpm db:migrate:prod

  # Create the flag file to prevent a re-run.
  touch "$FIRST_TIME_MIGRATION_FLAG"

  echo "Database migration completed."
else
  echo "Migration flag found. Skipping migration."
fi

echo "Starting server..."
exec node server.js
