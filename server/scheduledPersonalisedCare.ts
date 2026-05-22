/**
 * Scheduled handler for auto-generating personalised community care notes.
 * Triggered by the Manus Heartbeat cron every 3 days.
 * Mounted at POST /api/scheduled/personalised-care-notes in server/_core/index.ts
 */
import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";

export async function handlePersonalisedCareNotes(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only endpoint" });
    }

    // Import lazily to avoid circular deps at startup
    const { getDb, getAppSnapshot, getCurrentChallengeDay } = await import("./db");
    const { generatePersonalisedCareInsight } = await import("./releaseNoteGenerator");
    const { createCommunityCareReleaseNote } = await import("./db");

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database not available", taskUid: user.taskUid });
    }

    // Use a dummy admin user id (owner) for the note creator
    const { participants: participantsTable } = await import("../drizzle/schema");
    const allParticipants = await db.select().from(participantsTable).limit(100);

    const currentDay = getCurrentChallengeDay();
    const versionLabel = `auto-v${currentDay}`;

    // Get full snapshot for group stats
    const snapshot = await getAppSnapshot(-1, "admin", null);
    const allLogs = snapshot.logs as any[];
    const allParticipantsFull = snapshot.participants as any[];

    const totalPts = allParticipantsFull.reduce((s: number, p: any) => s + p.totalPoints, 0);
    const avgTotalPoints = allParticipantsFull.length > 0 ? Math.round(totalPts / allParticipantsFull.length) : 0;
    const avgStreak = allParticipantsFull.length > 0
      ? Math.round(allParticipantsFull.reduce((s: number, p: any) => s + p.currentStreak, 0) / allParticipantsFull.length)
      : 0;
    const completedToday = allLogs.filter((l: any) => l.dayNumber === currentDay && l.dayComplete).length;
    const completionRateToday = allParticipantsFull.length > 0 ? Math.round((completedToday / allParticipantsFull.length) * 100) : 0;
    const participantsAtRisk = allParticipantsFull.filter((p: any) => p.livesRemaining <= 1).length;
    const sortedByPoints = [...allParticipantsFull].sort((a: any, b: any) => b.totalPoints - a.totalPoints);
    const groupStats = { totalParticipants: allParticipantsFull.length, avgTotalPoints, avgStreak, completionRateToday, participantsAtRisk };

    const results: Array<{ participantId: number; name: string; success: boolean; error?: string }> = [];

    for (const participant of allParticipants) {
      try {
        const rank = sortedByPoints.findIndex((p: any) => p.id === (participant as any).id) + 1;
        const recentLogs = allLogs
          .filter((l: any) => l.participantId === (participant as any).id)
          .sort((a: any, b: any) => b.dayNumber - a.dayNumber)
          .slice(0, 3)
          .map((l: any) => ({
            dayNumber: l.dayNumber,
            submittedAt: l.submittedAt ? new Date(l.submittedAt).toISOString() : undefined,
            noAlcohol: !!l.noAlcohol,
            cleanEating: !!l.cleanEating,
            exerciseDone: !!l.exerciseDone,
            reflectionDone: !!l.reflectionDone,
            readTeachDone: !!l.readTeachDone,
            trackedEverything: !!l.trackedEverything,
            pointsAwarded: l.pointsAwarded ?? 0,
            exerciseType: l.exerciseType ?? undefined,
            exerciseDuration: l.exerciseDuration ?? undefined,
            reflectionText: String(l.reflectionText ?? "").slice(0, 80) || undefined,
            readTeachText: String(l.readTeachText ?? "").slice(0, 80) || undefined,
          }));

        if (recentLogs.length === 0) {
          results.push({ participantId: (participant as any).id, name: (participant as any).displayName ?? "?", success: false, error: "No logs" });
          continue;
        }

        const careCtx = {
          name: (participant as any).displayName ?? "Challenger",
          dayNumber: currentDay,
          totalPoints: (participant as any).totalPoints ?? 0,
          currentStreak: (participant as any).currentStreak ?? 0,
          livesRemaining: (participant as any).livesRemaining ?? 4,
          rank,
          recentLogs,
          groupStats,
        };

        const insight = await generatePersonalisedCareInsight(careCtx);
        const body = JSON.stringify(insight);

        // Use owner id = 1 as the creator (system-generated note)
        await createCommunityCareReleaseNote({
          title: `Warden Insight — ${(participant as any).displayName ?? "Challenger"}`,
          summary: insight.personalObservation.slice(0, 200),
          body,
          versionLabel,
          category: "community_care",
          active: true,
          targetUserId: (participant as any).userId,
        }, 1);

        results.push({ participantId: (participant as any).id, name: (participant as any).displayName ?? "?", success: true });
      } catch (err: any) {
        results.push({ participantId: (participant as any).id, name: (participant as any).displayName ?? "?", success: false, error: err?.message ?? "Unknown" });
      }
    }

    const generated = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    console.log(`[ScheduledCare] Generated ${generated} personalised notes, ${failed} failed. Day ${currentDay}.`);

    return res.json({ ok: true, generated, failed, day: currentDay, taskUid: user.taskUid });
  } catch (err: any) {
    console.error("[ScheduledCare] Handler error:", err);
    return res.status(500).json({
      error: err?.message ?? "Unknown error",
      stack: err?.stack,
      context: { url: req.url, taskUid: "unknown" },
      timestamp: new Date().toISOString(),
    });
  }
}
