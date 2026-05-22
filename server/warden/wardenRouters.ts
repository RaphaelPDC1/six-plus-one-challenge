import { z, type ZodType } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { runWardenCycle, triggerImmediateMessage } from "./runner";
import { getAppSnapshot, getCurrentChallengeDay, getParticipantByUserId } from "../db";
import { invokeLLM } from "../_core/llm";
import type { participants, dailyLogs } from "../../drizzle/schema";
import type { InferSelectModel } from "drizzle-orm";

type Participant = InferSelectModel<typeof participants>;
type DailyLog = InferSelectModel<typeof dailyLogs>;

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

function completedRuleCount(log: Partial<DailyLog> | null | undefined) {
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

function fallbackMood(participant: Partial<Participant>, logs: Partial<DailyLog>[], currentDay: number): WardenMoodResult {
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
      const participant = (participants as Participant[]).find(p => String(p.id) === String(targetParticipantId)) ?? ownParticipant;
      const currentDay = Number(snapshot.challenge?.currentDay ?? getCurrentChallengeDay());
      const logs = (snapshot.logs as DailyLog[]).filter(log => String(log.participantId) === String(targetParticipantId));
      if (!participant) return { label: "No read yet", tone: "white" as WardenMoodTone, detail: "The Warden could not find this participant profile.", confidence: 0, source: "fallback" as const };
      const fallback = fallbackMood(participant, logs, currentDay);
      const compactLogs = logs.slice(-8).map(log => {
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
   * Get a personal Warden anti-gaming insight for a specific participant.
   * Analyses last 7 days of logs: submission timing, reflection text patterns, streak anomalies.
   * Cached per participant per day (6h TTL). Returns one sharp observation.
   */
  getPersonalInsight: protectedProcedure
    .input(z.object({ participantId: z.number() }))
    .query(async ({ ctx, input }) => {
      const cacheKey = `personal-insight-${input.participantId}-${new Date().toISOString().slice(0, 10)}`;
      const cached = wardenMoodCache.get(cacheKey);
      if (cached && Date.now() - cached.createdAt < WARDEN_MOOD_CACHE_TTL_MS) {
        return { message: cached.mood.detail, source: "cache" as const };
      }
      try {
        const { getDb } = await import("../db");
        const db = await getDb();
        if (!db) return { message: "No hiding place. Log the day.", source: "fallback" as const };
        const { dailyLogs: logsTable } = await import("../../drizzle/schema");
        const { eq, desc } = await import("drizzle-orm");
        const logs = await db.select().from(logsTable).where(eq(logsTable.participantId, input.participantId)).orderBy(desc(logsTable.dayNumber)).limit(7);
        if (logs.length < 2) return { message: "The record is thin. Keep logging.", source: "fallback" as const };
        const timingData = logs.map(log => ({
          day: log.dayNumber,
          submittedAt: log.submittedAt ? new Date(log.submittedAt).toISOString() : null,
          hour: log.submittedAt ? new Date(log.submittedAt).getHours() : null,
          complete: log.dayComplete,
          reflectionLength: String(log.reflectionText ?? "").trim().length,
          readTeachLength: String(log.readTeachText ?? "").trim().length,
          exerciseDuration: log.exerciseDuration,
          exerciseType: String(log.exerciseType ?? "").trim().slice(0, 60),
        }));
        const lateNightCount = timingData.filter(d => d.hour !== null && (d.hour >= 23 || d.hour < 2)).length;
        const shortReflections = timingData.filter(d => d.complete && d.reflectionLength < 20).length;
        const repeatedExercise = timingData.length >= 3 && timingData.slice(0, 3).every(d => d.exerciseType && d.exerciseType === timingData[0].exerciseType);
        const prompt = `You are the Warden of a 50-day discipline challenge. You have access to a participant's last ${logs.length} days of logs. Write ONE short, sharp observation about their patterns — not a compliment, not a punishment. Dry. Intelligent. Slightly intimidating. Never cheesy. Never motivational-speaker energy. Make them feel seen.\n\nData:\n${JSON.stringify(timingData, null, 2)}\n\nPatterns detected:\n- Late-night submissions (11pm-2am): ${lateNightCount} of ${logs.length} days\n- Short reflections when complete: ${shortReflections} of ${logs.length} days\n- Same exercise type 3 days in a row: ${repeatedExercise}\n\nWrite ONE sentence (max 180 chars). No quotes. No prefix. Just the observation.`;
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are the Warden. One sentence. Dry. Sharp. No fluff." },
            { role: "user", content: prompt },
          ],
        });
        const message = String(response?.choices?.[0]?.message?.content ?? "").trim().slice(0, 200) || "The pattern is clear. Keep logging.";
        wardenMoodCache.set(cacheKey, { fingerprint: cacheKey, mood: { label: "insight", tone: "red", detail: message, confidence: 0.8, source: "ai" }, createdAt: Date.now() });
        return { message, source: "ai" as const };
      } catch (err) {
        console.warn("[Warden] getPersonalInsight failed", err);
        return { message: "No hiding place. Log the day.", source: "fallback" as const };
      }
    }),

  /**
   * Get a collective Warden board message about group-level patterns.
   * Anonymous, never accuses individuals. One observation per day.
   */
  getCollectiveBoardMessage: publicProcedure
    .query(async () => {
      const cacheKey = `collective-board-${new Date().toISOString().slice(0, 10)}`;
      const cached = wardenMoodCache.get(cacheKey);
      if (cached && Date.now() - cached.createdAt < WARDEN_MOOD_CACHE_TTL_MS) {
        return { message: cached.mood.detail, source: "cache" as const };
      }
      try {
        const { getDb, getCurrentChallengeDay } = await import("../db");
        const currentDay = getCurrentChallengeDay();
        const db = await getDb();
        if (!db) return { message: "Warden note: the system is watching consistency, not theatrics.", source: "fallback" as const };
        const { dailyLogs: logsTable } = await import("../../drizzle/schema");
        const { gte } = await import("drizzle-orm");
        const recentLogs = await db.select().from(logsTable).where(gte(logsTable.dayNumber, Math.max(1, currentDay - 3))).limit(200);
        const lateNightCount = recentLogs.filter(log => {
          if (!log.submittedAt) return false;
          const h = new Date(log.submittedAt).getHours();
          return h >= 23 || h < 2;
        }).length;
        const totalComplete = recentLogs.filter(log => log.dayComplete).length;
        const shortReflectionCount = recentLogs.filter(log => log.dayComplete && String(log.reflectionText ?? "").trim().length < 15).length;
        const prompt = `You are the Warden of a 50-day group discipline challenge. Write ONE collective observation about the group's patterns — anonymous, never accusing individuals. Dry. Intelligent. Slightly intimidating. Never cheesy.\n\nGroup data (last 3 days):\n- Total complete logs: ${totalComplete}\n- Late-night submissions (11pm-2am): ${lateNightCount}\n- Very short reflections when complete: ${shortReflectionCount}\n\nWrite ONE sentence (max 200 chars). No quotes. No prefix. General pattern observation only.`;
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are the Warden. One sentence. Dry. Sharp. Group-level only." },
            { role: "user", content: prompt },
          ],
        });
        const message = String(response?.choices?.[0]?.message?.content ?? "").trim().slice(0, 220) || "Warden note: late-night check-ins are rising. The system is watching consistency, not theatrics.";
        wardenMoodCache.set(cacheKey, { fingerprint: cacheKey, mood: { label: "board", tone: "red", detail: message, confidence: 0.8, source: "ai" }, createdAt: Date.now() });
        return { message, source: "ai" as const };
      } catch (err) {
        console.warn("[Warden] getCollectiveBoardMessage failed", err);
        return { message: "Warden note: late-night check-ins are rising. The system is watching consistency, not theatrics.", source: "fallback" as const };
      }
    }),

  /**
   * Get 3 Warden red-highlight bullets focused on TODAY's live group data.
   * Cache key includes day + 6h time-slot so it refreshes 4x/day:
   *   slot 0 = 00:00–05:59, slot 1 = 06:00–11:59, slot 2 = 12:00–17:59, slot 3 = 18:00–23:59
   * Warden voice: dry, intelligent, slightly intimidating. Never generic.
   */
  getDailyReds: publicProcedure
    .query(async () => {
      const now = new Date();
      const dayStr = now.toISOString().slice(0, 10);
      const timeSlot = Math.floor(now.getUTCHours() / 6); // 0-3
      const cacheKey = `daily-reds-${dayStr}-slot${timeSlot}`;
      const cached = wardenMoodCache.get(cacheKey);
      if (cached && Date.now() - cached.createdAt < WARDEN_MOOD_CACHE_TTL_MS) {
        // Parse the stored JSON array from detail
        try {
          const reds = JSON.parse(cached.mood.detail) as string[];
          return { reds, source: "cache" as const, slot: timeSlot };
        } catch { /* fall through to regenerate */ }
      }
      try {
        const { getDb, getCurrentChallengeDay } = await import("../db");
        const currentDay = getCurrentChallengeDay();
        const db = await getDb();
        if (!db) return { reds: ["Log today. The gap compounds.", "Every rule missed is a point lost permanently.", "The group is watching who shows up."], source: "fallback" as const, slot: timeSlot };
        const { dailyLogs: logsTable, participants: participantsTable } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        // Fetch today's logs and all participants
        const [todayLogs, allParticipants] = await Promise.all([
          db.select().from(logsTable).where(eq(logsTable.dayNumber, currentDay)).limit(100),
          db.select().from(participantsTable).limit(100),
        ]);
        const totalParticipants = allParticipants.length;
        const loggedToday = todayLogs.length;
        const completedToday = todayLogs.filter(l => l.dayComplete).length;
        const notLoggedCount = Math.max(0, totalParticipants - loggedToday);
        const livesAtRisk = allParticipants.filter(p => (p.livesRemaining ?? 4) <= 1).length;
        // Rule-level gap analysis for today
        const ruleKeys = ["noAlcohol", "cleanEating", "exerciseDone", "reflectionDone", "readTeachDone", "trackedEverything"] as const;
        const ruleLabels: Record<string, string> = { noAlcohol: "no-alcohol", cleanEating: "clean eating", exerciseDone: "exercise", reflectionDone: "reflection", readTeachDone: "read & teach", trackedEverything: "track everything" };
        const ruleMissCounts = ruleKeys.map(key => ({
          rule: ruleLabels[key],
          missed: todayLogs.filter(l => !l[key as keyof typeof l]).length,
        })).sort((a, b) => b.missed - a.missed);
        const topMissedRule = ruleMissCounts[0];
        const lateNightCount = todayLogs.filter(l => {
          if (!l.submittedAt) return false;
          const h = new Date(l.submittedAt).getUTCHours();
          return h >= 22 || h < 2;
        }).length;
        const prompt = `You are the Warden of a 50-day group discipline challenge. It is day ${currentDay}/50, time slot ${timeSlot} (0=midnight, 1=6am, 2=noon, 3=6pm UTC).

TODAY'S LIVE DATA:
- Total participants: ${totalParticipants}
- Logged today: ${loggedToday} (${notLoggedCount} have NOT logged yet)
- Completed today: ${completedToday}
- Lives at risk (≤1 life): ${livesAtRisk}
- Late-night submissions so far: ${lateNightCount}
- Most-missed rule today: "${topMissedRule?.rule}" (${topMissedRule?.missed} participants missed it)
- Rule miss breakdown: ${ruleMissCounts.slice(0, 4).map(r => `${r.rule}: ${r.missed} missed`).join(", ")}

Generate EXACTLY 3 short, punchy red-highlight bullets about TODAY's data. Each bullet:
- Max 14 words
- References actual numbers from today's data
- Warden voice: dry, precise, slightly unsettling
- No generic advice. No motivation. No fluff.
- Each bullet should feel like a different angle: one about who hasn't logged, one about a specific rule gap, one about risk/stakes

Respond in JSON only.`;
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are the Warden. Three bullets. Dry. Sharp. Today's data only. JSON only." },
            { role: "user", content: prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "warden_daily_reds",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  reds: {
                    type: "array",
                    items: { type: "string" },
                    minItems: 3,
                    maxItems: 3,
                  },
                },
                required: ["reds"],
                additionalProperties: false,
              },
            },
          },
        });
        const rawContent = response.choices[0].message.content;
        const content = typeof rawContent === "string" ? rawContent : null;
        if (!content) throw new Error("Empty LLM response");
        const parsed = JSON.parse(content);
        const reds: string[] = Array.isArray(parsed.reds) && parsed.reds.length >= 3
          ? parsed.reds.slice(0, 3).map((r: unknown) => String(r).slice(0, 120))
          : [`${notLoggedCount} challengers haven't logged yet today.`, `"${topMissedRule?.rule}" is today's most-missed rule.`, livesAtRisk > 0 ? `${livesAtRisk} challenger${livesAtRisk > 1 ? "s are" : " is"} one miss from losing a life.` : "No lives at risk — keep it that way."];
        wardenMoodCache.set(cacheKey, { fingerprint: cacheKey, mood: { label: "daily-reds", tone: "red", detail: JSON.stringify(reds), confidence: 0.9, source: "ai" }, createdAt: Date.now() });
        return { reds, source: "ai" as const, slot: timeSlot };
      } catch (err) {
        console.warn("[Warden] getDailyReds failed", err);
        return { reds: ["Log today. The gap compounds.", "Every rule missed is a point lost permanently.", "The group is watching who shows up."], source: "fallback" as const, slot: timeSlot };
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
