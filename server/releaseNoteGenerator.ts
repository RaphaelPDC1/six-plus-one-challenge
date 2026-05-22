import { invokeLLM } from "./_core/llm";

export interface PersonalisedCareInsight {
  personalObservation: string; // Sharp, data-driven observation about their last 3 days
  forwardStrategy: string; // Specific action to earn more points in the next 3 days
  communityNote: string; // How they're contributing to or needed by the group
  redHighlights: string[]; // 2-3 punchy teaching points in red (max 12 words each)
}

export interface ParticipantCareContext {
  name: string;
  dayNumber: number;
  totalPoints: number;
  currentStreak: number;
  livesRemaining: number;
  rank: number; // their position in the leaderboard
  recentLogs: Array<{
    dayNumber: number;
    submittedAt?: string; // ISO timestamp — for timing analysis
    noAlcohol: boolean;
    cleanEating: boolean;
    exerciseDone: boolean;
    reflectionDone: boolean;
    readTeachDone: boolean;
    trackedEverything: boolean;
    pointsAwarded: number;
    exerciseType?: string;
    exerciseDuration?: number;
    reflectionText?: string; // truncated to 80 chars
    readTeachText?: string; // truncated to 80 chars
  }>;
  groupStats: {
    totalParticipants: number;
    avgTotalPoints: number;
    avgStreak: number;
    completionRateToday: number; // 0-100
    participantsAtRisk: number; // lives <= 1
  };
}

/**
 * Generate a personalised community care card for a single participant.
 * Uses their last 3 days of performance, onboarding context, and group stats.
 * Warden voice: dry, intelligent, slightly intimidating. Never motivational-speaker energy.
 */
export async function generatePersonalisedCareInsight(
  ctx: ParticipantCareContext
): Promise<PersonalisedCareInsight> {
  const fallback: PersonalisedCareInsight = {
    personalObservation: "The system has been watching. Your patterns are becoming clear.",
    forwardStrategy: "Complete all 6 rules tomorrow. No partial credit. No excuses.",
    communityNote: "The group needs your consistency, not your intentions.",
    redHighlights: [
      "All 6 rules = 50 pts. Anything less is a gap.",
      "Streaks compound. Missing one day costs more than you think.",
      "Check Overview for today's active bonuses before you lock in.",
    ],
  };

  if (ctx.recentLogs.length === 0) return fallback;

  // Build a concise summary of their last 3 days
  const logSummary = ctx.recentLogs
    .slice(0, 3)
    .map((log) => {
      const rules = [
        log.noAlcohol ? "no-alcohol" : null,
        log.cleanEating ? "clean-eating" : null,
        log.exerciseDone ? `exercise(${log.exerciseType || "?"}${log.exerciseDuration ? ` ${log.exerciseDuration}min` : ""})` : null,
        log.reflectionDone ? "reflection" : null,
        log.readTeachDone ? "read&teach" : null,
        log.trackedEverything ? "tracked" : null,
      ].filter(Boolean);
      const completedCount = rules.length;
      const timeNote = log.submittedAt
        ? ` [submitted ${new Date(log.submittedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}]`
        : "";
      return `Day ${log.dayNumber}${timeNote}: ${completedCount}/6 rules (${rules.join(", ")}) → ${log.pointsAwarded}pts`;
    })
    .join("\n");

  const prompt = `You are the Warden — an intelligent, dry, slightly intimidating system that monitors a 50-day challenge.
You are generating a personalised community care card for one participant. This card is private — only they see it.

PARTICIPANT: ${ctx.name}
Current day: ${ctx.dayNumber}/50
Total points: ${ctx.totalPoints} (group avg: ${ctx.groupStats.avgTotalPoints})
Rank: #${ctx.rank} of ${ctx.groupStats.totalParticipants}
Streak: ${ctx.currentStreak} days (group avg: ${ctx.groupStats.avgStreak})
Lives remaining: ${ctx.livesRemaining}

LAST 3 DAYS:
${logSummary}

GROUP CONTEXT:
- ${ctx.groupStats.completionRateToday}% of participants completed today
- ${ctx.groupStats.participantsAtRisk} participants are at risk (1 life left)
- ${ctx.groupStats.totalParticipants} total participants

Generate a personalised community care card with EXACTLY this structure:

1. **personalObservation** (1-2 sentences): A sharp, specific observation about their last 3 days. Reference their actual data — timing, which rules they're skipping, patterns. Do NOT be generic. Do NOT be encouraging. Be precise and slightly unsettling in how accurate you are.

2. **forwardStrategy** (1-2 sentences): One specific, actionable thing they can do in the next 3 days to earn more points or protect their position. Reference their actual gaps. Be direct.

3. **communityNote** (1 sentence): How they're contributing to or needed by the group. Can reference their rank or the group's state. Not a compliment — a statement of fact or a challenge.

4. **redHighlights** (exactly 3 items, max 12 words each): Short, punchy teaching points that should be highlighted in red. These should be specific to this participant's patterns, not generic advice.

TONE: Dry. Intelligent. Slightly intimidating. Never cheesy. Never motivational-speaker energy. The Warden observes — it doesn't cheer.

Respond in JSON only.`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are the Warden — a dry, intelligent, slightly intimidating system that monitors a 50-day challenge. You observe patterns with precision. You never give generic advice. You never use motivational-speaker language. You respond in JSON only.",
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "personalised_care_insight",
          strict: true,
          schema: {
            type: "object",
            properties: {
              personalObservation: { type: "string" },
              forwardStrategy: { type: "string" },
              communityNote: { type: "string" },
              redHighlights: {
                type: "array",
                items: { type: "string" },
                minItems: 3,
                maxItems: 3,
              },
            },
            required: ["personalObservation", "forwardStrategy", "communityNote", "redHighlights"],
            additionalProperties: false,
          },
        },
      },
    });

    const rawContent = response.choices[0].message.content;
    const content = typeof rawContent === "string" ? rawContent : null;
    if (!content) throw new Error("Empty LLM response");

    const parsed = JSON.parse(content);
    return {
      personalObservation: parsed.personalObservation || fallback.personalObservation,
      forwardStrategy: parsed.forwardStrategy || fallback.forwardStrategy,
      communityNote: parsed.communityNote || fallback.communityNote,
      redHighlights: Array.isArray(parsed.redHighlights) && parsed.redHighlights.length >= 2
        ? parsed.redHighlights.slice(0, 3)
        : fallback.redHighlights,
    };
  } catch (error) {
    console.error("[releaseNoteGenerator] Failed to generate personalised insight:", error);
    return fallback;
  }
}

