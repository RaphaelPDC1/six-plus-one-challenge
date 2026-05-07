from pathlib import Path


def patch(path: str, patches: list[tuple[str, str, str]]) -> None:
    file_path = Path(path)
    source = file_path.read_text()
    for label, find, replace in patches:
        if find not in source:
            raise RuntimeError(f"Patch marker not found in {path}: {label}")
        source = source.replace(find, replace, 1)
    file_path.write_text(source)

patch('server/warden/challengeState.ts', [
    ('boost imports', '''import { and, desc, gte, lte } from "drizzle-orm";
import { getDb } from "../db";
import {
  participants,
  dailyLogs,
  paymentEvents,
  whatsappChatHistory,
} from "../../drizzle/schema";
import { getMaxMessagesForDramaScore } from "./organicScheduler";''', '''import { and, desc, gte, lte } from "drizzle-orm";
import { getDb } from "../db";
import {
  participants,
  dailyLogs,
  paymentEvents,
  whatsappChatHistory,
  boostWins,
} from "../../drizzle/schema";
import { BOOST_POINTS, getActiveBoostsForDay } from "../../shared/boostSystem";
import { getMaxMessagesForDramaScore } from "./organicScheduler";'''),
    ('challenge state boost interface', '''  before_midday_full_rule_completions: Array<{
    participant_name: string;
    timestamp: string;
  }>;
  daily_drama_score: number;''', '''  before_midday_full_rule_completions: Array<{
    participant_name: string;
    timestamp: string;
  }>;
  boost_context: {
    today_boosts: Array<{
      boost_id: string;
      boost_name: string;
      boost_icon: string;
      slot: number;
      anti_gaming_rule: string;
      status: "claimed" | "unclaimed";
      winner_name: string | null;
      points_awarded: number;
      warden_note: string | null;
    }>;
    today_winners: Array<{
      participant_name: string;
      boost_name: string;
      boost_icon: string;
      points_awarded: number;
      warden_note: string | null;
    }>;
    player_boost_history: Array<{
      participant_name: string;
      total_boost_wins: number;
      total_boost_points: number;
      latest_boost: string | null;
    }>;
    group_boost_leader: { participant_name: string; total_boost_wins: number; total_boost_points: number } | null;
    rival_boost_wins: Array<{ participant_name: string; total_boost_wins: number; total_boost_points: number }>;
    trigger_events: string[];
    unclaimed_boosts: string[];
  };
  daily_drama_score: number;'''),
    ('boost wins query', '''  const recentMessages = await db
    .select()
    .from(whatsappChatHistory)
    .where(gte(whatsappChatHistory.messageTimestamp, twelveHoursAgo))
    .orderBy(desc(whatsappChatHistory.messageTimestamp))
    .limit(50);
''', '''  const recentMessages = await db
    .select()
    .from(whatsappChatHistory)
    .where(gte(whatsappChatHistory.messageTimestamp, twelveHoursAgo))
    .orderBy(desc(whatsappChatHistory.messageTimestamp))
    .limit(50);

  const recentBoostWins = await db
    .select()
    .from(boostWins)
    .where(lte(boostWins.day, challengeDay))
    .orderBy(desc(boostWins.awardedAt))
    .limit(500);
'''),
    ('boost context derivation before drama', '''  const uniqueLateNightLoggers = new Set(lateLogsToday.map((log) => log.participant_name)).size;
  const uniqueBeforeMiddayCompletions = new Set(beforeMiddayFullRuleCompletions.map((log) => log.participant_name)).size;''', '''  const todaysActiveBoosts = getActiveBoostsForDay(challengeDay);
  const todayBoostWins = recentBoostWins.filter((win) => Number(win.day ?? 0) === challengeDay);
  const participantBoostSummary = allParticipants.map((participant) => {
    const wins = recentBoostWins.filter((win) => String(win.userId) === String(participant.id));
    const latest = wins.slice().sort((a, b) => b.awardedAt.getTime() - a.awardedAt.getTime())[0];
    return {
      participant_name: participant.displayName,
      total_boost_wins: wins.length,
      total_boost_points: wins.reduce((sum, win) => sum + Number(win.pointsAwarded ?? BOOST_POINTS), 0),
      latest_boost: latest?.boostName ?? null,
    };
  });
  const groupBoostLeader = participantBoostSummary
    .filter((item) => item.total_boost_wins > 0)
    .sort((a, b) => b.total_boost_points - a.total_boost_points || b.total_boost_wins - a.total_boost_wins)[0] ?? null;
  const boostContextTodayBoosts = todaysActiveBoosts.map((boost) => {
    const win = todayBoostWins.find((item) => item.boostId === boost.id);
    return {
      boost_id: boost.id,
      boost_name: boost.name,
      boost_icon: boost.icon,
      slot: boost.slot,
      anti_gaming_rule: boost.antiGaming,
      status: win ? "claimed" as const : "unclaimed" as const,
      winner_name: win ? participantNameById(allParticipants, win.userId) : null,
      points_awarded: win ? Number(win.pointsAwarded ?? BOOST_POINTS) : BOOST_POINTS,
      warden_note: win?.wardenNote ?? null,
    };
  });
  const boostTriggerEvents = [
    ...todayBoostWins.map((win) => {
      const name = participantNameById(allParticipants, win.userId);
      return `${name} won ${win.boostName.toUpperCase()} for +${Number(win.pointsAwarded ?? BOOST_POINTS)}: ${win.wardenNote ?? "boost claimed"}`;
    }),
    ...participantBoostSummary.filter((item) => item.total_boost_wins >= 3).map((item) => `${item.participant_name} has ${item.total_boost_wins} total boost wins`),
    ...(todayBoostWins.length >= 2 ? [`${todayBoostWins.length} boosts have been claimed today`] : []),
    ...(boostContextTodayBoosts.some((boost) => boost.status === "unclaimed") ? [`Unclaimed boost slots remain: ${boostContextTodayBoosts.filter((boost) => boost.status === "unclaimed").map((boost) => boost.boost_name).join(", ")}`] : []),
  ];
  const boostContext = {
    today_boosts: boostContextTodayBoosts,
    today_winners: todayBoostWins.map((win) => ({
      participant_name: participantNameById(allParticipants, win.userId),
      boost_name: win.boostName,
      boost_icon: win.boostIcon,
      points_awarded: Number(win.pointsAwarded ?? BOOST_POINTS),
      warden_note: win.wardenNote ?? null,
    })),
    player_boost_history: participantBoostSummary,
    group_boost_leader: groupBoostLeader,
    rival_boost_wins: participantBoostSummary
      .filter((item) => item.total_boost_wins > 0)
      .sort((a, b) => b.total_boost_points - a.total_boost_points || b.total_boost_wins - a.total_boost_wins)
      .slice(0, 5),
    trigger_events: boostTriggerEvents,
    unclaimed_boosts: boostContextTodayBoosts.filter((boost) => boost.status === "unclaimed").map((boost) => boost.boost_name),
  };

  const uniqueLateNightLoggers = new Set(lateLogsToday.map((log) => log.participant_name)).size;
  const uniqueBeforeMiddayCompletions = new Set(beforeMiddayFullRuleCompletions.map((log) => log.participant_name)).size;'''),
    ('drama boost events', '''    before_midday_completions: uniqueBeforeMiddayCompletions,
  };''', '''    before_midday_completions: uniqueBeforeMiddayCompletions,
    boost_events: Math.min(6, todayBoostWins.length * 2 + (boostContext.unclaimed_boosts.length > 0 ? 1 : 0)),
  };'''),
    ('return boost context', '''    before_midday_full_rule_completions: beforeMiddayFullRuleCompletions,
    daily_drama_score: dailyDramaScore,''', '''    before_midday_full_rule_completions: beforeMiddayFullRuleCompletions,
    boost_context: boostContext,
    daily_drama_score: dailyDramaScore,'''),
])

