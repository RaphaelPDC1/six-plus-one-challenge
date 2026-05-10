import { describe, expect, it } from "vitest";
import { BOOST_SEQUENCE, DAILY_NAMED_BOOST_CAP, evaluateBoostWinners, getActiveBoostsForDay } from "../shared/boostSystem";

describe("Approved boost system package", () => {
  const participant = (id: number, overrides: Record<string, unknown> = {}) => ({
    id,
    displayName: `Player ${id}`,
    totalPoints: 100 - id,
    currentStreak: 1,
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
    reflectionDone: true,
    reflectionText: "A direct reflection with useful depth and intent.",
    readTeachDone: true,
    readTeachText: "A clear Read and Teach paragraph with enough signal to count.",
    trackedEverything: true,
    pointsAwarded: 10,
    dayComplete: true,
    ...overrides,
  });

  const boostById = (id: string) => {
    const boost = BOOST_SEQUENCE.find((item) => item.id === id);
    if (!boost) throw new Error(`Missing boost fixture: ${id}`);
    return boost;
  };

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

  it("uses the approved stable seven-boost package every day instead of rotating three slots", () => {
    expect(getActiveBoostsForDay(1).map(boost => boost.id)).toEqual([
      "clean_sweep",
      "morning_proof",
      "bounce_back",
      "deep_work",
      "pressure_player",
      "streak_lock",
      "mover",
    ]);
    expect(getActiveBoostsForDay(99).map(boost => boost.slot)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(BOOST_SEQUENCE.map(boost => [boost.id, boost.pointsAwarded])).toEqual([
      ["clean_sweep", 5],
      ["morning_proof", 3],
      ["bounce_back", 4],
      ["deep_work", 4],
      ["pressure_player", 6],
      ["streak_lock", 7],
      ["mover", 5],
    ]);
  });

  it.each([
    ["clean_sweep", 1, 5, [participant(1, { currentStreak: 6 })], [log(1, 8, "2026-05-08T09:00:00.000Z")]],
    ["morning_proof", 2, 3, [participant(2)], [log(2, 8, "2026-05-08T08:15:00.000Z")]],
    ["bounce_back", 3, 4, [participant(3)], [log(3, 7, "2026-05-07T09:00:00.000Z", { dayComplete: false, pointsAwarded: 4, trackedEverything: false }), log(3, 8, "2026-05-08T09:00:00.000Z")]],
    ["deep_work", 4, 4, [participant(4)], [log(4, 8, "2026-05-08T09:00:00.000Z", { reflectionText: "x".repeat(160), readTeachText: "y".repeat(120) })]],
    ["pressure_player", 5, 6, [participant(5, { livesRemaining: 2 })], [log(5, 8, "2026-05-08T09:00:00.000Z")]],
    ["streak_lock", 6, 7, [participant(6, { currentStreak: 7 })], [log(6, 8, "2026-05-08T09:00:00.000Z")]],
  ])("awards %s to the expected eligible participant with its approved point value", (boostId, expectedParticipantId, expectedPoints, participants, logs) => {
    const awards = runSingleBoost({ boostId: boostId as string, participants: participants as any, logs: logs as any });

    expect(awards.map((award) => award.participant.id)).toEqual([expectedParticipantId]);
    expect(awards[0]?.pointsAwarded).toBe(expectedPoints);
    expect(awards[0]?.wardenNote).toContain(boostById(boostId as string).name);
  });

  it("does not treat new-player missing history as Bounce Back eligibility", () => {
    const awards = runSingleBoost({
      boostId: "bounce_back",
      day: 2,
      participants: [participant(1)],
      logs: [log(1, 2, "2026-05-08T09:00:00.000Z")],
    });

    expect(awards).toEqual([]);
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
      log(4, 8, "2026-05-08T09:40:00.000Z", { pointsAwarded: 10 }),
    ];

    const awards = runSingleBoost({ boostId: "mover", day: 8, participants, logs });

    expect(awards.map((award) => award.participant.id)).toEqual([4]);
    expect(awards[0]?.pointsAwarded).toBe(5);
  });

  it("deduplicates daily boost wins and caps named boost points at ten per participant per day", () => {
    const participants = [participant(1, { currentStreak: 6, livesRemaining: 2 })];
    const logs = [log(1, 8, "2026-05-08T08:00:00.000Z", { reflectionText: "x".repeat(180), readTeachText: "y".repeat(120) })];

    const awards = evaluateBoostWinners({ day: 8, participants, logs, activeBoosts: getActiveBoostsForDay(8) });
    const total = awards.reduce((sum, award) => sum + award.pointsAwarded, 0);

    expect(total).toBe(DAILY_NAMED_BOOST_CAP);
    expect(awards.map((award) => award.boost.id)).toEqual(["clean_sweep", "morning_proof", "deep_work"]);

    const duplicateBlocked = evaluateBoostWinners({
      day: 8,
      participants,
      logs,
      activeBoosts: [boostById("morning_proof")],
      boostWins: [{ userId: 1, boostId: "morning_proof", day: 8, pointsAwarded: 3 }],
    });
    expect(duplicateBlocked).toEqual([]);
  });
});
