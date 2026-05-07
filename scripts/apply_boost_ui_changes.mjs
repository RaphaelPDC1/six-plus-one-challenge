import fs from 'node:fs';
const path = '/home/ubuntu/six-plus-one-challenge/client/src/pages/Home.tsx';
let text = fs.readFileSync(path, 'utf8');
function mustReplace(find, replace) {
  const i = text.indexOf(find);
  if (i < 0) throw new Error('Missing marker: ' + find.slice(0, 80));
  text = text.slice(0, i) + replace + text.slice(i + find.length);
}
function replaceBetween(start, end, replace) {
  const s = text.indexOf(start);
  if (s < 0) throw new Error('Missing start: ' + start.slice(0, 80));
  const e = text.indexOf(end, s + start.length);
  if (e < 0) throw new Error('Missing end: ' + end.slice(0, 80));
  text = text.slice(0, s) + replace + text.slice(e + end.length);
}

mustReplace('function Overview({ snapshot }: { snapshot: Snapshot }) {\n  const [selected, setSelected] = useState<any>(null);\n', String.raw`function getBoostToneClass(tone?: string) {
  if (tone === "green") return "border-[#2ECC71]/55 bg-[#07150D] text-[#2ECC71]";
  if (tone === "red") return "border-[#C0392B]/55 bg-[#190B0A] text-[#FFB3A8]";
  if (tone === "purple") return "border-[#9B59B6]/55 bg-[#130F18] text-[#D8B4FE]";
  if (tone === "white") return "border-white/25 bg-white/[0.04] text-white";
  return "border-[#C8A96E]/55 bg-[#16130B] text-[#C8A96E]";
}

function WardenMoodCard({ mood, isLoading }: { mood: any; isLoading?: boolean }) {
  const safeMood = mood ?? { label: "Reading the room", tone: "white", detail: "The Warden is checking today's log, proof, lives, and reflection depth.", confidence: 0, source: "fallback" };
  return (
    <article className={classNames("motion-card min-w-0 rounded-[1.4rem] border p-4", getBoostToneClass(safeMood.tone))} data-testid="warden-mood-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MicroLabel tone={safeMood.tone === "red" ? "red" : safeMood.tone === "green" ? "green" : safeMood.tone === "purple" ? "purple" : "gold"}>Warden Mood</MicroLabel>
        <span className="rounded-full border border-current/40 bg-black/40 px-2 py-1 text-[8px] font-black uppercase tracking-[0.14em]">{isLoading ? "Reading" : safeMood.source === "ai" ? "AI read" : "Data read"}</span>
      </div>
      <h3 className="mt-3 break-words text-2xl font-black uppercase leading-none tracking-[-0.07em] text-white">{safeMood.label}</h3>
      <p className="mt-3 text-xs font-black uppercase leading-5 tracking-[0.12em] text-[#D8D8D8]">{safeMood.detail}</p>
      <p className="mt-4 text-[9px] font-black uppercase tracking-[0.16em] text-current">Confidence {Math.round(Number(safeMood.confidence ?? 0) * 100)}%</p>
    </article>
  );
}

function Overview({ snapshot }: { snapshot: Snapshot }) {
  const [selected, setSelected] = useState<any>(null);
`);

mustReplace('  const currentParticipant = insights.find((participant: any) => String(participant.id) === String(snapshot?.participant?.id)) ?? rankedInsights[0];\n', String.raw`  const currentParticipant = insights.find((participant: any) => String(participant.id) === String(snapshot?.participant?.id)) ?? rankedInsights[0];
  const currentParticipantId = currentParticipant?.id ?? snapshot?.participant?.id;
  const wardenMoodQuery = trpc.warden.getMood.useQuery({ participantId: Number(currentParticipantId), metric: "effort_vibe" }, { enabled: Boolean(currentParticipantId) });
  const activeBoosts = snapshot?.activeBoosts ?? [];
  const boostWins = snapshot?.boostWins ?? [];
  const todayBoostWins = boostWins.filter((win: any) => Number(win.day ?? 0) === currentDay);
  const ownBoostWins = boostWins.filter((win: any) => String(win.userId) === String(currentParticipantId));
`);

