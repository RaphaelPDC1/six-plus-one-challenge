from pathlib import Path

path = Path('/home/ubuntu/six-plus-one-challenge/client/src/pages/Home.tsx')
text = path.read_text()

old_anchor = '''  const rivalryCards = [
    {
      label: "Target above",
      tone: "gold" as const,
      participant: chasing,
      emptyTitle: "No one above you",
      emptyDetail: "You are setting the pace in your lane.",
      gap: chasing ? Math.max(0, Number(chasing.totalPoints ?? 0) - Number(currentParticipant?.totalPoints ?? 0)) : 0,
    },
    {
      label: "Threat below",
      tone: "red" as const,
      participant: beingChasedBy,
      emptyTitle: "No close threat",
      emptyDetail: "Hold the standard before the room closes in.",
      gap: beingChasedBy ? Math.max(0, Number(currentParticipant?.totalPoints ?? 0) - Number(beingChasedBy.totalPoints ?? 0)) : 0,
    },
  ];

  return (
'''
new_anchor = '''  const rivalryCards = [
    {
      label: "Chase",
      tone: "gold" as const,
      participant: chasing,
      emptyTitle: "No one above you",
      emptyDetail: "You are setting the pace in your lane.",
      gap: chasing ? Math.max(0, Number(chasing.totalPoints ?? 0) - Number(currentParticipant?.totalPoints ?? 0)) : 0,
    },
    {
      label: "Defend",
      tone: "red" as const,
      participant: beingChasedBy,
      emptyTitle: "No close threat",
      emptyDetail: "Hold the standard before the room closes in.",
      gap: beingChasedBy ? Math.max(0, Number(currentParticipant?.totalPoints ?? 0) - Number(beingChasedBy.totalPoints ?? 0)) : 0,
    },
  ];
  const currentRankLabel = currentRank >= 0 ? `#${currentRank + 1}` : "—";
  const currentPoints = Number(currentParticipant?.totalPoints ?? 0);
  const currentLives = Number(currentParticipant?.livesRemaining ?? 4);
  const passTasksLeft = Number(currentParticipant?.passTasksLeft ?? DAILY_PASS_THRESHOLD);
  const completedRules = Number(currentParticipant?.completedRulesToday ?? 0);
  const nextBoost = unclaimedTodayBoosts[0];
  const nextMove = passTasksLeft > 0
    ? {
        label: "Next best move",
        title: `Log ${passTasksLeft} more rule${passTasksLeft === 1 ? "" : "s"} before the day closes.`,
        detail: completedRules > 0 ? `${completedRules}/6 is started. Get to 5/6 to protect a life and bank the day.` : "Open today’s log, tick the first proof-backed rule, then build to 5/6.",
        action: "Open today’s log",
        tone: "red" as const,
      }
    : nextBoost
      ? {
          label: "Next best move",
          title: `You’re safe today. Chase ${nextBoost.name} for bonus points.`,
          detail: `${getPlainBoostCopy(nextBoost).plain} A bonus target can change the board without changing the core rules.`,
          action: "Review bonuses",
          tone: "gold" as const,
        }
      : {
          label: "Next best move",
          title: "Hold position and watch the room.",
          detail: "Your day is banked. Keep an eye on the person above and the closest threat below.",
          action: "Check rivals",
          tone: "green" as const,
        };

  return (
'''
if old_anchor not in text:
    raise SystemExit('Anchor block not found for overview constants')
text = text.replace(old_anchor, new_anchor, 1)

