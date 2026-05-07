import { z, type ZodType } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { runWardenCycle, triggerImmediateMessage } from "./runner";
import { getAppSnapshot, getCurrentChallengeDay, getParticipantByUserId } from "../db";
import { invokeLLM } from "../_core/llm";

/**
 * Warden tRPC router for Make.com webhook integration
 * These endpoints are public and called by Make automation
 */
type WardenMoodTone = "green" | "gold" | "red" | "purple" | "white";
type WardenMoodResult = {
  label: string;
  tone: WardenMoodTone;
  detail: string;
  confidence: number;
  source: "ai" | "fallback";
};

type WardenMoodCacheEntry = {
  fingerprint: string;
  mood: WardenMoodResult;
  createdAt: number;
};

const wardenMoodCache = new Map<string, WardenMoodCacheEntry>();
const WARDEN_MOOD_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

function stableMoodFingerprint(input: unknown) {
  return JSON.stringify(input);
}

function getStableMood(cacheKey: string, fingerprint: string) {
  const cached = wardenMoodCache.get(cacheKey);
  if (!cached) return null;
  const isFresh = Date.now() - cached.createdAt < WARDEN_MOOD_CACHE_TTL_MS;
  if (cached.fingerprint !== fingerprint || !isFresh) return null;
  return { ...cached.mood, source: cached.mood.source };
}

function rememberStableMood(cacheKey: string, fingerprint: string, mood: WardenMoodResult) {
  wardenMoodCache.set(cacheKey, { fingerprint, mood, createdAt: Date.now() });
  return mood;
}

function completedRuleCount(log: Record<string, any> | null | undefined) {
  if (!log) return 0;
  return [
    Boolean(log.noAlcohol),
    Boolean(log.cleanEating),
    Boolean(log.exerciseDone) || (Number(log.exerciseDuration ?? 0) >= 30 && String(log.exerciseType ?? "").trim().length > 0),
    Boolean(log.reflectionDone) || String(log.reflectionText ?? "").trim().length > 0,
    Boolean(log.readTeachDone) || String(log.readTeachText ?? "").trim().length > 0,
    Boolean(log.trackedEverything),
  ].filter(Boolean).length;
}

function fallbackMood(participant: Record<string, any>, logs: Record<string, any>[], currentDay: number): WardenMoodResult {
  const todayLog = logs.find(log => Number(log.dayNumber ?? 0) === currentDay);
  const recentLogs = logs.filter(log => Number(log.dayNumber ?? 0) >= Math.max(1, currentDay - 6));
  const todayCount = completedRuleCount(todayLog);
  const recentGreens = recentLogs.filter(log => Boolean(log.dayComplete) || completedRuleCount(log) >= 5).length;
  const insightText = String(todayLog?.reflectionText ?? "") + " " + String(todayLog?.readTeachText ?? "");
  const lives = Number(participant.livesRemaining ?? 4);
  if (lives <= 1) return { label: "Knife edge", tone: "red" as WardenMoodTone, detail: "The Warden sees one life left. Today needs proof, not promises.", confidence: 0.62, source: "fallback" as const };
  if (todayCount >= 6) return { label: "Locked in", tone: "green" as WardenMoodTone, detail: "Six rules are banked today. This is clean pressure with receipts.", confidence: 0.68, source: "fallback" as const };
  if (todayCount >= 5) return { label: "Green but watched", tone: "gold" as WardenMoodTone, detail: "The pass is there, but the Warden is still checking depth and proof quality.", confidence: 0.64, source: "fallback" as const };
  if (!todayLog) return { label: "Ghost mode", tone: "white" as WardenMoodTone, detail: "No log opened today. Silence is a signal in this challenge.", confidence: 0.6, source: "fallback" as const };
  if (insightText.trim().length >= 120) return { label: "Deep work", tone: "purple" as WardenMoodTone, detail: "The reflections have substance. Now turn that honesty into a green finish.", confidence: 0.66, source: "fallback" as const };
  if (recentGreens >= 4) return { label: "Still dangerous", tone: "green" as WardenMoodTone, detail: "The recent trend is strong, but today still has unfinished business.", confidence: 0.61, source: "fallback" as const };
  return { label: "Slipping", tone: "red" as WardenMoodTone, detail: "The Warden sees partial effort. Finish the pass before the board moves without you.", confidence: 0.58, source: "fallback" as const };
}

