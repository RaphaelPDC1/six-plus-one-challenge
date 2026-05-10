import { describe, expect, it, vi } from "vitest";
import type { ReminderCandidate } from "./notificationReminderRules";
import {
  buildReminderNotifications,
  dispatchDeterministicReminderNotifications,
  isInQuietHours,
} from "./notificationReminderRules";
import { notifyUserWithPush } from "./pushNotifications";

vi.mock("./pushNotifications", () => ({
  notifyUserWithPush: vi.fn(async input => ({ notification: { id: 1, type: input.type }, push: { status: "skipped", reason: "test" } })),
}));

const baseCandidate: ReminderCandidate = {
  userId: 7,
  participant: {
    id: 11,
    displayName: "Alex",
    currentStreak: 3,
    livesRemaining: 4,
    totalPoints: 95,
  },
  preferences: {
    pushEnabled: true,
    inAppEnabled: true,
    morningIntent: true,
    afternoonProof: true,
    eveningDeadline: true,
    lifeRisk: true,
    streakRewards: true,
    wardenUpdates: true,
    quietHoursEnabled: true,
    quietHoursStart: "22:00",
    quietHoursEnd: "07:00",
    timezone: "Europe/London",
  },
  todayLog: null,
};

function candidate(overrides: Partial<ReminderCandidate> = {}): ReminderCandidate {
  return {
    ...baseCandidate,
    ...overrides,
    participant: { ...baseCandidate.participant, ...(overrides.participant ?? {}) },
    preferences: { ...baseCandidate.preferences, ...(overrides.preferences ?? {}) },
  };
}

describe("notification reminder rules", () => {
  it("sends the morning intent reminder only when the participant has not started today", () => {
    const plans = buildReminderNotifications({
      candidate: candidate(),
      now: new Date("2026-05-10T07:30:00.000Z"),
      dayNumber: 5,
    });

    expect(plans.map(plan => plan.type)).toEqual(["morning_intent"]);
    expect(plans[0]?.body).toContain("Day 5");

    const startedPlans = buildReminderNotifications({
      candidate: candidate({ todayLog: { noAlcohol: true } }),
      now: new Date("2026-05-10T07:30:00.000Z"),
      dayNumber: 5,
    });

    expect(startedPlans.some(plan => plan.type === "morning_intent")).toBe(false);
  });

  it("creates afternoon proof, evening deadline, life-risk, and Warden nudges from deterministic windows", () => {
    const partial = candidate({
      participant: { livesRemaining: 2 },
      todayLog: {
        noAlcohol: true,
        cleanEating: true,
        exerciseDone: true,
        exerciseDuration: 45,
        exerciseType: "Run",
        exerciseProofUrl: "",
      },
    });

    expect(buildReminderNotifications({ candidate: partial, now: new Date("2026-05-10T14:00:00.000Z") }).map(plan => plan.type)).toEqual([
      "afternoon_proof",
      "warden_update",
    ]);

    expect(buildReminderNotifications({ candidate: partial, now: new Date("2026-05-10T19:00:00.000Z") }).map(plan => plan.type)).toEqual([
      "evening_deadline",
      "warden_update",
    ]);

    expect(buildReminderNotifications({ candidate: partial, now: new Date("2026-05-10T20:45:00.000Z") }).map(plan => plan.type)).toEqual([
      "life_risk",
    ]);
  });

  it("suppresses reminders during quiet hours and when both push and in-app channels are disabled", () => {
    expect(isInQuietHours(new Date("2026-05-10T22:15:00.000Z"), baseCandidate.preferences)).toBe(true);
    expect(buildReminderNotifications({ candidate: candidate(), now: new Date("2026-05-10T22:15:00.000Z") })).toEqual([]);
    expect(buildReminderNotifications({
      candidate: candidate({ preferences: { pushEnabled: false, inAppEnabled: false } }),
      now: new Date("2026-05-10T08:00:00.000Z"),
    })).toEqual([]);
  });

  it("emits streak reward reminders for completed seven-day streak milestones and avoids recently sent types", () => {
    const complete = candidate({
      participant: { currentStreak: 7, totalPoints: 145 },
      todayLog: { dayComplete: true, submittedAt: new Date("2026-05-10T18:00:00.000Z") },
    });

    const plans = buildReminderNotifications({ candidate: complete, now: new Date("2026-05-10T10:00:00.000Z") });
    expect(plans.map(plan => plan.type)).toEqual(["streak_reward"]);
    expect(plans[0]?.body).toContain("5 points");

    const deduped = buildReminderNotifications({
      candidate: candidate({ ...complete, recentlySentTypes: ["streak_reward"] }),
      now: new Date("2026-05-10T10:00:00.000Z"),
    });
    expect(deduped).toEqual([]);
  });

  it("dispatches generated reminder plans through the existing push plus in-app fallback pipeline", async () => {
    vi.mocked(notifyUserWithPush).mockClear();
    const result = await dispatchDeterministicReminderNotifications({
      candidates: [candidate()],
      now: new Date("2026-05-10T07:30:00.000Z"),
      dayNumber: 5,
    });

    expect(result.plans).toHaveLength(1);
    expect(notifyUserWithPush).toHaveBeenCalledWith(expect.objectContaining({
      userId: 7,
      participantId: 11,
      type: "morning_intent",
      actionUrl: "/?tab=my-day",
    }));
  });
});
