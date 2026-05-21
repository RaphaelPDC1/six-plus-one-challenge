import { invokeLLM } from "./_core/llm";

export interface ReleaseNoteInsight {
  personalLayer: string; // Insight about this participant's patterns
  groupLayer: string; // Insight about the group's collective progress
  gameLayer: string; // Insight about earning more points/bonuses
  redHighlights: string[]; // 2-3 short teaching points in red
}

/**
 * Analyze recent proof posts and generate a 3-layer AI insight
 * for a personalized release note that empowers participants to earn more points.
 */
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
  if (recentProofPosts.length === 0) {
    return {
      personalLayer: "You're just getting started. Every day builds momentum.",
      groupLayer: "The group is building strength together. Your consistency matters.",
      gameLayer: "Focus on completing all 6 rules daily to maximize points and unlock bonuses.",
      redHighlights: [
        "Complete all 6 rules = 50 base points + rotating bonuses",
        "Streak matters: each consecutive day multiplies your power",
        "Bonuses rotate daily—check Overview to see what's active today",
      ],
    };
  }

  const proofSummary = recentProofPosts
    .map(
      (post) =>
        `Day ${post.dayNumber}: ${post.exerciseType || "—"} (${post.exerciseDuration || 0}min), ` +
        `Reflection: "${post.reflectionText?.slice(0, 50) || "—"}", ` +
        `Teaching: "${post.readTeachText?.slice(0, 50) || "—"}", ` +
        `Points: ${post.pointsAwarded}`
    )
    .join("\n");

  const prompt = `You are a community care coach analyzing a participant's recent challenge performance.

Participant: ${participantName}
Recent proof posts (last 3-7 days):
${proofSummary}

Group stats:
- Average points per day: ${groupStats.avgPointsPerDay}
- Average streak length: ${groupStats.avgStreakLength} days
- Total participants: ${groupStats.totalParticipants}

Generate a brief, empowering 3-layer insight:

1. **Personal Layer** (1-2 sentences): What patterns do you see in this participant's recent work? What's their strength?
2. **Group Layer** (1-2 sentences): How does their effort fit into the group's collective progress? What's the group vibe?
3. **Game Layer** (1-2 sentences): What specific action could they take to earn more points or unlock bonuses?

Then provide 2-3 short, punchy teaching points (max 12 words each) that should be highlighted in RED. These should be actionable and motivating.

Format your response as JSON:
{
  "personalLayer": "...",
  "groupLayer": "...",
  "gameLayer": "...",
  "redHighlights": ["...", "...", "..."]
}`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a supportive, data-driven community care coach. Be brief, specific, and empowering. Focus on actionable insights.",
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "release_note_insight",
          strict: true,
          schema: {
            type: "object",
            properties: {
              personalLayer: { type: "string" },
              groupLayer: { type: "string" },
              gameLayer: { type: "string" },
              redHighlights: {
                type: "array",
                items: { type: "string" },
                minItems: 2,
                maxItems: 3,
              },
            },
            required: ["personalLayer", "groupLayer", "gameLayer", "redHighlights"],
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
      personalLayer: parsed.personalLayer || "Keep building.",
      groupLayer: parsed.groupLayer || "You're part of something bigger.",
      gameLayer: parsed.gameLayer || "Every point counts.",
      redHighlights: Array.isArray(parsed.redHighlights) ? parsed.redHighlights : [],
    };
  } catch (error) {
    console.error("Failed to generate release note insight:", error);
    // Fallback insight
    return {
      personalLayer: "Your effort is building something real.",
      groupLayer: "The group thrives when everyone shows up.",
      gameLayer: "Complete all 6 rules daily to maximize points and unlock rotating bonuses.",
      redHighlights: [
        "All 6 rules = 50 base points + bonuses",
        "Streaks multiply your power",
        "Check Overview for today's active bonuses",
      ],
    };
  }
}
