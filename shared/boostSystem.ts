export const BOOST_CHALLENGE_ID = 1;
export const BOOST_POINTS = 5;
export const BOOST_SLOT_COUNT = 7;
export const DAILY_NAMED_BOOST_CAP = 10;

export type BoostTone = "green" | "gold" | "red" | "purple" | "white";

export type BoostDefinition = {
  id: string;
  name: string;
  icon: string;
  shortRule: string;
  antiGaming: string;
  tone: BoostTone;
  pointsAwarded: number;
};

export type BoostParticipant = Record<string, any>;
export type BoostLog = Record<string, any>;
export type BoostWinLike = Record<string, any>;

export type BoostEvaluationAward = {
  boost: BoostDefinition;
  participant: BoostParticipant;
  pointsAwarded: number;
  wardenNote: string;
};

export type ActiveBoostSlot = BoostDefinition & {
  slot: number;
};

export const BOOST_SEQUENCE: BoostDefinition[] = [
  {
    id: "clean_sweep",
    name: "CLEAN SWEEP",
    icon: "✓",
    shortRule: "Every third consecutive perfect 6/6 day",
    antiGaming: "Requires all six rules complete and only pays on streak days 3, 6, 9, 12 and so on.",
    tone: "green",
    pointsAwarded: 5,
  },
  {
    id: "morning_proof",
    name: "MORNING PROOF",
    icon: "☀",
    shortRule: "Exercise proof uploaded before 09:00",
    antiGaming: "Requires an actual exercise proof upload timestamped before 09:00, not just a text exercise log.",
    tone: "gold",
    pointsAwarded: 3,
  },
  {
    id: "bounce_back",
    name: "BOUNCE BACK",
    icon: "↻",
    shortRule: "Complete the day after a missed or incomplete day",
    antiGaming: "Requires an actual previous-day log that was incomplete; new-player onboarding gaps do not count.",
    tone: "red",
    pointsAwarded: 4,
  },
  {
    id: "deep_work",
    name: "DEEP WORK",
    icon: "✎",
    shortRule: "Meaningful reflection plus Read & Teach depth",
    antiGaming: "Requires at least 250 combined characters across reflection and Read & Teach fields.",
    tone: "purple",
    pointsAwarded: 4,
  },
  {
    id: "pressure_player",
    name: "PRESSURE PLAYER",
    icon: "◈",
    shortRule: "Complete a day while on two lives or fewer",
    antiGaming: "Only players in the danger-life bracket can trigger it; copy frames this as a comeback badge.",
    tone: "red",
    pointsAwarded: 6,
  },
  {
    id: "streak_lock",
    name: "STREAK LOCK",
    icon: "7",
    shortRule: "Lock in each seven-day streak milestone",
    antiGaming: "Pays on streak days 7, 14, 21 and so on; duplicate awards for the same day are blocked.",
    tone: "green",
    pointsAwarded: 7,
  },
  {
    id: "mover",
    name: "MOVER",
    icon: "⇧",
    shortRule: "Biggest seven-day rank climb outside the top three",
    antiGaming: "Current top three excluded; requires a real climb over the previous seven-day view.",
    tone: "gold",
    pointsAwarded: 5,
  },
];

export function getActiveBoostsForDay(_day: number): ActiveBoostSlot[] {
  return BOOST_SEQUENCE.map((boost, index) => ({ ...boost, slot: index + 1 }));
}

export function isPassingBoostLog(log: BoostLog | null | undefined): boolean {
  if (!log) return false;
  return Boolean(log.dayComplete || log.completed || Number(log.pointsAwarded ?? 0) >= 10 || getCompletedRuleCount(log) >= 5);
}

export function getCompletedRuleCount(log: BoostLog | null | undefined): number {
  if (!log) return 0;
  return [
    Boolean(log.noAlcohol),
    Boolean(log.cleanEating),
    Boolean(log.exerciseDone) || (Number(log.exerciseDuration ?? 0) >= 30 && String(log.exerciseType ?? "").trim().length > 0),
    Boolean(log.reflectionDone) || String(log.reflectionText ?? "").trim().length > 0,
    Boolean(log.readTeachDone) || String(log.readTeachText ?? "").trim().length > 0,
    Boolean(log.trackedEverything),
  ].filter(Boolean).length;
}

export function getBoostWinnerIdsForDay(boostWins: BoostWinLike[], day: number): Set<string> {
  return new Set((boostWins ?? []).filter(win => Number(win.day ?? 0) === Number(day)).map(win => String(win.userId)));
}

