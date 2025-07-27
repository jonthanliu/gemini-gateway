import { db } from "@/lib/db";
import { errorLogs, requestLogs } from "@/lib/db/schema";
import { logError, logRequest } from "@/lib/services/logging.service";
import { count } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("Logging Service", () => {
  beforeEach(async () => {
    await db.delete(requestLogs);
    await db.delete(errorLogs);
  });

  afterEach(async () => {
    await db.delete(requestLogs);
    await db.delete(errorLogs);
  });

  it("should log a request", async () => {
    await logRequest("key1", "model1", 200, true, 100);
    const [{ count: total }] = await db
      .select({ count: count() })
      .from(requestLogs);
    expect(total).toBe(1);
  });

  it("should log an error", async () => {
    await logError("key1", "type1", "message1", {});
    const [{ count: total }] = await db
      .select({ count: count() })
      .from(errorLogs);
    expect(total).toBe(1);
  });
});
