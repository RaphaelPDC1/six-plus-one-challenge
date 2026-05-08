import { readFileSync, writeFileSync } from "node:fs";

const path = "/home/ubuntu/six-plus-one-challenge/client/src/pages/Home.tsx";
let source = readFileSync(path, "utf8");

const oldMetric = `function OverviewMetricCard({ label, value, detail, tone = "gold" }: { label: string; value: string | number; detail: string; tone?: "gold" | "red" | "green" | "purple" | "white" }) {
  const tones = {
    gold: "text-[#C8A96E] border-[#C8A96E]/45 bg-[#16130B]",
    red: "text-[#C0392B] border-[#C0392B]/45 bg-[#190B0A]",
    green: "text-[#2ECC71] border-[#2ECC71]/45 bg-[#07150D]",
    purple: "text-[#9B59B6] border-[#9B59B6]/45 bg-[#150E1A]",
    white: "text-white border-[#444] bg-[#111]",
  };
  return (
    <article className={classNames("motion-card border p-4", tones[tone])}>
      <MicroLabel tone={tone === "white" ? "muted" : tone}>{label}</MicroLabel>
      <p className="mt-3 max-w-full break-words text-4xl font-black uppercase leading-none tracking-[-0.08em] tabular-nums">{value}</p>
      <p className="mt-3 text-[10px] font-black uppercase leading-5 tracking-[0.14em] text-[#BDBDBD]">{detail}</p>
    </article>
  );
}
`;

