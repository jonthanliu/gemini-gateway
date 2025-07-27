// vitest.setup.ts
import { execSync } from "child_process";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { beforeAll } from "vitest";

beforeAll(() => {
  const dbDir = path.resolve(process.cwd(), "db");
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const dbPath = path.join(dbDir, `${randomUUID()}.db`);
  process.env.DATABASE_URL = `file:${dbPath}`;
  execSync("pnpm drizzle-kit migrate", { stdio: "inherit" });
});