replaceBetween('      <section className="grid gap-2 sm:grid-cols-3" data-testid="overview-intelligence-grid">\n', '      </section>\n\n      <section className="rounded-[1.4rem] border border-[#2A2A2A] bg-[#101010] p-4 sm:p-5" data-testid="personal-rivalry-cards">\n', String.raw`      <section className="grid gap-2 sm:grid-cols-3" data-testid="overview-intelligence-grid">
        <OverviewMetricCard label="Risk flags" value={riskCount} detail={`${riskLeader?.displayName ?? "No one"} is the current pressure signal`} tone={riskCount ? "red" : "green"} />
        <OverviewMetricCard label="Live app points" value={liveAppPoints} detail="Visible task, proof, insight and tracking value from today" tone="green" />
        <OverviewMetricCard label="Ops drag" value={pendingPayments + pendingRewards} detail={`${pendingPayments} payments · ${pendingRewards} rewards · ${totalLivesLost} lives lost`} tone={pendingPayments + pendingRewards ? "purple" : "white"} />
      </section>

      <section className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]" data-testid="overview-boost-warden-grid">
        <WardenMoodCard mood={wardenMoodQuery.data} isLoading={wardenMoodQuery.isLoading} />
        <article className="rounded-[1.4rem] border border-[#2ECC71]/30 bg-[#07150D] p-4" data-testid="overview-active-boosts">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <MicroLabel tone="green">Active boosts</MicroLabel>
              <h3 className="mt-2 text-2xl font-black uppercase leading-none tracking-[-0.07em] text-white">Today's three +5 windows.</h3>
            </div>
            <span className="rounded-full border border-[#2ECC71]/55 bg-black/45 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-[#2ECC71]">Day {currentDay}</span>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {activeBoosts.map((boost: any, index: number) => {
              const win = todayBoostWins.find((item: any) => item.boostId === boost.id);
              const owner = win ? participants.find((p: any) => String(p.id) === String(win.userId)) : null;
              return (
                <div key={boost.id ?? index} className={classNames("rounded-[1rem] border p-3", getBoostToneClass(boost.tone))}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xl font-black leading-none">{boost.icon}</span>
                    <span className="rounded-full border border-current/40 bg-black/40 px-2 py-1 text-[8px] font-black uppercase tracking-[0.14em]">{win ? "Claimed" : "Open"}</span>
                  </div>
                  <p className="mt-3 text-sm font-black uppercase tracking-[-0.03em] text-white">{boost.name}</p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-[0.13em]">{win ? `+${win.pointsAwarded} · ${owner?.displayName ?? "Winner"}` : "+5 additive"}</p>
                  <p className="mt-3 text-[10px] font-black uppercase leading-5 tracking-[0.12em] text-[#BDBDBD]">{win?.wardenNote ?? boost.shortRule}</p>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[9px] font-black uppercase tracking-[0.15em] text-[#777]">Your banked boosts: {ownBoostWins.length}. Base scores stay untouched.</p>
        </article>
      </section>

      <section className="rounded-[1.4rem] border border-[#2A2A2A] bg-[#101010] p-4 sm:p-5" data-testid="personal-rivalry-cards">
`);

replaceBetween('  const boosted = [...ranked].sort((a: any, b: any) => b.boostScore - a.boostScore || b.recentPointGain - a.recentPointGain).slice(0, 4);\n', '  return (\n', String.raw`  const leaderPoints = Number(ranked[0]?.totalPoints ?? 0);
  const activeBoosts = snapshot?.activeBoosts ?? [];
  const todayBoostWins = (snapshot?.boostWins ?? []).filter((win: any) => Number(win.day ?? 0) === Number(currentDay));
  const boostSlots = activeBoosts.map((boost: any, index: number) => {
    const win = todayBoostWins.find((item: any) => item.boostId === boost.id);
    const owner = win ? participants.find((participant: any) => String(participant.id) === String(win.userId)) : null;
    return { ...boost, state: win ? "Claimed" : "Open", title: owner?.displayName ?? boost.name, value: win ? `+${win.pointsAwarded} additive` : "+5 additive", detail: win?.wardenNote ?? boost.antiGaming ?? boost.shortRule, slot: boost.slot ?? index + 1 };
  });
  return (
`);

mustReplace('            <h3 className="mt-2 text-2xl font-black uppercase leading-none tracking-[-0.07em] text-white">Three slots. Earned, not gamed.</h3>\n', '            <h3 className="mt-2 text-2xl font-black uppercase leading-none tracking-[-0.07em] text-white">Rotating slots. Earned, not gamed.</h3>\n');
mustReplace('          <span className="shrink-0 rounded-full border border-[#2ECC71]/55 bg-black/45 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-[#2ECC71]">Live rules</span>\n', '          <span className="shrink-0 rounded-full border border-[#2ECC71]/55 bg-black/45 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-[#2ECC71]">Day {currentDay}</span>\n');
mustReplace('            const toneClass = slot.tone === "green" ? "border-[#2ECC71]/55 bg-[#082016] text-[#2ECC71]" : slot.tone === "red" ? "border-[#C0392B]/55 bg-[#190B0A] text-[#FFB3A8]" : "border-[#C8A96E]/55 bg-[#16130B] text-[#C8A96E]";\n', '            const toneClass = getBoostToneClass(slot.tone);\n');
mustReplace('                  <span className="text-[9px] font-black uppercase tracking-[0.16em]">Slot {index + 1}</span>\n', '                  <span className="text-[9px] font-black uppercase tracking-[0.16em]">{slot.icon} · Slot {slot.slot ?? index + 1}</span>\n');
fs.writeFileSync(path, text);
