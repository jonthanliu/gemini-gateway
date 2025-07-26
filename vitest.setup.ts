import { loadEnvConfig } from "@next/env";
import { migrate } from "drizzle-orm/libsql/migrator";
import { drizzle } from "drizzle-orm/libsql";
import { createClient, type Client } from "@libsql/client";
import path from "path";

const projectDir = process.cwd();
loadEnvConfig(projectDir);

let client: Client;

export async function setup() {
  client = createClient({
    url: "file::memory:?cache=shared",
  });
  const db = drizzle(client);
  const migrationsFolder = path.resolve(projectDir, "drizzle/migrations");
  await migrate(db, { migrationsFolder });
}

export async function teardown() {
  await client?.close();
}