const newMetric = `function OverviewMetricCard({
  label,
  value,
  detail,
  tone = "gold",
  actionLabel,
  expanded,
  onClick,
  children,
}: {
  label: string;
  value: string | number;
  detail: string;
  tone?: "gold" | "red" | "green" | "purple" | "white";
  actionLabel?: string;
  expanded?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}) {
  const tones = {
    gold: "text-[#C8A96E] border-[#C8A96E]/45 bg-[#16130B] shadow-[0_0_30px_rgba(200,169,110,0.08)]",
    red: "text-[#FFB3A8] border-[#C0392B]/55 bg-[#190B0A] shadow-[0_0_30px_rgba(192,57,43,0.10)]",
    green: "text-[#2ECC71] border-[#2ECC71]/45 bg-[#07150D] shadow-[0_0_30px_rgba(46,204,113,0.08)]",
    purple: "text-[#D8B4FE] border-[#9B59B6]/50 bg-[#150E1A] shadow-[0_0_30px_rgba(155,89,182,0.08)]",
    white: "text-white border-[#444] bg-[#111]",
  };
  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <MicroLabel tone={tone === "white" ? "muted" : tone}>{label}</MicroLabel>
        {onClick && <span className="rounded-full border border-current/35 bg-black/35 px-2 py-1 text-[8px] font-black uppercase tracking-[0.13em]">{actionLabel ?? (expanded ? "Hide" : "Tap")}</span>}
      </div>
      <p className="mt-3 max-w-full break-words text-3xl font-black uppercase leading-none tracking-[-0.08em] tabular-nums sm:text-4xl">{value}</p>
      <p className="mt-2 text-[10px] font-black uppercase leading-5 tracking-[0.13em] text-[#BDBDBD]">{detail}</p>
      <div className={classNames("grid transition-all duration-500 ease-out", expanded ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
        <div className="overflow-hidden">{children}</div>
      </div>
    </>
  );
  const className = classNames("motion-card min-w-0 rounded-[1.25rem] border p-4 text-left transition duration-300", tones[tone], onClick && "motion-press cursor-pointer hover:-translate-y-0.5 hover:border-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A96E]/60");
  return onClick ? <button type="button" onClick={onClick} className={className}>{content}</button> : <article className={className}>{content}</article>;
}

function getDaysRemainingInsight(currentDay: number, participantCount: number, todayComplete: number, onPaceCount: number) {
  const totalDays = 50;
  const daysRemaining = Math.max(0, totalDays - currentDay);
  const completionRate = participantCount ? Math.round((todayComplete / participantCount) * 100) : 0;
  const paceRate = participantCount ? Math.round((onPaceCount / participantCount) * 100) : 0;
  if (daysRemaining <= 7) return { value: daysRemaining, tone: "red" as const, detail: \`Final week. \${completionRate}% banked today.\`, headline: "Close-out mode", body: \`There are \${daysRemaining} days left after today. The useful signal now is simple: who is banking today and who is still exposed. \${onPaceCount}/\${participantCount || 0} are on pace overall.\` };
  if (daysRemaining <= 15) return { value: daysRemaining, tone: "red" as const, detail: \`Closing stretch. \${paceRate}% still on pace.\`, headline: "Pressure is real", body: "There is still room to move, but skipped days are expensive now. This view should help people see whether the room is protecting pace or drifting." };
  if (daysRemaining <= 30) return { value: daysRemaining, tone: "gold" as const, detail: \`Middle stretch. \${todayComplete}/\${participantCount || 0} banked.\`, headline: "Momentum check", body: "This is where the challenge can feel normal. The key signal is whether people keep banking ordinary days before the final pressure arrives." };
  return { value: daysRemaining, tone: "green" as const, detail: \`Early build. \${onPaceCount}/\${participantCount || 0} on pace.\`, headline: "Build the rhythm", body: "There is enough time to shape the leaderboard, but early consistency decides who gets to the hard part with lives and confidence still intact." };
}

function getPlainBoostCopy(boost: any) {
  const id = String(boost?.id ?? "");
  const copy: Record<string, { plain: string; how: string }> = {
    first_up: { plain: "Be the first valid pass of the day.", how: "Submit a passing log before everyone else. You cannot win it on back-to-back days." },
    streak_king: { plain: "Longest streak wins, unless they already lead.", how: "This rewards the person keeping a streak alive outside first place, so the leader cannot run away with it." },
    hardest_day: { plain: "Longest workout today wins.", how: "Log the biggest verified exercise duration. A same-player repeat is blocked the next day." },
    survivor: { plain: "Best day from someone low on lives.", how: "Only players on two lives or fewer can win. It rewards a strong response under danger." },
    mover: { plain: "Biggest recent climb wins.", how: "The current top three are excluded. It is for someone who has genuinely moved up over the last week." },
    depth: { plain: "Most honest depth wins.", how: "Reflection plus Read & Teach needs real substance, not one-line answers." },
    clean_sweep: { plain: "Only solo 6/6 gets it.", how: "If exactly one person completes all six rules, they get the boost. If multiple people do, nobody gets it." },
    ghost_hunter: { plain: "Best day without Ghost Life wins.", how: "Anyone who used Ghost Life is excluded. This rewards clean recovery without the safety net." },
    early_bird: { plain: "First valid pass before 8am wins.", how: "The log must be a passing day and arrive before 08:00." },
    comeback_kid: { plain: "Best bounce-back after losing a life.", how: "Only someone who has already lost a life can win. It rewards the strongest response." },
    proof_machine: { plain: "Best proof habit wins.", how: "The winner has the strongest proof rate across completed days, with low-sample perfect scores filtered out." },
    wardens_pick: { plain: "Best reflection quality wins.", how: "The Warden looks for the strongest useful reflection signal, not the loudest answer." },
    iron_week: { plain: "First clean seven-day streak wins.", how: "Awarded when someone hits exactly seven green days in a row for that run." },
    night_owl: { plain: "Last valid evening pass wins.", how: "Submit a passing log between 20:00 and 23:59. It cannot also be the First Up winner." },
    dead_heat: { plain: "Shared first place triggers it.", how: "At least two players must be tied for the top total at the end of the day." },
  };
  return copy[id] ?? { plain: boost?.shortRule ?? "Win the daily boost.", how: boost?.antiGaming ?? "Tap to review the exact rule." };
}
`;

