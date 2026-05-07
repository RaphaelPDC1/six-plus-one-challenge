export const BOOST_CHALLENGE_ID = 1;
export const BOOST_POINTS = 5;
export const BOOST_SLOT_COUNT = 3;

export type BoostTone = "green" | "gold" | "red" | "purple" | "white";

export type BoostDefinition = {
  id: string;
  name: string;
  icon: string;
  shortRule: string;
  antiGaming: string;
  tone: BoostTone;
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
  { id: "first_up", name: "FIRST UP", icon: "↑", shortRule: "First passing submission of the day", antiGaming: "Cannot win on consecutive days.", tone: "green" },
  { id: "streak_king", name: "STREAK KING", icon: "♚", shortRule: "Longest current streak outside first place", antiGaming: "Overall points leader is excluded.", tone: "gold" },
  { id: "hardest_day", name: "HARDEST DAY", icon: "◆", shortRule: "Longest exercise duration today", antiGaming: "Cannot win on consecutive days.", tone: "red" },
  { id: "survivor", name: "SURVIVOR", icon: "◈", shortRule: "Best daily score while on two lives or fewer", antiGaming: "Safe players cannot win this slot.", tone: "red" },
  { id: "mover", name: "MOVER", icon: "⇧", shortRule: "Biggest seven-day rank climb outside the top three", antiGaming: "Current top three excluded; requires a real climb.", tone: "purple" },
  { id: "depth", name: "DEPTH", icon: "✎", shortRule: "Longest reflection plus Read & Teach depth", antiGaming: "Needs at least 100 characters and a three-day cooldown.", tone: "gold" },
  { id: "clean_sweep", name: "CLEAN SWEEP", icon: "✓", shortRule: "Exactly one player completes all six rules", antiGaming: "If multiple people go 6/6, nobody wins.", tone: "green" },
  { id: "ghost_hunter", name: "GHOST HUNTER", icon: "◇", shortRule: "Best daily score among players who have not used Ghost Life", antiGaming: "Ghost Life users are excluded.", tone: "white" },
  { id: "early_bird", name: "EARLY BIRD", icon: "☀", shortRule: "First passing submission before 08:00", antiGaming: "Time locked before 08:00.", tone: "gold" },
  { id: "comeback_kid", name: "COMEBACK KID", icon: "↻", shortRule: "Strongest response from someone who has lost a life", antiGaming: "Requires at least one lost life.", tone: "red" },
  { id: "proof_machine", name: "PROOF MACHINE", icon: "◉", shortRule: "Highest proof rate across completed days", antiGaming: "Perfect proof with fewer than three logs is excluded.", tone: "green" },
  { id: "wardens_pick", name: "WARDEN'S PICK", icon: "W", shortRule: "Best reflection quality for the day", antiGaming: "Uses depth fallback unless AI confidence is high enough.", tone: "purple" },
  { id: "iron_week", name: "IRON WEEK", icon: "7", shortRule: "First day a player hits exactly seven greens in a row", antiGaming: "One award per streak run.", tone: "green" },
  { id: "night_owl", name: "NIGHT OWL", icon: "◐", shortRule: "Last passing submission between 20:00 and 23:59", antiGaming: "Cannot also be the same-day First Up winner.", tone: "purple" },
  { id: "dead_heat", name: "DEAD HEAT", icon: "=", shortRule: "Top tied total points at end of day", antiGaming: "Requires at least two players tied for first.", tone: "white" },
];