export const wardenRouter = router({
  getMood: protectedProcedure
    .input(z.object({ participantId: z.number().int().optional(), metric: z.enum(["effort_vibe", "risk", "depth", "proof", "momentum"]).default("effort_vibe") }).optional())
    .query(async ({ ctx, input }) => {
      const ownParticipant = await getParticipantByUserId(ctx.user.id);
      const targetParticipantId = input?.participantId ?? ownParticipant?.id;
      if (!targetParticipantId) return { label: "No read yet", tone: "white" as WardenMoodTone, detail: "Create a participant profile before the Warden can read the room.", confidence: 0, source: "fallback" as const };
      if (ctx.user.role !== "admin" && String(ownParticipant?.id) !== String(targetParticipantId)) {
        return { label: "Private read only", tone: "white" as WardenMoodTone, detail: "Warden Mood only reads your own logs unless you are the challenge admin.", confidence: 0, source: "fallback" as const };
      }
      const snapshot = await getAppSnapshot(ctx.user.id, ctx.user.role, ctx.user.email);
      const participants = snapshot.participants ?? [];
      const participant = participants.find((p: any) => String(p.id) === String(targetParticipantId)) ?? ownParticipant;
      const currentDay = Number(snapshot.challenge?.currentDay ?? getCurrentChallengeDay());
      const logs = (snapshot.logs ?? []).filter((log: any) => String(log.participantId) === String(targetParticipantId));
      if (!participant) return { label: "No read yet", tone: "white" as WardenMoodTone, detail: "The Warden could not find this participant profile.", confidence: 0, source: "fallback" as const };
      const fallback = fallbackMood(participant, logs, currentDay);
      const compactLogs = logs.slice(-8).map((log: any) => {
        const privateReflectionText = String(log.reflectionText ?? "").trim();
        return {
          day: log.dayNumber,
          rulesComplete: completedRuleCount(log),
          dayComplete: Boolean(log.dayComplete),
          pointsAwarded: log.pointsAwarded,
          exerciseDuration: log.exerciseDuration,
          hasProof: String(log.exerciseProofUrl ?? "").trim().length > 4,
          privateReflectionText: privateReflectionText.slice(0, 700),
          privateReflectionChars: privateReflectionText.length,
          reflectionShared: Boolean(log.reflectionShared),
          readTeachText: String(log.readTeachText ?? "").slice(0, 700),
          submittedAt: log.submittedAt,
        };
      });
      const moodContext = { metric: input?.metric ?? "effort_vibe", participant: { displayName: participant.displayName, livesRemaining: participant.livesRemaining, currentStreak: participant.currentStreak, totalPoints: participant.totalPoints, daysComplete: participant.daysComplete, primaryGoal: participant.primaryGoal, biggestObstacle: participant.biggestObstacle, trainingLevel: participant.trainingLevel, supportNeeded: participant.supportNeeded }, currentDay, logs: compactLogs, fallback };
      const cacheKey = `${targetParticipantId}:${input?.metric ?? "effort_vibe"}:${currentDay}`;
      const fingerprint = stableMoodFingerprint(moodContext);
      const stableMood = getStableMood(cacheKey, fingerprint);
      if (stableMood) return stableMood;
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are The Warden for the 6+1 4 Lives Challenge. Produce a private, concise vibe read for one participant based only on their own logs, private reflection log, Read & Teach, proof, streak, lives, and recent movement. Private reflections are personal context for that participant only: use the pattern, honesty, depth, or concern they reveal, but do not quote sensitive raw reflection lines or write as if the text is public. Be direct, motivating, and never mention technical field names." },
            { role: "user", content: JSON.stringify(moodContext) },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "warden_mood",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  tone: { type: "string", enum: ["green", "gold", "red", "purple", "white"] },
                  detail: { type: "string" },
                  confidence: { type: "number" },
                },
                required: ["label", "tone", "detail", "confidence"],
                additionalProperties: false,
              },
            },
          },
        });
        const content = response.choices[0]?.message?.content;
        const parsed = typeof content === "string" ? JSON.parse(content) : null;
        if (!parsed || typeof parsed.label !== "string" || typeof parsed.detail !== "string") return rememberStableMood(cacheKey, fingerprint, fallback);
        return rememberStableMood(cacheKey, fingerprint, {
          label: String(parsed.label).slice(0, 42),
          tone: (["green", "gold", "red", "purple", "white"].includes(parsed.tone) ? parsed.tone : fallback.tone) as WardenMoodTone,
          detail: String(parsed.detail).slice(0, 240),
          confidence: Math.max(0, Math.min(1, Number(parsed.confidence ?? 0))),
          source: "ai" as const,
        });
      } catch (error) {
        console.warn("[WardenMood] Falling back after LLM error", error);
        return rememberStableMood(cacheKey, fingerprint, fallback);
      }
    }),
  /**
   * Run a scheduled Warden cycle during randomized organic windows.
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
        const { getChallengeState } = await import("./challengeState");

        const messageCount = await getMessagesCountToday();
        const noMessageCount = await getNoMessageCountToday();
        const state = await getChallengeState();
        const dailyLimit = state.max_warden_messages_today;
        const hitLimit = await hasHitDailyLimit(dailyLimit);

        return {
          success: true,
          messagesSentToday: messageCount,
          noMessageDecisions: noMessageCount,
          dailyLimitHit: hitLimit,
          dailyDramaScore: state.daily_drama_score,
          dailyMessageLimit: dailyLimit,
          remainingMessages: Math.max(0, dailyLimit - messageCount),
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