function submittedAtTime(log: BoostLog | null | undefined): number {
  const submitted = log?.submittedAt ? new Date(log.submittedAt).getTime() : 0;
  return Number.isFinite(submitted) ? submitted : 0;
}

function submittedHour(log: BoostLog | null | undefined): number {
  const submitted = log?.submittedAt ? new Date(log.submittedAt) : null;
  return submitted && Number.isFinite(submitted.getTime()) ? submitted.getHours() : -1;
}

function participantForLog(log: BoostLog, participants: BoostParticipant[]): BoostParticipant | undefined {
  return participants.find(participant => String(participant.id) === String(log.participantId));
}

function logForParticipant(dayLogs: BoostLog[], participantId: unknown): BoostLog | undefined {
  return dayLogs.find(log => String(log.participantId) === String(participantId));
}

function hasBoostWinForDay(boostWins: BoostWinLike[], participantId: unknown, boostId: string, day: number): boolean {
  return (boostWins ?? []).some(win =>
    String(win.userId) === String(participantId)
    && String(win.boostId) === boostId
    && Number(win.day ?? 0) === day,
  );
}

function rankParticipantsByPoints(participants: BoostParticipant[], boostWins: BoostWinLike[] = []): BoostParticipant[] {
  const boostTotals = new Map<string, number>();
  for (const win of boostWins) {
    const userId = String(win.userId ?? "");
    boostTotals.set(userId, (boostTotals.get(userId) ?? 0) + Number(win.pointsAwarded ?? 0));
  }
  return [...participants].sort((a, b) =>
    (Number(b.totalPoints ?? 0) + (boostTotals.get(String(b.id)) ?? 0))
    - (Number(a.totalPoints ?? 0) + (boostTotals.get(String(a.id)) ?? 0))
    || String(a.displayName ?? "").localeCompare(String(b.displayName ?? "")),
  );
}

function makeAward(boost: BoostDefinition, participant: BoostParticipant, reason: string, pointsAwarded = boost.pointsAwarded ?? BOOST_POINTS): BoostEvaluationAward {
  return { boost, participant, pointsAwarded, wardenNote: `${boost.name}: ${reason}` };
}

function priorDayWasMissed(day: number, logs: BoostLog[], participantId: unknown): boolean {
  if (day <= 1) return false;
  const previous = logs.find(log => Number(log.dayNumber ?? 0) === day - 1 && String(log.participantId) === String(participantId));
  if (!previous) return false;
  return !isPassingBoostLog(previous) || !Boolean(previous.dayComplete ?? previous.completed);
}

function proofBeforeNine(log: BoostLog): boolean {
  return String(log.exerciseProofUrl ?? "").trim().length > 4 && submittedAtTime(log) > 0 && submittedHour(log) >= 0 && submittedHour(log) < 9;
}

function combinedDepth(log: BoostLog): number {
  return String(log.reflectionText ?? "").trim().length + String(log.readTeachText ?? "").trim().length;
}