start = text.index('    <div className="motion-page space-y-4 overflow-hidden" data-testid="overview-metrics-dashboard">')
end = text.index('      <ParticipantSheet participant={selected} onClose={() => setSelected(null)} />', start)
new_block = r'''    <div className="motion-page space-y-3 overflow-hidden pb-2" data-testid="overview-metrics-dashboard">
      <section className="sticky top-2 z-30 overflow-hidden border border-[#2A2A2A] bg-[#070707]/95 p-3 shadow-[0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur sm:top-3" data-testid="overview-position-strip">
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="border-r border-[#242424] pr-2">
            <p className="text-[8px] font-black uppercase tracking-[0.22em] text-[#777]">Rank</p>
            <p className="mt-1 text-2xl font-black uppercase leading-none tracking-[-0.07em] text-white">{currentRankLabel}</p>
          </div>
          <div className="border-r border-[#242424] pr-2">
            <p className="text-[8px] font-black uppercase tracking-[0.22em] text-[#C8A96E]">Points</p>
            <p className="mt-1 text-2xl font-black uppercase leading-none tracking-[-0.07em] text-[#C8A96E]">{currentPoints}</p>
          </div>
          <div className="border-r border-[#242424] pr-2">
            <p className="text-[8px] font-black uppercase tracking-[0.22em] text-[#777]">Lives</p>
            <div className="mt-2 flex justify-center"><LifeDots lives={currentLives} compact /></div>
          </div>
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.22em] text-[#777]">Day</p>
            <p className="mt-1 text-2xl font-black uppercase leading-none tracking-[-0.07em] text-white">{currentDay}<span className="text-xs text-[#777]">/50</span></p>
          </div>
        </div>
      </section>

      <section className={classNames("relative overflow-hidden border p-4 shadow-[0_0_50px_rgba(0,0,0,0.35)]", nextMove.tone === "red" ? "border-[#C0392B]/65 bg-[#190B0A]" : nextMove.tone === "gold" ? "border-[#C8A96E]/65 bg-[#16130B]" : "border-[#2ECC71]/45 bg-[#07150D]")} data-testid="overview-next-best-move">
        <div className="pointer-events-none absolute -right-14 -top-16 h-40 w-40 rounded-full bg-current/10 blur-3xl" />
        <div className="relative">
          <MicroLabel tone={nextMove.tone}>{nextMove.label}</MicroLabel>
          <h2 className="mt-3 text-3xl font-black uppercase leading-[0.9] tracking-[-0.08em] text-white sm:text-5xl">{nextMove.title}</h2>
          <p className="mt-3 text-xs font-black uppercase leading-5 tracking-[0.11em] text-[#D8D8D8]">{nextMove.detail}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="border border-current/45 bg-black/40 px-3 py-2 text-[9px] font-black uppercase tracking-[0.16em] text-current">{nextMove.action}</span>
            <span className="text-[9px] font-black uppercase tracking-[0.14em] text-[#777]">{completedRules}/6 done today · {Math.max(0, DAILY_PASS_THRESHOLD - completedRules)} to pass</span>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border border-[#2A2A2A] bg-[#0F0F0F] p-4 shadow-[0_0_50px_rgba(0,0,0,0.35)] sm:p-5" data-testid="overview-red-alert-pace-card">
        <div className="pointer-events-none absolute -left-16 -top-20 h-44 w-44 rounded-full bg-[#C8A96E]/12 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <MicroLabel tone={daysInsight.tone}>Challenge state</MicroLabel>
            <h2 className="mt-2 break-words text-3xl font-black uppercase leading-none tracking-[-0.08em] text-white sm:text-5xl">{daysInsight.headline}</h2>
          </div>
          <button type="button" onClick={() => setGroupDetailsOpen(value => !value)} className="motion-press border border-[#444] bg-black/45 px-3 py-2 text-[9px] font-black uppercase tracking-[0.14em] text-[#C8A96E] transition hover:border-[#C8A96E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A96E]/60">
            {groupDetailsOpen ? "Hide room summary" : "Room summary"} {groupDetailsOpen ? <ChevronUp className="ml-1 inline h-3 w-3" /> : <ChevronDown className="ml-1 inline h-3 w-3" />}
          </button>
        </div>
        <div className="relative mt-4 grid gap-2 md:grid-cols-3" data-testid="overview-intelligence-grid">
          <OverviewMetricCard label="Days left" value={daysInsight.value} detail={daysInsight.detail} tone={daysInsight.tone} />
          <OverviewMetricCard label="Banked today" value={liveAppPoints} detail="Visible points from today’s logs, proof, reflection, and tracking." tone="green" />
          <OverviewMetricCard label="Bonus leader" value={topBoostEarner ? topBoostEarner.participant.displayName : "No leader"} detail={topBoostEarner ? `+${topBoostEarner.totalBoostPoints} bonus pts · tap for wins` : "Bonus wins will appear here."} tone={topBoostEarner ? "gold" : "white"} expanded={boostLeaderOpen} onClick={() => setBoostLeaderOpen(value => !value)} actionLabel={boostLeaderOpen ? "Close" : "Reveal"}>
            <div className="space-y-2 border border-current/25 bg-black/35 p-3">
              {topBoostEarner ? topBoostEarner.wins.slice(0, 4).map((win: any) => {
                const boost = activeBoosts.find((item: any) => item.id === win.boostId) ?? { name: win.boostId };
                const copy = getPlainBoostCopy(boost);
                return <p key={win.id ?? `${win.boostId}-${win.day}`} className="text-[10px] font-black uppercase leading-5 tracking-[0.12em] text-[#E5E5E5]"><span className="text-current">{boost.name ?? win.boostId}</span>: {copy.plain}</p>;
              }) : <p className="text-[10px] font-black uppercase leading-5 tracking-[0.12em] text-[#BDBDBD]">No one has claimed a bonus yet.</p>}
            </div>
          </OverviewMetricCard>
        </div>
        <div className={classNames("grid transition-all duration-500 ease-out", groupDetailsOpen ? "mt-4 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")} data-testid="overview-room-summary">
          <div className="overflow-hidden border border-[#2A2A2A] bg-black/35 p-4">
            <p className="text-xs font-black uppercase leading-5 tracking-[0.12em] text-[#D8D8D8]">{daysInsight.body}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <InsightPill label="Banked" value={`${todayComplete}/${participantCount || 0}`} tone="green" />
              <InsightPill label="Opened" value={`${todayOpened}/${participantCount || 0}`} tone="gold" />
              <InsightPill label="On pace" value={`${onPaceCount}/${participantCount || 0}`} tone={onPaceCount >= todayComplete ? "green" : "red"} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]" data-testid="overview-boost-warden-grid">
        <WardenMoodCard mood={wardenMoodQuery.data} isLoading={wardenMoodQuery.isLoading} currentDay={currentDay} completedRules={currentParticipant?.completedRulesToday ?? 0} totalRules={6} />
        <article className="border border-[#2ECC71]/30 bg-[#07150D] p-4" data-testid="overview-active-boosts">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <MicroLabel tone="green">Today’s bonus targets</MicroLabel>
              <h3 className="mt-2 text-2xl font-black uppercase leading-none tracking-[-0.07em] text-white">Tap one. See how to win it.</h3>
            </div>
            <span className="border border-[#2ECC71]/55 bg-black/45 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-[#2ECC71]">+5 each</span>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {activeBoosts.map((boost: any, index: number) => {
              const win = todayBoostWins.find((item: any) => item.boostId === boost.id);
              const owner = win ? participants.find((p: any) => String(p.id) === String(win.userId)) : null;
              const copy = getPlainBoostCopy(boost);
              const expanded = expandedBoostId === String(boost.id ?? index);
              return (
                <button key={boost.id ?? index} type="button" onClick={() => setExpandedBoostId(expanded ? null : String(boost.id ?? index))} className={classNames("motion-card motion-press min-w-0 border p-3 text-left transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A96E]/60", getBoostToneClass(boost.tone))} aria-expanded={expanded}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xl font-black leading-none">{boost.icon}</span>
                    <span className="border border-current/40 bg-black/40 px-2 py-1 text-[8px] font-black uppercase tracking-[0.14em]">{win ? "Claimed" : "Open"}</span>
                  </div>
                  <p className="mt-3 text-sm font-black uppercase tracking-[-0.03em] text-white">{boost.name}</p>
                  <p className="mt-1 text-[10px] font-black uppercase leading-5 tracking-[0.12em]">{win ? `+${win.pointsAwarded} · ${owner?.displayName ?? "Winner"}` : copy.plain}</p>
                  <div className={classNames("grid transition-all duration-500 ease-out", expanded ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
                    <div className="overflow-hidden">
                      <p className="border border-current/25 bg-black/35 p-3 text-[10px] font-black uppercase leading-5 tracking-[0.12em] text-[#E5E5E5]">{win?.wardenNote ? `Why it was won: ${win.wardenNote}` : copy.how}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <InsightPill label="Your bonuses" value={`${ownBoostWins.length} claimed`} tone="green" />
            <InsightPill label="Your bonus pts" value={`+${ownTotalBoostPoints} pts`} tone="gold" />
          </div>
          {unclaimedTodayBoosts.length > 0 && <p className="mt-2 border border-[#C8A96E]/45 bg-[#16130B] px-3 py-2 text-[9px] font-black uppercase tracking-[0.14em] text-[#C8A96E]" data-testid="unclaimed-boost-alert">Still open: {unclaimedTodayBoosts.map((boost: any) => boost.name).join(" · ")}</p>}
        </article>
      </section>

      <section className="border border-[#2A2A2A] bg-[#101010] p-4 sm:p-5" data-testid="personal-rivalry-cards">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <MicroLabel tone="gold">Rival pressure</MicroLabel>
            <h3 className="mt-2 text-2xl font-black uppercase leading-none tracking-[-0.07em] text-white">The gap above. The threat below.</h3>
          </div>
          <span className="border border-[#C8A96E]/45 bg-[#16130B] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-[#C8A96E]">Your rank {currentRankLabel}</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {rivalryCards.map(card => {
            const rival = card.participant;
            return (
              <button key={card.label} type="button" onClick={() => rival && setSelected(rival)} className={classNames("motion-card motion-press min-w-0 border p-4 text-left", card.tone === "red" ? "border-[#C0392B]/55 bg-[#190B0A]" : "border-[#C8A96E]/55 bg-[#16130B]")} data-testid="rivalry-card">
                <MicroLabel tone={card.tone}>{card.label}</MicroLabel>
                <div className="mt-4 flex min-w-0 items-center gap-3">
                  {rival && <ProfilePhoto participant={rival} className="h-12 w-12 shrink-0" />}
                  <div className="min-w-0">
                    <p className="truncate text-xl font-black uppercase tracking-[-0.05em] text-white">{rival?.displayName ?? card.emptyTitle}</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#BDBDBD]">{rival ? `${card.gap} point gap` : card.emptyDetail}</p>
                  </div>
                </div>
                {rival && <p className="mt-3 text-[10px] font-black uppercase leading-5 tracking-[0.12em] text-[#BDBDBD]">{rival.statusLine}</p>}
                {rival && <p className="mt-2 text-[9px] font-black uppercase tracking-[0.15em] text-[#C8A96E]">Bonus wins: {boostWins.filter((win: any) => String(win.userId) === String(rival.id)).length} · You: {ownBoostWins.length}</p>}
              </button>
            );
          })}
        </div>
      </section>

      <section className="border border-[#2A2A2A] bg-[#101010] p-4 sm:p-5" data-testid="overview-compare-list">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <MicroLabel tone="red">Pressure list</MicroLabel>
            <h3 className="mt-2 text-2xl font-black uppercase leading-none tracking-[-0.07em] text-white">Who’s safe, slipping, or under pressure.</h3>
          </div>
          <p className="max-w-sm text-[10px] font-black uppercase leading-5 tracking-[0.14em] text-[#777]">Same points, lives, logs, proof, pace, and risk logic — now easier to scan on a phone.</p>
        </div>
        <div className="mt-4 space-y-2">
          {compareRows.map((p: any, index: number) => {
            const pace = Math.max(0, Math.min(100, pct(Number(p.completeCount ?? 0), currentDay)));
            const riskTone = Number(p.riskPoints ?? 0) >= 60 || Number(p.livesRemaining ?? 4) <= 1 ? "red" : Number(p.riskPoints ?? 0) >= 42 || Number(p.livesRemaining ?? 4) <= 2 ? "gold" : "green";
            const riskLabel = riskTone === "red" ? "Red zone" : riskTone === "gold" ? "Watch" : "Holding";
            return (
              <button key={p.id} type="button" onClick={() => { pulse(14); setSelected(p); }} className={classNames("motion-row motion-press w-full border bg-[#0D0D0D] p-3 text-left transition hover:border-[#C8A96E] focus-visible:border-[#C8A96E] focus-visible:outline-none", riskTone === "red" ? "border-[#C0392B]/70" : "border-[#2A2A2A]")} aria-label={`Open ${p.displayName} participant stats`} data-testid="overview-compare-row">
                <div className="grid grid-cols-[34px_minmax(0,1fr)_auto] items-start gap-3">
                  <span className={classNames("text-2xl font-black", riskTone === "red" ? "text-[#FFB3A8]" : index < 3 ? "text-[#C8A96E]" : "text-[#777]")}>#{index + 1}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-lg font-black uppercase tracking-[-0.04em] text-white">{p.displayName}</span>
                    <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.13em] text-[#777]">{p.completeCount}/{currentDay} pace · {p.totalPoints} pts</span>
                  </span>
                  <span className={classNames("border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.13em]", riskTone === "red" ? "border-[#C0392B] bg-[#C0392B]/15 text-[#FFB3A8]" : riskTone === "gold" ? "border-[#C8A96E] bg-[#16130B] text-[#C8A96E]" : "border-[#2ECC71] bg-[#07150D] text-[#2ECC71]")}>{riskLabel}</span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="h-2 overflow-hidden bg-[#242424]" aria-label={`${pace}% pace bar`} data-testid="pace-bar">
                      <div className={classNames("h-full", riskTone === "red" ? "bg-[#C0392B]" : riskTone === "gold" ? "bg-[#C8A96E]" : "bg-[#2ECC71]")} style={{ width: `${pace}%` }} />
                    </div>
                  </div>
                  <LifeDots lives={p.livesRemaining} compact />
                </div>
              </button>
            );
          })}
        </div>
      </section>
'''
text = text[:start] + new_block + text[end:]
text = text.replace('Back to Board</button>', 'Back to Overview</button>')
text = text.replace('aria-label="Back to Board list"', 'aria-label="Back to Overview list"')
path.write_text(text)
print('Applied Claude mobile Overview redesign refactor')
