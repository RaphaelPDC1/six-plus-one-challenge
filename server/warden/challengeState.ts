import { and, desc, gte, lte } from "drizzle-orm";
import { getDb } from "../db";
import {
  participants,
  dailyLogs,
  paymentEvents,
  whatsappChatHistory,
} from "../../drizzle/schema";
import { getMaxMessagesForDramaScore } from "./organicScheduler";

/**
 * CHALLENGE_STATE: Complete snapshot of challenge data for the Warden bot
 * Assembled for organic Warden windows and sent to Claude API for message generation
 */
export interface ChallengeState {
  challenge_day: number;
  participants: Array<{
    id: number;
    display_name: string;
    lives_remaining: number;
    current_streak: number;
    longest_streak: number;
    total_points: number;
    rules_completed_today: number;
    rules_completed_this_week: number;
    last_logged_at: string | null;
    days_without_logging: number;
    ghost_life_used: boolean;
  }>;
  group_average_completion: number;
  recent_chat_messages: Array<{
    sender_name: string;
    message_text: string;
    timestamp: string;
  }>;
  lives_lost_today: Array<{
    participant_name: string;
    timestamp: string;
  }>;
  milestones_hit_today: Array<{
    type: string;
    participant_name: string;
    value: number;
    timestamp: string;
  }>;
  sharp_insights_shared_today: Array<{
    participant_name: string;
    type: "reflection" | "reading";
    excerpt: string;
    timestamp: string;
  }>;
  late_logs_today: Array<{
    participant_name: string;
    timestamp: string;
  }>;
  daily_drama_score: number;
  max_warden_messages_today: number;
  drama_score_breakdown: {
    life_losses: number;
    milestones: number;
    streak_milestones: number;
    sharp_insights: number;
    late_loggers: number;
  };
}

/**
 * Calculate the current challenge day (1-50)
 * Assumes challenge started on a specific date; adjust as needed
 */
