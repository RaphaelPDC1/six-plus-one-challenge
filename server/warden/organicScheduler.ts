import type { ChallengeState } from "./challengeState";

export type WardenWindowId = "morning" | "midday" | "evening" | "late";

export interface WardenWindow {
  id: WardenWindowId;
  label: string;
  startMinuteUtc: number;
  endMinuteUtc: number;
  requiresDrama: boolean;
}

export interface OrganicWindowDecision {
  shouldRun: boolean;
  reason: string;
  windowId?: WardenWindowId;
  targetMinuteUtc?: number;
  currentMinuteUtc: number;
}

export const WARDEN_WINDOWS: WardenWindow[] = [
  {
    id: "morning",
    label: "Morning",
    startMinuteUtc: 7 * 60,
    endMinuteUtc: 9 * 60,
    requiresDrama: false,
  },
  {
    id: "midday",
    label: "Midday",
    startMinuteUtc: 12 * 60,
    endMinuteUtc: 14 * 60,
    requiresDrama: false,
  },
  {
    id: "evening",
    label: "Evening",
    startMinuteUtc: 18 * 60,
    endMinuteUtc: 20 * 60,
    requiresDrama: false,
  },
  {
    id: "late",
    label: "Late",
    startMinuteUtc: 21 * 60,
    endMinuteUtc: 22 * 60,
    requiresDrama: true,
  },
];

export function getMaxMessagesForDramaScore(score: number): number {
  if (score >= 6) return 4;
  if (score >= 3) return 3;
  return 2;
}

function toUtcDateKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function getCurrentUtcMinute(date: Date = new Date()): number {
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

export function getOrganicWindowTargetMinute(
  window: WardenWindow,
  date: Date = new Date(),
  triggerCadenceMinutes = 15
): number {
  const latestStartMinute = Math.max(
    window.startMinuteUtc,
    window.endMinuteUtc - triggerCadenceMinutes
  );
  const availableMinutes = Math.max(1, latestStartMinute - window.startMinuteUtc + 1);
  const seed = `${toUtcDateKey(date)}:${window.id}`;
  return window.startMinuteUtc + (hashString(seed) % availableMinutes);
}

export function getActiveOrganicWindow(
  date: Date = new Date(),
  triggerCadenceMinutes = 15
): { window: WardenWindow; targetMinuteUtc: number } | null {
  const currentMinuteUtc = getCurrentUtcMinute(date);

  for (const window of WARDEN_WINDOWS) {
    const targetMinuteUtc = getOrganicWindowTargetMinute(
      window,
      date,
      triggerCadenceMinutes
    );
    const slotEndMinute = Math.min(window.endMinuteUtc, targetMinuteUtc + triggerCadenceMinutes);

    if (currentMinuteUtc >= targetMinuteUtc && currentMinuteUtc < slotEndMinute) {
      return { window, targetMinuteUtc };
    }
  }

  return null;
}

export function hasLateWindowDrama(state: ChallengeState): boolean {
  const score = state.daily_drama_score ?? 0;
  const lifeLosses = state.lives_lost_today?.length ?? 0;
  const milestones = state.milestones_hit_today?.length ?? 0;
  const sharpInsights = state.sharp_insights_shared_today?.length ?? 0;
  const sharedThemes = state.shared_themes?.length ?? 0;
  const personalBests = state.personal_bests_today?.length ?? 0;
  const silentReturns = state.silent_returns_today?.length ?? 0;
  const ghostLifeSignals = state.ghost_life_signals_today?.length ?? 0;

  return (
    score >= 3 ||
    lifeLosses > 0 ||
    milestones > 0 ||
    sharpInsights >= 2 ||
    sharedThemes > 0 ||
    personalBests > 0 ||
    silentReturns > 0 ||
    ghostLifeSignals > 0
  );
}

export function shouldRunOrganicWardenCycle(
  state: ChallengeState,
  date: Date = new Date(),
  triggerCadenceMinutes = 15
): OrganicWindowDecision {
  const currentMinuteUtc = getCurrentUtcMinute(date);
  const active = getActiveOrganicWindow(date, triggerCadenceMinutes);

  if (!active) {
    return {
      shouldRun: false,
      reason: "outside_organic_window_slot",
      currentMinuteUtc,
    };
  }

  if (active.window.requiresDrama && !hasLateWindowDrama(state)) {
    return {
      shouldRun: false,
      reason: "late_window_without_enough_drama",
      windowId: active.window.id,
      targetMinuteUtc: active.targetMinuteUtc,
      currentMinuteUtc,
    };
  }

  return {
    shouldRun: true,
    reason: "organic_window_slot_active",
    windowId: active.window.id,
    targetMinuteUtc: active.targetMinuteUtc,
    currentMinuteUtc,
  };
}