export function evaluateBoostWinners(params: {
  day: number;
  participants: BoostParticipant[];
  logs: BoostLog[];
  boostWins?: BoostWinLike[];
  activeBoosts?: BoostDefinition[];
}): BoostEvaluationAward[] {
  const day = Math.max(1, Math.floor(Number(params.day) || 1));
  const participants = params.participants ?? [];
  const logs = params.logs ?? [];
  const boostWins = params.boostWins ?? [];
  const activeBoosts = params.activeBoosts ?? getActiveBoostsForDay(day);
  const boostById = new Map(activeBoosts.map(boost => [boost.id, boost]));
  const dayLogs = logs.filter(log => Number(log.dayNumber ?? 0) === day);
  const passingLogs = dayLogs.filter(isPassingBoostLog);
  const rankedNow = rankParticipantsByPoints(participants, boostWins);
  const topThreeIds = new Set(rankedNow.slice(0, 3).map(participant => String(participant.id)));
  const awards: BoostEvaluationAward[] = [];

  for (const participant of participants) {
    const log = logForParticipant(dayLogs, participant.id);
    if (!log || !isPassingBoostLog(log)) continue;
    const completedRules = getCompletedRuleCount(log);
    const currentStreak = Number(participant.currentStreak ?? 0);

    const cleanSweep = boostById.get("clean_sweep");
    if (cleanSweep && completedRules >= 6 && currentStreak > 0 && currentStreak % 3 === 0) {
      awards.push(makeAward(cleanSweep, participant, `perfect 6/6 streak milestone reached on day ${currentStreak}.`));
    }

    const morningProof = boostById.get("morning_proof");
    if (morningProof && proofBeforeNine(log)) {
      awards.push(makeAward(morningProof, participant, "exercise proof was uploaded before 09:00."));
    }

    const bounceBack = boostById.get("bounce_back");
    if (bounceBack && priorDayWasMissed(day, logs, participant.id)) {
      awards.push(makeAward(bounceBack, participant, "completed today after a missed or incomplete previous day."));
    }

    const deepWork = boostById.get("deep_work");
    const depth = combinedDepth(log);
    if (deepWork && depth >= 250) {
      awards.push(makeAward(deepWork, participant, `${depth} characters of reflection and Read & Teach depth.`));
    }

    const pressurePlayer = boostById.get("pressure_player");
    if (pressurePlayer && Number(participant.livesRemaining ?? 4) <= 2) {
      awards.push(makeAward(pressurePlayer, participant, "completed the day while carrying two lives or fewer."));
    }

    const streakLock = boostById.get("streak_lock");
    if (streakLock && currentStreak > 0 && currentStreak % 7 === 0) {
      awards.push(makeAward(streakLock, participant, `locked a ${currentStreak}-day streak milestone.`));
    }
  }

  const mover = boostById.get("mover");
  if (mover) {
    const pastPoints = new Map<string, number>();
    for (const log of logs.filter(log => Number(log.dayNumber ?? 0) <= Math.max(1, day - 7))) {
      pastPoints.set(String(log.participantId), (pastPoints.get(String(log.participantId)) ?? 0) + Number(log.pointsAwarded ?? 0));
    }
    const pastRank = [...participants].sort((a, b) =>
      (pastPoints.get(String(b.id)) ?? 0) - (pastPoints.get(String(a.id)) ?? 0)
      || String(a.displayName ?? "").localeCompare(String(b.displayName ?? "")),
    );
    const moverWinner = rankedNow
      .filter(participant => !topThreeIds.has(String(participant.id)) && logForParticipant(passingLogs, participant.id))
      .map(participant => {
        const pastPosition = pastRank.findIndex(candidate => String(candidate.id) === String(participant.id));
        const nowPosition = rankedNow.findIndex(candidate => String(candidate.id) === String(participant.id));
        return { participant, climb: (pastPosition >= 0 ? pastPosition + 1 : rankedNow.length) - (nowPosition + 1) };
      })
      .filter(item => item.climb > 0)
      .sort((a, b) => b.climb - a.climb || String(a.participant.displayName ?? "").localeCompare(String(b.participant.displayName ?? "")))[0];
    if (moverWinner?.participant) {
      awards.push(makeAward(mover, moverWinner.participant, `climbed ${moverWinner.climb} leaderboard place${moverWinner.climb === 1 ? "" : "s"} over the seven-day view.`));
    }
  }

  const alreadyAwarded = new Set(boostWins
    .filter(win => Number(win.day ?? 0) === day)
    .map(win => `${win.boostId}:${win.userId}`));
  const pointsAlreadyAwardedToday = new Map<string, number>();
  for (const win of boostWins.filter(win => Number(win.day ?? 0) === day)) {
    const participantId = String(win.userId ?? "");
    pointsAlreadyAwardedToday.set(participantId, (pointsAlreadyAwardedToday.get(participantId) ?? 0) + Number(win.pointsAwarded ?? 0));
  }

  const emitted = new Set<string>();
  const cappedAwards: BoostEvaluationAward[] = [];
  for (const award of awards) {
    const participantId = String(award.participant.id);
    const key = `${award.boost.id}:${participantId}`;
    if (emitted.has(key) || alreadyAwarded.has(key) || hasBoostWinForDay(boostWins, participantId, award.boost.id, day)) continue;
    const currentDailyBoostPoints = pointsAlreadyAwardedToday.get(participantId) ?? 0;
    const remaining = DAILY_NAMED_BOOST_CAP - currentDailyBoostPoints;
    if (remaining <= 0) continue;
    const cappedPoints = Math.min(award.pointsAwarded, remaining);
    cappedAwards.push({ ...award, pointsAwarded: cappedPoints });
    pointsAlreadyAwardedToday.set(participantId, currentDailyBoostPoints + cappedPoints);
    emitted.add(key);
  }

  return cappedAwards;
}