if (!source.includes(oldMetric)) throw new Error("Metric block not found");
source = source.replace(oldMetric, newMetric);

const oldWarden = `function WardenMoodCard({ mood, isLoading, currentDay, completedRules, totalRules }: { mood: any; isLoading?: boolean; currentDay?: number; completedRules?: number; totalRules?: number }) {
  const daysRemaining = Math.max(0, 50 - (currentDay ?? 1));
  const progressPercent = Math.round(((completedRules ?? 0) / (totalRules ?? 6)) * 100);
  
  // Contextual mood based on progress and days remaining
  let contextualMood = mood;
  if (!mood || mood.source === "fallback") {
    if (daysRemaining <= 10 && progressPercent < 50) {
      contextualMood = { label: "Pressure mounting", tone: "red", detail: "Days are short. Rules need attention.", confidence: 0.8, source: "contextual" };
    } else if (daysRemaining <= 10 && progressPercent >= 50) {
      contextualMood = { label: "Final push", tone: "gold", detail: "You're in the home stretch. Finish what you started.", confidence: 0.85, source: "contextual" };
    } else if (daysRemaining > 25 && progressPercent >= 80) {
      contextualMood = { label: "Solid foundation", tone: "green", detail: "Early consistency is paying off. Keep the rhythm.", confidence: 0.8, source: "contextual" };
    } else if (progressPercent < 30) {
      contextualMood = { label: "Building momentum", tone: "gold", detail: "You're finding the pattern. Stay with it.", confidence: 0.75, source: "contextual" };
    } else {
      contextualMood = { label: "On track", tone: "green", detail: "The work is showing. Keep moving.", confidence: 0.8, source: "contextual" };
    }
  }
  
  const safeMood = contextualMood ?? { label: "Reading the evidence", tone: "white", detail: "The Warden is reading today's log, proof, lives, and private reflection signal.", confidence: 0, source: "fallback" };
  return (
    <article className={classNames("motion-card min-w-0 rounded-[1.4rem] border p-4", getBoostToneClass(safeMood.tone))} data-testid="warden-mood-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MicroLabel tone={safeMood.tone === "red" ? "red" : safeMood.tone === "green" ? "green" : safeMood.tone === "purple" ? "purple" : "gold"}>Warden Mood</MicroLabel>
        <span className="rounded-full border border-current/40 bg-black/40 px-2 py-1 text-[8px] font-black uppercase tracking-[0.14em]">{isLoading ? "Reading" : safeMood.source === "ai" ? "Warden read" : safeMood.source === "contextual" ? "Progress read" : "Rules read"}</span>
      </div>
      <h3 className="mt-3 break-words text-2xl font-black uppercase leading-none tracking-[-0.07em] text-white">{safeMood.label}</h3>
      <p className="mt-3 text-xs font-black uppercase leading-5 tracking-[0.12em] text-[#D8D8D8]">{safeMood.detail}</p>
      <p className="mt-4 text-[9px] font-black uppercase tracking-[0.16em] text-current">Confidence {Math.round(Number(safeMood.confidence ?? 0) * 100)}%</p>
    </article>
  );
}
`;

