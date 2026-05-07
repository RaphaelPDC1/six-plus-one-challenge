from pathlib import Path

path = Path('/home/ubuntu/six-plus-one-challenge/client/src/pages/Home.tsx')
source = path.read_text()
source = source.replace(
    'import { DAILY_PASS_THRESHOLD, DAILY_RULE_COUNT, clampLives, getDailyLogProgress } from "@/lib/challengeUi";\n',
    'import { DAILY_PASS_THRESHOLD, DAILY_RULE_COUNT, clampLives, getDailyLogProgress } from "@/lib/challengeUi";\nimport { buildFocusedChartData, buildParticipantInsights, calculateLiveTaskPoints, logHasInsight, logHasProof, rankForPodium } from "@/lib/challengeInsights";\n',
)
start = source.find('function Overview({ snapshot }: { snapshot: Snapshot }) {')
end = source.find('const COMPLIANCE_RULE_LABELS =', start)
if start == -1 or end == -1:
    raise SystemExit('Could not locate Overview block boundaries')
replacement = r'''function InsightPill({ label, value, tone = "gold" }: { label: string; value: string | number; tone?: "gold" | "red" | "green" | "purple" | "white" }) {
  const tones = {
    gold: "border-[#C8A96E]/50 text-[#C8A96E]",
    red: "border-[#C0392B]/55 text-[#FFB3A8]",
    green: "border-[#2ECC71]/55 text-[#2ECC71]",
    purple: "border-[#9B59B6]/55 text-[#D9B3F0]",
    white: "border-[#444] text-white",
  };
  return <span className={classNames("border bg-black px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em]", tones[tone])}>{label}: {value}</span>;
}

function Overview({ snapshot }: { snapshot: Snapshot }) {
  const [selected, setSelected] = useState<any>(null);
  const [focusedParticipantId, setFocusedParticipantId] = useState<number | string | null>(null);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const participants = snapshot?.participants ?? [];
  const logs = snapshot?.logs ?? [];
  const payments = snapshot?.payments ?? [];
  const redemptions = snapshot?.redemptions ?? [];
  const currentDay = Math.max(Number(snapshot?.challenge?.currentDay ?? 1), 1);
  const participantCount = participants.length;
  const expectedSlots = participantCount * currentDay;
  const insights = useMemo(() => buildParticipantInsights({ participants, logs, currentDay }), [participants, logs, currentDay]);
  const rankedInsights = useMemo(() => rankForPodium(insights), [insights]);
  const focusedParticipant = insights.find((participant: any) => String(participant.id) === String(focusedParticipantId ?? insights[0]?.id)) ?? insights[0];
  const focusedChartData = useMemo(() => buildFocusedChartData({ logs, participants, focusedParticipantId: focusedParticipant?.id, currentDay }), [currentDay, focusedParticipant?.id, logs, participants]);
  const completedLogs = insights.reduce((sum: number, p: any) => sum + p.completeCount, 0);
  const todayOpened = insights.filter((p: any) => p.todayLog).length;
  const todayComplete = insights.filter((p: any) => p.completedRulesToday >= DAILY_PASS_THRESHOLD).length;
  const totalLivesLost = insights.reduce((sum: number, p: any) => sum + p.livesLost, 0);
  const averageStreak = participantCount ? Math.round(insights.reduce((sum: number, p: any) => sum + Number(p.currentStreak ?? 0), 0) / participantCount) : 0;
  const strongestStreak = insights.reduce((max: number, p: any) => Math.max(max, Number(p.currentStreak ?? 0), Number(p.longestStreak ?? 0)), 0);
  const pendingPayments = payments.filter((p: any) => p.status === "pending").length;
  const pendingRewards = redemptions.filter((r: any) => r.status === "pending").length;
  const topMover = [...insights].sort((a: any, b: any) => b.moverScore - a.moverScore || b.recentPointGain - a.recentPointGain)[0];
  const mostConsistent = [...insights].sort((a: any, b: any) => b.consistencyScore - a.consistencyScore || b.currentStreak - a.currentStreak)[0];
  const riskLeader = [...insights].sort((a: any, b: any) => b.riskScore - a.riskScore || a.livesRemaining - b.livesRemaining)[0];
  const boostedLeader = [...insights].sort((a: any, b: any) => b.boostScore - a.boostScore || b.totalPoints - a.totalPoints)[0];
  const riskSorted = [...insights].sort((a: any, b: any) => b.riskScore - a.riskScore || b.passTasksLeft - a.passTasksLeft);
  const comparisonRows = [...insights].sort((a: any, b: any) => b.riskScore - a.riskScore || b.moverScore - a.moverScore);
  const liveAppPoints = insights.reduce((sum: number, participant: any) => {
    const taskPoints = calculateLiveTaskPoints(participant.completedRulesToday, {
      hasProof: logHasProof(participant.todayLog),
      hasInsight: logHasInsight(participant.todayLog),
      trackedEverything: Boolean(participant.todayLog?.trackedEverything),
    });
    return sum + taskPoints.visibleTotal;
  }, 0);

  return (
    <div className="motion-page space-y-5" data-testid="overview-metrics-dashboard">
      <section className="border border-[#2A2A2A] bg-[#101010] p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#2A2A2A] pb-4">
          <div>
            <MicroLabel tone="gold">Overview · command centre</MicroLabel>
            <h2 className="mt-2 text-3xl font-black uppercase leading-none tracking-[-0.07em] text-white sm:text-5xl">Score. Risk. Momentum.</h2>
          </div>
          <p className="max-w-md text-[10px] font-black uppercase leading-5 tracking-[0.16em] text-[#777]">The overview now treats every tick, proof, life, streak, and time-pressure signal as part of one command view. Board remains the deeper competitive layer.</p>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
          <OverviewMetricCard label="Participants" value={participantCount} detail="Active competitors tracked" tone="white" />
          <OverviewMetricCard label="Today green" value={`${todayComplete}/${participantCount}`} detail={`${todayOpened}/${participantCount} opened their daily log`} tone={todayComplete === participantCount && participantCount > 0 ? "green" : "gold"} />
          <OverviewMetricCard label="Live app points" value={liveAppPoints} detail="Visible task, proof, insight and tracking value from today's ticks" tone="green" />
          <OverviewMetricCard label="Group pass rate" value={`${pct(completedLogs, expectedSlots)}%`} detail={`${completedLogs}/${expectedSlots || 0} challenge pass slots`} tone="green" />
          <OverviewMetricCard label="Average streak" value={averageStreak} detail={`Best active/longest: ${strongestStreak}`} tone="gold" />
          <OverviewMetricCard label="Lives lost" value={totalLivesLost} detail={`${riskSorted.filter((p: any) => p.riskScore >= 42).length} meaningful risk flags`} tone={totalLivesLost > 0 ? "red" : "green"} />
        </div>
      </section>

      <section className="min-w-0 overflow-hidden border border-[#2A2A2A] bg-[#101010] p-4 sm:p-5" data-testid="group-pulse-and-focused-chart">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <MicroLabel tone="gold">Simple group signals</MicroLabel>
            <h2 className="mt-2 break-words text-2xl font-black uppercase tracking-[-0.06em] text-white sm:text-4xl">Tap graph first. Then read the signals.</h2>
            <p className="mt-2 max-w-xl text-xs font-bold leading-5 text-[#8D8D8D]">The graph now opens directly under this control, not hidden below the signal cards. Signals are calculated from tasks left, time pressure, lives lost, streaks, proof, and recent points.</p>
          </div>
          <button type="button" onClick={() => { pulse(10); setComparisonOpen(open => !open); }} className="min-h-11 border border-[#C8A96E]/60 bg-[#16130B] px-4 text-[10px] font-black uppercase tracking-[0.16em] text-[#C8A96E]" aria-expanded={comparisonOpen} data-testid="view-focused-graph-button">
            {comparisonOpen ? "Hide graph" : "View graph"}
          </button>
        </div>
        {comparisonOpen && (
          <div className="mt-4 border border-[#C8A96E]/35 bg-black p-3" data-testid="focused-participant-graph-panel">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <MicroLabel tone="green">Focused graph</MicroLabel>
                <h3 className="mt-2 text-xl font-black uppercase tracking-[-0.05em] text-white">{focusedParticipant?.displayName ?? "Participant"} vs group pace.</h3>
                <p className="mt-2 text-[10px] font-black uppercase leading-5 tracking-[0.14em] text-[#777]">Gold shows selected days passed. Green shows group average. The pale line shows selected points banked.</p>
              </div>
              <label className="grid gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#C8A96E]">
                Select participant
                <select value={String(focusedParticipant?.id ?? "")} onChange={event => setFocusedParticipantId(event.target.value)} className="min-h-11 min-w-[14rem] border border-[#C8A96E]/45 bg-[#0D0D0D] px-3 text-xs font-black uppercase tracking-[0.12em] text-white" data-testid="graph-participant-select">
                  {insights.map((participant: any) => <option key={participant.id} value={String(participant.id)}>{participant.displayName}</option>)}
                </select>
              </label>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Quick participant graph selector">
              {rankedInsights.slice(0, 18).map((participant: any) => {
                const active = String(participant.id) === String(focusedParticipant?.id);
                return <button key={participant.id} type="button" onClick={() => { pulse(8); setFocusedParticipantId(String(participant.id)); }} className={classNames("shrink-0 border px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em]", active ? "border-[#C8A96E] bg-[#C8A96E] text-black" : "border-[#2A2A2A] bg-[#0D0D0D] text-[#BDBDBD]")} aria-pressed={active}>{participant.displayName}</button>;
              })}
            </div>
            <div className="mt-3 h-64 min-w-0 overflow-hidden sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={focusedChartData} margin={{ left: -18, right: 4, top: 10, bottom: 0 }}>
                  <CartesianGrid stroke="#242424" strokeDasharray="3 3" />
                  <XAxis dataKey="day" stroke="#777" tick={{ fill: "#777", fontSize: 11, fontWeight: 900 }} />
                  <YAxis allowDecimals={false} stroke="#777" tick={{ fill: "#777", fontSize: 11, fontWeight: 900 }} />
                  <Tooltip contentStyle={{ background: "#0D0D0D", border: "1px solid #C8A96E", borderRadius: 0, color: "#fff" }} />
                  <Line type="monotone" dataKey="focused" name={`${focusedParticipant?.displayName ?? "Selected"} days passed`} stroke={GOLD} strokeWidth={4} dot={false} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="groupAverage" name="Group average days passed" stroke={GREEN} strokeWidth={3} strokeDasharray="7 5" dot={false} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="focusedPoints" name="Selected points" stroke="#ECF0F1" strokeWidth={2} strokeDasharray="2 4" dot={false} yAxisId={0} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        <div className="mt-4 grid gap-3 lg:grid-cols-4">
          <button type="button" onClick={() => topMover && setSelected(topMover)} className="motion-card motion-press border border-[#2ECC71]/45 bg-[#07150D] p-4 text-left">
            <MicroLabel tone="green">Top mover</MicroLabel>
            <h3 className="mt-3 text-2xl font-black uppercase tracking-[-0.06em] text-white">{topMover?.displayName ?? "—"}</h3>
            <p className="mt-2 text-[10px] font-black uppercase leading-5 tracking-[0.14em] text-[#A8EFC5]">{topMover?.moverReasons?.[0] ?? "Movement needs a green day"}</p>
            <InsightPill label="Mover score" value={topMover?.moverScore ?? 0} tone="green" />
          </button>
          <button type="button" onClick={() => mostConsistent && setSelected(mostConsistent)} className="motion-card motion-press border border-[#C8A96E]/45 bg-[#16130B] p-4 text-left">
            <MicroLabel tone="gold">Most consistent</MicroLabel>
            <h3 className="mt-3 text-2xl font-black uppercase tracking-[-0.06em] text-white">{mostConsistent?.displayName ?? "—"}</h3>
            <p className="mt-2 text-[10px] font-black uppercase leading-5 tracking-[0.14em] text-[#D9C89A]">{mostConsistent?.consistencyReasons?.[0] ?? "Consistency building"}</p>
            <InsightPill label="Consistency" value={mostConsistent?.consistencyScore ?? 0} tone="gold" />
          </button>
          <button type="button" onClick={() => riskLeader && setSelected(riskLeader)} className="motion-card motion-press border border-[#C0392B]/55 bg-[#190B0A] p-4 text-left">
            <MicroLabel tone="red">Most at risk</MicroLabel>
            <h3 className="mt-3 text-2xl font-black uppercase tracking-[-0.06em] text-white">{riskLeader?.displayName ?? "—"}</h3>
            <p className="mt-2 text-[10px] font-black uppercase leading-5 tracking-[0.14em] text-[#FFB3A8]">{riskLeader?.riskReasons?.[0] ?? "No immediate pressure"}</p>
            <InsightPill label="Risk" value={riskLeader?.riskScore ?? 0} tone="red" />
          </button>
          <button type="button" onClick={() => boostedLeader && setSelected(boostedLeader)} className="motion-card motion-press border border-[#9B59B6]/50 bg-[#150E1A] p-4 text-left">
            <MicroLabel tone="purple">Boosted</MicroLabel>
            <h3 className="mt-3 text-2xl font-black uppercase tracking-[-0.06em] text-white">{boostedLeader?.displayName ?? "—"}</h3>
            <p className="mt-2 text-[10px] font-black uppercase leading-5 tracking-[0.14em] text-[#D9B3F0]">{boostedLeader?.boostReasons?.[0] ?? "No boost yet"}</p>
            <InsightPill label="Boost" value={boostedLeader?.boostScore ?? 0} tone="purple" />
          </button>
        </div>
      </section>

      <section className="border border-[#2A2A2A] bg-[#101010] p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <MicroLabel tone="green">Points engine</MicroLabel>
            <h3 className="mt-2 text-2xl font-black uppercase tracking-[-0.06em] text-white sm:text-4xl">Ticks now show value.</h3>
          </div>
          <p className="max-w-sm text-[10px] font-black uppercase tracking-[0.16em] text-[#777]">Backend awards still happen on submit, but the app now shows visible earning routes as tasks are ticked: rule points, pass bonus, full-green bonus, proof, insight and tracking value.</p>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <OverviewMetricCard label="Today submitted" value={`${todayOpened}/${participantCount}`} detail="Opened logs now contribute to live point pressure" tone="gold" />
          <OverviewMetricCard label="Today passed" value={`${todayComplete}/${participantCount}`} detail={`Pass still means ${DAILY_PASS_THRESHOLD}/${DAILY_RULE_COUNT} rules`} tone={todayComplete === participantCount && participantCount > 0 ? "green" : "gold"} />
          <OverviewMetricCard label="Ops queue" value={pendingPayments + pendingRewards} detail={`${pendingPayments} payments · ${pendingRewards} rewards`} tone={pendingPayments + pendingRewards ? "purple" : "white"} />
        </div>
      </section>

      <section className="border border-[#2A2A2A] bg-[#101010] p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <MicroLabel tone="red">Participant comparison</MicroLabel>
            <h3 className="mt-2 text-2xl font-black uppercase tracking-[-0.06em] text-white sm:text-4xl">Compare what matters.</h3>
          </div>
          <p className="max-w-sm text-[10px] font-black uppercase tracking-[0.16em] text-[#777]">Rows now compare pass pace, point velocity, proof reliability, and risk instead of flat totals. Tap anyone for their Board-style drill-down.</p>
        </div>
        <div className="mt-5 space-y-2">
          {comparisonRows.map((p: any, index: number) => (
            <button key={p.id} type="button" onClick={() => { pulse(14); setSelected(p); }} className="motion-row motion-press grid w-full gap-3 border border-[#2A2A2A] bg-[#0D0D0D] p-3 text-left transition hover:border-[#C8A96E] focus-visible:border-[#C8A96E] focus-visible:outline-none sm:grid-cols-[2.5rem_3.5rem_minmax(0,1fr)_minmax(260px,1fr)] sm:items-center" aria-label={`Open ${p.displayName} participant stats`}>
              <span className={classNames("text-2xl font-black", p.riskScore >= 60 ? "text-[#C0392B]" : index < 3 ? "text-[#C8A96E]" : "text-[#777]")}>#{index + 1}</span>
              <ProfilePhoto participant={p} className="h-12 w-12" />
              <span className="min-w-0">
                <span className="block break-words text-lg font-black uppercase tracking-[-0.04em] text-white">{p.displayName}</span>
                <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.14em] text-[#777]">{p.comparisonLine}</span>
                <span className="mt-2 block max-w-[260px]"><HealthBar lives={p.livesRemaining} label="" compact /></span>
              </span>
              <span className="flex flex-wrap gap-2">
                {p.comparisonStats.map((stat: any) => <InsightPill key={stat.label} label={stat.label} value={stat.value} tone={stat.tone} />)}
              </span>
            </button>
          ))}
        </div>
      </section>
      <ParticipantSheet participant={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

'''
source = source[:start] + replacement + source[end:]
path.write_text(source)