// Legacy broadcast insight — kept for backwards compatibility with admin form
export interface ReleaseNoteInsight {
  personalLayer: string;
  groupLayer: string;
  gameLayer: string;
  redHighlights: string[];
}

export async function generateReleaseNoteInsight(
  participantName: string,
  recentProofPosts: Array<{
    dayNumber: number;
    exerciseType?: string;
    exerciseDuration?: number;
    reflectionText?: string;
    readTeachText?: string;
    cleanEatingNote?: string;
    pointsAwarded: number;
  }>,
  groupStats: {
    avgPointsPerDay: number;
    avgStreakLength: number;
    totalParticipants: number;
  }
): Promise<ReleaseNoteInsight> {
  // Delegate to personalised generator with adapted context
  const ctx: ParticipantCareContext = {
    name: participantName,
    dayNumber: recentProofPosts[0]?.dayNumber ?? 1,
    totalPoints: recentProofPosts.reduce((s, l) => s + l.pointsAwarded, 0),
    currentStreak: 0,
    livesRemaining: 4,
    rank: 1,
    recentLogs: recentProofPosts.map((p) => ({
      dayNumber: p.dayNumber,
      noAlcohol: true,
      cleanEating: !!p.cleanEatingNote,
      exerciseDone: !!p.exerciseType,
      reflectionDone: !!p.reflectionText,
      readTeachDone: !!p.readTeachText,
      trackedEverything: true,
      pointsAwarded: p.pointsAwarded,
      exerciseType: p.exerciseType,
      exerciseDuration: p.exerciseDuration,
      reflectionText: p.reflectionText?.slice(0, 80),
      readTeachText: p.readTeachText?.slice(0, 80),
    })),
    groupStats: {
      totalParticipants: groupStats.totalParticipants,
      avgTotalPoints: groupStats.avgPointsPerDay,
      avgStreak: groupStats.avgStreakLength,
      completionRateToday: 70,
      participantsAtRisk: 0,
    },
  };
  const insight = await generatePersonalisedCareInsight(ctx);
  return {
    personalLayer: insight.personalObservation,
    groupLayer: insight.communityNote,
    gameLayer: insight.forwardStrategy,
    redHighlights: insight.redHighlights,
  };
}
