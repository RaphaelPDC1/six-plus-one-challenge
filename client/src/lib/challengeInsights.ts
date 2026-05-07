export const DAILY_PASS_THRESHOLD = 5;
export const DAILY_RULE_COUNT = 6;

export type ChallengeLog = Record<string, any>;
export type ChallengeParticipant = Record<string, any>;

export type ParticipantInsight = ChallengeParticipant & {
  ownedLogs: ChallengeLog[];
  latestLog: ChallengeLog | null;
  todayLog: ChallengeLog | null;
  completeCount: number;
  completionRate: number;
  submitRate: number;
  proofRate: number;
  pointVelocity: number;
  recentPointGain: number;
  recentPasses: number;
  completedRulesToday: number;
  tasksLeftToday: number;
  passTasksLeft: number;
  livesLost: number;
  riskScore: number;
  riskLabel: string;
  riskReasons: string[];
  moverScore: number;
  moverReasons: string[];
  consistencyScore: number;
  consistencyReasons: string[];
  boostScore: number;
  boostLabel: string;
  boostReasons: string[];
  comparisonLine: string;
  statusLine: string;
  statusTag: string;
  statusTone: "gold" | "green" | "red" | "purple" | "white";
  comparisonStats: Array<{ label: string; value: string; tone: "gold" | "green" | "red" | "purple" | "white" }>;
  podiumRank?: number;
};

export function clampScore(value: number, max = 100): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(max, Math.round(value)));
}

