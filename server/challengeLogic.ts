export const DAILY_RULE_KEYS = [
  "noAlcohol",
  "cleanEating",
  "exerciseDone",
  "reflectionDone",
  "readTeachDone",
  "trackedEverything",
] as const;

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

export function isDayComplete(input: CompletionInput): boolean {
  const rulesDone =
    input.noAlcohol &&
    input.cleanEating &&
    input.exerciseDone &&
    input.reflectionDone &&
    input.readTeachDone &&
    (input.trackedEverything ?? true);

  if (!rulesDone) return false;
  if (!input.submittedAt || !input.deadline) return true;
  return input.submittedAt.getTime() <= input.deadline.getTime();
}

export function evaluateDailyRules(input: Required<DailyRuleState>) {
  const missedRules = getMissedRules(input);
  return { complete: missedRules.length === 0, missedRules };
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

export function calculateDailyPoints(dayNumber: number, complete: boolean): number {
  if (!complete) return 0;
  return 10 + calculateCheckpointBonus(dayNumber);
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

export function canSendWardenMessage(messagesSentToday: number): boolean {
  return messagesSentToday < 3;
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
