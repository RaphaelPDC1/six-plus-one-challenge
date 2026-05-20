import { describe, expect, it } from "vitest";
import {
  buildFocusedChartData,
  buildParticipantInsights,
  calculateLiveTaskPoints,
  rankForPodium,
} from "./challengeInsights";

describe("challenge insight calculations", () => {
  it("shows live points increasing as rule ticks, proof, insight, and tracking are added", () => {
    // 0 rules = 0 pts
    expect(calculateLiveTaskPoints(0).visibleTotal).toBe(0);
    // 4 rules (fallback order: noAlcohol=8, cleanEating=8, exercise=12, reflection=8) = 36
    expect(calculateLiveTaskPoints(4).visibleTotal).toBe(36);
    // 5 rules (fallback: 8+8+12+8+8=44) + proof bonus = 45
    expect(calculateLiveTaskPoints(5, { hasProof: true }).visibleTotal).toBe(45);
    // 6 rules with ruleStates: 8+8+12+8+8+6=50 + proof+insight+tracking bonuses = 53
    expect(calculateLiveTaskPoints(6, {
      hasProof: true,
      hasInsight: true,
      trackedEverything: true,
      ruleStates: [
        { key: "noAlcohol", done: true },
        { key: "cleanEating", done: true },
        { key: "exercise", done: true },
        { key: "reflection", done: true },
        { key: "readTeach", done: true },
        { key: "trackedEverything", done: true },
      ],
    })).toMatchObject({
      rulePoints: 50,
      passBonus: 0,
      fullGreenBonus: 0,
      proofBonus: 1,
      insightBonus: 1,
      trackingBonus: 1,
      visibleTotal: 53,
    });
  });

  it("combines tasks left, time, recent misses, and lives lost into useful risk signals", () => {
    const [safe, risky] = buildParticipantInsights({
      currentDay: 6,
      now: new Date("2026-05-07T21:00:00Z"),
      participants: [
        { id: "safe", displayName: "Safe", livesRemaining: 4, currentStreak: 6, totalPoints: 80 },
        { id: "risky", displayName: "Risky", livesRemaining: 1, currentStreak: 0, totalPoints: 20 },
      ],
      logs: [
        { participantId: "safe", dayNumber: 6, completed: true, noAlcohol: true, cleanEating: true, exerciseDuration: 45, exerciseType: "Gym", reflectionText: "Done", readTeachText: "Lesson", trackedEverything: true, pointsAwarded: 18, exerciseProofUrl: "proof" },
        { participantId: "risky", dayNumber: 4, completed: false, noAlcohol: true, cleanEating: false, exerciseDuration: 0, exerciseType: "", reflectionText: "", readTeachText: "", trackedEverything: false, pointsAwarded: 0 },
      ],
    });

    expect(risky.riskScore).toBeGreaterThan(safe.riskScore);
    expect(risky.riskReasons.join(" ")).toContain("life");
    expect(risky.riskReasons.join(" ")).toContain("no log opened today");
  });

  it("ranks the podium by points, then movement and consistency as tie breakers", () => {
    const insights = buildParticipantInsights({
      currentDay: 3,
      participants: [
        { id: "a", displayName: "A", livesRemaining: 4, currentStreak: 2, totalPoints: 50 },
        { id: "b", displayName: "B", livesRemaining: 4, currentStreak: 3, totalPoints: 50 },
        { id: "c", displayName: "C", livesRemaining: 3, currentStreak: 1, totalPoints: 20 },
      ],
      logs: [
        { participantId: "a", dayNumber: 1, completed: true, pointsAwarded: 10, noAlcohol: true, cleanEating: true, exerciseDuration: 30, exerciseType: "Run", reflectionText: "A reflection", readTeachText: "A teaching", trackedEverything: true },
        { participantId: "b", dayNumber: 1, completed: true, pointsAwarded: 16, noAlcohol: true, cleanEating: true, exerciseDuration: 30, exerciseType: "Run", reflectionText: "A reflection with lots of detail", readTeachText: "A teaching with lots of detail", trackedEverything: true, exerciseProofUrl: "proof" },
        { participantId: "b", dayNumber: 2, completed: true, pointsAwarded: 16, noAlcohol: true, cleanEating: true, exerciseDuration: 30, exerciseType: "Run", reflectionText: "A reflection with lots of detail", readTeachText: "A teaching with lots of detail", trackedEverything: true, exerciseProofUrl: "proof" },
      ],
    });

    const ranked = rankForPodium(insights);
    expect(ranked[0].id).toBe("b");
    expect(ranked[0].podiumRank).toBe(1);
    expect(ranked[1].podiumRank).toBe(2);
    expect(ranked[2].podiumRank).toBe(3);
  });

  it("builds focused chart data for a selected participant against the group average", () => {
    const chart = buildFocusedChartData({
      currentDay: 3,
      focusedParticipantId: "a",
      participants: [{ id: "a" }, { id: "b" }],
      logs: [
        { participantId: "a", dayNumber: 1, completed: true, pointsAwarded: 10 },
        { participantId: "a", dayNumber: 2, completed: true, pointsAwarded: 12 },
        { participantId: "b", dayNumber: 1, completed: true, pointsAwarded: 10 },
      ],
    });

    expect(chart[1]).toMatchObject({ day: 2, focused: 2, groupAverage: 1.5, focusedPoints: 22 });
  });
});
