import fs from 'node:fs';

function patchFile(path, patches) {
  let source = fs.readFileSync(path, 'utf8');
  for (const { find, replace, label } of patches) {
    if (!source.includes(find)) {
      throw new Error(`Patch marker not found in ${path}: ${label}`);
    }
    source = source.replace(find, replace);
  }
  fs.writeFileSync(path, source);
}

patchFile('server/warden/challengeState.ts', [
  {
    label: 'boost imports',
    find: `import { and, desc, gte, lte } from "drizzle-orm";\nimport { getDb } from "../db";\nimport {\n  participants,\n  dailyLogs,\n  paymentEvents,\n  whatsappChatHistory,\n} from "../../drizzle/schema";\nimport { getMaxMessagesForDramaScore } from "./organicScheduler";`,
    replace: `import { and, desc, gte, lte } from "drizzle-orm";\nimport { getDb } from "../db";\nimport {\n  participants,\n  dailyLogs,\n  paymentEvents,\n  whatsappChatHistory,\n  boostWins,\n} from "../../drizzle/schema";\nimport { BOOST_POINTS, getActiveBoostsForDay } from "../../shared/boostSystem";\nimport { getMaxMessagesForDramaScore } from "./organicScheduler";`,
  },
  {
    label: 'challenge state boost interface',
    find: `  before_midday_full_rule_completions: Array<{\n    participant_name: string;\n    timestamp: string;\n  }>;\n  daily_drama_score: number;`,
    replace: `  before_midday_full_rule_completions: Array<{\n    participant_name: string;\n    timestamp: string;\n  }>;\n  boost_context: {\n    today_boosts: Array<{\n      boost_id: string;\n      boost_name: string;\n      boost_icon: string;\n      slot: number;\n      anti_gaming_rule: string;\n      status: "claimed" | "unclaimed";\n      winner_name: string | null;\n      points_awarded: number;\n      warden_note: string | null;\n    }>;\n    today_winners: Array<{\n      participant_name: string;\n      boost_name: string;\n      boost_icon: string;\n      points_awarded: number;\n      warden_note: string | null;\n    }>;\n    player_boost_history: Array<{\n      participant_name: string;\n      total_boost_wins: number;\n      total_boost_points: number;\n      latest_boost: string | null;\n    }>;\n    group_boost_leader: { participant_name: string; total_boost_wins: number; total_boost_points: number } | null;\n    rival_boost_wins: Array<{ participant_name: string; total_boost_wins: number; total_boost_points: number }>;\n    trigger_events: string[];\n    unclaimed_boosts: string[];\n  };\n  daily_drama_score: number;`,
  },
  {
    label: 'boost wins query',
    find: `  const recentMessages = await db\n    .select()\n    .from(whatsappChatHistory)\n    .where(gte(whatsappChatHistory.messageTimestamp, twelveHoursAgo))\n    .orderBy(desc(whatsappChatHistory.messageTimestamp))\n    .limit(50);\n`,
    replace: `  const recentMessages = await db\n    .select()\n    .from(whatsappChatHistory)\n    .where(gte(whatsappChatHistory.messageTimestamp, twelveHoursAgo))\n    .orderBy(desc(whatsappChatHistory.messageTimestamp))\n    .limit(50);\n\n  const recentBoostWins = await db\n    .select()\n    .from(boostWins)\n    .where(lte(boostWins.day, challengeDay))\n    .orderBy(desc(boostWins.awardedAt))\n    .limit(500);\n`,
  },
  {
    label: 'boost context derivation before drama',
    find: `  const uniqueLateNightLoggers = new Set(lateLogsToday.map((log) => log.participant_name)).size;\n  const uniqueBeforeMiddayCompletions = new Set(beforeMiddayFullRuleCompletions.map((log) => log.participant_name)).size;`,
    replace: `  const todaysActiveBoosts = getActiveBoostsForDay(challengeDay);\n  const todayBoostWins = recentBoostWins.filter((win) => Number(win.day ?? 0) === challengeDay);\n  const participantBoostSummary = allParticipants.map((participant) => {\n    const wins = recentBoostWins.filter((win) => String(win.userId) === String(participant.id));\n    const latest = wins.slice().sort((a, b) => b.awardedAt.getTime() - a.awardedAt.getTime())[0];\n    return {\n      participant_name: participant.displayName,\n      total_boost_wins: wins.length,\n      total_boost_points: wins.reduce((sum, win) => sum + Number(win.pointsAwarded ?? BOOST_POINTS), 0),\n      latest_boost: latest?.boostName ?? null,\n    };\n  });\n  const groupBoostLeader = participantBoostSummary\n    .filter((item) => item.total_boost_wins > 0)\n    .sort((a, b) => b.total_boost_points - a.total_boost_points || b.total_boost_wins - a.total_boost_wins)[0] ?? null;\n  const boostContextTodayBoosts = todaysActiveBoosts.map((boost) => {\n    const win = todayBoostWins.find((item) => item.boostId === boost.id);\n    return {\n      boost_id: boost.id,\n      boost_name: boost.name,\n      boost_icon: boost.icon,\n      slot: boost.slot,\n      anti_gaming_rule: boost.antiGaming,\n      status: win ? "claimed" as const : "unclaimed" as const,\n      winner_name: win ? participantNameById(allParticipants, win.userId) : null,\n      points_awarded: win ? Number(win.pointsAwarded ?? BOOST_POINTS) : BOOST_POINTS,\n      warden_note: win?.wardenNote ?? null,\n    };\n  });\n  const boostTriggerEvents = [\n    ...todayBoostWins.map((win) => {\n      const name = participantNameById(allParticipants, win.userId);\n      return `${name} won ${win.boostName.toUpperCase()} for +${Number(win.pointsAwarded ?? BOOST_POINTS)}: ${win.wardenNote ?? "boost claimed"}`;\n    }),\n    ...participantBoostSummary.filter((item) => item.total_boost_wins >= 3).map((item) => `${item.participant_name} has ${item.total_boost_wins} total boost wins`),\n    ...(todayBoostWins.length >= 2 ? [`${todayBoostWins.length} boosts have been claimed today`] : []),\n    ...(boostContextTodayBoosts.some((boost) => boost.status === "unclaimed") ? [`Unclaimed boost slots remain: ${boostContextTodayBoosts.filter((boost) => boost.status === "unclaimed").map((boost) => boost.boost_name).join(", ")}`] : []),\n  ];\n  const boostContext = {\n    today_boosts: boostContextTodayBoosts,\n    today_winners: todayBoostWins.map((win) => ({\n      participant_name: participantNameById(allParticipants, win.userId),\n      boost_name: win.boostName,\n      boost_icon: win.boostIcon,\n      points_awarded: Number(win.pointsAwarded ?? BOOST_POINTS),\n      warden_note: win.wardenNote ?? null,\n    })),\n    player_boost_history: participantBoostSummary,\n    group_boost_leader: groupBoostLeader,\n    rival_boost_wins: participantBoostSummary\n      .filter((item) => item.total_boost_wins > 0)\n      .sort((a, b) => b.total_boost_points - a.total_boost_points || b.total_boost_wins - a.total_boost_wins)\n      .slice(0, 5),\n    trigger_events: boostTriggerEvents,\n    unclaimed_boosts: boostContextTodayBoosts.filter((boost) => boost.status === "unclaimed").map((boost) => boost.boost_name),\n  };\n\n  const uniqueLateNightLoggers = new Set(lateLogsToday.map((log) => log.participant_name)).size;\n  const uniqueBeforeMiddayCompletions = new Set(beforeMiddayFullRuleCompletions.map((log) => log.participant_name)).size;`,
  },
  {
    label: 'drama boost events',
    find: `    before_midday_completions: uniqueBeforeMiddayCompletions,\n  };`,
    replace: `    before_midday_completions: uniqueBeforeMiddayCompletions,\n    boost_events: Math.min(6, todayBoostWins.length * 2 + (boostContext.unclaimed_boosts.length > 0 ? 1 : 0)),\n  };`,
  },
  {
    label: 'return boost context',
    find: `    before_midday_full_rule_completions: beforeMiddayFullRuleCompletions,\n    daily_drama_score: dailyDramaScore,`,
    replace: `    before_midday_full_rule_completions: beforeMiddayFullRuleCompletions,\n    boost_context: boostContext,\n    daily_drama_score: dailyDramaScore,`,
  },
]);

