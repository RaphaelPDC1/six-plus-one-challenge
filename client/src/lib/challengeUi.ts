export const DAILY_PASS_THRESHOLD = 5;
export const DAILY_RULE_COUNT = 6;

export type DailyLogRuleInput = {
  noAlcohol: boolean;
  cleanEating: boolean;
  cleanEatingNote?: string;
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
  const cleanEatingConfirmed = form.cleanEating && String(form.cleanEatingNote ?? "").trim().length >= 10;
  return [
    { key: "noAlcohol", done: form.noAlcohol },
    { key: "cleanEating", done: cleanEatingConfirmed },
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
  passThreshold: number;
  totalRules: number;
} {
  const rules = getDailyLogRuleStates(form);
  const completedRules = rules.filter(rule => rule.done).length;
  return {
    rules,
    completedRules,
    allAddressed: completedRules >= DAILY_PASS_THRESHOLD,
    passThreshold: DAILY_PASS_THRESHOLD,
    totalRules: DAILY_RULE_COUNT,
  };
}
