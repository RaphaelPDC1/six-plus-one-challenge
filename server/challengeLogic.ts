export const DAILY_RULE_KEYS = [
  "noAlcohol",
  "cleanEating",
  "exerciseDone",
  "reflectionDone",
  "readTeachDone",
  "trackedEverything",
] as const;

export const DAILY_PASS_THRESHOLD = 5;
export const DAILY_RULE_COUNT = DAILY_RULE_KEYS.length;

export type DailyRuleKey = (typeof DAILY_RULE_KEYS)[number];

export type DailyRuleState = {
  noAlcohol: boolean;
  cleanEating: boolean;
  exerciseDone: boolean;
  reflectionDone: boolean;
  readTeachDone: boolean;
  trackedEverything?: boolean;
};

export type CompletionInput = DailyRuleState & {
  submittedAt?: Date | null;
  deadline?: Date | null;
};

export function countCompletedDailyRules(input: DailyRuleState): number {
  return DAILY_RULE_KEYS.reduce((total, key) => total + (input[key] ? 1 : 0), 0);
}

export function isDayComplete(input: CompletionInput): boolean {
  const rulesDone = countCompletedDailyRules(input) >= DAILY_PASS_THRESHOLD;

  if (!rulesDone) return false;
  if (!input.submittedAt || !input.deadline) return true;
  return input.submittedAt.getTime() <= input.deadline.getTime();
}

export function evaluateDailyRules(input: Required<DailyRuleState>) {
  const missedRules = getMissedRules(input);
  const completedRules = countCompletedDailyRules(input);
  return { complete: completedRules >= DAILY_PASS_THRESHOLD, missedRules, completedRules, requiredRules: DAILY_PASS_THRESHOLD, totalRules: DAILY_RULE_COUNT };
}

export function calculateCheckpointBonus(dayNumber: number): number {
  if (dayNumber === 10) return 50;
  if (dayNumber === 25) return 100;
  if (dayNumber === 40) return 150;
  if (dayNumber === 50) return 250;
  return 0;
}

export function calculateCheckpointAward(dayNumber: number, complete: boolean): number {
  return complete ? calculateCheckpointBonus(dayNumber) : 0;
}

export function calculateDailyPoints(dayNumber: number, complete: boolean, options: { completedRules?: number; submittedAt?: Date; ghostLifeUsed?: boolean; currentStreak?: number } = {}): number {
  if (!complete) return 0;
  const completedRules = Math.max(0, Math.min(DAILY_RULE_COUNT, options.completedRules ?? DAILY_PASS_THRESHOLD));
  const fullGreenBonus = completedRules >= DAILY_RULE_COUNT ? 3 : 0;
  const earlyCompletionBonus = options.submittedAt && options.submittedAt.getHours() < 14 ? 1 : 0;
  const restraintBonus = options.ghostLifeUsed ? 0 : 1;
  const nextStreak = (options.currentStreak ?? 0) + 1;
  const streakMilestoneBonus = nextStreak > 0 && nextStreak % 5 === 0 ? 2 : 0;
  return 10 + fullGreenBonus + earlyCompletionBonus + restraintBonus + streakMilestoneBonus + calculateCheckpointBonus(dayNumber);
}

export function applyLifeLoss(currentLives: number): number {
  return Math.max(0, currentLives - 1);
}

export const nextLivesAfterLoss = applyLifeLoss;

export function canEarnGhostLife(params: {
  ghostLifeUsed: boolean;
  livesRemaining: number;
  exerciseDuration: number;
  insightCount: number;
}): boolean {
  return (
    !params.ghostLifeUsed &&
    params.livesRemaining < 4 &&
    params.exerciseDuration >= 60 &&
    params.insightCount >= 2
  );
}

export function getGhostLifeEligibility(params: {
  ghostLifeUsed: boolean;
  livesRemaining: number;
  doubleDownComplete: boolean;
}) {
  if (params.ghostLifeUsed) return { eligible: false, reason: "Ghost Life already used" };
  if (params.livesRemaining >= 4) return { eligible: false, reason: "No lost life to restore" };
  if (!params.doubleDownComplete) return { eligible: false, reason: "Double-Down day not complete" };
  return { eligible: true, reason: "Eligible" };
}

export function canSendWardenMessage(messagesSentToday: number, maxMessagesToday = 4): boolean {
  return messagesSentToday < Math.min(Math.max(maxMessagesToday, 0), 4);
}

export const canPostWardenMessage = canSendWardenMessage;

export function getMissedRules(input: DailyRuleState): string[] {
  const missed: string[] = [];
  if (!input.noAlcohol) missed.push("No Alcohol");
  if (!input.cleanEating) missed.push("Clean Eating");
  if (!input.exerciseDone) missed.push("30m Exercise");
  if (!input.reflectionDone) missed.push("Daily Reflection");
  if (!input.readTeachDone) missed.push("Read & Teach");
  if (input.trackedEverything === false) missed.push("Track Everything");
  return missed;
}
