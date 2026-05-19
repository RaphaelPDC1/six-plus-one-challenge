import { getDb } from "./db";
import { errorLogs, bugReports } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export type ErrorSeverity = "info" | "warning" | "error" | "critical";
export type ErrorEventType = "api_call" | "calculation" | "sync" | "submission" | "refresh" | "validation";

export interface LogContext {
  [key: string]: any;
}

async function getDatabase() {
  return await getDb();
}

/**
 * Log an error or event to the database for debugging
 */
export async function logError(options: {
  userId?: number;
  participantId?: number;
  eventType: ErrorEventType;
  action: string;
  severity?: ErrorSeverity;
  message: string;
  context?: LogContext;
  stackTrace?: string;
}) {
  try {
    const db = await getDatabase();
    if (!db) return;
    await db.insert(errorLogs).values({
      userId: options.userId,
      participantId: options.participantId,
      eventType: options.eventType,
      action: options.action,
      severity: options.severity || "info",
      message: options.message,
      context: options.context ? JSON.stringify(options.context) : undefined,
      stackTrace: options.stackTrace,
    });
  } catch (err) {
    // Fail silently to avoid breaking the main flow
    console.error("[LogError] Failed to log error:", err);
  }
}

/**
 * Log API calls for debugging data sync issues
 */
export async function logApiCall(options: {
  userId?: number;
  participantId?: number;
  action: string;
  input?: any;
  output?: any;
  error?: string;
}) {
  const severity = options.error ? "error" : "info";
  await logError({
    userId: options.userId,
    participantId: options.participantId,
    eventType: "api_call",
    action: options.action,
    severity,
    message: options.error || `${options.action} called successfully`,
    context: {
      input: options.input,
      output: options.output,
      error: options.error,
    },
  });
}

/**
 * Log calculation issues (points, lives, etc.)
 */
export async function logCalculation(options: {
  userId?: number;
  participantId?: number;
  action: string;
  expected: any;
  actual: any;
  mismatch: boolean;
}) {
  await logError({
    userId: options.userId,
    participantId: options.participantId,
    eventType: "calculation",
    action: options.action,
    severity: options.mismatch ? "warning" : "info",
    message: options.mismatch
      ? `Calculation mismatch: ${options.action}`
      : `Calculation verified: ${options.action}`,
    context: {
      expected: options.expected,
      actual: options.actual,
      mismatch: options.mismatch,
    },
  });
}

/**
 * Log data sync issues
 */
export async function logSync(options: {
  userId?: number;
  participantId?: number;
  action: string;
  staleData?: any;
  freshData?: any;
  issue: string;
}) {
  await logError({
    userId: options.userId,
    participantId: options.participantId,
    eventType: "sync",
    action: options.action,
    severity: "warning",
    message: `Sync issue: ${options.issue}`,
    context: {
      staleData: options.staleData,
      freshData: options.freshData,
    },
  });
}

/**
 * Get recent error logs for a participant (for debugging)
 */
export async function getRecentErrorLogs(participantId: number, limit = 20) {
  try {
    const db = await getDatabase();
    if (!db) return [];
    return await db
      .select()
      .from(errorLogs)
      .where(eq(errorLogs.participantId, participantId))
      .orderBy(errorLogs.createdAt)
      .limit(limit);
  } catch (err) {
    console.error("[GetRecentErrorLogs] Failed:", err);
    return [];
  }
}

/**
 * Create a bug report from a participant
 */
export async function createBugReport(options: {
  userId: number;
  participantId?: number;
  title: string;
  description: string;
  screenshotUrl?: string;
  screenshotKey?: string;
  affectedPage?: string;
  priority?: "low" | "medium" | "high" | "critical";
}) {
  try {
    const db = await getDatabase();
    if (!db) throw new Error("Database not initialized");
    const result = await db.insert(bugReports).values({
      userId: options.userId,
      participantId: options.participantId,
      title: options.title,
      description: options.description,
      screenshotUrl: options.screenshotUrl,
      screenshotKey: options.screenshotKey,
      affectedPage: options.affectedPage,
      priority: options.priority || "medium",
      status: "open",
    });
    return result;
  } catch (err) {
    console.error("[CreateBugReport] Failed to create bug report:", err);
    throw err;
  }
}
