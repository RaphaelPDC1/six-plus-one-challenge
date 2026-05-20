import type { DailyLog, NotificationPreference, Participant } from "../drizzle/schema";
import { getCurrentChallengeDay } from "./db";
import { notifyUserWithPush } from "./pushNotifications";

export type ReminderNotificationType = "morning_intent" | "afternoon_proof" | "evening_deadline" | "life_risk" | "streak_reward" | "warden_update";

export type ReminderCandidate = {
  userId: number;
  participant: Pick<Participant, "id" | "displayName" | "currentStreak" | "livesRemaining" | "totalPoints">;
  preferences: Pick<NotificationPreference,
    "pushEnabled" |
    "inAppEnabled" |
    "morningIntent" |
    "afternoonProof" |
    "eveningDeadline" |
    "lifeRisk" |
    "streakRewards" |
    "wardenUpdates" |
    "quietHoursEnabled" |
    "quietHoursStart" |
    "quietHoursEnd" |
    "timezone"
  >;
  todayLog?: Partial<Pick<DailyLog,
    "dayComplete" |
    "submittedAt" |
    "noAlcohol" |
    "cleanEating" |
    "exerciseDone" |
    "exerciseDuration" |
    "exerciseType" |
    "exerciseProofUrl" |
    "reflectionDone" |
    "reflectionText" |
    "readTeachDone" |
    "readTeachText" |
    "trackedEverything"
  >> | null;
  recentlySentTypes?: ReminderNotificationType[];
};

export type ReminderPlan = {
  userId: number;
  participantId: number;
  type: ReminderNotificationType;
  title: string;
  body: string;
  actionUrl: string;
  reason: string;
};

const RULE_COUNT = 6;
const REWARD_POINT_THRESHOLDS = [1000, 1500, 2500] as const;

