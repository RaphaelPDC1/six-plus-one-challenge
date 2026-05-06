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
 * Assembled for organic Warden windows and sent to Claude API for message generation.
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
  recent_insights: Array<{
    participant: string;
    insight_text: string;
    shared_at: string;
    rule: "read_teach";
  }>;
  recent_reflections: Array<{
    participant: string;
    reflection_text: string;
    logged_at: string;
    is_shared: boolean;
  }>;
  exercise_logs: Array<{
    participant: string;
    activity_type: string;
    duration_minutes: number;
    proof_uploaded: boolean;
    logged_at: string;
  }>;
  improving_participants: string[];
  declining_participants: string[];
  silent_participants: string[];
  consistent_participants: string[];
  shared_themes: Array<{
    theme: string;
    participants: string[];
    quotes: string[];
  }>;
  personal_bests_today: Array<{
    participant_name: string;
    type: "exercise_duration" | "rules_completed";
    value: number;
    previous_best: number;
    timestamp: string;
  }>;
  silent_returns_today: Array<{
    participant_name: string;
    days_quiet_before_logging: number;
    timestamp: string;
  }>;
  ghost_life_signals_today: Array<{
    participant_name: string;
    reason: string;
    timestamp: string;
  }>;
  before_midday_full_rule_completions: Array<{
    participant_name: string;
    timestamp: string;
  }>;
  daily_drama_score: number;
  max_warden_messages_today: number;
  drama_score_breakdown: {
    life_losses: number;
    milestones: number;
    streak_milestones: number;
    shared_themes: number;
    personal_bests: number;
    deep_insights: number;
    late_night_loggers: number;
    silent_returns: number;
    ghost_life_uses: number;
    before_midday_completions: number;
  };
}

function calculateChallengeDay(): number {
  // TODO: Confirm the exact start date with the user.
  const challengeStart = new Date("2026-01-01");
  const today = new Date();
  const daysDiff = Math.floor(
    (today.getTime() - challengeStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  return Math.min(daysDiff + 1, 50);
}

function completedRuleCount(log: typeof dailyLogs.$inferSelect): number {
  return [
    log.noAlcohol,
    log.cleanEating,
    log.exerciseDone,
    log.reflectionDone,
    log.readTeachDone,
    log.trackedEverything,
  ].filter(Boolean).length;
}

function submittedTimestamp(log: typeof dailyLogs.$inferSelect): Date {
  return log.submittedAt || log.updatedAt || log.createdAt;
}

function participantNameById(
  allParticipants: Array<typeof participants.$inferSelect>,
  participantId: number
): string {
  return allParticipants.find((p) => p.id === participantId)?.displayName || "Unknown";
}

const THEME_STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "because",
  "before",
  "challenge",
  "could",
  "every",
  "everything",
  "having",
  "logged",
  "myself",
  "people",
  "really",
  "should",
  "something",
  "through",
  "today",
  "tomorrow",
  "without",
]);

function extractThemeWords(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 6 && !THEME_STOP_WORDS.has(word));

  return Array.from(new Set(words)).slice(0, 8);
}

function shortQuote(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  return trimmed.length > 140 ? `${trimmed.slice(0, 137)}...` : trimmed;
}

