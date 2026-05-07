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


describe("Boost System complete winner matrix", () => {
  const boostById = (id: string) => {
    const boost = BOOST_SEQUENCE.find((item) => item.id === id);
    if (!boost) throw new Error(`Missing boost fixture: ${id}`);
    return boost;
  };

  const participant = (id: number, overrides: Record<string, unknown> = {}) => ({
    id,
    displayName: `Player ${id}`,
    totalPoints: 100 - id,
    currentStreak: 3,
    livesRemaining: 4,
    ghostLifeUsed: false,
    ...overrides,
  });

  const log = (participantId: number, dayNumber: number, submittedAt: string, overrides: Record<string, unknown> = {}) => ({
    participantId,
    dayNumber,
    submittedAt,
    updatedAt: submittedAt,
    createdAt: submittedAt,
    noAlcohol: true,
    cleanEating: true,
    exerciseDone: true,
    exerciseDuration: 35,
    exerciseType: "Run",
    exerciseProofUrl: "https://proof.example/image.jpg",
    readTeachDone: true,
    readTeachText: "A clear Read and Teach paragraph with enough signal to count.",
    reflectionText: "A direct reflection with useful depth and intent.",
    trackedEverything: true,
    pointsAwarded: 12,
    dayComplete: true,
    ...overrides,
  });

  const runSingleBoost = ({
    boostId,
    day = 8,
    participants,
    logs,
    boostWins = [],
  }: {
    boostId: string;
    day?: number;
    participants: Array<Record<string, unknown>>;
    logs: Array<Record<string, unknown>>;
    boostWins?: Array<Record<string, unknown>>;
  }) => evaluateBoostWinners({
    day,
    participants: participants as any,
    logs: logs as any,
    boostWins: boostWins as any,
    activeBoosts: [boostById(boostId)],
  });

  it.each([
    ["first_up", 2, [participant(1), participant(2)], [log(1, 8, "2026-05-08T09:00:00.000Z"), log(2, 8, "2026-05-08T06:50:00.000Z")]],
    ["streak_king", 2, [participant(1, { totalPoints: 300, currentStreak: 2 }), participant(2, { totalPoints: 250, currentStreak: 9 }), participant(3, { totalPoints: 200, currentStreak: 7 })], [log(1, 8, "2026-05-08T09:00:00.000Z")]],
    ["hardest_day", 3, [participant(1), participant(2), participant(3)], [log(1, 8, "2026-05-08T09:00:00.000Z", { exerciseDuration: 40 }), log(3, 8, "2026-05-08T10:00:00.000Z", { exerciseDuration: 95 })]],
    ["survivor", 4, [participant(3, { livesRemaining: 4 }), participant(4, { livesRemaining: 1 })], [log(3, 8, "2026-05-08T09:00:00.000Z", { pointsAwarded: 14 }), log(4, 8, "2026-05-08T10:00:00.000Z", { pointsAwarded: 12 })]],
    ["depth", 5, [participant(5), participant(6)], [log(5, 8, "2026-05-08T09:00:00.000Z", { reflectionText: "x".repeat(170), readTeachText: "y".repeat(120) }), log(6, 8, "2026-05-08T10:00:00.000Z", { reflectionText: "short", readTeachText: "short" })]],
    ["clean_sweep", 6, [participant(6), participant(7)], [log(6, 8, "2026-05-08T09:00:00.000Z"), log(7, 8, "2026-05-08T10:00:00.000Z", { trackedEverything: false })]],
    ["ghost_hunter", 8, [participant(8, { ghostLifeUsed: false }), participant(9, { ghostLifeUsed: true })], [log(8, 8, "2026-05-08T09:00:00.000Z", { pointsAwarded: 11 }), log(9, 8, "2026-05-08T10:00:00.000Z", { pointsAwarded: 20 })]],
    ["early_bird", 10, [participant(10), participant(11)], [log(10, 8, "2026-05-08T07:15:00.000Z"), log(11, 8, "2026-05-08T08:01:00.000Z")]],
    ["comeback_kid", 12, [participant(12, { livesRemaining: 3 }), participant(13, { livesRemaining: 4 })], [log(12, 8, "2026-05-08T09:00:00.000Z", { pointsAwarded: 13 }), log(13, 8, "2026-05-08T10:00:00.000Z", { pointsAwarded: 15 })]],
    ["wardens_pick", 14, [participant(14), participant(15)], [log(14, 8, "2026-05-08T09:00:00.000Z", { reflectionText: "w".repeat(240), readTeachText: "z".repeat(210) }), log(15, 8, "2026-05-08T10:00:00.000Z", { reflectionText: "thin", readTeachText: "thin" })]],
    ["iron_week", 16, [participant(16, { currentStreak: 7 }), participant(17, { currentStreak: 6 })], [log(16, 8, "2026-05-08T09:00:00.000Z")]],
    ["night_owl", 19, [participant(18), participant(19)], [log(18, 8, "2026-05-08T10:15:00.000Z"), log(19, 8, "2026-05-09T02:30:00.000Z")]],
  ])("awards %s to the expected eligible player", (boostId, expectedParticipantId, participants, logs) => {
    const awards = runSingleBoost({ boostId: boostId as string, participants: participants as any, logs: logs as any });
    expect(awards.map((award) => award.participant.id)).toEqual([expectedParticipantId]);
    expect(awards[0]?.pointsAwarded).toBe(BOOST_POINTS);
    expect(awards[0]?.wardenNote).toContain(boostById(boostId as string).name);
  });

  it("awards MOVER to the biggest seven-day climber outside the current top three", () => {
    const participants = [
      participant(1, { totalPoints: 300 }),
      participant(2, { totalPoints: 250 }),
      participant(3, { totalPoints: 200 }),
      participant(4, { totalPoints: 180 }),
      participant(5, { totalPoints: 150 }),
    ];
    const logs = [
      log(1, 1, "2026-05-01T09:00:00.000Z", { pointsAwarded: 90 }),
      log(2, 1, "2026-05-01T09:10:00.000Z", { pointsAwarded: 80 }),
      log(3, 1, "2026-05-01T09:20:00.000Z", { pointsAwarded: 70 }),
      log(5, 1, "2026-05-01T09:30:00.000Z", { pointsAwarded: 60 }),
      log(4, 1, "2026-05-01T09:40:00.000Z", { pointsAwarded: 10 }),
      log(4, 8, "2026-05-08T09:40:00.000Z", { pointsAwarded: 12 }),
    ];

    const awards = runSingleBoost({ boostId: "mover", day: 8, participants, logs });

    expect(awards.map((award) => award.participant.id)).toEqual([4]);
  });

  it("awards PROOF MACHINE by proof rate while excluding under-sampled perfect records", () => {
    const participants = [participant(1), participant(2), participant(3)];
    const logs = [
      log(1, 6, "2026-05-06T09:00:00.000Z", { exerciseProofUrl: "https://proof.example/one.jpg" }),
      log(1, 7, "2026-05-07T09:00:00.000Z", { exerciseProofUrl: "https://proof.example/two.jpg" }),
      log(2, 6, "2026-05-06T10:00:00.000Z", { exerciseProofUrl: "https://proof.example/a.jpg" }),
      log(2, 7, "2026-05-07T10:00:00.000Z", { exerciseProofUrl: "https://proof.example/b.jpg" }),
      log(2, 8, "2026-05-08T10:00:00.000Z", { exerciseProofUrl: "" }),
      log(3, 8, "2026-05-08T11:00:00.000Z", { exerciseProofUrl: "" }),
    ];

    const awards = runSingleBoost({ boostId: "proof_machine", day: 8, participants, logs });

    expect(awards.map((award) => award.participant.id)).toEqual([2]);
  });

  it("awards DEAD HEAT to every tied first-place participant", () => {
    const participants = [participant(1, { totalPoints: 200 }), participant(2, { totalPoints: 200 }), participant(3, { totalPoints: 150 })];
    const awards = runSingleBoost({ boostId: "dead_heat", participants, logs: [log(1, 8, "2026-05-08T09:00:00.000Z")] });

    expect(awards.map((award) => award.participant.id)).toEqual([1, 2]);
    expect(awards.every((award) => award.pointsAwarded === BOOST_POINTS)).toBe(true);
  });

  it("skips already-fired daily slots but keeps daily points separate from additive boost points", () => {
    const participants = [participant(1), participant(2)];
    const logs = [log(1, 8, "2026-05-08T07:00:00.000Z", { pointsAwarded: 12 }), log(2, 8, "2026-05-08T09:00:00.000Z", { pointsAwarded: 10 })];
    const boostWins = [{ userId: 1, boostId: "first_up", day: 8, pointsAwarded: BOOST_POINTS }];
    const awards = runSingleBoost({ boostId: "first_up", participants, logs, boostWins });

    expect(awards).toEqual([]);
    expect(logs.reduce((sum, item) => sum + Number(item.pointsAwarded), 0)).toBe(22);
    expect(boostWins.reduce((sum, item) => sum + Number(item.pointsAwarded), 0)).toBe(BOOST_POINTS);
  });
});