export function pct(part: number, whole: number): number {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

export function getLogRuleStates(log: ChallengeLog | null | undefined) {
  return [
    { key: "noAlcohol", label: "No alcohol", done: Boolean(log?.noAlcohol) },
    { key: "cleanEating", label: "Clean eating", done: Boolean(log?.cleanEating) },
    { key: "exercise", label: "30m exercise", done: Number(log?.exerciseDuration ?? 0) >= 30 && String(log?.exerciseType ?? "").trim().length > 1 },
    { key: "reflection", label: "Reflection", done: String(log?.reflectionText ?? "").trim().length > 1 },
    { key: "readTeach", label: "Read / teach", done: String(log?.readTeachText ?? "").trim().length > 1 },
    { key: "trackedEverything", label: "Tracked all", done: Boolean(log?.trackedEverything) },
  ];
}

export function getLogCompletedRuleCount(log: ChallengeLog | null | undefined): number {
  return getLogRuleStates(log).filter(rule => rule.done).length;
}

export function logHasProof(log: ChallengeLog | null | undefined): boolean {
  return String(log?.exerciseProofUrl ?? "").trim().length > 4;
}

export function logHasInsight(log: ChallengeLog | null | undefined): boolean {
  return String(log?.reflectionText ?? "").trim().length > 20 || String(log?.readTeachText ?? "").trim().length > 20;
}

export function isPassingLog(log: ChallengeLog | null | undefined): boolean {
  return Boolean(log?.completed || log?.dayComplete || getLogCompletedRuleCount(log) >= DAILY_PASS_THRESHOLD);
}

export function calculateLiveTaskPoints(completedRules: number, options: { hasProof?: boolean; hasInsight?: boolean; trackedEverything?: boolean } = {}) {
  const safeRules = Math.max(0, Math.min(DAILY_RULE_COUNT, completedRules));
  const rulePoints = safeRules * 2;
  const passBonus = safeRules >= DAILY_PASS_THRESHOLD ? 4 : 0;
  const fullGreenBonus = safeRules >= DAILY_RULE_COUNT ? 3 : 0;
  const proofBonus = options.hasProof ? 1 : 0;
  const insightBonus = options.hasInsight ? 1 : 0;
  const trackingBonus = options.trackedEverything ? 1 : 0;
  return {
    rulePoints,
    passBonus,
    fullGreenBonus,
    proofBonus,
    insightBonus,
    trackingBonus,
    visibleTotal: rulePoints + passBonus + fullGreenBonus + proofBonus + insightBonus + trackingBonus,
  };
}

function buildBoardStatus(params: {
  livesRemaining: number;
  completedRulesToday: number;
  passTasksLeft: number;
  todayPassed: boolean;
  noTodayLog: boolean;
  proofRate: number;
  recentLogs: ChallengeLog[];
  recentPasses: number;
  recentPointGain: number;
  currentStreak: number;
  riskScore: number;
  riskReasons: string[];
}) {
  const recentProofs = params.recentLogs.filter(logHasProof).length;
  const streakDays = Math.max(0, Number(params.currentStreak ?? 0));
  if (params.livesRemaining <= 1) return { statusLine: "One life left. Needs a big day.", statusTag: "Critical", statusTone: "red" as const };
  if (params.passTasksLeft > 0 && recentProofs === 0) return { statusLine: "Falling behind — no proof this week.", statusTag: "Slipping", statusTone: "red" as const };
  if (params.riskScore >= 70) return { statusLine: params.noTodayLog ? "Danger zone — no log opened today." : `Danger zone — ${params.passTasksLeft || params.riskReasons[0]} still blocking today.`, statusTag: "Danger", statusTone: "red" as const };
  if (params.riskScore >= 42) return { statusLine: `${params.riskReasons[0] ?? "Pressure building"}. Needs attention.`, statusTag: "Slipping", statusTone: "gold" as const };
  if (params.todayPassed && streakDays >= 3) return { statusLine: `Strong run — ${streakDays} days in a row.`, statusTag: "On track", statusTone: "green" as const };
  if (params.todayPassed) return { statusLine: "Green today — pressure banked.", statusTag: "On track", statusTone: "green" as const };
  if (params.completedRulesToday >= 3) return { statusLine: `${params.completedRulesToday}/6 ticked. Finish the pass.` , statusTag: "Building", statusTone: "gold" as const };
  if (params.recentPointGain > 0 && params.recentPasses >= 2) return { statusLine: "Moving well — keep the streak alive.", statusTag: "On track", statusTone: "green" as const };
  if (params.proofRate >= 60) return { statusLine: "Proof habit is solid. Needs today’s ticks.", statusTag: "Watch", statusTone: "gold" as const };
  return { statusLine: "Quiet board — needs a green day.", statusTag: "Watch", statusTone: "white" as const };
}

export function buildParticipantInsights(params: {
  participants: ChallengeParticipant[];
  logs: ChallengeLog[];
  currentDay: number;
  now?: Date;
}): ParticipantInsight[] {
  const participants = params.participants ?? [];
  const logs = params.logs ?? [];
  const currentDay = Math.max(1, Number(params.currentDay ?? 1));
  const now = params.now ?? new Date();
  const hour = now.getHours();
  const dayUrgency = hour >= 20 ? 1 : hour >= 17 ? 0.72 : hour >= 12 ? 0.42 : 0.18;

  return participants.map(participant => {
    const ownedLogs = logs
      .filter(log => String(log.participantId) === String(participant.id))
      .sort((a, b) => Number(a.dayNumber ?? 0) - Number(b.dayNumber ?? 0));
    const latestLog = [...ownedLogs].reverse()[0] ?? null;
    const todayLog = ownedLogs.find(log => Number(log.dayNumber ?? 0) === currentDay) ?? null;
    const recentLogs = ownedLogs.filter(log => Number(log.dayNumber ?? 0) >= Math.max(1, currentDay - 6));
    const recentThreeLogs = ownedLogs.filter(log => Number(log.dayNumber ?? 0) >= Math.max(1, currentDay - 2));
    const passedLogs = ownedLogs.filter(isPassingLog);
    const recentPasses = recentThreeLogs.filter(isPassingLog).length;
    const completeCount = passedLogs.length;
    const completionRate = pct(completeCount, currentDay);
    const submitRate = pct(ownedLogs.length, currentDay);
    const proofRate = pct(ownedLogs.filter(logHasProof).length, Math.max(1, ownedLogs.length));
    const recentPointGain = recentLogs.reduce((sum, log) => sum + Number(log.pointsAwarded ?? 0), 0);
    const pointVelocity = Math.round((recentPointGain / Math.max(1, recentLogs.length || 1)) * 10) / 10;
    const completedRulesToday = todayLog ? getLogCompletedRuleCount(todayLog) : 0;
    const tasksLeftToday = Math.max(0, DAILY_RULE_COUNT - completedRulesToday);
    const passTasksLeft = Math.max(0, DAILY_PASS_THRESHOLD - completedRulesToday);
    const livesRemaining = Math.max(0, Math.min(4, Number(participant.livesRemaining ?? 4)));
    const livesLost = Math.max(0, 4 - livesRemaining);
    const todayPassed = isPassingLog(todayLog);
    const noTodayLog = !todayLog;
    const latestWasMiss = latestLog ? !isPassingLog(latestLog) : true;
    const recentMisses = Math.max(0, 3 - recentPasses);

    const riskReasons: string[] = [];
    if (passTasksLeft > 0) riskReasons.push(`${passTasksLeft} more rule${passTasksLeft === 1 ? "" : "s"} needed to pass today`);
    if (noTodayLog) riskReasons.push("no log opened today");
    if (livesLost > 0) riskReasons.push(`${livesLost} life ${livesLost === 1 ? "already" : "lives"} lost`);
    if (recentMisses > 0) riskReasons.push(`${recentMisses} pressure flag${recentMisses === 1 ? "" : "s"} in the last 3 days`);
    if (latestWasMiss && latestLog) riskReasons.push("latest submitted day was not green");

    const riskScore = clampScore(
      passTasksLeft * 13 +
      tasksLeftToday * 4 +
      Math.round(passTasksLeft * 12 * dayUrgency) +
      (noTodayLog ? Math.round(18 + 14 * dayUrgency) : 0) +
      livesLost * 15 +
      recentMisses * 9 +
      (Number(participant.currentStreak ?? 0) === 0 ? 8 : 0),
    );

    const moverReasons: string[] = [];
    if (recentPointGain > 0) moverReasons.push(`+${recentPointGain} points in the recent window`);
    if (recentPasses > 0) moverReasons.push(`${recentPasses}/3 recent pass pace`);
    if (todayPassed) moverReasons.push("today already banked green progress");
    if (recentMisses > 0 && todayPassed) moverReasons.push("recovered after recent pressure");
    if (completedRulesToday > 0 && !todayPassed) moverReasons.push(`${completedRulesToday}/6 rules ticked today`);
    const moverScore = clampScore(recentPointGain + recentPasses * 14 + completedRulesToday * 4 + Number(participant.currentStreak ?? 0) * 2 + (todayPassed ? 12 : 0) + (recentMisses > 0 && todayPassed ? 10 : 0), 160);

    const consistencyReasons: string[] = [];
    if (completionRate >= 80) consistencyReasons.push(`${completionRate}% pass rate`);
    if (Number(participant.currentStreak ?? 0) > 0) consistencyReasons.push(`${participant.currentStreak} day active streak`);
    if (proofRate >= 50) consistencyReasons.push(`${proofRate}% proof reliability`);
    if (livesLost === 0) consistencyReasons.push("no lives lost yet");
    const consistencyScore = clampScore(completionRate * 0.45 + Number(participant.currentStreak ?? 0) * 6 + proofRate * 0.2 + (livesLost === 0 ? 12 : Math.max(0, 10 - livesLost * 3)) + recentPasses * 6, 160);

    const boostReasons: string[] = [];
    if (todayLog?.pointsAwarded) boostReasons.push(`today awarded ${todayLog.pointsAwarded} points`);
    if (completedRulesToday >= DAILY_RULE_COUNT) boostReasons.push("full 6/6 green day");
    if (logHasProof(todayLog)) boostReasons.push("proof uploaded through the app");
    if (logHasInsight(todayLog)) boostReasons.push("reflection or teaching added depth");
    if (recentPointGain > 0 && !todayLog?.pointsAwarded) boostReasons.push(`recent +${recentPointGain} point lift`);
    const boostScore = clampScore(Number(todayLog?.pointsAwarded ?? 0) * 2 + (completedRulesToday >= DAILY_RULE_COUNT ? 16 : 0) + (logHasProof(todayLog) ? 8 : 0) + (logHasInsight(todayLog) ? 8 : 0) + recentPointGain, 160);

    const riskLabel = riskScore >= 70 ? "Red zone" : riskScore >= 42 ? "Watch today" : riskScore >= 18 ? "Manageable" : "Safe";
    const boostLabel = boostScore >= 65 ? "Major boost" : boostScore >= 32 ? "Active boost" : boostScore > 0 ? "Small lift" : "No boost yet";
    const boardStatus = buildBoardStatus({ livesRemaining, completedRulesToday, passTasksLeft, todayPassed, noTodayLog, proofRate, recentLogs, recentPasses, recentPointGain, currentStreak: Number(participant.currentStreak ?? 0), riskScore, riskReasons });

    return {
      ...participant,
      ownedLogs,
      latestLog,
      todayLog,
      completeCount,
      completionRate,
      submitRate,
      proofRate,
      pointVelocity,
      recentPointGain,
      recentPasses,
      completedRulesToday,
      tasksLeftToday,
      passTasksLeft,
      livesLost,
      riskScore,
      riskLabel,
      riskReasons: riskReasons.length ? riskReasons : ["low immediate risk based on logs, lives, and timing"],
      moverScore,
      moverReasons: moverReasons.length ? moverReasons : ["needs a fresh completion to create movement"],
      consistencyScore,
      consistencyReasons: consistencyReasons.length ? consistencyReasons : ["consistency still needs proof across more days"],
      boostScore,
      boostLabel,
      boostReasons: boostReasons.length ? boostReasons : ["tick rules, upload proof, or submit a green day to activate a boost"],
      comparisonLine: `${completionRate}% pass · ${pointVelocity} pts/day · ${proofRate}% proof · ${riskLabel}`,
      statusLine: boardStatus.statusLine,
      statusTag: boardStatus.statusTag,
      statusTone: boardStatus.statusTone,
      comparisonStats: [
        { label: "Pass pace", value: `${completionRate}%`, tone: completionRate >= 80 ? "green" : completionRate >= 55 ? "gold" : "red" },
        { label: "Velocity", value: `${pointVelocity}/day`, tone: pointVelocity >= 10 ? "green" : pointVelocity > 0 ? "gold" : "white" },
        { label: "Proof", value: `${proofRate}%`, tone: proofRate >= 60 ? "green" : proofRate > 0 ? "gold" : "white" },
        { label: "Risk", value: `${riskScore}`, tone: riskScore >= 60 ? "red" : riskScore >= 30 ? "gold" : "green" },
      ],
    };
  });
}

export function rankForPodium(insights: ParticipantInsight[]): ParticipantInsight[] {
  return [...insights]
    .sort((a, b) => Number(b.totalPoints ?? 0) - Number(a.totalPoints ?? 0) || b.moverScore - a.moverScore || b.consistencyScore - a.consistencyScore)
    .map((participant, index) => ({ ...participant, podiumRank: index + 1 }));
}

export function buildFocusedChartData(params: { logs: ChallengeLog[]; participants: ChallengeParticipant[]; focusedParticipantId?: string | number | null; currentDay: number }) {
  const logs = params.logs ?? [];
  const participants = params.participants ?? [];
  const participantCount = Math.max(1, participants.length);
  const dayCount = Math.max(Number(params.currentDay ?? 1), 10);
  const focusedId = String(params.focusedParticipantId ?? participants[0]?.id ?? "");
  return Array.from({ length: dayCount }, (_, index) => {
    const day = index + 1;
    const focusedComplete = logs.filter(log => String(log.participantId) === focusedId && Number(log.dayNumber ?? 0) <= day && isPassingLog(log)).length;
    const groupAverage = Math.round((logs.filter(log => Number(log.dayNumber ?? 0) <= day && isPassingLog(log)).length / participantCount) * 10) / 10;
    const focusedPoints = logs.filter(log => String(log.participantId) === focusedId && Number(log.dayNumber ?? 0) <= day).reduce((sum, log) => sum + Number(log.pointsAwarded ?? 0), 0);
    return { day, focused: focusedComplete, groupAverage, focusedPoints };
  });
}
