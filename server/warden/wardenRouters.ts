import { z } from "zod";
import type { ZodType } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { runWardenCycle, triggerImmediateMessage } from "./runner";

/**
 * Warden tRPC router for Make.com webhook integration
 * These endpoints are public and called by Make automation
 */
export const wardenRouter = router({
  /**
   * Run a scheduled Warden cycle (every 2 hours, 06:00–22:00 GMT)
   * Called by Make.com automation
   * Returns the generated message and whether it was sent
   */
  runCycle: publicProcedure
    .input(
      z.object({
        source: z.string().optional(),
      }).optional()
    )
    .mutation(async ({ input }) => {
      try {
        console.log("[Warden] tRPC runCycle called", { source: input?.source || "unknown" });

        const result = await runWardenCycle();

        return {
          success: true,
          messageGenerated: result.messageGenerated,
          messageSent: result.messageSent,
          message: result.message,
          reason: result.reason,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.error("[Warden] tRPC runCycle failed:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        };
      }
    }),

  /**
   * Trigger an immediate Warden message for a specific event
   * Called by Make.com when a life loss, milestone, or other event occurs
   */
  triggerImmediate: publicProcedure
    .input(
      z.object({
        triggerType: z.enum(["life_loss", "milestone", "streak", "emergency"]),
        context: z.record(z.string(), z.any() as ZodType).optional(),
        source: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        console.log("[Warden] tRPC triggerImmediate called", {
          triggerType: input.triggerType,
          source: input.source || "unknown",
        });

        const result = await triggerImmediateMessage(
          input.triggerType,
          input.context || {}
        );

        return {
          success: true,
          messageSent: result.messageSent,
          message: result.message,
          triggerType: input.triggerType,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.error("[Warden] tRPC triggerImmediate failed:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          triggerType: input.triggerType,
          timestamp: new Date().toISOString(),
        };
      }
    }),

  /**
   * Get the current challenge state for debugging/monitoring
   * Called by Make.com or admin dashboard to inspect live data
   */
  getState: publicProcedure
    .query(async () => {
      try {
        const { getChallengeState } = await import("./challengeState");
        const state = await getChallengeState();

        return {
          success: true,
          state,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.error("[Warden] tRPC getState failed:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        };
      }
    }),

  /**
   * Get today's message count for monitoring daily limits
   * Called by Make.com or admin dashboard
   */
  getDailyStats: publicProcedure
    .query(async () => {
      try {
        const { getMessagesCountToday, getNoMessageCountToday, hasHitDailyLimit } = await import("./messageLogger");

        const messageCount = await getMessagesCountToday();
        const noMessageCount = await getNoMessageCountToday();
        const hitLimit = await hasHitDailyLimit();

        return {
          success: true,
          messagesSentToday: messageCount,
          noMessageDecisions: noMessageCount,
          dailyLimitHit: hitLimit,
          remainingMessages: Math.max(0, 3 - messageCount),
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.error("[Warden] tRPC getDailyStats failed:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        };
      }
    }),
});
