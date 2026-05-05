export type DailyLogRuleInput = {
  noAlcohol: boolean;
  cleanEating: boolean;
  exerciseDuration: number;
  exerciseType: string;
  reflectionText: string;
  readTeachText: string;
  trackedEverything: boolean;
};

export type DailyLogRuleState = {
  key: string;
  done: boolean;
};

export function clampLives(lives: number | null | undefined): number {
  const value = Number(lives ?? 0);
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(4, value));
}

export function getLivesTone(lives: number | null | undefined): "critical" | "danger" | "stable" {
  const safeLives = clampLives(lives);
  if (safeLives <= 1) return "critical";
  if (safeLives === 2) return "danger";
  return "stable";
}

export function getDailyLogRuleStates(form: DailyLogRuleInput): DailyLogRuleState[] {
  return [
    { key: "noAlcohol", done: form.noAlcohol },
    { key: "cleanEating", done: form.cleanEating },
    { key: "exercise", done: form.exerciseDuration >= 30 && form.exerciseType.trim().length > 1 },
    { key: "reflection", done: form.reflectionText.trim().length > 1 },
    { key: "readTeach", done: form.readTeachText.trim().length > 1 },
    { key: "trackedEverything", done: form.trackedEverything },
  ];
}

export function getDailyLogProgress(form: DailyLogRuleInput): {
  rules: DailyLogRuleState[];
  completedRules: number;
  allAddressed: boolean;
} {
  const rules = getDailyLogRuleStates(form);
  const completedRules = rules.filter(rule => rule.done).length;
  return {
    rules,
    completedRules,
    allAddressed: completedRules === 6,
  };
}
