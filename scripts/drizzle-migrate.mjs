import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!process.env.DATABASE_URL) {
  throw new Error("process.env.DATABASE_URL is undefined.");
}

const dbUrl = process.env.DATABASE_URL;
console.log({ url: dbUrl });

const client = createClient({ url: dbUrl });
const db = drizzle(client);

async function main() {
  console.info(`Running migrations...`);

  // In standalone mode, the migrations folder will be at the root.
  const migrationsFolder = path.join(__dirname, "../", "drizzle/migrations");

  console.info(`Migrations folder: ${migrationsFolder}`);

  await migrate(db, { migrationsFolder });

  console.info("Migrated successfully");
  process.exit(0);
}

main().catch((e) => {
  console.error("Migration failed");
  console.error(e);
  process.exit(1);
});
