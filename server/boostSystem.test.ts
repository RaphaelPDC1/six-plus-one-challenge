import { describe, expect, it } from "vitest";
import { BOOST_POINTS, BOOST_SEQUENCE, evaluateBoostWinners, getActiveBoostsForDay } from "../shared/boostSystem";

describe("Boost System deterministic rules", () => {
  const participants = [
    { id: 1, displayName: "Alex", totalPoints: 120, currentStreak: 4, livesRemaining: 4, ghostLifeUsed: false },
    { id: 2, displayName: "Blair", totalPoints: 100, currentStreak: 6, livesRemaining: 2, ghostLifeUsed: false },
    { id: 3, displayName: "Casey", totalPoints: 90, currentStreak: 2, livesRemaining: 4, ghostLifeUsed: true },
    { id: 4, displayName: "Devon", totalPoints: 60, currentStreak: 7, livesRemaining: 1, ghostLifeUsed: false },
  ];

  const completeLog = (participantId: number, submittedAt: string, overrides: Record<string, unknown> = {}) => ({
    participantId,
    dayNumber: 1,
    submittedAt,
    noAlcohol: true,
    cleanEating: true,
    exerciseDone: true,
    exerciseDuration: 45,
    reflectionDone: true,
    reflectionText: "A proper reflection with enough honesty to be useful.",
    readTeachDone: true,
    readTeachText: "A meaningful lesson taught back clearly.",
    trackedEverything: true,
    pointsAwarded: 12,
    dayComplete: true,
    ...overrides,
  });

  it("rotates exactly three active boosts per day without randomness", () => {
    expect(getActiveBoostsForDay(1).map(boost => boost.id)).toEqual(["first_up", "streak_king", "hardest_day"]);
    expect(getActiveBoostsForDay(2).map(boost => boost.id)).toEqual(["survivor", "mover", "depth"]);
    expect(getActiveBoostsForDay(6).map(boost => boost.id)).toEqual(["first_up", "streak_king", "hardest_day"]);
    expect(getActiveBoostsForDay(1).map(boost => boost.slot)).toEqual([1, 2, 3]);
    expect(BOOST_SEQUENCE).toHaveLength(15);
  });

  it("awards additive +5 boost wins without mutating source log points", () => {
    const logs = [
      completeLog(2, "2026-05-07T06:20:00.000Z", { exerciseDuration: 30, pointsAwarded: 10 }),
      completeLog(1, "2026-05-07T07:30:00.000Z", { exerciseDuration: 80, pointsAwarded: 12 }),
      completeLog(3, "2026-05-07T08:15:00.000Z", { exerciseDuration: 50, pointsAwarded: 11 }),
    ];

    const awards = evaluateBoostWinners({ day: 1, participants, logs, activeBoosts: getActiveBoostsForDay(1) });

    expect(awards.map(award => award.boost.id)).toEqual(["first_up", "streak_king", "hardest_day"]);
    expect(awards.every(award => award.pointsAwarded === BOOST_POINTS)).toBe(true);
    expect(logs.map(log => log.pointsAwarded)).toEqual([10, 12, 11]);
    expect(awards.find(award => award.boost.id === "first_up")?.participant.id).toBe(2);
    expect(awards.find(award => award.boost.id === "hardest_day")?.participant.id).toBe(1);
  });

  it("enforces anti-gaming constraints and skips conditional boosts when no eligible winner exists", () => {
    const logs = [completeLog(2, "2026-05-07T06:20:00.000Z", { pointsAwarded: 13 })];

    const blockedFirstUp = evaluateBoostWinners({
      day: 1,
      participants,
      logs,
      activeBoosts: [getActiveBoostsForDay(1)[0]],
      boostWins: [{ userId: 2, day: 0, boostId: "first_up" }],
    });
    expect(blockedFirstUp).toEqual([]);

    const cleanSweepBlockedByTie = evaluateBoostWinners({
      day: 1,
      participants,
      logs: [completeLog(1, "2026-05-07T06:20:00.000Z"), completeLog(2, "2026-05-07T06:30:00.000Z")],
      activeBoosts: [{ ...BOOST_SEQUENCE.find(boost => boost.id === "clean_sweep")!, slot: 1 }],
    });
    expect(cleanSweepBlockedByTie).toEqual([]);

    const survivorWithoutDangerPlayer = evaluateBoostWinners({
      day: 1,
      participants: participants.map(participant => ({ ...participant, livesRemaining: 4 })),
      logs,
      activeBoosts: [{ ...BOOST_SEQUENCE.find(boost => boost.id === "survivor")!, slot: 1 }],
    });
    expect(survivorWithoutDangerPlayer).toEqual([]);
  });
});
