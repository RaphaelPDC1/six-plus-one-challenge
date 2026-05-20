export const BOOST_CHALLENGE_ID = 1;
export const BOOST_POINTS = 8;
export const BOOST_SLOT_COUNT = 3; // 3 rotating boosts active per day
export const DAILY_NAMED_BOOST_CAP = 35; // raised to match new higher-value boosts

export type BoostTone = "green" | "gold" | "red" | "purple" | "white";

export type BoostDefinition = {
  id: string;
  name: string;
  icon: string;
  shortRule: string;
  antiGaming: string;
  tone: BoostTone;
  pointsAwarded: number;
  alwaysActive?: boolean; // never rotates out
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

// ─── Always-active boosts (run every day, never rotate out) ───────────────────
export const ALWAYS_ACTIVE_BOOSTS: BoostDefinition[] = [
  {
    id: "mover",
    name: "MOVER",
    icon: "⇧",
    shortRule: "Biggest leaderboard climb in 7 days — 1 winner per day",
    antiGaming: "Current top 3 excluded. Requires a real rank climb over the previous 7-day view. Only the biggest climber wins.",
    tone: "gold",
    pointsAwarded: 12,
    alwaysActive: true,
  },
  {
    id: "bounce_back",
    name: "BOUNCE BACK",
    icon: "↻",
    shortRule: "Full 6/6 day after a missed or incomplete day",
    antiGaming: "Requires an actual previous-day log that was incomplete. New-player onboarding gaps do not count.",
    tone: "red",
    pointsAwarded: 10,
    alwaysActive: true,
  },
  {
    id: "comeback_kid",
    name: "COMEBACK KID",
    icon: "★",
    shortRule: "First full 6/6 day after losing a life",
    antiGaming: "Requires a life-loss event on record before this day. Only fires once per life lost.",
    tone: "red",
    pointsAwarded: 10,
    alwaysActive: true,
  },
  {
    id: "double_down",
    name: "DOUBLE DOWN",
    icon: "⚡",
    shortRule: "Ghost Life used AND still hits 6/6 same day",
    antiGaming: "Requires ghostLifeUsed flag AND all 6 rules complete on the same day. Ghost Life must have been activated on this day.",
    tone: "purple",
    pointsAwarded: 15,
    alwaysActive: true,
  },
];

// ─── Rotating pool (3 drawn per day from this list) ───────────────────────────
export const ROTATING_BOOSTS: BoostDefinition[] = [
  {
    id: "teaching_moment",
    name: "TEACHING MOMENT",
    icon: "📖",
    shortRule: "Read & Teach text ≥ 100 words — actually taught something",
    antiGaming: "Word count checked server-side. Padding with repeated words is flagged. Must be coherent prose.",
    tone: "purple",
    pointsAwarded: 8,
  },
  {
    id: "deep_reflection",
    name: "DEEP REFLECTION",
    icon: "✎",
    shortRule: "Reflection text ≥ 120 words — went beyond surface journalling",
    antiGaming: "Word count checked server-side. Must be a single coherent entry, not repeated sentences.",
    tone: "purple",
    pointsAwarded: 8,
  },
  {
    id: "proof_beast",
    name: "PROOF BEAST",
    icon: "🎥",
    shortRule: "Exercise proof is a video (not just a photo)",
    antiGaming: "Proof URL must resolve to a video file type (mp4, mov, webm). Photo uploads do not qualify.",
    tone: "green",
    pointsAwarded: 8,
  },
  {
    id: "lone_wolf",
    name: "LONE WOLF",
    icon: "🐺",
    shortRule: "Only participant to complete all 6 rules that day",
    antiGaming: "Evaluated at end of day. If more than one person hits 6/6, no one wins this boost.",
    tone: "white",
    pointsAwarded: 10,
  },
  {
    id: "pressure_player",
    name: "PRESSURE PLAYER",
    icon: "◈",
    shortRule: "Locks in with less than 90 minutes before the deadline",
    antiGaming: "Submission timestamp must be within 90 minutes of the 23:59 deadline. Must be a full lock-in, not a save.",
    tone: "red",
    pointsAwarded: 10,
  },
  {
    id: "underdog",
    name: "UNDERDOG",
    icon: "🥊",
    shortRule: "Bottom-3 leaderboard player completes 6/6",
    antiGaming: "Rank evaluated at day start. Must be in the bottom 3 at the time of submission. Ties broken by name.",
    tone: "gold",
    pointsAwarded: 12,
  },
  {
    id: "rival_beater",
    name: "RIVAL BEATER",
    icon: "⚔",
    shortRule: "Outscores the person directly above you on the board that day",
    antiGaming: "Daily points only (no cumulative). Must complete 6/6. The person above must also have logged that day.",
    tone: "gold",
    pointsAwarded: 10,
  },
  {
    id: "iron_will",
    name: "IRON WILL",
    icon: "🔩",
    shortRule: "6/6 on a day where 3 or more others missed",
    antiGaming: "Requires at least 3 other participants with incomplete or missing logs that day. Evaluated at end of day.",
    tone: "green",
    pointsAwarded: 10,
  },
  {
    id: "clean_sweep",
    name: "CLEAN SWEEP",
    icon: "✓",
    shortRule: "All 6 rules done — everyone who completes 6/6 qualifies",
    antiGaming: "No exclusions. All participants who hit 6/6 on this day receive the boost.",
    tone: "green",
    pointsAwarded: 6,
  },
  {
    id: "morning_proof",
    name: "MORNING PROOF",
    icon: "☀",
    shortRule: "First to submit exercise proof before 09:00",
    antiGaming: "Requires an actual exercise proof upload timestamped before 09:00. Only the first person qualifies.",
    tone: "gold",
    pointsAwarded: 6,
  },
  {
    id: "philosopher",
    name: "PHILOSOPHER",
    icon: "💭",
    shortRule: "Reflection text contains a question — shows genuine inquiry",
    antiGaming: "Must contain at least one question mark in a meaningful sentence. Rhetorical filler questions are excluded by word count (≥ 60 words required).",
    tone: "purple",
    pointsAwarded: 10,
  },
  {
    id: "the_teacher",
    name: "THE TEACHER",
    icon: "🎓",
    shortRule: "Read & Teach text references a specific book, author, or concept by name",
    antiGaming: "Must contain a proper noun (capitalised name or title). Generic phrases like 'a book I read' do not qualify.",
    tone: "purple",
    pointsAwarded: 12,
  },
  {
    id: "the_standard",
    name: "THE STANDARD",
    icon: "🏆",
    shortRule: "6/6 for 3 consecutive days — resets if broken",
    antiGaming: "Streak must be unbroken. Missing a day resets the counter. Pays on days 3, 6, 9 etc. of unbroken 6/6.",
    tone: "green",
    pointsAwarded: 8,
  },
];

// ─── All boosts combined (for display/lookup) ─────────────────────────────────
export const ALL_BOOSTS: BoostDefinition[] = [...ALWAYS_ACTIVE_BOOSTS, ...ROTATING_BOOSTS];

// ─── Deterministic daily rotation (seeded by day number) ─────────────────────
export function getActiveBoostsForDay(day: number): ActiveBoostSlot[] {
  const alwaysOn = ALWAYS_ACTIVE_BOOSTS.map((boost, i) => ({ ...boost, slot: i + 1 }));

  // Deterministic shuffle using day as seed — same day always gives same 3 boosts
  const seed = Math.max(1, Math.floor(Number(day) || 1));
  const shuffled = [...ROTATING_BOOSTS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = ((seed * 1664525 + 1013904223) % (i + 1) + (i + 1)) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const rotating = shuffled.slice(0, BOOST_SLOT_COUNT).map((boost, i) => ({
    ...boost,
    slot: ALWAYS_ACTIVE_BOOSTS.length + i + 1,
  }));

  return [...alwaysOn, ...rotating];
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

// ─── Internal helpers ─────────────────────────────────────────────────────────

function submittedAtTime(log: BoostLog | null | undefined): number {
  const submitted = log?.submittedAt ? new Date(log.submittedAt).getTime() : 0;
  return Number.isFinite(submitted) ? submitted : 0;
}

function submittedHour(log: BoostLog | null | undefined): number {
  const submitted = log?.submittedAt ? new Date(log.submittedAt) : null;
  return submitted && Number.isFinite(submitted.getTime()) ? submitted.getUTCHours() : -1;
}

function submittedMinutesBeforeMidnight(log: BoostLog | null | undefined): number {
  const submitted = log?.submittedAt ? new Date(log.submittedAt) : null;
  if (!submitted || !Number.isFinite(submitted.getTime())) return 9999;
  const minutesIntoDay = submitted.getUTCHours() * 60 + submitted.getUTCMinutes();
  return 1439 - minutesIntoDay; // minutes before 23:59
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

function isVideoProof(log: BoostLog): boolean {
  const url = String(log.exerciseProofUrl ?? "").toLowerCase();
  return url.length > 4 && (url.includes(".mp4") || url.includes(".mov") || url.includes(".webm") || url.includes("video"));
}

function wordCount(text: string): number {
  return String(text ?? "").trim().split(/\s+/).filter(Boolean).length;
}

function containsQuestion(text: string): boolean {
  const sentences = String(text ?? "").split(/[.!?]/);
  return sentences.some(s => s.includes("?") && wordCount(s) >= 4);
}

function containsProperNoun(text: string): boolean {
  // Check for capitalised words that aren't at the start of a sentence
  const words = String(text ?? "").split(/\s+/);
  return words.some((word, i) => i > 0 && /^[A-Z][a-z]{2,}/.test(word));
}

// ─── Main evaluation function ─────────────────────────────────────────────────
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
  const perfectLogs = dayLogs.filter(log => getCompletedRuleCount(log) >= 6);
  const rankedNow = rankParticipantsByPoints(participants, boostWins);
  const topThreeIds = new Set(rankedNow.slice(0, 3).map(participant => String(participant.id)));
  const bottomThreeIds = new Set(rankedNow.slice(-3).map(participant => String(participant.id)));
  const awards: BoostEvaluationAward[] = [];

  // ─── Per-participant boosts ──────────────────────────────────────────────────
  for (const participant of participants) {
    const log = logForParticipant(dayLogs, participant.id);
    if (!log || !isPassingBoostLog(log)) continue;
    const completedRules = getCompletedRuleCount(log);
    const currentStreak = Number(participant.currentStreak ?? 0);

    // BOUNCE BACK — 6/6 after a missed day
    const bounceBack = boostById.get("bounce_back");
    if (bounceBack && completedRules >= 6 && priorDayWasMissed(day, logs, participant.id)) {
      awards.push(makeAward(bounceBack, participant, "completed 6/6 today after a missed or incomplete previous day."));
    }

    // COMEBACK KID — first 6/6 after losing a life
    const comebackKid = boostById.get("comeback_kid");
    if (comebackKid && completedRules >= 6) {
      const lifeLossLogs = logs.filter(l =>
        String(l.participantId) === String(participant.id) &&
        Number(l.dayNumber ?? 0) < day &&
        Boolean(l.lifeLost ?? false)
      );
      const alreadyWonComeback = boostWins.some(w =>
        String(w.userId) === String(participant.id) && String(w.boostId) === "comeback_kid"
      );
      if (lifeLossLogs.length > 0 && !alreadyWonComeback) {
        awards.push(makeAward(comebackKid, participant, "first 6/6 day after losing a life."));
      }
    }

    // DOUBLE DOWN — Ghost Life used AND 6/6 same day
    const doubleDown = boostById.get("double_down");
    if (doubleDown && completedRules >= 6 && Boolean(participant.ghostLifeUsed)) {
      awards.push(makeAward(doubleDown, participant, "used Ghost Life and still completed 6/6 on the same day."));
    }

    // TEACHING MOMENT — Read & Teach ≥ 100 words
    const teachingMoment = boostById.get("teaching_moment");
    if (teachingMoment && wordCount(log.readTeachText) >= 100) {
      awards.push(makeAward(teachingMoment, participant, `${wordCount(log.readTeachText)}-word Read & Teach entry.`));
    }

    // DEEP REFLECTION — Reflection ≥ 120 words
    const deepReflection = boostById.get("deep_reflection");
    if (deepReflection && wordCount(log.reflectionText) >= 120) {
      awards.push(makeAward(deepReflection, participant, `${wordCount(log.reflectionText)}-word reflection entry.`));
    }

    // PROOF BEAST — exercise proof is a video
    const proofBeast = boostById.get("proof_beast");
    if (proofBeast && isVideoProof(log)) {
      awards.push(makeAward(proofBeast, participant, "submitted a video as exercise proof."));
    }

    // PRESSURE PLAYER — locked in within 90 mins of midnight
    const pressurePlayer = boostById.get("pressure_player");
    if (pressurePlayer && completedRules >= 6 && submittedMinutesBeforeMidnight(log) <= 90) {
      awards.push(makeAward(pressurePlayer, participant, `locked in with ${submittedMinutesBeforeMidnight(log)} minutes to midnight.`));
    }

    // UNDERDOG — bottom-3 player completes 6/6
    const underdog = boostById.get("underdog");
    if (underdog && completedRules >= 6 && bottomThreeIds.has(String(participant.id))) {
      awards.push(makeAward(underdog, participant, "completed 6/6 from the bottom 3 of the leaderboard."));
    }

    // RIVAL BEATER — outscores the person directly above on the board that day
    const rivalBeater = boostById.get("rival_beater");
    if (rivalBeater && completedRules >= 6) {
      const myRank = rankedNow.findIndex(p => String(p.id) === String(participant.id));
      if (myRank > 0) {
        const rival = rankedNow[myRank - 1];
        const rivalLog = logForParticipant(dayLogs, rival.id);
        const myDayPts = Number(log.pointsAwarded ?? 0);
        const rivalDayPts = Number(rivalLog?.pointsAwarded ?? 0);
        if (rivalLog && myDayPts > rivalDayPts) {
          awards.push(makeAward(rivalBeater, participant, `outscored ${rival.displayName ?? "rival"} (${myDayPts} vs ${rivalDayPts} pts) today.`));
        }
      }
    }

    // PHILOSOPHER — reflection contains a genuine question
    const philosopher = boostById.get("philosopher");
    if (philosopher && wordCount(log.reflectionText) >= 60 && containsQuestion(log.reflectionText)) {
      awards.push(makeAward(philosopher, participant, "reflection contained a genuine question — showed real inquiry."));
    }

    // THE TEACHER — Read & Teach references a specific book/author/concept
    const theTeacher = boostById.get("the_teacher");
    if (theTeacher && wordCount(log.readTeachText) >= 40 && containsProperNoun(log.readTeachText)) {
      awards.push(makeAward(theTeacher, participant, "Read & Teach referenced a specific book, author, or concept by name."));
    }

    // THE STANDARD — 6/6 for 3 consecutive days (streak divisible by 3)
    const theStandard = boostById.get("the_standard");
    if (theStandard && completedRules >= 6 && currentStreak > 0 && currentStreak % 3 === 0) {
      awards.push(makeAward(theStandard, participant, `maintained 6/6 for ${currentStreak} consecutive days.`));
    }

    // CLEAN SWEEP — all 6 rules done (everyone eligible)
    const cleanSweep = boostById.get("clean_sweep");
    if (cleanSweep && completedRules >= 6) {
      awards.push(makeAward(cleanSweep, participant, "completed all 6 rules today."));
    }
  }

  // ─── Competitive boosts (evaluated across all participants) ─────────────────

  // MORNING PROOF — first to submit proof before 09:00
  const morningProof = boostById.get("morning_proof");
  if (morningProof) {
    const earlyProofs = dayLogs
      .filter(log => proofBeforeNine(log))
      .sort((a, b) => submittedAtTime(a) - submittedAtTime(b));
    if (earlyProofs.length > 0) {
      const winner = participantForLog(earlyProofs[0], participants);
      if (winner) {
        awards.push(makeAward(morningProof, winner, "first to submit exercise proof before 09:00."));
      }
    }
  }

  // LONE WOLF — only person to complete 6/6 that day
  const loneWolf = boostById.get("lone_wolf");
  if (loneWolf && perfectLogs.length === 1) {
    const winner = participantForLog(perfectLogs[0], participants);
    if (winner) {
      awards.push(makeAward(loneWolf, winner, "the only participant to complete all 6 rules today."));
    }
  }

  // IRON WILL — 6/6 on a day where 3+ others missed
  const ironWill = boostById.get("iron_will");
  if (ironWill) {
    const missedCount = participants.filter(p => {
      const log = logForParticipant(dayLogs, p.id);
      return !log || !isPassingBoostLog(log);
    }).length;
    if (missedCount >= 3) {
      for (const log of perfectLogs) {
        const winner = participantForLog(log, participants);
        if (winner) {
          awards.push(makeAward(ironWill, winner, `completed 6/6 on a day when ${missedCount} others missed.`));
        }
      }
    }
  }

  // MOVER — biggest leaderboard climb in 7 days (top 3 excluded)
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
      awards.push(makeAward(mover, moverWinner.participant, `climbed ${moverWinner.climb} leaderboard place${moverWinner.climb === 1 ? "" : "s"} over the 7-day view.`));
    }
  }

  // ─── Dedup and cap ────────────────────────────────────────────────────────────
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
