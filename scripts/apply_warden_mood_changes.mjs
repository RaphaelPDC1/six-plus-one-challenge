import fs from 'node:fs';

const path = '/home/ubuntu/six-plus-one-challenge/server/warden/wardenRouters.ts';
let text = fs.readFileSync(path, 'utf8');
function replaceOnce(find, replace) {
  const count = text.split(find).length - 1;
  if (count !== 1) throw new Error(`Expected one occurrence, found ${count}: ${find.slice(0, 80)}`);
  text = text.replace(find, replace);
}

replaceOnce(String.raw`import type { ZodType } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { runWardenCycle, triggerImmediateMessage } from "./runner";
`, String.raw`import { z, type ZodType } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { runWardenCycle, triggerImmediateMessage } from "./runner";
import { getAppSnapshot, getCurrentChallengeDay, getParticipantByUserId } from "../db";
import { invokeLLM } from "../_core/llm";
`);

replaceOnce(String.raw`export const wardenRouter = router({
`, String.raw`type WardenMoodTone = "green" | "gold" | "red" | "purple" | "white";

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

function fallbackMood(participant: Record<string, any>, logs: Record<string, any>[], currentDay: number) {
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
      const compactLogs = logs.slice(-8).map((log: any) => ({
        day: log.dayNumber,
        rulesComplete: completedRuleCount(log),
        dayComplete: Boolean(log.dayComplete),
        pointsAwarded: log.pointsAwarded,
        exerciseDuration: log.exerciseDuration,
        hasProof: String(log.exerciseProofUrl ?? "").trim().length > 4,
        reflectionText: String(log.reflectionText ?? "").slice(0, 700),
        readTeachText: String(log.readTeachText ?? "").slice(0, 700),
        submittedAt: log.submittedAt,
      }));
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are The Warden for the 6+1 4 Lives Challenge. Produce a private, concise vibe read for one participant based only on their own logs, reflection, Read & Teach, proof, streak, lives, and recent movement. Be direct, motivating, and never mention technical field names." },
            { role: "user", content: JSON.stringify({ metric: input?.metric ?? "effort_vibe", participant: { displayName: participant.displayName, livesRemaining: participant.livesRemaining, currentStreak: participant.currentStreak, totalPoints: participant.totalPoints, daysComplete: participant.daysComplete, primaryGoal: participant.primaryGoal, biggestObstacle: participant.biggestObstacle, trainingLevel: participant.trainingLevel, supportNeeded: participant.supportNeeded }, currentDay, logs: compactLogs, fallback }) },
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
        if (!parsed || typeof parsed.label !== "string" || typeof parsed.detail !== "string") return fallback;
        return {
          label: String(parsed.label).slice(0, 42),
          tone: (["green", "gold", "red", "purple", "white"].includes(parsed.tone) ? parsed.tone : fallback.tone) as WardenMoodTone,
          detail: String(parsed.detail).slice(0, 240),
          confidence: Math.max(0, Math.min(1, Number(parsed.confidence ?? 0))),
          source: "ai" as const,
        };
      } catch (error) {
        console.warn("[WardenMood] Falling back after LLM error", error);
        return fallback;
      }
    }),
`);

fs.writeFileSync(path, text);