const newWarden = `function WardenMoodCard({ mood, isLoading, currentDay, completedRules, totalRules }: { mood: any; isLoading?: boolean; currentDay?: number; completedRules?: number; totalRules?: number }) {
  const daysRemaining = Math.max(0, 50 - (currentDay ?? 1));
  const done = Math.max(0, Number(completedRules ?? 0));
  const total = Math.max(1, Number(totalRules ?? 6));
  const missing = Math.max(0, total - done);

  let interpreted = { label: "Reading today's shape", tone: "white", detail: "No judgement yet. The useful read appears once today's log starts moving.", confidence: 0.65, source: "progress" } as any;
  if (done >= 5 && daysRemaining <= 10) interpreted = { label: "Finish-line control", tone: "green", detail: \`Today is protected: \${done}/\${total} done with \${daysRemaining} days left. Keep proof tight and avoid cheap mistakes.\`, confidence: 0.88, source: "progress" };
  else if (done >= 5) interpreted = { label: "Day is in hand", tone: "green", detail: \`\${done}/\${total} done. This is the pace that keeps lives quiet and points moving.\`, confidence: 0.84, source: "progress" };
  else if (done >= 3 && daysRemaining <= 10) interpreted = { label: "Close, but exposed", tone: "gold", detail: \`\${done}/\${total} done with \${missing} still open. In the final stretch, unfinished rules turn into pressure fast.\`, confidence: 0.82, source: "progress" };
  else if (done >= 3) interpreted = { label: "Half-built day", tone: "gold", detail: \`\${done}/\${total} done. There is progress, but \${missing} rule\${missing === 1 ? "" : "s"} still decide whether this becomes a banked day.\`, confidence: 0.78, source: "progress" };
  else if (daysRemaining <= 10) interpreted = { label: "Needs action now", tone: "red", detail: \`Only \${done}/\${total} done and \${daysRemaining} days left. This is not panic, but it does need a clean finish today.\`, confidence: 0.86, source: "progress" };
  else interpreted = { label: "Still forming", tone: "purple", detail: \`Only \${done}/\${total} done so far. The Warden is waiting for the day to show proof, effort, and tracking.\`, confidence: 0.72, source: "progress" };

  const safeMood = mood?.source === "ai" && mood?.detail ? mood : interpreted;
  const tone = safeMood.tone === "red" ? "red" : safeMood.tone === "green" ? "green" : safeMood.tone === "purple" ? "purple" : safeMood.tone === "white" ? "white" : "gold";
  return (
    <article className={classNames("motion-card min-w-0 rounded-[1.4rem] border p-4", getBoostToneClass(tone))} data-testid="warden-mood-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MicroLabel tone={tone === "white" ? "muted" : tone}>Warden read</MicroLabel>
        <span className="rounded-full border border-current/40 bg-black/40 px-2 py-1 text-[8px] font-black uppercase tracking-[0.14em]">{isLoading ? "Reading" : safeMood.source === "ai" ? "AI read" : "Today read"}</span>
      </div>
      <h3 className="mt-3 break-words text-2xl font-black uppercase leading-none tracking-[-0.07em] text-white">{safeMood.label}</h3>
      <p className="mt-3 text-xs font-black uppercase leading-5 tracking-[0.11em] text-[#E5E5E5]">{safeMood.detail}</p>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <span className="rounded-[0.9rem] border border-current/25 bg-black/30 p-2"><b className="block text-lg leading-none text-white">{done}</b><small className="text-[8px] font-black uppercase tracking-[0.12em]">Done</small></span>
        <span className="rounded-[0.9rem] border border-current/25 bg-black/30 p-2"><b className="block text-lg leading-none text-white">{missing}</b><small className="text-[8px] font-black uppercase tracking-[0.12em]">Open</small></span>
        <span className="rounded-[0.9rem] border border-current/25 bg-black/30 p-2"><b className="block text-lg leading-none text-white">{daysRemaining}</b><small className="text-[8px] font-black uppercase tracking-[0.12em]">Days</small></span>
      </div>
    </article>
  );
}
`;

if (!source.includes(oldWarden)) throw new Error("Warden block not found");
source = source.replace(oldWarden, newWarden);

const oldState = `function Overview({ snapshot }: { snapshot: Snapshot }) {
  const [selected, setSelected] = useState<any>(null);`;
const newState = `function Overview({ snapshot }: { snapshot: Snapshot }) {
  const [selected, setSelected] = useState<any>(null);
  const [boostLeaderOpen, setBoostLeaderOpen] = useState(false);
  const [expandedBoostId, setExpandedBoostId] = useState<string | null>(null);
  const [groupDetailsOpen, setGroupDetailsOpen] = useState(false);`;
