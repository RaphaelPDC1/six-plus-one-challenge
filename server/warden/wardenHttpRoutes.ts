import type { Express, Request, Response } from "express";
import { getChallengeState } from "./challengeState";
import { getMessagesCountToday, getNoMessageCountToday, hasHitDailyLimit } from "./messageLogger";
import { runWardenCycle, triggerImmediateMessage } from "./runner";

const immediateTriggerTypes = ["life_loss", "milestone", "streak", "emergency"] as const;
type ImmediateTriggerType = (typeof immediateTriggerTypes)[number];

function isImmediateTriggerType(value: unknown): value is ImmediateTriggerType {
  return typeof value === "string" && immediateTriggerTypes.includes(value as ImmediateTriggerType);
}

function sendSuccess(res: Response, payload: Record<string, unknown>) {
  res.json({
    success: true,
    ...payload,
    timestamp: new Date().toISOString(),
  });
}

function sendFailure(res: Response, error: unknown, extra: Record<string, unknown> = {}) {
  res.status(200).json({
    success: false,
    error: error instanceof Error ? error.message : "Unknown error",
    ...extra,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Plain HTTP Warden endpoints for Make.com.
 *
 * The existing tRPC procedures remain available, but these routes avoid the nested
 * tRPC response envelope so Make.com scenarios can parse the result directly.
 */
export function registerWardenHttpRoutes(app: Express) {
  app.post("/api/warden/run", async (req: Request, res: Response) => {
    try {
      console.log("[Warden] HTTP run called", { source: req.body?.source || "unknown" });
      const result = await runWardenCycle();

      sendSuccess(res, {
        messageGenerated: result.messageGenerated,
        messageSent: result.messageSent,
        message: result.message,
        reason: result.reason,
        source: req.body?.source || "make-http",
      });
    } catch (error) {
      console.error("[Warden] HTTP run failed:", error);
      sendFailure(res, error, { source: req.body?.source || "make-http" });
    }
  });

  app.post("/api/warden/trigger", async (req: Request, res: Response) => {
    const triggerType = req.body?.triggerType;

    if (!isImmediateTriggerType(triggerType)) {
      res.status(400).json({
        success: false,
        error: "Invalid triggerType. Use one of: life_loss, milestone, streak, emergency.",
        timestamp: new Date().toISOString(),
      });
      return;
    }

    try {
      console.log("[Warden] HTTP trigger called", {
        triggerType,
        source: req.body?.source || "unknown",
      });

      const result = await triggerImmediateMessage(triggerType, req.body?.context || {});

      sendSuccess(res, {
        messageSent: result.messageSent,
        message: result.message,
        triggerType,
        source: req.body?.source || "make-http-event",
      });
    } catch (error) {
      console.error("[Warden] HTTP trigger failed:", error);
      sendFailure(res, error, {
        triggerType,
        source: req.body?.source || "make-http-event",
      });
    }
  });

  app.get("/api/warden/stats", async (_req: Request, res: Response) => {
    try {
      const messageCount = await getMessagesCountToday();
      const noMessageCount = await getNoMessageCountToday();
      const state = await getChallengeState();
      const dailyLimit = state.max_warden_messages_today;
      const hitLimit = await hasHitDailyLimit(dailyLimit);

      sendSuccess(res, {
        messagesSentToday: messageCount,
        noMessageDecisions: noMessageCount,
        dailyLimitHit: hitLimit,
        dailyDramaScore: state.daily_drama_score,
        dailyMessageLimit: dailyLimit,
        remainingMessages: Math.max(0, dailyLimit - messageCount),
      });
    } catch (error) {
      console.error("[Warden] HTTP stats failed:", error);
      sendFailure(res, error);
    }
  });
}