patchFile('server/warden/messageGenerator.ts', [
  {
    label: 'prompt boost access',
    find: `- drama_score_breakdown: how the score was calculated, including themes, bests, deep insights, silent returns, Ghost Life signals, and early completions\n`,
    replace: `- boost_context: active +5 boost slots, claimed/unclaimed state, today's winners, each player's boost history, group boost leader, rival boost wins, boost trigger events, and unclaimed boost slots\n- drama_score_breakdown: how the score was calculated, including themes, bests, deep insights, silent returns, Ghost Life signals, early completions, and boost events\n`,
  },
  {
    label: 'prompt boost triggers',
    find: `8. Someone hits a personal best, returns after silence, or finishes all six rules before midday\n9. Group completion rate drops significantly week on week\n10. Someone completes or appears to complete a Ghost Life Double-Down Day\n11. The entire group completes a day with no life losses — rare, worth noting\n`,
    replace: `8. Someone hits a personal best, returns after silence, or finishes all six rules before midday\n9. Group completion rate drops significantly week on week\n10. Someone completes or appears to complete a Ghost Life Double-Down Day\n11. The entire group completes a day with no life losses — rare, worth noting\n12. A boost is won, one player wins multiple boosts in a day, someone builds a streak of boost wins, Survivor / Warden's Pick / Iron Week / Dead Heat fires, the boost leader changes, or a slot remains unclaimed late in the day\n`,
  },
  {
    label: 'prompt boost style guidance',
    find: `The Warden should never feel like a cron job. Do not write as if you are checking in on a schedule. Write as if you have been watching all day and have chosen this moment because the data earned it. Use the actual writing, exercise effort, timing, shared themes, silence, returns, and pattern changes in CHALLENGE_STATE to sound like a presence that understands the room, not a bot reciting counters.\n`,
    replace: `The Warden should never feel like a cron job. Do not write as if you are checking in on a schedule. Write as if you have been watching all day and have chosen this moment because the data earned it. Use the actual writing, exercise effort, timing, shared themes, silence, returns, boost wins, unclaimed boost slots, and pattern changes in CHALLENGE_STATE to sound like a presence that understands the room, not a bot reciting counters.\n\nWhen boost_context contains events, reference the display boost names exactly when useful — FIRST UP, STREAK KING, SURVIVOR, WARDEN'S PICK, IRON WEEK, DEAD HEAT, or the supplied boost_name. Treat boost wins with the same sharpness as life events: earned, visible, and not motivational. Never invent a boost winner or imply a +5 has been awarded unless boost_context says it was claimed.\n`,
  },
]);