/** Assemble the complete CHALLENGE_STATE for the Warden bot. */
export async function getChallengeState(): Promise<ChallengeState> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const challengeDay = calculateChallengeDay();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);
  const historyStart = new Date(todayStart);
  historyStart.setDate(historyStart.getDate() - 30);

  const allParticipants = await db.select().from(participants);

  const todayLogs = await db
    .select()
    .from(dailyLogs)
    .where(and(gte(dailyLogs.createdAt, todayStart), lte(dailyLogs.createdAt, todayEnd)));

  const weekLogs = await db
    .select()
    .from(dailyLogs)
    .where(and(gte(dailyLogs.createdAt, weekStart), lte(dailyLogs.createdAt, now)));

  const historyLogs = await db
    .select()
    .from(dailyLogs)
    .where(and(gte(dailyLogs.createdAt, historyStart), lte(dailyLogs.createdAt, now)));

  const todayPayments = await db
    .select()
    .from(paymentEvents)
    .where(and(gte(paymentEvents.createdAt, todayStart), lte(paymentEvents.createdAt, todayEnd)));

  const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
  const recentMessages = await db
    .select()
    .from(whatsappChatHistory)
    .where(gte(whatsappChatHistory.messageTimestamp, twelveHoursAgo))
    .orderBy(desc(whatsappChatHistory.messageTimestamp))
    .limit(50);

  const participantSnapshots = allParticipants.map((p: typeof participants.$inferSelect) => {
    const participantTodayLogs = todayLogs.filter((log) => log.participantId === p.id);
    const participantWeekLogs = weekLogs.filter((log) => log.participantId === p.id);
    const participantHistoryLogs = historyLogs.filter((log) => log.participantId === p.id);

    const todayRulesCount = participantTodayLogs.reduce(
      (best, log) => Math.max(best, completedRuleCount(log)),
      0
    );
    const weekRulesCount = participantWeekLogs.reduce(
      (total, log) => total + completedRuleCount(log),
      0
    );
    const lastLog = participantHistoryLogs
      .slice()
      .sort((a, b) => submittedTimestamp(b).getTime() - submittedTimestamp(a).getTime())[0];
    const lastLoggedAt = lastLog ? submittedTimestamp(lastLog) : null;
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

  const totalParticipants = allParticipants.length;
  const groupAverageCompletion =
    totalParticipants > 0
      ? participantSnapshots.reduce((sum, p) => sum + p.rules_completed_this_week, 0) /
        (totalParticipants * 7 * 6)
      : 0;

  const livesLostToday = todayPayments.map((payment: typeof paymentEvents.$inferSelect) => ({
    participant_name: participantNameById(allParticipants, payment.participantId),
    timestamp: payment.createdAt.toISOString(),
  }));

  const milestonesToday: ChallengeState["milestones_hit_today"] = [];
  participantSnapshots.forEach((p) => {
    if (p.current_streak === 7 || p.current_streak === 14 || p.current_streak === 21) {
      milestonesToday.push({
        type: `streak_${p.current_streak}_days`,
        participant_name: p.display_name,
        value: p.current_streak,
        timestamp: now.toISOString(),
      });
    }
  });

  if (challengeDay === 10 || challengeDay === 25 || challengeDay === 40 || challengeDay === 50) {
    milestonesToday.push({
      type: `challenge_day_${challengeDay}`,
      participant_name: "Group",
      value: challengeDay,
      timestamp: now.toISOString(),
    });
  }

  const recentInsights = todayLogs
    .filter((log) => Boolean(log.readTeachText?.trim()))
    .map((log) => ({
      participant: participantNameById(allParticipants, log.participantId),
      insight_text: log.readTeachText!.trim(),
      shared_at: submittedTimestamp(log).toISOString(),
      rule: "read_teach" as const,
    }));

  const recentReflections = todayLogs
    .filter((log) => log.reflectionShared && Boolean(log.reflectionText?.trim()))
    .map((log) => ({
      participant: participantNameById(allParticipants, log.participantId),
      reflection_text: log.reflectionText!.trim(),
      logged_at: submittedTimestamp(log).toISOString(),
      is_shared: Boolean(log.reflectionShared),
    }));

  const exerciseLogs = todayLogs
    .filter((log) => log.exerciseDone || log.exerciseDuration > 0 || Boolean(log.exerciseType?.trim()))
    .map((log) => ({
      participant: participantNameById(allParticipants, log.participantId),
      activity_type: log.exerciseType?.trim() || "Exercise logged",
      duration_minutes: log.exerciseDuration || 0,
      proof_uploaded: Boolean(log.exerciseProofUrl?.trim()),
      logged_at: submittedTimestamp(log).toISOString(),
    }));

  const sharpInsightsToday = [
    ...recentReflections
      .filter((reflection) => reflection.reflection_text.length >= 80)
      .map((reflection) => ({
        participant_name: reflection.participant,
        type: "reflection" as const,
        excerpt: shortQuote(reflection.reflection_text),
        timestamp: reflection.logged_at,
      })),
    ...recentInsights
      .filter((insight) => insight.insight_text.length >= 80)
      .map((insight) => ({
        participant_name: insight.participant,
        type: "reading" as const,
        excerpt: shortQuote(insight.insight_text),
        timestamp: insight.shared_at,
      })),
  ];

  const lateLogsToday = todayLogs
    .filter((log) => submittedTimestamp(log).getUTCHours() >= 21)
    .map((log) => ({
      participant_name: participantNameById(allParticipants, log.participantId),
      timestamp: submittedTimestamp(log).toISOString(),
    }));

  const themeCandidates = [
    ...recentInsights.map((item) => ({ participant: item.participant, text: item.insight_text })),
    ...recentReflections.map((item) => ({ participant: item.participant, text: item.reflection_text })),
  ];
  const themeMap = new Map<string, { participants: Set<string>; quotes: string[] }>();
  themeCandidates.forEach((candidate) => {
    extractThemeWords(candidate.text).forEach((theme) => {
      const current = themeMap.get(theme) || { participants: new Set<string>(), quotes: [] };
      current.participants.add(candidate.participant);
      if (current.quotes.length < 3) current.quotes.push(shortQuote(candidate.text));
      themeMap.set(theme, current);
    });
  });

  const sharedThemes = Array.from(themeMap.entries())
    .map(([theme, value]) => ({
      theme,
      participants: Array.from(value.participants),
      quotes: value.quotes,
    }))
    .filter((theme) => theme.participants.length >= 2)
    .slice(0, 5);

  const personalBestsToday: ChallengeState["personal_bests_today"] = [];
  todayLogs.forEach((log) => {
    const name = participantNameById(allParticipants, log.participantId);
    const priorLogs = historyLogs.filter(
      (item) => item.participantId === log.participantId && item.id !== log.id && submittedTimestamp(item) < todayStart
    );
    const previousBestDuration = priorLogs.reduce(
      (best, item) => Math.max(best, item.exerciseDuration || 0),
      0
    );
    if ((log.exerciseDuration || 0) >= 30 && (log.exerciseDuration || 0) > previousBestDuration) {
      personalBestsToday.push({
        participant_name: name,
        type: "exercise_duration",
        value: log.exerciseDuration || 0,
        previous_best: previousBestDuration,
        timestamp: submittedTimestamp(log).toISOString(),
      });
    }

    const previousBestRules = priorLogs.reduce(
      (best, item) => Math.max(best, completedRuleCount(item)),
      0
    );
    const currentRules = completedRuleCount(log);
    if (currentRules >= 5 && currentRules > previousBestRules) {
      personalBestsToday.push({
        participant_name: name,
        type: "rules_completed",
        value: currentRules,
        previous_best: previousBestRules,
        timestamp: submittedTimestamp(log).toISOString(),
      });
    }
  });

  const silentReturnsToday: ChallengeState["silent_returns_today"] = [];
  todayLogs.forEach((log) => {
    const priorLogs = historyLogs
      .filter((item) => item.participantId === log.participantId && submittedTimestamp(item) < todayStart)
      .sort((a, b) => submittedTimestamp(b).getTime() - submittedTimestamp(a).getTime());
    const previousLog = priorLogs[0];
    if (!previousLog) return;
    const daysQuiet = Math.floor(
      (todayStart.getTime() - submittedTimestamp(previousLog).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysQuiet >= 3) {
      silentReturnsToday.push({
        participant_name: participantNameById(allParticipants, log.participantId),
        days_quiet_before_logging: daysQuiet,
        timestamp: submittedTimestamp(log).toISOString(),
      });
    }
  });

  const ghostLifeSignalsToday = todayLogs
    .filter((log) => {
      const participant = allParticipants.find((p) => p.id === log.participantId);
      const insightCount = [log.readTeachText, log.reflectionText].filter((text) => (text || "").trim().length >= 80).length;
      return Boolean(participant?.ghostLifeUsed) && log.exerciseDuration >= 60 && insightCount >= 2;
    })
    .map((log) => ({
      participant_name: participantNameById(allParticipants, log.participantId),
      reason: "Ghost Life flag is active and today's log resembles a Double-Down redemption day",
      timestamp: submittedTimestamp(log).toISOString(),
    }));

  const beforeMiddayFullRuleCompletions = todayLogs
    .filter((log) => completedRuleCount(log) >= 6 && submittedTimestamp(log).getUTCHours() < 12)
    .map((log) => ({
      participant_name: participantNameById(allParticipants, log.participantId),
      timestamp: submittedTimestamp(log).toISOString(),
    }));

  const improvingParticipants = participantSnapshots
    .filter((p) => p.current_streak >= 2 && p.rules_completed_today >= 5)
    .map((p) => p.display_name);
  const decliningParticipants = participantSnapshots
    .filter((p) => {
      const logs = historyLogs.filter((log) => log.participantId === p.id);
      const recentIncomplete = logs.filter((log) => submittedTimestamp(log) >= weekStart && completedRuleCount(log) < 5).length;
      return recentIncomplete >= 2 || (p.current_streak === 0 && logs.length > 0);
    })
    .map((p) => p.display_name);
  const silentParticipants = participantSnapshots
    .filter((p) => p.days_without_logging >= 2)
    .map((p) => p.display_name);
  const consistentParticipants = participantSnapshots
    .filter((p) => p.current_streak >= 7)
    .map((p) => p.display_name);

  const uniqueLateNightLoggers = new Set(lateLogsToday.map((log) => log.participant_name)).size;
  const uniqueBeforeMiddayCompletions = new Set(beforeMiddayFullRuleCompletions.map((log) => log.participant_name)).size;
  const deepInsightCount = [
    ...recentInsights.map((insight) => insight.insight_text),
    ...recentReflections.map((reflection) => reflection.reflection_text),
  ].filter((text) => text.trim().length > 100).length;
  const streakMilestoneCount = milestonesToday.filter((milestone) => milestone.type.startsWith("streak_")).length;
  const nonStreakMilestoneCount = milestonesToday.length - streakMilestoneCount;

  const dramaScoreBreakdown = {
    life_losses: livesLostToday.length * 3,
    milestones: nonStreakMilestoneCount * 2,
    streak_milestones: streakMilestoneCount * 2,
    shared_themes: sharedThemes.length * 2,
    personal_bests: personalBestsToday.length * 2,
    deep_insights: deepInsightCount,
    late_night_loggers: uniqueLateNightLoggers,
    silent_returns: silentReturnsToday.length * 2,
    ghost_life_uses: ghostLifeSignalsToday.length * 3,
    before_midday_completions: uniqueBeforeMiddayCompletions,
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
    recent_insights: recentInsights,
    recent_reflections: recentReflections,
    exercise_logs: exerciseLogs,
    improving_participants: improvingParticipants,
    declining_participants: decliningParticipants,
    silent_participants: silentParticipants,
    consistent_participants: consistentParticipants,
    shared_themes: sharedThemes,
    personal_bests_today: personalBestsToday,
    silent_returns_today: silentReturnsToday,
    ghost_life_signals_today: ghostLifeSignalsToday,
    before_midday_full_rule_completions: beforeMiddayFullRuleCompletions,
    daily_drama_score: dailyDramaScore,
    max_warden_messages_today: getMaxMessagesForDramaScore(dailyDramaScore),
    drama_score_breakdown: dramaScoreBreakdown,
  };
}
