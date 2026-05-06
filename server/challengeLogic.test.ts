import { describe, expect, it } from "vitest";
import {
  DAILY_PASS_THRESHOLD,
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
  mergeDailyLogInputWithoutWipingExistingWork,
  resolveDailyCompletionAward,
} from "./db";

describe("challengeLogic", () => {
  it("marks a day complete once five of six rules are satisfied", () => {
    const complete = evaluateDailyRules({
      noAlcohol: true,
      cleanEating: true,
      exerciseDone: true,
      reflectionDone: true,
      readTeachDone: true,
      trackedEverything: false,
    });

    expect(complete.complete).toBe(true);
    expect(complete.completedRules).toBe(DAILY_PASS_THRESHOLD);
    expect(complete.requiredRules).toBe(5);
    expect(complete.totalRules).toBe(6);
    expect(complete.missedRules).toEqual(["Track Everything"]);
    expect(DAILY_RULE_KEYS).toHaveLength(6);
  });

  it("identifies missed rules while passing a five-rule day", () => {
    const result = evaluateDailyRules({
      noAlcohol: true,
      cleanEating: false,
      exerciseDone: true,
      reflectionDone: true,
      readTeachDone: true,
      trackedEverything: true,
    });

    expect(result.complete).toBe(true);
    expect(result.completedRules).toBe(5);
    expect(result.missedRules).toEqual(["Clean Eating"]);
  });

  it("keeps days incomplete below the five-rule threshold", () => {
    const result = evaluateDailyRules({
      noAlcohol: true,
      cleanEating: false,
      exerciseDone: true,
      reflectionDone: false,
      readTeachDone: true,
      trackedEverything: true,
    });

    expect(result.complete).toBe(false);
    expect(result.completedRules).toBe(4);
    expect(result.missedRules).toEqual(["Clean Eating", "Daily Reflection"]);
  });

  it("still reports Track Everything as a missed rule when it is the one open item", () => {
    const result = evaluateDailyRules({
      noAlcohol: true,
      cleanEating: true,
      exerciseDone: true,
      reflectionDone: true,
      readTeachDone: true,
      trackedEverything: false,
    });

    expect(result.complete).toBe(true);
    expect(result.completedRules).toBe(5);
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

  it("enforces the organic Warden message ceiling and dynamic lower limits", () => {
    expect(canPostWardenMessage(0)).toBe(true);
    expect(canPostWardenMessage(3)).toBe(true);
    expect(canPostWardenMessage(4)).toBe(false);
    expect(canPostWardenMessage(9)).toBe(false);
    expect(canPostWardenMessage(2, 2)).toBe(false);
    expect(canPostWardenMessage(3, 3)).toBe(false);
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

  it("awards streak and points only the first time a participant completes a calendar day", () => {
    const submittedAt = new Date("2026-05-06T12:00:00Z");

    const firstCompletion = resolveDailyCompletionAward(undefined, {
      complete: true,
      dayNumber: 1,
      submittedAt,
      deadlinePassed: false,
    });

    const repeatedCompletion = resolveDailyCompletionAward({
      dayComplete: true,
      pointsAwarded: firstCompletion.pointsAwarded,
      submittedAt,
    }, {
      complete: true,
      dayNumber: 1,
      submittedAt: new Date("2026-05-06T13:00:00Z"),
      deadlinePassed: false,
    });

    expect(firstCompletion).toMatchObject({ dayComplete: true, newlyComplete: true, pointsAwarded: 10, draftSaved: false });
    expect(repeatedCompletion).toMatchObject({ dayComplete: true, newlyComplete: false, pointsAwarded: 10, draftSaved: false });
    expect(repeatedCompletion.submittedAt).toBe(submittedAt);
  });

  it("merges same-day edits without wiping rule work that was already completed today", () => {
    const existingTodayLog = {
      noAlcohol: true,
      cleanEating: true,
      cleanEatingNote: "Clean breakfast and lunch.",
      exerciseDone: true,
      exerciseDuration: 35,
      exerciseType: "Run",
      exerciseProofUrl: "https://example.com/run.jpg",
      reflectionDone: true,
      reflectionText: "Stayed focused this morning.",
      reflectionShared: true,
      readTeachDone: true,
      readTeachText: "Atomic Habits: make it obvious.",
      trackedEverything: true,
    } as any;

    const accidentalSparseDraft = {
      dayNumber: 1,
      noAlcohol: false,
      cleanEating: false,
      cleanEatingNote: "",
      exerciseDuration: 0,
      exerciseType: "",
      exerciseProofUrl: "",
      reflectionText: "",
      reflectionShared: false,
      readTeachText: "",
      trackedEverything: false,
    };

    const merged = mergeDailyLogInputWithoutWipingExistingWork(existingTodayLog, accidentalSparseDraft);

    expect(merged).toMatchObject({
      noAlcohol: true,
      cleanEating: true,
      cleanEatingNote: "Clean breakfast and lunch.",
      exerciseDuration: 35,
      exerciseType: "Run",
      exerciseProofUrl: "https://example.com/run.jpg",
      reflectionText: "Stayed focused this morning.",
      reflectionShared: true,
      readTeachText: "Atomic Habits: make it obvious.",
      trackedEverything: true,
    });
  });

  it("does not let a completed-to-draft-to-completed toggle re-open streak credit", () => {
    const originalSubmittedAt = new Date("2026-05-06T12:00:00Z");
    const draftToggle = resolveDailyCompletionAward({
      dayComplete: true,
      pointsAwarded: 10,
      submittedAt: originalSubmittedAt,
    }, {
      complete: false,
      dayNumber: 1,
      submittedAt: new Date("2026-05-06T14:00:00Z"),
      deadlinePassed: false,
    });

    const retickedCompletion = resolveDailyCompletionAward({
      dayComplete: draftToggle.dayComplete,
      pointsAwarded: draftToggle.pointsAwarded,
      submittedAt: draftToggle.submittedAt,
    }, {
      complete: true,
      dayNumber: 1,
      submittedAt: new Date("2026-05-06T15:00:00Z"),
      deadlinePassed: false,
    });

    expect(draftToggle).toMatchObject({ alreadyComplete: true, dayComplete: true, newlyComplete: false, pointsAwarded: 10, draftSaved: false });
    expect(draftToggle.submittedAt).toBe(originalSubmittedAt);
    expect(retickedCompletion).toMatchObject({ alreadyComplete: true, dayComplete: true, newlyComplete: false, pointsAwarded: 10, draftSaved: false });
    expect(retickedCompletion.submittedAt).toBe(originalSubmittedAt);
  });
});