patch('server/warden/messageGenerator.ts', [
    ('prompt boost access', '''- drama_score_breakdown: how the score was calculated, including themes, bests, deep insights, silent returns, Ghost Life signals, and early completions
''', '''- boost_context: active +5 boost slots, claimed/unclaimed state, today's winners, each player's boost history, group boost leader, rival boost wins, boost trigger events, and unclaimed boost slots
- drama_score_breakdown: how the score was calculated, including themes, bests, deep insights, silent returns, Ghost Life signals, early completions, and boost events
'''),
    ('prompt boost triggers', '''8. Someone hits a personal best, returns after silence, or finishes all six rules before midday
9. Group completion rate drops significantly week on week
10. Someone completes or appears to complete a Ghost Life Double-Down Day
11. The entire group completes a day with no life losses — rare, worth noting
''', '''8. Someone hits a personal best, returns after silence, or finishes all six rules before midday
9. Group completion rate drops significantly week on week
10. Someone completes or appears to complete a Ghost Life Double-Down Day
11. The entire group completes a day with no life losses — rare, worth noting
12. A boost is won, one player wins multiple boosts in a day, someone builds a streak of boost wins, Survivor / Warden's Pick / Iron Week / Dead Heat fires, the boost leader changes, or a slot remains unclaimed late in the day
'''),
    ('prompt boost style guidance', '''The Warden should never feel like a cron job. Do not write as if you are checking in on a schedule. Write as if you have been watching all day and have chosen this moment because the data earned it. Use the actual writing, exercise effort, timing, shared themes, silence, returns, and pattern changes in CHALLENGE_STATE to sound like a presence that understands the room, not a bot reciting counters.
''', '''The Warden should never feel like a cron job. Do not write as if you are checking in on a schedule. Write as if you have been watching all day and have chosen this moment because the data earned it. Use the actual writing, exercise effort, timing, shared themes, silence, returns, boost wins, unclaimed boost slots, and pattern changes in CHALLENGE_STATE to sound like a presence that understands the room, not a bot reciting counters.

When boost_context contains events, reference the display boost names exactly when useful — FIRST UP, STREAK KING, SURVIVOR, WARDEN'S PICK, IRON WEEK, DEAD HEAT, or the supplied boost_name. Treat boost wins with the same sharpness as life events: earned, visible, and not motivational. Never invent a boost winner or imply a +5 has been awarded unless boost_context says it was claimed.
'''),
])