export function getActiveBoostsForDay(day: number): ActiveBoostSlot[] {
  const safeDay = Math.max(1, Math.floor(Number(day) || 1));
  const startIndex = ((safeDay - 1) * BOOST_SLOT_COUNT) % BOOST_SEQUENCE.length;
  return Array.from({ length: BOOST_SLOT_COUNT }, (_, index) => ({
    ...BOOST_SEQUENCE[(startIndex + index) % BOOST_SEQUENCE.length],
    slot: index + 1,
  }));
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

function submittedAtTime(log: BoostLog): number {
  const submitted = log.submittedAt ? new Date(log.submittedAt).getTime() : 0;
  return Number.isFinite(submitted) ? submitted : 0;
}

function submittedHour(log: BoostLog): number {
  const submitted = log.submittedAt ? new Date(log.submittedAt) : null;
  return submitted && Number.isFinite(submitted.getTime()) ? submitted.getHours() : -1;
}

function participantForLog(log: BoostLog, participants: BoostParticipant[]): BoostParticipant | undefined {
  return participants.find(participant => String(participant.id) === String(log.participantId));
}

function hasRecentBoostWin(boostWins: BoostWinLike[], participantId: unknown, boostId: string, day: number, lookbackDays: number): boolean {
  return (boostWins ?? []).some(win => String(win.userId) === String(participantId) && String(win.boostId) === boostId && Number(win.day ?? 0) >= day - lookbackDays && Number(win.day ?? 0) < day);
}

function rankParticipantsByPoints(participants: BoostParticipant[]): BoostParticipant[] {
  return [...participants].sort((a, b) => Number(b.totalPoints ?? 0) - Number(a.totalPoints ?? 0) || String(a.displayName ?? "").localeCompare(String(b.displayName ?? "")));
}

function makeAward(boost: BoostDefinition, participant: BoostParticipant, reason: string): BoostEvaluationAward {
  return { boost, participant, pointsAwarded: BOOST_POINTS, wardenNote: `${boost.name}: ${reason}` };
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
  const dayLogs = logs.filter(log => Number(log.dayNumber ?? 0) === day);
  const passingLogs = dayLogs.filter(isPassingBoostLog);
  const rankedNow = rankParticipantsByPoints(participants);
  const topThreeIds = new Set(rankedNow.slice(0, 3).map(participant => String(participant.id)));
  const firstUpParticipantId = (() => {
    const first = [...passingLogs].filter(log => submittedAtTime(log) > 0).sort((a, b) => submittedAtTime(a) - submittedAtTime(b))[0];
    return first ? String(first.participantId) : "";
  })();

  const awards: BoostEvaluationAward[] = [];

  for (const boost of activeBoosts) {
    if ((boostWins ?? []).some(win => Number(win.day ?? 0) === day && String(win.boostId) === boost.id)) continue;

    if (boost.id === "first_up") {
      const first = [...passingLogs].filter(log => submittedAtTime(log) > 0).sort((a, b) => submittedAtTime(a) - submittedAtTime(b))[0];
      const participant = first ? participantForLog(first, participants) : undefined;
      if (participant && !hasRecentBoostWin(boostWins, participant.id, boost.id, day, 1)) awards.push(makeAward(boost, participant, "first passing log through the gate without a consecutive-day repeat."));
    }

    if (boost.id === "streak_king") {
      const leaderId = String(rankedNow[0]?.id ?? "");
      const winner = [...participants].filter(p => String(p.id) !== leaderId && Number(p.currentStreak ?? 0) > 0).sort((a, b) => Number(b.currentStreak ?? 0) - Number(a.currentStreak ?? 0) || Number(b.totalPoints ?? 0) - Number(a.totalPoints ?? 0))[0];
      if (winner) awards.push(makeAward(boost, winner, `${winner.displayName} owns the longest non-leader streak.`));
    }

    if (boost.id === "hardest_day") {
      const log = [...dayLogs].filter(log => Number(log.exerciseDuration ?? 0) > 0).sort((a, b) => Number(b.exerciseDuration ?? 0) - Number(a.exerciseDuration ?? 0))[0];
      const participant = log ? participantForLog(log, participants) : undefined;
      if (participant && !hasRecentBoostWin(boostWins, participant.id, boost.id, day, 1)) awards.push(makeAward(boost, participant, `${log.exerciseDuration} minutes logged for the hardest verified training day.`));
    }

    if (boost.id === "survivor") {
      const candidate = [...passingLogs]
        .map(log => ({ log, participant: participantForLog(log, participants) }))
        .filter(item => item.participant && Number(item.participant.livesRemaining ?? 4) <= 2)
        .sort((a, b) => Number(b.log.pointsAwarded ?? 0) - Number(a.log.pointsAwarded ?? 0) || getCompletedRuleCount(b.log) - getCompletedRuleCount(a.log))[0];
      if (candidate?.participant) awards.push(makeAward(boost, candidate.participant, "best daily output from the danger-life bracket."));
    }

    if (boost.id === "mover") {
      const sevenDaysAgoLogs = logs.filter(log => Number(log.dayNumber ?? 0) <= Math.max(1, day - 7));
      const pastPoints = new Map<string, number>();
      for (const log of sevenDaysAgoLogs) pastPoints.set(String(log.participantId), (pastPoints.get(String(log.participantId)) ?? 0) + Number(log.pointsAwarded ?? 0));
      const pastRank = [...participants].sort((a, b) => (pastPoints.get(String(b.id)) ?? 0) - (pastPoints.get(String(a.id)) ?? 0));
      const winner = rankedNow
        .filter(p => !topThreeIds.has(String(p.id)))
        .map(p => ({ participant: p, climb: (pastRank.findIndex(x => String(x.id) === String(p.id)) + 1 || rankedNow.length) - (rankedNow.findIndex(x => String(x.id) === String(p.id)) + 1) }))
        .filter(item => item.climb > 0)
        .sort((a, b) => b.climb - a.climb || Number(b.participant.totalPoints ?? 0) - Number(a.participant.totalPoints ?? 0))[0]?.participant;
      if (winner) awards.push(makeAward(boost, winner, "biggest seven-day rank climb outside the top three."));
    }

    if (boost.id === "depth" || boost.id === "wardens_pick") {
      const candidate = [...dayLogs]
        .map(log => ({ log, participant: participantForLog(log, participants), depth: String(log.reflectionText ?? "").trim().length + String(log.readTeachText ?? "").trim().length }))
        .filter(item => item.participant && item.depth >= 100 && (boost.id === "wardens_pick" || !hasRecentBoostWin(boostWins, item.participant?.id, boost.id, day, 3)))
        .sort((a, b) => b.depth - a.depth || Number(b.log.pointsAwarded ?? 0) - Number(a.log.pointsAwarded ?? 0))[0];
      if (candidate?.participant) awards.push(makeAward(boost, candidate.participant, boost.id === "wardens_pick" ? "strongest Warden-readable reflection depth today." : `${candidate.depth} characters of honest reflection and Read & Teach depth.`));
    }

    if (boost.id === "clean_sweep") {
      const sixes = dayLogs.filter(log => getCompletedRuleCount(log) >= 6);
      const participant = sixes.length === 1 ? participantForLog(sixes[0], participants) : undefined;
      if (participant) awards.push(makeAward(boost, participant, "the only 6/6 clean sweep on the board."));
    }

    if (boost.id === "ghost_hunter") {
      const candidate = [...passingLogs]
        .map(log => ({ log, participant: participantForLog(log, participants) }))
        .filter(item => item.participant && !item.participant.ghostLifeUsed)
        .sort((a, b) => Number(b.log.pointsAwarded ?? 0) - Number(a.log.pointsAwarded ?? 0) || getCompletedRuleCount(b.log) - getCompletedRuleCount(a.log))[0];
      if (candidate?.participant) awards.push(makeAward(boost, candidate.participant, "best day from the no-Ghost-Life bracket."));
    }

    if (boost.id === "early_bird") {
      const early = [...passingLogs].filter(log => submittedAtTime(log) > 0 && submittedHour(log) >= 0 && submittedHour(log) < 8).sort((a, b) => submittedAtTime(a) - submittedAtTime(b))[0];
      const participant = early ? participantForLog(early, participants) : undefined;
      if (participant) awards.push(makeAward(boost, participant, "first valid pass before 08:00."));
    }

    if (boost.id === "comeback_kid") {
      const candidate = [...passingLogs]
        .map(log => ({ log, participant: participantForLog(log, participants) }))
        .filter(item => item.participant && Number(item.participant.livesRemaining ?? 4) < 4)
        .sort((a, b) => Number(b.log.pointsAwarded ?? 0) - Number(a.log.pointsAwarded ?? 0) || Number(a.participant?.livesRemaining ?? 4) - Number(b.participant?.livesRemaining ?? 4))[0];
      if (candidate?.participant) awards.push(makeAward(boost, candidate.participant, "best response from a player carrying life-loss pressure."));
    }

    if (boost.id === "proof_machine") {
      const proofRows = participants.map(participant => {
        const owned = logs.filter(log => String(log.participantId) === String(participant.id) && Number(log.dayNumber ?? 0) <= day && isPassingBoostLog(log));
        const proofs = owned.filter(log => String(log.exerciseProofUrl ?? "").trim().length > 4).length;
        return { participant, ownedCount: owned.length, rate: owned.length ? proofs / owned.length : 0 };
      }).filter(row => row.ownedCount >= 3 || row.rate < 1);
      const winner = proofRows.sort((a, b) => b.rate - a.rate || b.ownedCount - a.ownedCount)[0];
      if (winner?.participant && winner.rate > 0) awards.push(makeAward(boost, winner.participant, `${Math.round(winner.rate * 100)}% proof rate across completed days.`));
    }

    if (boost.id === "iron_week") {
      const winner = participants.find(participant => Number(participant.currentStreak ?? 0) === 7 && !hasRecentBoostWin(boostWins, participant.id, boost.id, day, 6));
      if (winner) awards.push(makeAward(boost, winner, "exactly seven green days in a row, with no duplicate award for the streak run."));
    }

    if (boost.id === "night_owl") {
      const late = [...passingLogs]
        .filter(log => submittedAtTime(log) > 0 && submittedHour(log) >= 20 && submittedHour(log) <= 23 && String(log.participantId) !== firstUpParticipantId)
        .sort((a, b) => submittedAtTime(b) - submittedAtTime(a))[0];
      const participant = late ? participantForLog(late, participants) : undefined;
      if (participant) awards.push(makeAward(boost, participant, "last valid pass in the 20:00-23:59 window without doubling as First Up."));
    }

    if (boost.id === "dead_heat") {
      const top = Number(rankedNow[0]?.totalPoints ?? 0);
      const tied = rankedNow.filter(participant => Number(participant.totalPoints ?? 0) === top && top > 0);
      if (tied.length >= 2) {
        for (const participant of tied) awards.push(makeAward(boost, participant, "shares the top points total at the close of the day."));
      }
    }
  }

  const seen = new Set<string>();
  return awards.filter(award => {
    const key = `${award.boost.id}:${award.participant.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
