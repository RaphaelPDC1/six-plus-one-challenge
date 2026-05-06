import { describe, expect, it, vi, beforeEach } from "vitest";
import { generateWardenMessage, shouldSendMessage } from "./messageGenerator";
import { logWardenMessage, getMessagesCountToday, hasHitDailyLimit } from "./messageLogger";
import type { ChallengeState } from "./challengeState";

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
    daily_drama_score: 0,
    max_warden_messages_today: 2,
    drama_score_breakdown: {
      life_losses: 0,
      milestones: 0,
      streak_milestones: 0,
      sharp_insights: 0,
      late_loggers: 0,
    },
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
        life_losses: 3,
        milestones: 0,
        streak_milestones: 0,
        sharp_insights: 0,
        late_loggers: 0,
      },
    });

    const message = await generateWardenMessage(mockState);
    expect(message).toBeTruthy();
    expect(message).not.toBe("NO_MESSAGE");
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
    // If no error is thrown, the test passes
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

describe("Challenge State Structure", () => {
  it("should have correct structure", () => {
    const mockState = buildChallengeState();

    expect(mockState).toHaveProperty("challenge_day");
    expect(mockState).toHaveProperty("participants");
    expect(mockState).toHaveProperty("group_average_completion");
    expect(mockState).toHaveProperty("recent_chat_messages");
    expect(mockState).toHaveProperty("lives_lost_today");
    expect(mockState).toHaveProperty("milestones_hit_today");
    expect(mockState).toHaveProperty("sharp_insights_shared_today");
    expect(mockState).toHaveProperty("late_logs_today");
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
