from pathlib import Path

path = Path('/home/ubuntu/six-plus-one-challenge/client/src/pages/Home.tsx')
source = path.read_text()
start = source.find('function Leaderboard({ snapshot }: { snapshot: Snapshot }) {')
end = source.find('function ProofFeed({ snapshot }: { snapshot: Snapshot }) {', start)
if start == -1 or end == -1:
    raise SystemExit('Could not locate Leaderboard block boundaries')
replacement = r'''function PodiumCard({ participant, index, onSelect }: { participant: any; index: number; onSelect: () => void }) {
  const rank = index + 1;
  const styles = rank === 1
    ? { label: "1st", border: "border-[#C8A96E]", bg: "bg-[#181207]", text: "text-[#C8A96E]", ring: "shadow-[0_0_40px_rgba(200,169,110,0.22)]", height: "sm:min-h-[17rem]" }
    : rank === 2
      ? { label: "2nd", border: "border-[#BFC7D5]", bg: "bg-[#10131A]", text: "text-[#BFC7D5]", ring: "shadow-[0_0_32px_rgba(191,199,213,0.14)]", height: "sm:min-h-[15rem]" }
      : { label: "3rd", border: "border-[#B87333]", bg: "bg-[#1A1009]", text: "text-[#D58A45]", ring: "shadow-[0_0_32px_rgba(184,115,51,0.16)]", height: "sm:min-h-[14rem]" };
  return (
    <button type="button" onClick={onSelect} className={classNames("motion-card motion-press relative overflow-hidden border-2 p-4 text-left transition hover:-translate-y-1", styles.border, styles.bg, styles.ring, styles.height)} data-podium-rank={rank}>
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/5 blur-xl" />
      <div className="flex items-start justify-between gap-3">
        <span className={classNames("text-5xl font-black uppercase leading-none tracking-[-0.1em]", styles.text)}>{styles.label}</span>
        <ProfilePhoto participant={participant} className="h-14 w-14" />
      </div>
      <h3 className="mt-5 break-words text-2xl font-black uppercase leading-none tracking-[-0.07em] text-white">{participant?.displayName ?? "—"}</h3>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <InsightPill label="Points" value={participant?.totalPoints ?? 0} tone={rank === 1 ? "gold" : "white"} />
        <InsightPill label="Boost" value={participant?.boostScore ?? 0} tone="purple" />
        <InsightPill label="Pace" value={`${participant?.completionRate ?? 0}%`} tone="green" />
        <InsightPill label="Risk" value={participant?.riskScore ?? 0} tone={participant?.riskScore >= 60 ? "red" : "gold"} />
      </div>
      <p className="mt-4 text-[10px] font-black uppercase leading-5 tracking-[0.14em] text-[#BDBDBD]">{participant?.boostReasons?.[0] ?? participant?.moverReasons?.[0] ?? "Keep banking green days to hold the podium"}</p>
    </button>
  );
}

function Leaderboard({ snapshot }: { snapshot: Snapshot }) {
  const [selected, setSelected] = useState<any>(null);
  const logs = snapshot?.logs ?? [];
  const participants = snapshot?.participants ?? [];
  const currentDay = snapshot?.challenge?.currentDay ?? 1;
  const ranked = useMemo(() => rankForPodium(buildParticipantInsights({ participants, logs, currentDay })), [participants, logs, currentDay]);
  const podium = ranked.slice(0, 3);
  const boosted = [...ranked].sort((a: any, b: any) => b.boostScore - a.boostScore || b.recentPointGain - a.recentPointGain).slice(0, 4);
  return (
    <section className="border border-[#2A2A2A] bg-[#101010] p-5" data-testid="bosses-board-section">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <MicroLabel tone="gold">Board / Bosses</MicroLabel>
          <h2 className="mt-2 break-words text-3xl font-black uppercase leading-none tracking-[-0.07em] text-white sm:text-4xl">Podium, boosts, pressure.</h2>
        </div>
        <p className="max-w-sm text-xs font-bold uppercase tracking-[0.14em] text-[#777]">Rank still respects points, but the board now explains why people are moving: boost score, proof, recent point lift, pass pace, streaks and risk.</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-[0.95fr_1.1fr_0.95fr] lg:items-end" data-testid="top-three-podium">
        {podium[1] && <PodiumCard participant={podium[1]} index={1} onSelect={() => { pulse(14); setSelected(podium[1]); }} />}
        {podium[0] && <PodiumCard participant={podium[0]} index={0} onSelect={() => { pulse([12, 24, 12]); setSelected(podium[0]); }} />}
        {podium[2] && <PodiumCard participant={podium[2]} index={2} onSelect={() => { pulse(14); setSelected(podium[2]); }} />}
      </div>

      <div className="mt-5 border border-[#9B59B6]/35 bg-[#150E1A] p-4" data-testid="boosted-insights-strip">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <MicroLabel tone="purple">Boosted right now</MicroLabel>
            <h3 className="mt-2 text-2xl font-black uppercase tracking-[-0.06em] text-white">Not just a badge. A reason.</h3>
          </div>
          <p className="max-w-sm text-[10px] font-black uppercase leading-5 tracking-[0.14em] text-[#D9B3F0]">Boosts come from today’s awarded points, full 6/6 days, proof uploaded in the app, teaching/reflection depth and recent point movement.</p>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {boosted.map((participant: any) => (
            <button key={participant.id} type="button" onClick={() => { pulse(12); setSelected(participant); }} className="motion-row motion-press border border-[#9B59B6]/35 bg-black/35 p-3 text-left">
              <div className="flex items-center gap-3">
                <ProfilePhoto participant={participant} className="h-10 w-10" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-black uppercase tracking-[-0.03em] text-white">{participant.displayName}</p>
                  <p className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-[#D9B3F0]">{participant.boostLabel} · {participant.boostScore}</p>
                </div>
              </div>
              <p className="mt-3 text-[10px] font-black uppercase leading-5 tracking-[0.12em] text-[#BDBDBD]">{participant.boostReasons[0]}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {ranked.map((p: any, index: number) => (
          <button key={p.id} onClick={() => { pulse(14); setSelected(p); }} className={classNames("motion-row motion-press grid w-full grid-cols-[48px_minmax(0,1fr)] items-center gap-3 border bg-[#0D0D0D] p-3 text-left transition hover:border-[#C8A96E] sm:grid-cols-[56px_56px_minmax(0,1fr)_minmax(260px,1fr)_auto] sm:gap-4 sm:p-4", index === 0 ? "border-l-4 border-l-[#C8A96E] border-[#3C3423]" : index === 1 ? "border-l-4 border-l-[#BFC7D5] border-[#2A2A2A]" : index === 2 ? "border-l-4 border-l-[#B87333] border-[#2A2A2A]" : "border-[#2A2A2A]")}>
            <span className={classNames("text-2xl font-black sm:text-3xl", index === 0 ? "text-[#C8A96E]" : index === 1 ? "text-[#BFC7D5]" : index === 2 ? "text-[#D58A45]" : "text-[#777]")}>#{index + 1}</span>
            <span className="hidden sm:block"><ProfilePhoto participant={p} className="h-12 w-12" /></span>
            <span className="min-w-0">
              <span className="block break-words text-lg font-black uppercase tracking-[-0.04em] text-white sm:text-xl">{p.displayName}</span>
              <span className="mt-1 block break-words text-[11px] font-bold uppercase tracking-[0.1em] text-[#777] sm:text-xs sm:tracking-[0.14em]">{p.comparisonLine}</span>
              <span className="mt-3 block max-w-[260px]"><HealthBar lives={p.livesRemaining} label="" compact /></span>
            </span>
            <span className="col-span-2 flex flex-wrap gap-2 sm:col-span-1">
              {p.comparisonStats.map((stat: any) => <InsightPill key={stat.label} label={stat.label} value={stat.value} tone={stat.tone} />)}
            </span>
            <span className="col-span-2 mt-2 min-w-0 text-left sm:col-span-1 sm:mt-0 sm:text-right">
              <span className="block text-2xl font-black text-[#C8A96E] sm:text-3xl">{p.totalPoints}</span>
              <span className="poster-label text-[#777]">points</span>
            </span>
          </button>
        ))}
      </div>
      <ParticipantSheet participant={selected} onClose={() => setSelected(null)} />
    </section>
  );
}

'''
path.write_text(source[:start] + replacement + source[end:])