source = source.replace(oldState, newState);

const oldAfterRisk = `  const riskLeader = [...insights].sort((a: any, b: any) => b.riskPoints - a.riskPoints || a.livesRemaining - b.livesRemaining)[0];`;
const newAfterRisk = `  const riskLeader = [...insights].sort((a: any, b: any) => b.riskPoints - a.riskPoints || a.livesRemaining - b.livesRemaining)[0];
  const daysInsight = getDaysRemainingInsight(currentDay, participantCount, todayComplete, onPaceCount);`;
source = source.replace(oldAfterRisk, newAfterRisk);

const oldTopSections = `      <section className="relative overflow-hidden rounded-[1.6rem] border border-[#C0392B]/55 bg-[#160908] p-4 shadow-[0_0_40px_rgba(192,57,43,0.12)] sm:p-6" data-testid="overview-red-alert-pace-card">
        <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-[#C0392B]/20 blur-3xl" />
        <MicroLabel tone="red">Overview · pressure board</MicroLabel>
        <div className="relative mt-3 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="min-w-0">
            <h2 className="break-words text-4xl font-black uppercase leading-none tracking-[-0.09em] text-white sm:text-6xl">{onPaceCount}/{participantCount || 0} on pace.</h2>
            <p className="mt-3 max-w-xl text-xs font-black uppercase leading-5 tracking-[0.13em] text-[#FFB3A8]">Pace is strict: you only count as on track when completed challenge days have kept up with day {currentDay}.</p>
          </div>
          <div className="rounded-[1.1rem] border border-[#C0392B]/60 bg-black/35 p-3 text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#777]">Banked today</p>
            <p className="mt-1 text-3xl font-black leading-none text-[#C8A96E]">{todayComplete}/{participantCount || 0}</p>
            <p className="mt-2 text-[9px] font-black uppercase tracking-[0.14em] text-[#777]">{todayOpened}/{participantCount || 0} opened</p>
          </div>
        </div>
      </section>

      <section className="grid gap-2 sm:grid-cols-3" data-testid="overview-intelligence-grid">
        <OverviewMetricCard label="Days remaining" value={Math.max(0, 50 - currentDay)} detail={currentDay <= 10 ? "Pace is building. Stay consistent." : currentDay <= 25 ? "Halfway through. Momentum matters." : currentDay <= 40 ? "Final stretch. Hold the line." : "Last 10 days. Finish strong."} tone={currentDay <= 10 ? "green" : currentDay <= 25 ? "gold" : currentDay <= 40 ? "gold" : "red"} />
        <OverviewMetricCard label="Live points bank" value={liveAppPoints} detail="Today's visible value from tasks, proof, insight, and tracking" tone="green" />
        <OverviewMetricCard label="Boost leader" value={topBoostEarner ? \`+\${topBoostEarner.totalBoostPoints}\` : 0} detail={topBoostEarner ? \`\${topBoostEarner.participant.displayName} · \${topBoostEarner.wins.length} wins\` : "No boosts banked yet"} tone={topBoostEarner ? "gold" : "white"} />
      </section>`;

