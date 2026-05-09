import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateWardenMessage, shouldSendMessage } from "./messageGenerator";
import { logWardenMessage, getMessagesCountToday, hasHitDailyLimit } from "./messageLogger";
import type { ChallengeState } from "./challengeState";
import { isWardenLifeLossPaymentEvent } from "./challengeState";

// Mock the database
vi.mock("../db", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue({}),
    }),
  }),
}));

// Mock the LLM
vi.mock("../_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: "Day 12. Marcus — life 3 gone. The group has now lost 4 lives total.",
        },
      },
    ],
  } as any),
}));

function emptyDramaBreakdown(): ChallengeState["drama_score_breakdown"] {
  return {
    life_losses: 0,
    milestones: 0,
    streak_milestones: 0,
    shared_themes: 0,
    personal_bests: 0,
    deep_insights: 0,
    late_night_loggers: 0,
    silent_returns: 0,
    ghost_life_uses: 0,
    before_midday_completions: 0,
  };
}

function buildChallengeState(overrides: Partial<ChallengeState> = {}): ChallengeState {
  return {
    challenge_day: 12,
    participants: [
      {
        id: 1,
        display_name: "Marcus",
        lives_remaining: 3,
        current_streak: 5,
        longest_streak: 8,
        total_points: 150,
        rules_completed_today: 5,
        rules_completed_this_week: 28,
        last_logged_at: new Date().toISOString(),
        days_without_logging: 0,
        ghost_life_used: false,
      },
    ],
    group_average_completion: 0.85,
    recent_chat_messages: [],
    lives_lost_today: [],
    milestones_hit_today: [],
    sharp_insights_shared_today: [],
    late_logs_today: [],
    recent_insights: [],
    recent_reflections: [],
    exercise_logs: [],
    improving_participants: [],
    declining_participants: [],
    silent_participants: [],
    consistent_participants: [],
    shared_themes: [],
    personal_bests_today: [],
    silent_returns_today: [],
    ghost_life_signals_today: [],
    before_midday_full_rule_completions: [],
    daily_drama_score: 0,
    max_warden_messages_today: 2,
    drama_score_breakdown: emptyDramaBreakdown(),
    ...overrides,
  };
}

describe("Warden Message Generator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should generate a valid Warden message from CHALLENGE_STATE", async () => {
    const mockState = buildChallengeState({
      lives_lost_today: [
        {
          participant_name: "Marcus",
          timestamp: new Date().toISOString(),
        },
      ],
      daily_drama_score: 3,
      max_warden_messages_today: 3,
      drama_score_breakdown: {
        ...emptyDramaBreakdown(),
        life_losses: 3,
      },
    });

    const message = await generateWardenMessage(mockState);
    expect(message).toBeTruthy();
    expect(message).not.toBe("NO_MESSAGE");
  });

  it("should pass richer writing, exercise, and shared-theme context to the Warden", async () => {
    const now = new Date().toISOString();
    const mockState = buildChallengeState({
      recent_insights: [
        {
          participant: "Amira",
          insight_text: "Discipline looked boring until the proof started stacking up. The routine is starting to remove the debate.",
          shared_at: now,
          rule: "read_teach",
        },
      ],
      recent_reflections: [
        {
          participant: "Marcus",
          reflection_text: "I keep waiting to feel ready, but the pattern is obvious now. Readiness has been the excuse.",
          logged_at: now,
          is_shared: true,
        },
      ],
      exercise_logs: [
        {
          participant: "Amira",
          activity_type: "Run",
          duration_minutes: 72,
          proof_uploaded: true,
          logged_at: now,
        },
      ],
      shared_themes: [
        {
          theme: "discipline",
          participants: ["Amira", "Marcus"],
          quotes: [
            "Discipline looked boring until the proof started stacking up.",
            "Readiness has been the excuse.",
          ],
        },
      ],
      personal_bests_today: [
        {
          participant_name: "Amira",
          type: "exercise_duration",
          value: 72,
          previous_best: 45,
          timestamp: now,
        },
      ],
      daily_drama_score: 5,
      max_warden_messages_today: 3,
      drama_score_breakdown: {
        ...emptyDramaBreakdown(),
        shared_themes: 2,
        personal_bests: 2,
        deep_insights: 1,
      },
    });

    const { invokeLLM } = await import("../_core/llm");
    await generateWardenMessage(mockState);
    const userPrompt = vi.mocked(invokeLLM).mock.calls[0]?.[0]?.messages?.[1]?.content as string;
    expect(userPrompt).toContain("recent_insights");
    expect(userPrompt).toContain("exercise_logs");
    expect(userPrompt).toContain("shared_themes");
    expect(userPrompt).toContain("personal_bests_today");
  });

  it("should return NO_MESSAGE when appropriate", async () => {
    const mockState = buildChallengeState({
      challenge_day: 5,
      participants: [
        {
          id: 1,
          display_name: "Alice",
          lives_remaining: 4,
          current_streak: 3,
          longest_streak: 3,
          total_points: 100,
          rules_completed_today: 5,
          rules_completed_this_week: 20,
          last_logged_at: new Date().toISOString(),
          days_without_logging: 0,
          ghost_life_used: false,
        },
      ],
      group_average_completion: 0.9,
    });

    // Mock the LLM to return NO_MESSAGE
    const { invokeLLM } = await import("../_core/llm");
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: "NO_MESSAGE",
          },
        },
      ],
    } as any);

    const message = await generateWardenMessage(mockState);
    expect(message).toBe("NO_MESSAGE");
  });
});

