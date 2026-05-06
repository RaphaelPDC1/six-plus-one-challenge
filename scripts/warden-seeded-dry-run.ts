import { generateWardenMessage, shouldSendMessage } from "../server/warden/messageGenerator";
import type { ChallengeState } from "../server/warden/challengeState";

const now = new Date("2026-05-06T21:14:00.000Z").toISOString();

const seededState: ChallengeState = {
  challenge_day: 12,
  participants: [
    {
      id: 1,
      display_name: "Jay",
      lives_remaining: 4,
      current_streak: 8,
      longest_streak: 8,
      total_points: 245,
      rules_completed_today: 6,
      rules_completed_this_week: 39,
      last_logged_at: "2026-05-06T22:58:00.000Z",
      days_without_logging: 0,
      ghost_life_used: false,
    },
    {
      id: 2,
      display_name: "Dami",
      lives_remaining: 3,
      current_streak: 2,
      longest_streak: 6,
      total_points: 176,
      rules_completed_today: 6,
      rules_completed_this_week: 25,
      last_logged_at: "2026-05-06T11:42:00.000Z",
      days_without_logging: 0,
      ghost_life_used: false,
    },
    {
      id: 3,
      display_name: "Marcus",
      lives_remaining: 2,
      current_streak: 0,
      longest_streak: 7,
      total_points: 122,
      rules_completed_today: 4,
      rules_completed_this_week: 18,
      last_logged_at: "2026-05-03T19:10:00.000Z",
      days_without_logging: 3,
      ghost_life_used: true,
    },
  ],
  group_average_completion: 0.72,
  recent_chat_messages: [
    {
      sender: "Jay",
      message: "No excuses tonight. Got it in late.",
      timestamp: "2026-05-06T22:59:00.000Z",
    },
    {
      sender: "Dami",
      message: "The reading hit differently today.",
      timestamp: "2026-05-06T12:08:00.000Z",
    },
  ],
  lives_lost_today: [
    {
      participant_name: "Marcus",
      timestamp: "2026-05-06T20:00:00.000Z",
    },
  ],
  milestones_hit_today: [
    {
      participant_name: "Jay",
      milestone_type: "streak",
      value: 8,
      timestamp: "2026-05-06T22:58:00.000Z",
    },
  ],
  sharp_insights_shared_today: [
    {
      participant_name: "Jay",
      insight: "Small wins compound faster than big swings when you stop negotiating with the easy standards.",
      timestamp: "2026-05-06T06:02:00.000Z",
    },
    {
      participant_name: "Dami",
      insight: "Discipline is not motivation; it is removing the option to become someone softer when no one is watching.",
      timestamp: "2026-05-06T11:35:00.000Z",
    },
  ],
  late_logs_today: [
    {
      participant_name: "Jay",
      logged_at: "2026-05-06T22:58:00.000Z",
      rules_completed: 6,
    },
  ],
  recent_insights: [
    {
      participant: "Jay",
      insight_text: "Small wins compound faster than big swings when you stop negotiating with the easy standards.",
      shared_at: "2026-05-06T06:02:00.000Z",
      rule: "read_teach",
    },
    {
      participant: "Dami",
      insight_text: "Discipline is not motivation; it is removing the option to become someone softer when no one is watching.",
      shared_at: "2026-05-06T11:35:00.000Z",
      rule: "read_teach",
    },
  ],
  recent_reflections: [
    {
      participant: "Dami",
      reflection_text: "I keep saying I want consistency, but I only respect it when it costs comfort. Today cost comfort.",
      logged_at: "2026-05-06T11:42:00.000Z",
      is_shared: true,
    },
  ],
  exercise_logs: [
    {
      participant: "Jay",
      activity_type: "5K run",
      duration_minutes: 46,
      proof_uploaded: true,
      logged_at: "2026-05-06T22:55:00.000Z",
    },
    {
      participant: "Dami",
      activity_type: "Strength circuit",
      duration_minutes: 52,
      proof_uploaded: true,
      logged_at: "2026-05-06T11:20:00.000Z",
    },
  ],
  improving_participants: ["Jay", "Dami"],
  declining_participants: ["Marcus"],
  silent_participants: ["Marcus"],
  consistent_participants: ["Jay"],
  shared_themes: [
    {
      theme: "discipline without negotiation",
      participants: ["Jay", "Dami"],
      quotes: [
        "stop negotiating with the easy standards",
        "removing the option to become someone softer",
      ],
    },
  ],
  personal_bests_today: [
    {
      participant_name: "Jay",
      type: "rules_completed_before_late_night",
      value: 6,
      previous_best: 5,
      timestamp: "2026-05-06T22:58:00.000Z",
    },
  ],
  silent_returns_today: [],
  ghost_life_signals_today: [
    {
      participant_name: "Marcus",
      signal: "ghost_life_used_or_needed",
      timestamp: now,
    },
  ],
  before_midday_full_rule_completions: [
    {
      participant_name: "Dami",
      completed_at: "2026-05-06T11:42:00.000Z",
    },
  ],
  daily_drama_score: 15,
  max_warden_messages_today: 4,
  drama_score_breakdown: {
    life_losses: 3,
    milestones: 0,
    streak_milestones: 2,
    shared_themes: 2,
    personal_bests: 2,
    deep_insights: 2,
    late_night_loggers: 1,
    silent_returns: 0,
    ghost_life_uses: 3,
    before_midday_completions: 1,
  },
};

const message = await generateWardenMessage(seededState);
console.log("Generated Warden message:");
console.log(message);
console.log("\nWould send after validation:", shouldSendMessage(message));
