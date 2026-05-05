import { describe, expect, it } from "vitest";
import {
  DAILY_RULE_KEYS,
  calculateCheckpointAward,
  canPostWardenMessage,
  evaluateDailyRules,
  getGhostLifeEligibility,
  nextLivesAfterLoss,
} from "./challengeLogic";
import {
  CHALLENGE_START_DATE,
  getChallengeCalendar,
  getChallengeDateIsoForDay,
  getChallengeDeadlineForDay,
  getCurrentChallengeDay,
} from "./db";

describe("challengeLogic", () => {
  it("marks a day complete only when all six rules are satisfied", () => {
    const complete = evaluateDailyRules({
      noAlcohol: true,
      cleanEating: true,
      exerciseDone: true,
      reflectionDone: true,
      readTeachDone: true,
      trackedEverything: true,
    });

    expect(complete.complete).toBe(true);
    expect(complete.missedRules).toEqual([]);
    expect(DAILY_RULE_KEYS).toHaveLength(6);
  });

  it("identifies missed rules for life-loss context", () => {
    const result = evaluateDailyRules({
      noAlcohol: true,
      cleanEating: false,
      exerciseDone: true,
      reflectionDone: false,
      readTeachDone: true,
      trackedEverything: true,
    });

    expect(result.complete).toBe(false);
    expect(result.missedRules).toEqual(["Clean Eating", "Daily Reflection"]);
  });

  it("treats Track Everything as a life-loss rule when it is missed", () => {
    const result = evaluateDailyRules({
      noAlcohol: true,
      cleanEating: true,
      exerciseDone: true,
      reflectionDone: true,
      readTeachDone: true,
      trackedEverything: false,
    });

    expect(result.complete).toBe(false);
    expect(result.missedRules).toEqual(["Track Everything"]);
  });

  it("keeps the lives floor at zero", () => {
    expect(nextLivesAfterLoss(4)).toBe(3);
    expect(nextLivesAfterLoss(0)).toBe(0);
  });

  it("makes Ghost Life non-repeatable and dependent on a Double-Down day", () => {
    expect(getGhostLifeEligibility({ livesRemaining: 2, ghostLifeUsed: false, doubleDownComplete: true })).toEqual({ eligible: true, reason: "Eligible" });
    expect(getGhostLifeEligibility({ livesRemaining: 2, ghostLifeUsed: true, doubleDownComplete: true }).eligible).toBe(false);
    expect(getGhostLifeEligibility({ livesRemaining: 2, ghostLifeUsed: false, doubleDownComplete: false }).eligible).toBe(false);
    expect(getGhostLifeEligibility({ livesRemaining: 4, ghostLifeUsed: false, doubleDownComplete: true }).eligible).toBe(false);
  });

  it("awards checkpoint points only on Day 10, 25, 40 and 50", () => {
    expect(calculateCheckpointAward(10, true)).toBeGreaterThan(0);
    expect(calculateCheckpointAward(25, true)).toBeGreaterThan(0);
    expect(calculateCheckpointAward(40, true)).toBeGreaterThan(0);
    expect(calculateCheckpointAward(50, true)).toBeGreaterThan(0);
    expect(calculateCheckpointAward(11, true)).toBe(0);
    expect(calculateCheckpointAward(10, false)).toBe(0);
  });

  it("enforces a hard cap of three Warden messages per day", () => {
    expect(canPostWardenMessage(0)).toBe(true);
    expect(canPostWardenMessage(2)).toBe(true);
    expect(canPostWardenMessage(3)).toBe(false);
    expect(canPostWardenMessage(9)).toBe(false);
  });

  it("anchors challenge day calculations to 6 May and clamps before/after the 50-day window", () => {
    expect(CHALLENGE_START_DATE).toBe("2026-05-06");
    expect(getChallengeDateIsoForDay(1)).toBe("2026-05-06");
    expect(getChallengeDateIsoForDay(2)).toBe("2026-05-07");
    expect(getChallengeDateIsoForDay(50)).toBe("2026-06-24");
    expect(getCurrentChallengeDay(new Date("2026-05-05T23:59:59Z"))).toBe(1);
    expect(getCurrentChallengeDay(new Date("2026-05-06T00:00:00Z"))).toBe(1);
    expect(getCurrentChallengeDay(new Date("2026-05-20T12:00:00Z"))).toBe(15);
    expect(getCurrentChallengeDay(new Date("2026-07-20T12:00:00Z"))).toBe(50);
  });

  it("builds a traceable calendar from day one through the current challenge day", () => {
    const calendar = getChallengeCalendar(new Date("2026-05-10T09:00:00Z"));

    expect(calendar).toHaveLength(5);
    expect(calendar.map(day => day.dayNumber)).toEqual([1, 2, 3, 4, 5]);
    expect(calendar.map(day => day.dateIso)).toEqual(["2026-05-06", "2026-05-07", "2026-05-08", "2026-05-09", "2026-05-10"]);
    expect(calendar[0]).toMatchObject({ dayNumber: 1, dateIso: "2026-05-06", isToday: false });
    expect(calendar[4]).toMatchObject({ dayNumber: 5, dateIso: "2026-05-10", isToday: true });
    expect(getChallengeDeadlineForDay(1).toISOString()).toBe("2026-05-06T23:59:59.999Z");
  });
});