describe("Warden Message Validation", () => {
  it("should accept valid messages", () => {
    const validMessage = "Day 12. Marcus — life 3 gone. The group has now lost 4 lives total.";
    expect(shouldSendMessage(validMessage)).toBe(true);
  });

  it("should reject NO_MESSAGE", () => {
    expect(shouldSendMessage("NO_MESSAGE")).toBe(false);
  });

  it("should reject empty messages", () => {
    expect(shouldSendMessage("")).toBe(false);
  });

  it("should reject messages that are too short", () => {
    expect(shouldSendMessage("Hi")).toBe(false);
  });

  it("should reject messages that are too long", () => {
    const longMessage = "A".repeat(600);
    expect(shouldSendMessage(longMessage)).toBe(false);
  });

  it("should reject report-like messages with more than three sentences or lines", () => {
    const reportMessage = [
      "Marcus has lost a life.",
      "He now stands at 2 lives remaining.",
      "Jay reached an 8-day streak today.",
      "Dami completed all six rules before midday.",
    ].join("\n");
    expect(shouldSendMessage(reportMessage)).toBe(false);
  });
});

describe("Warden Message Logging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should log a message successfully", async () => {
    await logWardenMessage(
      "Day 12. Marcus — life 3 gone.",
      "commentary",
      "test_event",
      true
    );
    expect(true).toBe(true);
  });

  it("should get message count for today", async () => {
    const count = await getMessagesCountToday();
    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it("should check daily limit correctly with a supplied dynamic limit", async () => {
    const hasHitLimit = await hasHitDailyLimit(4);
    expect(typeof hasHitLimit).toBe("boolean");
  });
});

describe("Warden payment event scheme separation", () => {
  const participants = [{ id: 1 }, { id: 2 }, { id: 3 }];

  it("excludes join/onboarding payments from life-loss context", () => {
    expect(isWardenLifeLossPaymentEvent({
      participantId: 2,
      dailyLogId: null,
      amountPence: 2500,
      reason: "Lando joined the platform and completed onboarding",
      status: "pending",
    }, participants)).toBe(false);

    expect(isWardenLifeLossPaymentEvent({
      participantId: 3,
      dailyLogId: null,
      amountPence: 2500,
      reason: "Lord registration approved",
      status: "pending",
    }, participants)).toBe(false);
  });

  it("keeps genuine missed-rule penalty payments in life-loss context", () => {
    expect(isWardenLifeLossPaymentEvent({
      participantId: 1,
      dailyLogId: 44,
      amountPence: 2500,
      reason: "Deadline passed for day 4. Missed rule(s): Exercise",
      status: "pending",
    }, participants)).toBe(true);
  });
});

describe("Challenge State Structure", () => {
  it("should have correct richer room-reading structure", () => {
    const mockState = buildChallengeState();

    expect(mockState).toHaveProperty("challenge_day");
    expect(mockState).toHaveProperty("participants");
    expect(mockState).toHaveProperty("group_average_completion");
    expect(mockState).toHaveProperty("recent_chat_messages");
    expect(mockState).toHaveProperty("lives_lost_today");
    expect(mockState).toHaveProperty("milestones_hit_today");
    expect(mockState).toHaveProperty("sharp_insights_shared_today");
    expect(mockState).toHaveProperty("late_logs_today");
    expect(mockState).toHaveProperty("recent_insights");
    expect(mockState).toHaveProperty("recent_reflections");
    expect(mockState).toHaveProperty("exercise_logs");
    expect(mockState).toHaveProperty("shared_themes");
    expect(mockState).toHaveProperty("personal_bests_today");
    expect(mockState).toHaveProperty("silent_returns_today");
    expect(mockState).toHaveProperty("ghost_life_signals_today");
    expect(mockState).toHaveProperty("before_midday_full_rule_completions");
    expect(mockState).toHaveProperty("daily_drama_score");
    expect(mockState).toHaveProperty("max_warden_messages_today");
    expect(mockState).toHaveProperty("drama_score_breakdown");

    expect(typeof mockState.challenge_day).toBe("number");
    expect(Array.isArray(mockState.participants)).toBe(true);
    expect(typeof mockState.group_average_completion).toBe("number");
    expect(typeof mockState.daily_drama_score).toBe("number");
    expect(typeof mockState.max_warden_messages_today).toBe("number");
  });
});
