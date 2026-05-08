import { describe, expect, it } from "vitest";
import { clampLives, getDailyLogProgress, getLivesTone } from "./challengeUi";

const completeForm = {
  noAlcohol: true,
  cleanEating: true,
  cleanEatingNote: "eggs, salad, chicken",
  exerciseDuration: 30,
  exerciseType: "Strength",
  reflectionText: "Today exposed a weak point.",
  readTeachText: "Consistency beats intensity.",
  trackedEverything: true,
};

describe("challenge UI redesign helpers", () => {
  it("unlocks the daily submit state once five of six rules are addressed", () => {
    expect(getDailyLogProgress(completeForm)).toMatchObject({
      completedRules: 6,
      allAddressed: true,
      passThreshold: 5,
    });

    expect(getDailyLogProgress({ ...completeForm, exerciseType: "" })).toMatchObject({
      completedRules: 5,
      allAddressed: true,
      passThreshold: 5,
    });
  });

  it("keeps the daily submit state locked below the 5-of-6 pass rule", () => {
    expect(getDailyLogProgress({ ...completeForm, trackedEverything: false, readTeachText: "" })).toMatchObject({
      completedRules: 4,
      allAddressed: false,
      passThreshold: 5,
    });
  });

  it("does not count Clean Eating from an early checkbox unless a meal note confirms the day", () => {
    expect(getDailyLogProgress({ ...completeForm, cleanEating: true, cleanEatingNote: "" })).toMatchObject({
      completedRules: 5,
      allAddressed: true,
    });

    expect(getDailyLogProgress({ ...completeForm, cleanEating: true, cleanEatingNote: "eggs" })).toMatchObject({
      completedRules: 5,
      allAddressed: true,
    });

    expect(getDailyLogProgress({ ...completeForm, cleanEating: true, cleanEatingNote: "eggs, salad, chicken" })).toMatchObject({
      completedRules: 6,
      allAddressed: true,
    });
  });

  it("clamps lives to the four-segment health bar range", () => {
    expect(clampLives(6)).toBe(4);
    expect(clampLives(3)).toBe(3);
    expect(clampLives(-2)).toBe(0);
    expect(clampLives(undefined)).toBe(0);
  });

  it("marks one-life states as critical for the poster-style health bar", () => {
    expect(getLivesTone(4)).toBe("stable");
    expect(getLivesTone(2)).toBe("danger");
    expect(getLivesTone(1)).toBe("critical");
    expect(getLivesTone(0)).toBe("critical");
  });
});
