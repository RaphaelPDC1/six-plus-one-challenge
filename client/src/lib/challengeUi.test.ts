import { describe, expect, it } from "vitest";
import { clampLives, getDailyLogProgress, getLivesTone } from "./challengeUi";

const completeForm = {
  noAlcohol: true,
  cleanEating: true,
  exerciseDuration: 30,
  exerciseType: "Strength",
  reflectionText: "Today exposed a weak point.",
  readTeachText: "Consistency beats intensity.",
  trackedEverything: true,
};

describe("challenge UI redesign helpers", () => {
  it("only unlocks the daily submit state after all six rules are addressed", () => {
    expect(getDailyLogProgress(completeForm)).toMatchObject({
      completedRules: 6,
      allAddressed: true,
    });

    expect(getDailyLogProgress({ ...completeForm, exerciseType: "" })).toMatchObject({
      completedRules: 5,
      allAddressed: false,
    });
  });

  it("counts the auto-tracking rule as the sixth addressed rule when enabled", () => {
    expect(getDailyLogProgress({ ...completeForm, trackedEverything: false })).toMatchObject({
      completedRules: 5,
      allAddressed: false,
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
