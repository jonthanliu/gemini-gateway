// vitest.setup.ts
import { beforeAll } from "vitest";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";

beforeAll(() => {
  const dbDir = path.resolve(process.cwd(), "db");
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const dbPath = path.join(dbDir, `${randomUUID()}.db`);
  process.env.DATABASE_URL = `file:${dbPath}`;
});