const newTopSections = `      <section className="relative overflow-hidden rounded-[1.6rem] border border-[#2A2A2A] bg-[#0F0F0F] p-4 shadow-[0_0_50px_rgba(0,0,0,0.35)] sm:p-5" data-testid="overview-red-alert-pace-card">
        <div className="pointer-events-none absolute -left-16 -top-20 h-44 w-44 rounded-full bg-[#C8A96E]/12 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <MicroLabel tone={daysInsight.tone}>Overview · quick read</MicroLabel>
            <h2 className="mt-2 break-words text-3xl font-black uppercase leading-none tracking-[-0.08em] text-white sm:text-5xl">{daysInsight.headline}</h2>
          </div>
          <button type="button" onClick={() => setGroupDetailsOpen(value => !value)} className="motion-press rounded-full border border-[#444] bg-black/45 px-3 py-2 text-[9px] font-black uppercase tracking-[0.14em] text-[#C8A96E] transition hover:border-[#C8A96E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A96E]/60">
            {groupDetailsOpen ? "Hide group read" : "Tap to review"} {groupDetailsOpen ? <ChevronUp className="ml-1 inline h-3 w-3" /> : <ChevronDown className="ml-1 inline h-3 w-3" />}
          </button>
        </div>
        <div className="relative mt-4 grid gap-2 md:grid-cols-3" data-testid="overview-intelligence-grid">
          <OverviewMetricCard label="Days left" value={daysInsight.value} detail={daysInsight.detail} tone={daysInsight.tone} />
          <OverviewMetricCard label="Live bank" value={liveAppPoints} detail="Points visible from today’s logs, proof, reflection, and tracking." tone="green" />
          <OverviewMetricCard label="Boost leader" value={topBoostEarner ? topBoostEarner.participant.displayName : "No leader"} detail={topBoostEarner ? \`+\${topBoostEarner.totalBoostPoints} boost pts · tap for wins\` : "Boost wins will appear here."} tone={topBoostEarner ? "gold" : "white"} expanded={boostLeaderOpen} onClick={() => setBoostLeaderOpen(value => !value)} actionLabel={boostLeaderOpen ? "Close" : "Reveal"}>
            <div className="space-y-2 rounded-[1rem] border border-current/25 bg-black/35 p-3">
              {topBoostEarner ? topBoostEarner.wins.slice(0, 4).map((win: any) => {
                const boost = activeBoosts.find((item: any) => item.id === win.boostId) ?? { name: win.boostId };
                const copy = getPlainBoostCopy(boost);
                return <p key={win.id ?? \`\${win.boostId}-\${win.day}\`} className="text-[10px] font-black uppercase leading-5 tracking-[0.12em] text-[#E5E5E5]"><span className="text-current">{boost.name ?? win.boostId}</span>: {copy.plain}</p>;
              }) : <p className="text-[10px] font-black uppercase leading-5 tracking-[0.12em] text-[#BDBDBD]">No one has claimed a boost yet.</p>}
            </div>
          </OverviewMetricCard>
        </div>
        <div className={classNames("grid transition-all duration-500 ease-out", groupDetailsOpen ? "mt-4 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
          <div className="overflow-hidden rounded-[1.2rem] border border-[#2A2A2A] bg-black/35 p-4">
            <p className="text-xs font-black uppercase leading-5 tracking-[0.12em] text-[#D8D8D8]">{daysInsight.body}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <InsightPill label="Banked" value={\`\${todayComplete}/\${participantCount || 0}\`} tone="green" />
              <InsightPill label="Opened" value={\`\${todayOpened}/\${participantCount || 0}\`} tone="gold" />
              <InsightPill label="On pace" value={\`\${onPaceCount}/\${participantCount || 0}\`} tone={onPaceCount >= todayComplete ? "green" : "red"} />
            </div>
          </div>
        </div>
      </section>`;

if (!source.includes(oldTopSections)) throw new Error("Top overview block not found");
source = source.replace(oldTopSections, newTopSections);