function calculateChallengeDay(): number {
  // TODO: Confirm the exact start date with the user
  // For now, this is a placeholder that counts from a reference date
  const challengeStart = new Date("2026-01-01");
  const today = new Date();
  const daysDiff = Math.floor(
    (today.getTime() - challengeStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  return Math.min(daysDiff + 1, 50);
}

/**
 * Assemble the complete CHALLENGE_STATE for the Warden bot
 */
export async function getChallengeState(): Promise<ChallengeState> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const challengeDay = calculateChallengeDay();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  // Fetch all participants with their current stats
  const allParticipants = await db.select().from(participants);

  // Fetch today's logs to calculate rules completed
  const todayLogs = await db
    .select()
    .from(dailyLogs)
    .where(
      and(
        gte(dailyLogs.createdAt, todayStart),
        lte(dailyLogs.createdAt, new Date(todayStart.getTime() + 24 * 60 * 60 * 1000))
      )
    );

  // Fetch this week's logs
  const weekLogs = await db
    .select()
    .from(dailyLogs)
    .where(
      and(
        gte(dailyLogs.createdAt, weekStart),
        lte(dailyLogs.createdAt, now)
      )
    );

  // Fetch today's payment events (life losses)
  const todayPayments = await db
    .select()
    .from(paymentEvents)
    .where(
      and(
        gte(paymentEvents.createdAt, todayStart),
        lte(paymentEvents.createdAt, new Date(todayStart.getTime() + 24 * 60 * 60 * 1000))
      )
    );

  // Fetch recent chat messages (last 12 hours)
  const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
  const recentMessages = await db
    .select()
    .from(whatsappChatHistory)
    .where(gte(whatsappChatHistory.messageTimestamp, twelveHoursAgo))
    .orderBy(desc(whatsappChatHistory.messageTimestamp))
    .limit(50);

  // Build participant snapshot
  const participantSnapshots = allParticipants.map((p: typeof participants.$inferSelect) => {
    const todayRulesCount = todayLogs.filter(
      (log: typeof dailyLogs.$inferSelect) =>
        log.participantId === p.id &&
        log.dayComplete
    ).length;

    const weekRulesCount = weekLogs.filter(
      (log: typeof dailyLogs.$inferSelect) =>
        log.participantId === p.id &&
        log.dayComplete
    ).length;

    const lastLog = todayLogs
      .filter((log: typeof dailyLogs.$inferSelect) => log.participantId === p.id &&
        log.dayComplete
      ).sort((a: typeof dailyLogs.$inferSelect, b: typeof dailyLogs.$inferSelect) => (b.submittedAt?.getTime() || 0) - (a.submittedAt?.getTime() || 0))[0];

    const lastLoggedAt = lastLog?.submittedAt || null;
    const daysWithoutLogging = lastLoggedAt
      ? Math.floor((now.getTime() - lastLoggedAt.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    return {
      id: p.id,
      display_name: p.displayName,
      lives_remaining: p.livesRemaining,
      current_streak: p.currentStreak,
      longest_streak: p.longestStreak,
      total_points: p.totalPoints,
      rules_completed_today: todayRulesCount,
      rules_completed_this_week: weekRulesCount,
      last_logged_at: lastLoggedAt?.toISOString() || null,
      days_without_logging: daysWithoutLogging,
      ghost_life_used: p.ghostLifeUsed,
    };
  });

  // Calculate group average completion rate
  const totalParticipants = allParticipants.length;
  const groupAverageCompletion =
    totalParticipants > 0
      ? participantSnapshots.reduce((sum: number, p: typeof participantSnapshots[0]) => sum + p.rules_completed_this_week, 0) /
        (totalParticipants * 7)
      : 0;

  // Build lives lost today snapshot. Count the life-loss event as drama even while payment is pending.
  const livesLostToday = todayPayments
    .map((payment: typeof paymentEvents.$inferSelect) => {
      const participant = allParticipants.find((p: typeof participants.$inferSelect) => p.id === payment.participantId);
      return {
        participant_name: participant?.displayName || "Unknown",
        timestamp: payment.createdAt.toISOString(),
      };
    });

  // Build milestones hit today snapshot
  const milestonesToday: ChallengeState["milestones_hit_today"] = [];

  // Check for streak milestones
  participantSnapshots.forEach((p: typeof participantSnapshots[0]) => {
    if (p.current_streak === 7 || p.current_streak === 14 || p.current_streak === 21) {
      milestonesToday.push({
        type: `streak_${p.current_streak}_days`,
        participant_name: p.display_name,
        value: p.current_streak,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Check for challenge day milestones
  if (challengeDay === 10 || challengeDay === 25 || challengeDay === 40 || challengeDay === 50) {
    milestonesToday.push({
      type: `challenge_day_${challengeDay}`,
      participant_name: "Group",
      value: challengeDay,
      timestamp: new Date().toISOString(),
    });
  }

  const sharpInsightsToday = todayLogs
    .flatMap((log: typeof dailyLogs.$inferSelect) => {
      const participant = allParticipants.find((p: typeof participants.$inferSelect) => p.id === log.participantId);
      const timestamp = (log.submittedAt || log.createdAt).toISOString();
      const insights: ChallengeState["sharp_insights_shared_today"] = [];

      if (log.reflectionShared && log.reflectionText && log.reflectionText.trim().length >= 80) {
        insights.push({
          participant_name: participant?.displayName || "Unknown",
          type: "reflection",
          excerpt: log.reflectionText.trim().slice(0, 180),
          timestamp,
        });
      }

      if (log.readTeachText && log.readTeachText.trim().length >= 80) {
        insights.push({
          participant_name: participant?.displayName || "Unknown",
          type: "reading",
          excerpt: log.readTeachText.trim().slice(0, 180),
          timestamp,
        });
      }

      return insights;
    });

  const lateLogsToday = todayLogs
    .filter((log: typeof dailyLogs.$inferSelect) => {
      const submittedAt = log.submittedAt || log.createdAt;
      return submittedAt.getUTCHours() >= 20;
    })
    .map((log: typeof dailyLogs.$inferSelect) => {
      const participant = allParticipants.find((p: typeof participants.$inferSelect) => p.id === log.participantId);
      const submittedAt = log.submittedAt || log.createdAt;
      return {
        participant_name: participant?.displayName || "Unknown",
        timestamp: submittedAt.toISOString(),
      };
    });

  const uniqueLateLoggers = new Set(lateLogsToday.map((log) => log.participant_name)).size;
  const streakMilestoneCount = milestonesToday.filter((milestone) => milestone.type.startsWith("streak_")).length;
  const nonStreakMilestoneCount = milestonesToday.length - streakMilestoneCount;
  const dramaScoreBreakdown = {
    life_losses: livesLostToday.length * 3,
    milestones: nonStreakMilestoneCount * 2,
    streak_milestones: streakMilestoneCount * 2,
    sharp_insights: sharpInsightsToday.length,
    late_loggers: uniqueLateLoggers,
  };
  const dailyDramaScore = Object.values(dramaScoreBreakdown).reduce((sum, value) => sum + value, 0);

  return {
    challenge_day: challengeDay,
    participants: participantSnapshots,
    group_average_completion: Math.round(groupAverageCompletion * 100) / 100,
    recent_chat_messages: recentMessages.map((msg: typeof whatsappChatHistory.$inferSelect) => ({
      sender_name: msg.senderName || "Unknown",
      message_text: msg.messageText,
      timestamp: msg.messageTimestamp.toISOString(),
    })),
    lives_lost_today: livesLostToday,
    milestones_hit_today: milestonesToday,
    sharp_insights_shared_today: sharpInsightsToday,
    late_logs_today: lateLogsToday,
    daily_drama_score: dailyDramaScore,
    max_warden_messages_today: getMaxMessagesForDramaScore(dailyDramaScore),
    drama_score_breakdown: dramaScoreBreakdown,
  };
}
