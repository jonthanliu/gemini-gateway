import { db } from "@/lib/db";
import { errorLogs, requestLogs } from "@/lib/db/schema";
import { clearAllLogs, deleteLogs, getLogs } from "@/lib/services/log.service";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("Log Service", () => {
  beforeEach(async () => {
    await db.delete(requestLogs);
    await db.delete(errorLogs);

    await db.insert(requestLogs).values([
      {
        apiKey: "key1",
        model: "model1",
        statusCode: 200,
        isSuccess: true,
        latency: 100,
      },
      {
        apiKey: "key2",
        model: "model2",
        statusCode: 500,
        isSuccess: false,
        latency: 200,
      },
    ]);

    await db.insert(errorLogs).values([
      {
        apiKey: "key1",
        errorType: "type1",
        errorMessage: "message1",
        errorDetails: "{}",
      },
      {
        apiKey: "key2",
        errorType: "type2",
        errorMessage: "message2",
        errorDetails: "{}",
      },
    ]);
  });

  afterEach(async () => {
    await db.delete(requestLogs);
    await db.delete(errorLogs);
  });

  it("should get request logs", async () => {
    const { logs, total } = await getLogs({ logType: "request" });
    expect(total).toBe(2);
    expect(logs.length).toBe(2);
  });

  it("should get error logs", async () => {
    const { logs, total } = await getLogs({ logType: "error" });
    expect(total).toBe(2);
    expect(logs.length).toBe(2);
  });

  it("should delete request logs", async () => {
    const { logs } = await getLogs({ logType: "request" });
    const logIds = logs.map((log) => log.id);
    await deleteLogs(logIds, "request");
    const { total } = await getLogs({ logType: "request" });
    expect(total).toBe(0);
  });

  it("should clear all request logs", async () => {
    await clearAllLogs("request");
    const { total } = await getLogs({ logType: "request" });
    expect(total).toBe(0);
  });
});