patch('client/src/pages/Home.tsx', [
    ('overview boost totals', '''  const todayBoostWins = boostWins.filter((win: any) => Number(win.day ?? 0) === currentDay);
  const ownBoostWins = boostWins.filter((win: any) => String(win.userId) === String(currentParticipantId));''', '''  const todayBoostWins = boostWins.filter((win: any) => Number(win.day ?? 0) === currentDay);
  const ownBoostWins = boostWins.filter((win: any) => String(win.userId) === String(currentParticipantId));
  const ownTotalBoostPoints = ownBoostWins.reduce((sum: number, win: any) => sum + Number(win.pointsAwarded ?? 5), 0);
  const boostLeaderboard = participants
    .map((participant: any) => {
      const wins = boostWins.filter((win: any) => String(win.userId) === String(participant.id));
      return {
        participant,
        wins,
        totalBoostPoints: wins.reduce((sum: number, win: any) => sum + Number(win.pointsAwarded ?? 5), 0),
      };
    })
    .filter((entry: any) => entry.wins.length > 0)
    .sort((a: any, b: any) => b.totalBoostPoints - a.totalBoostPoints || b.wins.length - a.wins.length);
  const topBoostEarner = boostLeaderboard[0];
  const unclaimedTodayBoosts = activeBoosts.filter((boost: any) => !todayBoostWins.some((win: any) => win.boostId === boost.id));'''),
    ('overview metric card boost leader', '''        <OverviewMetricCard label="Ops drag" value={pendingPayments + pendingRewards} detail={`${pendingPayments} payments · ${pendingRewards} rewards · ${totalLivesLost} lives lost`} tone={pendingPayments + pendingRewards ? "purple" : "white"} />''', '''        <OverviewMetricCard label="Top boost earner" value={topBoostEarner ? `+${topBoostEarner.totalBoostPoints}` : 0} detail={topBoostEarner ? `${topBoostEarner.participant.displayName} · ${topBoostEarner.wins.length} wins` : "No boost wins banked yet"} tone={topBoostEarner ? "gold" : "white"} />'''),
    ('active boost footer', '''          <p className="mt-3 text-[9px] font-black uppercase tracking-[0.15em] text-[#777]">Your banked boosts: {ownBoostWins.length}. Base scores stay untouched.</p>''', '''          <p className="mt-3 text-[9px] font-black uppercase tracking-[0.15em] text-[#777]">Your banked boosts: {ownBoostWins.length} wins · +{ownTotalBoostPoints} additive. Base scores stay untouched.</p>
          {unclaimedTodayBoosts.length > 0 && <p className="mt-2 rounded-full border border-[#C8A96E]/45 bg-[#16130B] px-3 py-2 text-[9px] font-black uppercase tracking-[0.14em] text-[#C8A96E]" data-testid="unclaimed-boost-alert">Unclaimed windows still open: {unclaimedTodayBoosts.map((boost: any) => boost.name).join(" · ")}</p>}'''),
    ('rivalry boost count', '''                {rival && <p className="mt-3 text-[10px] font-black uppercase leading-5 tracking-[0.12em] text-[#BDBDBD]">{rival.statusLine}</p>}''', '''                {rival && <p className="mt-3 text-[10px] font-black uppercase leading-5 tracking-[0.12em] text-[#BDBDBD]">{rival.statusLine}</p>}
                {rival && <p className="mt-2 text-[9px] font-black uppercase tracking-[0.15em] text-[#C8A96E]">Boost wins: {boostWins.filter((win: any) => String(win.userId) === String(rival.id)).length} · You: {ownBoostWins.length}</p>}'''),
    ('leaderboard boost locals', '''  const activeBoosts = snapshot?.activeBoosts ?? [];
  const todayBoostWins = (snapshot?.boostWins ?? []).filter((win: any) => Number(win.day ?? 0) === Number(currentDay));''', '''  const activeBoosts = snapshot?.activeBoosts ?? [];
  const allBoostWins = snapshot?.boostWins ?? [];
  const todayBoostWins = allBoostWins.filter((win: any) => Number(win.day ?? 0) === Number(currentDay));'''),
    ('leaderboard row boost stats', '''          const eliminationRisk = Number(p.riskScore ?? 0) >= 60 || Number(p.livesRemaining ?? 4) <= 1;
          return (''', '''          const eliminationRisk = Number(p.riskScore ?? 0) >= 60 || Number(p.livesRemaining ?? 4) <= 1;
          const playerBoostWins = allBoostWins.filter((win: any) => String(win.userId) === String(p.id));
          const todayPlayerBoostWins = todayBoostWins.filter((win: any) => String(win.userId) === String(p.id));
          const totalBoostPoints = playerBoostWins.reduce((sum: number, win: any) => sum + Number(win.pointsAwarded ?? 5), 0);
          return ('''),
    ('leaderboard row boost badge', '''                    {eliminationRisk && <span className="rounded-full border border-[#C0392B] bg-[#C0392B]/15 px-2 py-1 text-[8px] font-black uppercase tracking-[0.13em] text-[#FFB3A8]" data-testid="elimination-risk-badge">⚠ ELIMINATION RISK</span>}''', '''                    {eliminationRisk && <span className="rounded-full border border-[#C0392B] bg-[#C0392B]/15 px-2 py-1 text-[8px] font-black uppercase tracking-[0.13em] text-[#FFB3A8]" data-testid="elimination-risk-badge">⚠ ELIMINATION RISK</span>}
                    {todayPlayerBoostWins.map((win: any) => <span key={win.id ?? `${win.boostId}-${win.userId}`} className="rounded-full border border-[#C8A96E] bg-[#16130B] px-2 py-1 text-[8px] font-black uppercase tracking-[0.13em] text-[#C8A96E]" data-testid="boost-won-badge">{win.boostIcon} {win.boostName}</span>)}'''),
    ('leaderboard total boost points', '''                  <span className="block max-w-full break-words text-2xl font-black leading-none text-[#C8A96E] sm:text-3xl">{p.totalPoints}</span>
                  <span className="poster-label text-[#777]">points</span>''', '''                  <span className="block max-w-full break-words text-2xl font-black leading-none text-[#C8A96E] sm:text-3xl">{p.totalPoints}</span>
                  <span className="poster-label text-[#777]">points · +{totalBoostPoints} boost</span>'''),
    ('leaderboard expanded boost pill', '''                    {p.comparisonStats.map((stat: any) => <InsightPill key={stat.label} label={stat.label} value={stat.value} tone={stat.tone} />)}''', '''                    {p.comparisonStats.map((stat: any) => <InsightPill key={stat.label} label={stat.label} value={stat.value} tone={stat.tone} />)}
                    <InsightPill label="Boost" value={`+${totalBoostPoints} / ${playerBoostWins.length} wins`} tone={totalBoostPoints > 0 ? "gold" : "white"} />'''),
])

print('Applied Boost follow-up patches.')