function getLocalMinutes(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone || "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find(part => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find(part => part.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

function parseClockMinutes(value: string | null | undefined, fallback: string) {
  const source = /^\d{2}:\d{2}$/.test(value ?? "") ? String(value) : fallback;
  const [hour, minute] = source.split(":").map(Number);
  return Math.min(1439, Math.max(0, hour * 60 + minute));
}

export function isInQuietHours(now: Date, preferences: Pick<NotificationPreference, "quietHoursEnabled" | "quietHoursStart" | "quietHoursEnd" | "timezone">) {
  if (!preferences.quietHoursEnabled) return false;
  const localMinutes = getLocalMinutes(now, preferences.timezone || "Europe/London");
  const start = parseClockMinutes(preferences.quietHoursStart, "22:00");
  const end = parseClockMinutes(preferences.quietHoursEnd, "07:00");
  if (start === end) return false;
  if (start < end) return localMinutes >= start && localMinutes < end;
  return localMinutes >= start || localMinutes < end;
}

function isInWindow(now: Date, timezone: string, start: string, end: string) {
  const localMinutes = getLocalMinutes(now, timezone || "Europe/London");
  return localMinutes >= parseClockMinutes(start, start) && localMinutes <= parseClockMinutes(end, end);
}

function countCompletedRules(log: ReminderCandidate["todayLog"]) {
  if (!log) return 0;
  return [
    Boolean(log.noAlcohol),
    Boolean(log.cleanEating),
    Boolean(log.exerciseDone) || Number(log.exerciseDuration ?? 0) >= 30,
    Boolean(log.reflectionDone) || String(log.reflectionText ?? "").trim().length > 0,
    Boolean(log.readTeachDone) || String(log.readTeachText ?? "").trim().length > 0,
    Boolean(log.trackedEverything),
  ].filter(Boolean).length;
}

function hasStartedToday(log: ReminderCandidate["todayLog"]) {
  return countCompletedRules(log) > 0 || String(log?.exerciseType ?? "").trim().length > 0 || String(log?.exerciseProofUrl ?? "").trim().length > 0;
}

function needsProof(log: ReminderCandidate["todayLog"]) {
  if (!log) return true;
  const exerciseStarted = Boolean(log.exerciseDone) || Number(log.exerciseDuration ?? 0) > 0 || String(log.exerciseType ?? "").trim().length > 0;
  return exerciseStarted && String(log.exerciseProofUrl ?? "").trim().length === 0;
}

function nextRewardThreshold(points: number) {
  return REWARD_POINT_THRESHOLDS.find(threshold => points < threshold) ?? null;
}

function shouldSkipType(type: ReminderNotificationType, candidate: ReminderCandidate) {
  return (candidate.recentlySentTypes ?? []).includes(type);
}

function addPlan(plans: ReminderPlan[], candidate: ReminderCandidate, type: ReminderNotificationType, title: string, body: string, reason: string) {
  if (shouldSkipType(type, candidate)) return;
  plans.push({
    userId: candidate.userId,
    participantId: candidate.participant.id,
    type,
    title,
    body,
    actionUrl: "/?tab=my-day",
    reason,
  });
}

export function buildReminderNotifications(input: { candidate: ReminderCandidate; now?: Date; dayNumber?: number }) {
  const now = input.now ?? new Date();
  const dayNumber = input.dayNumber ?? getCurrentChallengeDay(now);
  const { candidate } = input;
  const { preferences, participant, todayLog } = candidate;
  const plans: ReminderPlan[] = [];
  const timezone = preferences.timezone || "Europe/London";
  const completedRules = countCompletedRules(todayLog);
  const dayComplete = Boolean(todayLog?.dayComplete || todayLog?.submittedAt || completedRules >= RULE_COUNT);
  const started = hasStartedToday(todayLog);

  if (!preferences.pushEnabled && !preferences.inAppEnabled) return plans;
  if (isInQuietHours(now, preferences)) return plans;

  if (preferences.morningIntent && !dayComplete && !started && isInWindow(now, timezone, "07:00", "10:59")) {
    addPlan(
      plans,
      candidate,
      "morning_intent",
      "Set today’s 6+1 intent",
      `Day ${dayNumber}: open Today’s Log before the day gets noisy. Six standards, one honest submission.`,
      "morning window and no rule progress yet",
    );
  }

  if (preferences.afternoonProof && !dayComplete && needsProof(todayLog) && isInWindow(now, timezone, "13:00", "17:59")) {
    addPlan(
      plans,
      candidate,
      "afternoon_proof",
      "Proof check before the rush",
      "If training is done, bank the proof now. Future you does not get credit for a forgotten upload.",
      "afternoon window and proof is still missing",
    );
  }

  if (preferences.eveningDeadline && !dayComplete && isInWindow(now, timezone, "18:00", "21:29")) {
    addPlan(
      plans,
      candidate,
      "evening_deadline",
      "Tonight’s log is still open",
      `${completedRules}/${RULE_COUNT} standards are banked. Finish the missing pieces before the deadline.`,
      "evening window and day is incomplete",
    );
  }

  if (preferences.lifeRisk && !dayComplete && participant.livesRemaining <= 2 && isInWindow(now, timezone, "21:30", "22:59")) {
    addPlan(
      plans,
      candidate,
      "life_risk",
      "Life-risk warning",
      `${participant.displayName}, you have ${participant.livesRemaining}/4 lives left. Save the day before another one disappears.`,
      "late window, incomplete day, and two or fewer lives remaining",
    );
  }

  const rewardThreshold = nextRewardThreshold(participant.totalPoints);
  if (preferences.streakRewards && dayComplete && participant.currentStreak > 0 && participant.currentStreak % 7 === 0 && isInWindow(now, timezone, "08:00", "20:59")) {
    addPlan(
      plans,
      candidate,
      "streak_reward",
      "Streak banked",
      rewardThreshold
        ? `Seven-day block protected. ${rewardThreshold - participant.totalPoints} points to the next reward tier.`
        : "Seven-day block protected. You are in the top reward tier conversation now.",
      "completed day and seven-day streak milestone",
    );
  }

  if (preferences.wardenUpdates && !dayComplete && completedRules > 0 && completedRules < RULE_COUNT && isInWindow(now, timezone, "12:00", "20:59")) {
    addPlan(
      plans,
      candidate,
      "warden_update",
      "Warden nudge",
      `The board sees ${completedRules}/${RULE_COUNT}. Finish cleanly and give the group something useful to chase.`,
      "partial progress during active hours",
    );
  }

  return plans;
}

export async function dispatchDeterministicReminderNotifications(input: { candidates: ReminderCandidate[]; now?: Date; dayNumber?: number }) {
  const plans = input.candidates.flatMap(candidate => buildReminderNotifications({ candidate, now: input.now, dayNumber: input.dayNumber }));
  const outcomes = [];
  for (const plan of plans) {
    outcomes.push(await notifyUserWithPush({
      userId: plan.userId,
      participantId: plan.participantId,
      type: plan.type,
      title: plan.title,
      body: plan.body,
      actionUrl: plan.actionUrl,
    }));
  }
  return { plans, outcomes };
}
