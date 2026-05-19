import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { createBugReport, logError, logApiCall, logCalculation, logSync, getRecentErrorLogs } from "./logging";

describe("Error Logging System", () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
  });

  it("should log an error to the database", async () => {
    await logError({
      userId: 1,
      participantId: 1,
      eventType: "api_call",
      action: "testAction",
      severity: "warning",
      message: "Test error message",
      context: { test: true },
    });
    
    // Verify the error was logged
    const logs = await getRecentErrorLogs(1, 1);
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0]?.message).toBe("Test error message");
  });

  it("should log an API call", async () => {
    await logApiCall({
      userId: 5,
      participantId: 5,
      action: "submitDailyLog_test",
      input: { dayNumber: 14 },
      output: { success: true },
    });

    const logs = await getRecentErrorLogs(5, 10);
    const apiLog = logs.find((l) => l?.action === "submitDailyLog_test");
    expect(apiLog).toBeDefined();
  });

  it("should log a calculation issue", async () => {
    await logCalculation({
      userId: 3,
      participantId: 3,
      action: "calculatePoints_test",
      expected: 50,
      actual: 45,
      mismatch: true,
    });

    const logs = await getRecentErrorLogs(3, 10);
    expect(logs.length).toBeGreaterThan(0);
    const calcLog = logs.find((l) => l?.action === "calculatePoints_test");
    expect(calcLog).toBeDefined();
    expect(calcLog?.severity).toBe("warning");
  });

  it("should log a sync issue", async () => {
    await logSync({
      userId: 4,
      participantId: 4,
      action: "snapshotRefresh_test",
      staleData: { points: 100 },
      freshData: { points: 105 },
      issue: "Stale points detected",
    });

    const logs = await getRecentErrorLogs(4, 10);
    expect(logs.length).toBeGreaterThan(0);
    const syncLog = logs.find((l) => l?.action === "snapshotRefresh_test");
    expect(syncLog).toBeDefined();
    expect(syncLog?.severity).toBe("warning");
  });

  it("should create a bug report", async () => {
    const result = await createBugReport({
      userId: 1,
      participantId: 1,
      title: "Test bug: Points not showing",
      description: "When I complete a rule, the points don't update",
      affectedPage: "my_day",
      priority: "high",
    });

    expect(result).toBeDefined();
  });

  it("should retrieve recent error logs for a participant", async () => {
    // Log multiple errors
    await logError({
      userId: 2,
      participantId: 2,
      eventType: "sync",
      action: "testSync",
      severity: "error",
      message: "Test sync error",
    });

    await logError({
      userId: 2,
      participantId: 2,
      eventType: "calculation",
      action: "testCalc",
      severity: "warning",
      message: "Test calc warning",
    });

    const logs = await getRecentErrorLogs(2, 5);
    expect(logs.length).toBeGreaterThanOrEqual(2);
  });

  it("should handle logging failures gracefully", async () => {
    // This should not throw even if something goes wrong
    await expect(
      logError({
        userId: 1,
        participantId: 1,
        eventType: "api_call",
        action: "testAction",
        message: "Test",
      })
    ).resolves.not.toThrow();
  });
});
