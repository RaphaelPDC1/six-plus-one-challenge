import { describe, it, expect } from "vitest";
import {
  getMaxMessagesForDramaScore,
  getActiveOrganicWindow,
  getOrganicWindowTargetMinute,
  hasLateWindowDrama,
  shouldRunOrganicWardenCycle,
  WARDEN_WINDOWS,
} from "./organicScheduler";
import type { ChallengeState } from "./challengeState";

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

function buildState(overrides: Partial<ChallengeState> = {}): ChallengeState {
  return {
    challenge_day: 12,
    participants: [],
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

describe("Organic Warden Scheduling", () => {
  it("maps drama scores to data-driven daily message limits", () => {
    expect(getMaxMessagesForDramaScore(0)).toBe(2);
    expect(getMaxMessagesForDramaScore(2)).toBe(2);
    expect(getMaxMessagesForDramaScore(3)).toBe(3);
    expect(getMaxMessagesForDramaScore(5)).toBe(3);
    expect(getMaxMessagesForDramaScore(6)).toBe(4);
    expect(getMaxMessagesForDramaScore(12)).toBe(4);
  });

  it("chooses a stable randomized target minute inside each organic window for a given day", () => {
    const date = new Date("2026-05-06T00:00:00.000Z");

    for (const window of WARDEN_WINDOWS) {
      const firstTarget = getOrganicWindowTargetMinute(window, date);
      const secondTarget = getOrganicWindowTargetMinute(window, date);

      expect(firstTarget).toBe(secondTarget);
      expect(firstTarget).toBeGreaterThanOrEqual(window.startMinuteUtc);
      expect(firstTarget).toBeLessThan(window.endMinuteUtc);
    }
  });

  it("only activates a window during its randomized slot", () => {
    const window = WARDEN_WINDOWS[0];
    const date = new Date("2026-05-06T00:00:00.000Z");
    const targetMinute = getOrganicWindowTargetMinute(window, date);
    const activeDate = new Date(Date.UTC(2026, 4, 6, Math.floor(targetMinute / 60), targetMinute % 60));
    const inactiveDate = new Date("2026-05-06T10:00:00.000Z");

    expect(getActiveOrganicWindow(activeDate)?.window.id).toBe(window.id);
    expect(getActiveOrganicWindow(inactiveDate)).toBeNull();
  });

  it("does not allow the late window unless the day has enough drama", () => {
    const lateWindow = WARDEN_WINDOWS.find((window) => window.id === "late");
    expect(lateWindow).toBeDefined();

    const date = new Date("2026-05-06T00:00:00.000Z");
    const targetMinute = getOrganicWindowTargetMinute(lateWindow!, date);
    const activeLateDate = new Date(Date.UTC(2026, 4, 6, Math.floor(targetMinute / 60), targetMinute % 60));

    const quietDecision = shouldRunOrganicWardenCycle(buildState(), activeLateDate);
    expect(hasLateWindowDrama(buildState())).toBe(false);
    expect(quietDecision.shouldRun).toBe(false);
    expect(quietDecision.reason).toBe("late_window_without_enough_drama");

    const dramaticState = buildState({
      daily_drama_score: 6,
      max_warden_messages_today: 4,
      lives_lost_today: [{ participant_name: "Marcus", timestamp: activeLateDate.toISOString() }],
      drama_score_breakdown: {
        ...emptyDramaBreakdown(),
        life_losses: 3,
        streak_milestones: 2,
        deep_insights: 1,
      },
    });

    const dramaticDecision = shouldRunOrganicWardenCycle(dramaticState, activeLateDate);
    expect(hasLateWindowDrama(dramaticState)).toBe(true);
    expect(dramaticDecision.shouldRun).toBe(true);
  });

  it("allows late-window messages for richer room-reading signals even without a life loss", () => {
    const lateWindow = WARDEN_WINDOWS.find((window) => window.id === "late");
    const date = new Date("2026-05-06T00:00:00.000Z");
    const targetMinute = getOrganicWindowTargetMinute(lateWindow!, date);
    const activeLateDate = new Date(Date.UTC(2026, 4, 6, Math.floor(targetMinute / 60), targetMinute % 60));

    const themedState = buildState({
      daily_drama_score: 4,
      max_warden_messages_today: 3,
      shared_themes: [
        {
          theme: "discipline without mood",
          participants: ["Amira", "Marcus"],
          quotes: ["The routine is removing the debate.", "Readiness has been the excuse."],
        },
      ],
      personal_bests_today: [
        {
          participant_name: "Amira",
          type: "exercise_duration",
          value: 72,
          previous_best: 45,
          timestamp: activeLateDate.toISOString(),
        },
      ],
      drama_score_breakdown: {
        ...emptyDramaBreakdown(),
        shared_themes: 2,
        personal_bests: 2,
      },
    });

    const decision = shouldRunOrganicWardenCycle(themedState, activeLateDate);
    expect(hasLateWindowDrama(themedState)).toBe(true);
    expect(decision.shouldRun).toBe(true);
  });
});
