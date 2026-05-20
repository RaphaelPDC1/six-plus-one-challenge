import { describe, expect, it } from "vitest";
import { ALL_BOOSTS, DAILY_NAMED_BOOST_CAP, evaluateBoostWinners, getActiveBoostsForDay } from "../shared/boostSystem";

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
    pointsAwarded: 50,
    dayComplete: true,
    ...overrides,
  });

  const boostById = (id: string) => {
    const boost = ALL_BOOSTS.find((item) => item.id === id);
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

  it("uses the new 17-boost system with always-active and rotating boosts", () => {
    const activeDay1 = getActiveBoostsForDay(1);
    // Always-active boosts are always present
    const alwaysActiveIds = ["mover", "bounce_back", "comeback_kid", "double_down"];
    for (const id of alwaysActiveIds) {
      expect(activeDay1.map(b => b.id)).toContain(id);
    }
    // Should have 4 always-active + 3 rotating = 7 total
    expect(activeDay1.length).toBe(7);
    // Slots should be sequential
    expect(activeDay1.map(b => b.slot)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    // ALL_BOOSTS should contain all 17 boosts
    expect(ALL_BOOSTS.length).toBe(17);
  });

  it("awards clean_sweep to a participant who completes 6/6", () => {
    const participants = [participant(1)];
    const logs = [log(1, 8, "2026-05-08T09:00:00.000Z")];
    const awards = runSingleBoost({ boostId: "clean_sweep", participants, logs });
    expect(awards.map(a => a.participant.id)).toEqual([1]);
    expect(awards[0]?.pointsAwarded).toBe(boostById("clean_sweep").pointsAwarded);
    expect(awards[0]?.wardenNote).toContain(boostById("clean_sweep").name);
  });

  it("awards morning_proof to the first participant to submit proof before 09:00", () => {
    const participants = [participant(2)];
    const logs = [log(2, 8, "2026-05-08T08:15:00.000Z")];
    const awards = runSingleBoost({ boostId: "morning_proof", participants, logs });
    expect(awards.map(a => a.participant.id)).toEqual([2]);
    expect(awards[0]?.pointsAwarded).toBe(boostById("morning_proof").pointsAwarded);
    expect(awards[0]?.wardenNote).toContain(boostById("morning_proof").name);
  });

  it("awards bounce_back to a participant who completes 6/6 after a missed day", () => {
    const participants = [participant(3)];
    const logs = [
      log(3, 7, "2026-05-07T09:00:00.000Z", { dayComplete: false, pointsAwarded: 4, trackedEverything: false }),
      log(3, 8, "2026-05-08T09:00:00.000Z"),
    ];
    const awards = runSingleBoost({ boostId: "bounce_back", participants, logs });
    expect(awards.map(a => a.participant.id)).toEqual([3]);
    expect(awards[0]?.pointsAwarded).toBe(boostById("bounce_back").pointsAwarded);
    expect(awards[0]?.wardenNote).toContain(boostById("bounce_back").name);
  });

  it("awards deep_work (teaching_moment + deep_reflection) for quality entries", () => {
    const participants = [participant(4)];
    // Use space-separated words so wordCount() (splits by whitespace) returns correct count
    const longReadTeach = Array(110).fill("word").join(" "); // 110 words
    const logs = [log(4, 8, "2026-05-08T09:00:00.000Z", {
      reflectionText: Array(130).fill("thought").join(" "), // 130 words
      readTeachText: longReadTeach,
    })];
    // teaching_moment requires 100+ words in readTeachText
    const teachingAwards = runSingleBoost({ boostId: "teaching_moment", participants, logs });
    expect(teachingAwards.map(a => a.participant.id)).toEqual([4]);
    expect(teachingAwards[0]?.pointsAwarded).toBe(boostById("teaching_moment").pointsAwarded);
  });

  it("awards pressure_player to a participant who locks in with less than 90 mins to midnight", () => {
    const participants = [participant(5, { livesRemaining: 2 })];
    // 23:00 UTC = 60 mins before midnight
    const logs = [log(5, 8, "2026-05-08T23:00:00.000Z")];
    const awards = runSingleBoost({ boostId: "pressure_player", participants, logs });
    expect(awards.map(a => a.participant.id)).toEqual([5]);
    expect(awards[0]?.pointsAwarded).toBe(boostById("pressure_player").pointsAwarded);
    expect(awards[0]?.wardenNote).toContain(boostById("pressure_player").name);
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
    expect(awards.map(a => a.participant.id)).toEqual([4]);
    expect(awards[0]?.pointsAwarded).toBe(boostById("mover").pointsAwarded);
  });

  it("deduplicates daily boost wins and caps named boost points at the daily cap per participant", () => {
    const participants = [participant(1, { currentStreak: 6, livesRemaining: 2 })];
    const logs = [log(1, 8, "2026-05-08T08:00:00.000Z", {
      reflectionText: "x".repeat(180),
      readTeachText: "y".repeat(120),
    })];

    const awards = evaluateBoostWinners({ day: 8, participants, logs, activeBoosts: getActiveBoostsForDay(8) });
    const total = awards.reduce((sum, award) => sum + award.pointsAwarded, 0);

    expect(total).toBeLessThanOrEqual(DAILY_NAMED_BOOST_CAP);

    const duplicateBlocked = evaluateBoostWinners({
      day: 8,
      participants,
      logs,
      activeBoosts: [boostById("morning_proof")],
      boostWins: [{ userId: 1, boostId: "morning_proof", day: 8, pointsAwarded: boostById("morning_proof").pointsAwarded }],
    });
    expect(duplicateBlocked).toEqual([]);
  });
});