patchFile('client/src/pages/Home.tsx', [
  {
    label: 'overview boost totals',
    find: `  const todayBoostWins = boostWins.filter((win: any) => Number(win.day ?? 0) === currentDay);\n  const ownBoostWins = boostWins.filter((win: any) => String(win.userId) === String(currentParticipantId));`,
    replace: `  const todayBoostWins = boostWins.filter((win: any) => Number(win.day ?? 0) === currentDay);\n  const ownBoostWins = boostWins.filter((win: any) => String(win.userId) === String(currentParticipantId));\n  const ownTotalBoostPoints = ownBoostWins.reduce((sum: number, win: any) => sum + Number(win.pointsAwarded ?? 5), 0);\n  const boostLeaderboard = participants\n    .map((participant: any) => {\n      const wins = boostWins.filter((win: any) => String(win.userId) === String(participant.id));\n      return {\n        participant,\n        wins,\n        totalBoostPoints: wins.reduce((sum: number, win: any) => sum + Number(win.pointsAwarded ?? 5), 0),\n      };\n    })\n    .filter((entry: any) => entry.wins.length > 0)\n    .sort((a: any, b: any) => b.totalBoostPoints - a.totalBoostPoints || b.wins.length - a.wins.length);\n  const topBoostEarner = boostLeaderboard[0];\n  const unclaimedTodayBoosts = activeBoosts.filter((boost: any) => !todayBoostWins.some((win: any) => win.boostId === boost.id));`,
  },
  {
    label: 'overview metric card boost leader',
    find: `        <OverviewMetricCard label="Ops drag" value={pendingPayments + pendingRewards} detail={`${pendingPayments} payments · ${pendingRewards} rewards · ${totalLivesLost} lives lost`} tone={pendingPayments + pendingRewards ? "purple" : "white"} />`,
    replace: `        <OverviewMetricCard label="Top boost earner" value={topBoostEarner ? `+${topBoostEarner.totalBoostPoints}` : 0} detail={topBoostEarner ? `${topBoostEarner.participant.displayName} · ${topBoostEarner.wins.length} wins` : "No boost wins banked yet"} tone={topBoostEarner ? "gold" : "white"} />`,
  },
  {
    label: 'active boost footer',
    find: `          <p className="mt-3 text-[9px] font-black uppercase tracking-[0.15em] text-[#777]">Your banked boosts: {ownBoostWins.length}. Base scores stay untouched.</p>`,
    replace: `          <p className="mt-3 text-[9px] font-black uppercase tracking-[0.15em] text-[#777]">Your banked boosts: {ownBoostWins.length} wins · +{ownTotalBoostPoints} additive. Base scores stay untouched.</p>\n          {unclaimedTodayBoosts.length > 0 && <p className="mt-2 rounded-full border border-[#C8A96E]/45 bg-[#16130B] px-3 py-2 text-[9px] font-black uppercase tracking-[0.14em] text-[#C8A96E]" data-testid="unclaimed-boost-alert">Unclaimed windows still open: {unclaimedTodayBoosts.map((boost: any) => boost.name).join(" · ")}</p>}`,
  },
  {
    label: 'rivalry boost count',
    find: `                {rival && <p className="mt-3 text-[10px] font-black uppercase leading-5 tracking-[0.12em] text-[#BDBDBD]">{rival.statusLine}</p>}`,
    replace: `                {rival && <p className="mt-3 text-[10px] font-black uppercase leading-5 tracking-[0.12em] text-[#BDBDBD]">{rival.statusLine}</p>}\n                {rival && <p className="mt-2 text-[9px] font-black uppercase tracking-[0.15em] text-[#C8A96E]">Boost wins: {boostWins.filter((win: any) => String(win.userId) === String(rival.id)).length} · You: {ownBoostWins.length}</p>}`,
  },
  {
    label: 'leaderboard boost locals',
    find: `  const activeBoosts = snapshot?.activeBoosts ?? [];\n  const todayBoostWins = (snapshot?.boostWins ?? []).filter((win: any) => Number(win.day ?? 0) === Number(currentDay));`,
    replace: `  const activeBoosts = snapshot?.activeBoosts ?? [];\n  const allBoostWins = snapshot?.boostWins ?? [];\n  const todayBoostWins = allBoostWins.filter((win: any) => Number(win.day ?? 0) === Number(currentDay));`,
  },
  {
    label: 'leaderboard row boost stats',
    find: `          const eliminationRisk = Number(p.riskScore ?? 0) >= 60 || Number(p.livesRemaining ?? 4) <= 1;\n          return (`,
    replace: `          const eliminationRisk = Number(p.riskScore ?? 0) >= 60 || Number(p.livesRemaining ?? 4) <= 1;\n          const playerBoostWins = allBoostWins.filter((win: any) => String(win.userId) === String(p.id));\n          const todayPlayerBoostWins = todayBoostWins.filter((win: any) => String(win.userId) === String(p.id));\n          const totalBoostPoints = playerBoostWins.reduce((sum: number, win: any) => sum + Number(win.pointsAwarded ?? 5), 0);\n          return (`,
  },
  {
    label: 'leaderboard row boost badge',
    find: `                    {eliminationRisk && <span className="rounded-full border border-[#C0392B] bg-[#C0392B]/15 px-2 py-1 text-[8px] font-black uppercase tracking-[0.13em] text-[#FFB3A8]" data-testid="elimination-risk-badge">⚠ ELIMINATION RISK</span>}`, 
    replace: `                    {eliminationRisk && <span className="rounded-full border border-[#C0392B] bg-[#C0392B]/15 px-2 py-1 text-[8px] font-black uppercase tracking-[0.13em] text-[#FFB3A8]" data-testid="elimination-risk-badge">⚠ ELIMINATION RISK</span>}\n                    {todayPlayerBoostWins.map((win: any) => <span key={win.id ?? `${win.boostId}-${win.userId}`} className="rounded-full border border-[#C8A96E] bg-[#16130B] px-2 py-1 text-[8px] font-black uppercase tracking-[0.13em] text-[#C8A96E]" data-testid="boost-won-badge">{win.boostIcon} {win.boostName}</span>)}`,
  },
  {
    label: 'leaderboard total boost points',
    find: `                  <span className="block max-w-full break-words text-2xl font-black leading-none text-[#C8A96E] sm:text-3xl">{p.totalPoints}</span>\n                  <span className="poster-label text-[#777]">points</span>`,
    replace: `                  <span className="block max-w-full break-words text-2xl font-black leading-none text-[#C8A96E] sm:text-3xl">{p.totalPoints}</span>\n                  <span className="poster-label text-[#777]">points · +{totalBoostPoints} boost</span>`,
  },
  {
    label: 'leaderboard expanded boost pill',
    find: `                    {p.comparisonStats.map((stat: any) => <InsightPill key={stat.label} label={stat.label} value={stat.value} tone={stat.tone} />)}`,
    replace: `                    {p.comparisonStats.map((stat: any) => <InsightPill key={stat.label} label={stat.label} value={stat.value} tone={stat.tone} />)}\n                    <InsightPill label="Boost" value={`+${totalBoostPoints} / ${playerBoostWins.length} wins`} tone={totalBoostPoints > 0 ? "gold" : "white"} />`,
  },
]);

console.log('Applied Boost follow-up patches.');