const oldBoostSection = `        <article className="rounded-[1.4rem] border border-[#2ECC71]/30 bg-[#07150D] p-4" data-testid="overview-active-boosts">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <MicroLabel tone="green">Active boosts</MicroLabel>
              <h3 className="mt-2 text-2xl font-black uppercase leading-none tracking-[-0.07em] text-white">Three +5 windows. Earned, not given.</h3>
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
                  <p className="mt-1 text-[10px] font-black uppercase tracking-[0.13em]">{win ? \`+\${win.pointsAwarded} · \${owner?.displayName ?? "Winner"}\` : "+5 bonus available"}</p>
                  <p className="mt-3 text-[10px] font-black uppercase leading-5 tracking-[0.12em] text-[#BDBDBD]">{win?.wardenNote ?? boost.description ?? boost.shortRule}</p>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[9px] font-black uppercase tracking-[0.15em] text-[#777]">Your boosts: {ownBoostWins.length} claimed · +{ownTotalBoostPoints} points total.</p>
          {unclaimedTodayBoosts.length > 0 && <p className="mt-2 rounded-full border border-[#C8A96E]/45 bg-[#16130B] px-3 py-2 text-[9px] font-black uppercase tracking-[0.14em] text-[#C8A96E]" data-testid="unclaimed-boost-alert">Still open: {unclaimedTodayBoosts.map((boost: any) => boost.name).join(" · ")}</p>}
        </article>`;

const newBoostSection = `        <article className="rounded-[1.4rem] border border-[#2ECC71]/30 bg-[#07150D] p-4" data-testid="overview-active-boosts">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <MicroLabel tone="green">Today’s boosts</MicroLabel>
              <h3 className="mt-2 text-2xl font-black uppercase leading-none tracking-[-0.07em] text-white">Tap a boost. See how to win it.</h3>
            </div>
            <span className="rounded-full border border-[#2ECC71]/55 bg-black/45 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-[#2ECC71]">+5 each</span>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {activeBoosts.map((boost: any, index: number) => {
              const win = todayBoostWins.find((item: any) => item.boostId === boost.id);
              const owner = win ? participants.find((p: any) => String(p.id) === String(win.userId)) : null;
              const copy = getPlainBoostCopy(boost);
              const expanded = expandedBoostId === String(boost.id ?? index);
              return (
                <button key={boost.id ?? index} type="button" onClick={() => setExpandedBoostId(expanded ? null : String(boost.id ?? index))} className={classNames("motion-card motion-press min-w-0 rounded-[1rem] border p-3 text-left transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A96E]/60", getBoostToneClass(boost.tone))} aria-expanded={expanded}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xl font-black leading-none">{boost.icon}</span>
                    <span className="rounded-full border border-current/40 bg-black/40 px-2 py-1 text-[8px] font-black uppercase tracking-[0.14em]">{win ? "Claimed" : "Open"}</span>
                  </div>
                  <p className="mt-3 text-sm font-black uppercase tracking-[-0.03em] text-white">{boost.name}</p>
                  <p className="mt-1 text-[10px] font-black uppercase leading-5 tracking-[0.12em]">{win ? \`+\${win.pointsAwarded} · \${owner?.displayName ?? "Winner"}\` : copy.plain}</p>
                  <div className={classNames("grid transition-all duration-500 ease-out", expanded ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
                    <div className="overflow-hidden">
                      <p className="rounded-[0.9rem] border border-current/25 bg-black/35 p-3 text-[10px] font-black uppercase leading-5 tracking-[0.12em] text-[#E5E5E5]">{win?.wardenNote ? \`Why it was won: \${win.wardenNote}\` : copy.how}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <InsightPill label="Your boosts" value={\`\${ownBoostWins.length} claimed\`} tone="green" />
            <InsightPill label="Your bonus" value={\`+\${ownTotalBoostPoints} pts\`} tone="gold" />
          </div>
          {unclaimedTodayBoosts.length > 0 && <p className="mt-2 rounded-full border border-[#C8A96E]/45 bg-[#16130B] px-3 py-2 text-[9px] font-black uppercase tracking-[0.14em] text-[#C8A96E]" data-testid="unclaimed-boost-alert">Still open: {unclaimedTodayBoosts.map((boost: any) => boost.name).join(" · ")}</p>}
        </article>`;

if (!source.includes(oldBoostSection)) throw new Error("Boost block not found");
source = source.replace(oldBoostSection, newBoostSection);

writeFileSync(path, source);
