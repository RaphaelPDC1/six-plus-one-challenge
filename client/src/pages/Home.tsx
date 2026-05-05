import { useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { clampLives, getDailyLogProgress } from "@/lib/challengeUi";
import { toast } from "sonner";
import {
  Activity,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Crown,
  Dumbbell,
  Flame,
  Gift,
  HeartPulse,
  Lock,
  MessageSquare,
  Shield,
  Swords,
  Trophy,
  UserRound,
  Utensils,
  X,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Snapshot = any;

type MyDayForm = {
  noAlcohol: boolean;
  cleanEating: boolean;
  cleanEatingNote: string;
  exerciseDuration: number;
  exerciseType: string;
  exerciseProofUrl: string;
  reflectionText: string;
  reflectionShared: boolean;
  readTeachText: string;
  trackedEverything: boolean;
};

type TabKey = "myday" | "overview" | "leaderboard" | "proof" | "rewards" | "admin";

type RuleKey = keyof MyDayForm | "exercise" | "reflection" | "readTeach";

const GOLD = "#C8A96E";
const RED = "#C0392B";
const GREEN = "#2ECC71";
const PURPLE = "#9B59B6";
const chartColors = [GOLD, RED, GREEN, PURPLE, "#4CA3C9", "#E67E22", "#F1C40F", "#ECF0F1"];

const emptyDay: MyDayForm = {
  noAlcohol: true,
  cleanEating: true,
  cleanEatingNote: "",
  exerciseDuration: 30,
  exerciseType: "",
  exerciseProofUrl: "",
  reflectionText: "",
  reflectionShared: true,
  readTeachText: "",
  trackedEverything: true,
};

function pulse(pattern: number | number[] = 18) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

function classNames(...items: Array<string | false | null | undefined>) {
  return items.filter(Boolean).join(" ");
}

function MicroLabel({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "gold" | "red" | "green" | "purple" }) {
  const tones = {
    muted: "text-[#777]",
    gold: "text-[#C8A96E]",
    red: "text-[#C0392B]",
    green: "text-[#2ECC71]",
    purple: "text-[#9B59B6]",
  };
  return <p className={classNames("poster-label", tones[tone])}>{children}</p>;
}

function SharpButton({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={classNames(
        "poster-button flex min-h-12 items-center justify-center gap-2 px-5 py-3 text-xs transition disabled:cursor-not-allowed",
        className,
      )}
    >
      {children}
    </button>
  );
}

function HealthBar({ lives = 4, label = "Lives", compact = false }: { lives?: number; label?: string; compact?: boolean }) {
  const safeLives = clampLives(lives);
  return (
    <section className={classNames("border border-[#2A2A2A] bg-[#101010]", compact ? "p-2" : "p-4")}> 
      <div className="mb-3 flex items-end justify-between gap-3">
        <MicroLabel tone={safeLives <= 1 ? "red" : "gold"}>{label}</MicroLabel>
        <span className={classNames("text-xs font-black uppercase tracking-[0.28em]", safeLives <= 1 ? "text-[#C0392B]" : "text-[#C8A96E]")}>{safeLives}/4</span>
      </div>
      <div className="grid grid-cols-4 gap-1 bg-[#2A2A2A] p-[2px]">
        {Array.from({ length: 4 }).map((_, index) => {
          const alive = index < safeLives;
          const critical = alive && safeLives <= 1;
          return (
            <div
              key={index}
              className={classNames(
                "h-5 border border-[#0D0D0D] transition-all duration-500",
                alive ? "bg-[#C0392B]" : "bg-[#171717]",
                critical && "animate-danger-drain shadow-[0_0_18px_rgba(192,57,43,0.65)]",
              )}
            />
          );
        })}
      </div>
      {!compact && <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-[#777]">{safeLives <= 1 ? "Last warning. Everything counts." : "Lose a rule. Lose a life."}</p>}
    </section>
  );
}

function PosterStat({ label, value, tone = "gold" }: { label: string; value: string | number; tone?: "gold" | "red" | "green" | "purple" | "white" }) {
  const tones = {
    gold: "text-[#C8A96E]",
    red: "text-[#C0392B]",
    green: "text-[#2ECC71]",
    purple: "text-[#9B59B6]",
    white: "text-white",
  };
  return (
    <div className="border border-[#2A2A2A] bg-[#111] p-4">
      <MicroLabel tone={tone === "white" ? "muted" : tone}>{label}</MicroLabel>
      <p className={classNames("mt-3 text-4xl font-black uppercase leading-none", tones[tone])}>{value}</p>
    </div>
  );
}

function WardenPresence({ snapshot }: { snapshot: Snapshot }) {
  const latest = [...(snapshot?.wardenMessages ?? [])].reverse()[0];
  return (
    <aside className="border-l-4 border-[#C0392B] bg-[#130F0F] p-4">
      <div className="flex items-center justify-between gap-4">
        <MicroLabel tone="red">The Warden is watching</MicroLabel>
        <span className="h-2 w-2 animate-pulse bg-[#C0392B]" />
      </div>
      <p className="mt-3 text-sm font-bold leading-6 text-[#D8D8D8]">
        <span className="type-caret pr-1">{latest?.content ?? "Log honestly. The group sees momentum. The Warden sees patterns."}</span>
      </p>
      <p className="mt-3 text-[10px] font-black uppercase tracking-[0.28em] text-[#777]">Max 3 unprompted messages per day</p>
    </aside>
  );
}

function Landing() {
  return (
    <main className="poster-grid min-h-screen overflow-hidden bg-[#0D0D0D] text-white">
      <section className="container flex min-h-screen flex-col justify-between py-8">
        <nav className="flex items-center justify-between border-b border-[#2A2A2A] pb-5">
          <div>
            <MicroLabel tone="gold">6+1 Four Lives</MicroLabel>
            <p className="mt-2 text-sm font-black uppercase tracking-[0.22em] text-white">50 days. 4 lives. No hiding.</p>
          </div>
          <SharpButton onClick={() => (window.location.href = getLoginUrl())}>
            <UserRound className="h-4 w-4" /> Enter
          </SharpButton>
        </nav>
        <div className="grid items-end gap-10 py-14 lg:grid-cols-[1.12fr_0.88fr]">
          <div>
            <MicroLabel tone="red">Accountability with teeth</MicroLabel>
            <h1 className="mt-5 max-w-5xl text-6xl font-black uppercase leading-[0.82] tracking-[-0.08em] md:text-8xl lg:text-9xl">
              You are in. Now prove it.
            </h1>
            <p className="mt-7 max-w-2xl text-lg font-bold leading-8 text-[#BDBDBD]">
              Daily rules. Public pressure. Four lives. Offline Monzo penalties. Warden commentary. This is not a dashboard — it is the scoreboard for whether the group keeps its word.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <SharpButton onClick={() => (window.location.href = getLoginUrl())}>Start today’s log</SharpButton>
              <button className="min-h-12 border border-[#2A2A2A] bg-[#111] px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:border-[#C8A96E] hover:text-[#C8A96E]">
                See the rules
              </button>
            </div>
          </div>
          <div className="bg-[#2A2A2A] p-[2px]">
            {[
              ["01", "Six rules decide the day", GOLD],
              ["02", "Miss one and a life can go", RED],
              ["03", "The group sees the scoreboard", GREEN],
              ["04", "Ghost Life is one shot only", PURPLE],
            ].map(([number, copy, color]) => (
              <div key={number} className="mb-[2px] grid grid-cols-[76px_1fr] bg-[#101010] last:mb-0">
                <div className="grid place-items-center border-r border-[#2A2A2A] p-5 text-3xl font-black" style={{ color }}>{number}</div>
                <div className="p-5 text-lg font-black uppercase tracking-[-0.03em] text-white">{copy}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function RuleCard({
  title,
  label,
  complete,
  active,
  icon: Icon,
  onToggle,
  children,
}: {
  title: string;
  label: string;
  complete: boolean;
  active: boolean;
  icon: any;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <article className={classNames("border transition", complete ? "border-[#174D2B] bg-[#0F1E15]" : active ? "border-[#C8A96E] bg-[#14120B]" : "border-[#2A2A2A] bg-[#101010]")}> 
      <button className="flex w-full items-center justify-between gap-4 p-4 text-left" onClick={() => { pulse(12); onToggle(); }}>
        <div className="flex min-w-0 items-center gap-4">
          <div className={classNames("grid h-11 w-11 place-items-center border", complete ? "border-[#2ECC71] text-[#2ECC71]" : "border-[#343434] text-[#C8A96E]")}>{complete ? <Check className="h-5 w-5 animate-gold-pop" /> : <Icon className="h-5 w-5" />}</div>
          <div className="min-w-0">
            <MicroLabel tone={complete ? "green" : "gold"}>{label}</MicroLabel>
            <h3 className={classNames("mt-2 text-lg font-black uppercase tracking-[-0.04em] text-white", complete && "text-[#2ECC71] line-through decoration-[#2ECC71]/70")}>{title}</h3>
          </div>
        </div>
        {active ? <ChevronUp className="h-5 w-5 text-[#C8A96E]" /> : <ChevronDown className="h-5 w-5 text-[#777]" />}
      </button>
      {active && <div className="border-t border-[#2A2A2A] p-4">{children}</div>}
    </article>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <MicroLabel>{label}</MicroLabel>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={classNames("w-full border border-[#2A2A2A] bg-[#0D0D0D] px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-[#555] focus:border-[#C8A96E]", props.className)} />;
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={classNames("min-h-28 w-full border border-[#2A2A2A] bg-[#0D0D0D] px-4 py-3 text-sm font-bold leading-6 text-white outline-none transition placeholder:text-[#555] focus:border-[#C8A96E]", props.className)} />;
}

function MyDay({ snapshot, refetch }: { snapshot: Snapshot; refetch: () => void }) {
  const [form, setForm] = useState<MyDayForm>(emptyDay);
  const [openRule, setOpenRule] = useState<RuleKey>("exercise");
  const [lastMissed, setLastMissed] = useState<string[]>([]);
  const participant = snapshot?.participant;
  const latestWarden = [...(snapshot?.wardenMessages ?? [])].reverse()[0];
  const { rules, completedRules, allAddressed } = getDailyLogProgress(form);

  const submit = trpc.challenge.submitMyDay.useMutation({
    onSuccess: data => {
      setLastMissed(data.missedRules);
      pulse(data.complete ? [20, 40, 20] : [120, 40, 120]);
      toast.custom(() => (
        <div className="border border-[#C8A96E] bg-[#0D0D0D] p-4 text-white shadow-2xl">
          <p className="poster-label text-[#C8A96E]">Day submitted</p>
          <p className="mt-2 text-sm font-black uppercase tracking-[-0.02em]">{data.complete ? "Complete. Points added." : "Incomplete. Life-loss obligation logged."}</p>
        </div>
      ));
      refetch();
    },
    onError: error => toast.error(error.message),
  });
  const ghost = trpc.challenge.applyGhostLife.useMutation({
    onSuccess: () => {
      pulse([16, 35, 16]);
      toast("Ghost Life check complete.");
      refetch();
    },
    onError: error => toast.error(error.message),
  });

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <section className="space-y-5">
        <div className="border border-[#2A2A2A] bg-[#101010] p-5">
          <div className="grid gap-5 md:grid-cols-[1fr_320px]">
            <div>
              <MicroLabel tone="gold">Day {snapshot?.challenge.currentDay ?? "—"} / 50 · Today’s Log</MicroLabel>
              <h1 className="mt-3 text-5xl font-black uppercase leading-[0.86] tracking-[-0.08em] text-white md:text-7xl">Do the work. Log the proof.</h1>
              <p className="mt-4 max-w-2xl text-sm font-bold leading-6 text-[#A7A7A7]">This is the first screen because this is the only action that matters today. Address all six rules, submit once, then earn the right to check the leaderboard.</p>
            </div>
            <HealthBar lives={participant?.livesRemaining ?? 4} label="Your lives" />
          </div>
          <div className="mt-5 grid gap-2 bg-[#2A2A2A] p-[2px] sm:grid-cols-3">
            <PosterStat label="Rules addressed" value={`${completedRules}/6`} tone={allAddressed ? "green" : "gold"} />
            <PosterStat label="Current streak" value={participant?.currentStreak ?? 0} tone="green" />
            <PosterStat label="Points" value={participant?.totalPoints ?? 0} tone="gold" />
          </div>
        </div>

        <div className="space-y-2">
          <RuleCard title="No alcohol" label="Rule 01" icon={Shield} complete={form.noAlcohol} active={openRule === "noAlcohol"} onToggle={() => setOpenRule(openRule === "noAlcohol" ? "exercise" : "noAlcohol")}>
            <label className="flex items-center justify-between gap-4 border border-[#2A2A2A] bg-[#0D0D0D] p-4">
              <span className="text-sm font-black uppercase tracking-[0.12em] text-white">Kept clean today</span>
              <input type="checkbox" checked={form.noAlcohol} onChange={event => { pulse(18); setForm({ ...form, noAlcohol: event.target.checked }); }} className="h-5 w-5 accent-[#C8A96E]" />
            </label>
          </RuleCard>

          <RuleCard title="Clean eating" label="Rule 02" icon={Utensils} complete={form.cleanEating} active={openRule === "cleanEating"} onToggle={() => setOpenRule(openRule === "cleanEating" ? "exercise" : "cleanEating")}>
            <div className="space-y-3">
              <label className="flex items-center justify-between gap-4 border border-[#2A2A2A] bg-[#0D0D0D] p-4">
                <span className="text-sm font-black uppercase tracking-[0.12em] text-white">Food stayed inside the rules</span>
                <input type="checkbox" checked={form.cleanEating} onChange={event => { pulse(18); setForm({ ...form, cleanEating: event.target.checked }); }} className="h-5 w-5 accent-[#C8A96E]" />
              </label>
              <Field label="Optional food note"><TextInput value={form.cleanEatingNote} onChange={event => setForm({ ...form, cleanEatingNote: event.target.value })} placeholder="Anything the group should know?" /></Field>
            </div>
          </RuleCard>

          <RuleCard title="Exercise done" label="Rule 03" icon={Dumbbell} complete={rules[2].done} active={openRule === "exercise"} onToggle={() => setOpenRule(openRule === "exercise" ? "reflection" : "exercise")}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Minutes"><TextInput type="number" value={form.exerciseDuration} onChange={event => setForm({ ...form, exerciseDuration: Number(event.target.value) })} /></Field>
              <Field label="Workout type"><TextInput value={form.exerciseType} onChange={event => setForm({ ...form, exerciseType: event.target.value })} placeholder="Run, gym, mobility..." /></Field>
              <div className="sm:col-span-2">
                <Field label="Proof upload / link"><TextInput value={form.exerciseProofUrl} onChange={event => setForm({ ...form, exerciseProofUrl: event.target.value })} placeholder="Camera, library, Strava or proof note" /></Field>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" className="border border-[#C8A96E]/50 bg-[#16130B] px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-[#C8A96E]" onClick={() => pulse(12)}>Camera</button>
                  <button type="button" className="border border-[#2A2A2A] bg-[#111] px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-white" onClick={() => pulse(12)}>Library</button>
                </div>
              </div>
            </div>
          </RuleCard>

          <RuleCard title="Reflection shared" label="Rule 04" icon={MessageSquare} complete={rules[3].done} active={openRule === "reflection"} onToggle={() => setOpenRule(openRule === "reflection" ? "readTeach" : "reflection")}>
            <div className="space-y-3">
              <Field label="Daily reflection"><TextArea value={form.reflectionText} onChange={event => setForm({ ...form, reflectionText: event.target.value })} placeholder="What did today reveal?" /></Field>
              <label className="flex items-center justify-between gap-4 border border-[#2A2A2A] bg-[#0D0D0D] p-4">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-[#BDBDBD]">Share insight to Proof Feed</span>
                <input type="checkbox" checked={form.reflectionShared} onChange={event => { pulse(18); setForm({ ...form, reflectionShared: event.target.checked }); }} className="h-5 w-5 accent-[#C8A96E]" />
              </label>
            </div>
          </RuleCard>

          <RuleCard title="Read & Teach" label="Rule 05" icon={BookOpen} complete={rules[4].done} active={openRule === "readTeach"} onToggle={() => setOpenRule(openRule === "readTeach" ? "trackedEverything" : "readTeach")}>
            <Field label="Teach one useful idea"><TextArea value={form.readTeachText} onChange={event => setForm({ ...form, readTeachText: event.target.value })} placeholder="One useful idea for the group..." /></Field>
          </RuleCard>

          <RuleCard title="Track everything" label="Rule 06" icon={Activity} complete={form.trackedEverything} active={openRule === "trackedEverything"} onToggle={() => setOpenRule(openRule === "trackedEverything" ? "exercise" : "trackedEverything")}>
            <label className="flex items-center justify-between gap-4 border border-[#2A2A2A] bg-[#0D0D0D] p-4">
              <span className="text-sm font-black uppercase tracking-[0.12em] text-white">The day has been logged honestly</span>
              <input type="checkbox" checked={form.trackedEverything} onChange={event => { pulse(18); setForm({ ...form, trackedEverything: event.target.checked }); }} className="h-5 w-5 accent-[#C8A96E]" />
            </label>
          </RuleCard>
        </div>

        <div className="sticky bottom-[74px] z-20 border border-[#2A2A2A] bg-[#0D0D0D]/95 p-3 backdrop-blur md:static md:bg-transparent md:p-0">
          <SharpButton className="w-full py-5 text-sm" disabled={!allAddressed || submit.isPending} onClick={() => submit.mutate({ ...form, dayNumber: snapshot?.challenge.currentDay ?? 1 })}>
            {submit.isPending ? "Submitting" : allAddressed ? "Submit today" : `Address ${6 - completedRules} more`}
          </SharpButton>
          {lastMissed.length > 0 && <div className="mt-3 border-l-4 border-[#C0392B] bg-[#180F0F] p-4 text-sm font-bold text-[#F0B7AE]">Missed rules: {lastMissed.join(", ")}. A Monzo penalty obligation has been logged for founder confirmation.</div>}
        </div>
      </section>

      <aside className="space-y-5">
        <WardenPresence snapshot={snapshot} />
        <HealthBar lives={participant?.livesRemaining ?? 4} label="Lives remain" />
        <div className="border border-[#2A2A2A] bg-[#101010] p-4">
          <MicroLabel tone="purple">Ghost Life</MicroLabel>
          <p className="mt-3 text-2xl font-black uppercase leading-none text-white">One shot. No repeats.</p>
          <p className="mt-3 text-sm font-bold leading-6 text-[#999]">Double-down recovery requires 60 minutes exercise and 2 insights. Backend eligibility stays unchanged.</p>
          <SharpButton className="mt-4 w-full border-[#9B59B6] bg-[#9B59B6]" disabled={ghost.isPending || participant?.ghostLifeUsed} onClick={() => ghost.mutate({ exerciseDuration: form.exerciseDuration, insightCount: form.readTeachText.split(".").filter(Boolean).length })}>
            {participant?.ghostLifeUsed ? "Ghost used" : "Check ghost life"}
          </SharpButton>
        </div>
        <div className="border border-[#2A2A2A] bg-[#101010] p-4">
          <MicroLabel tone="red">Last Warden note</MicroLabel>
          <p className="mt-3 text-sm font-bold leading-6 text-[#BDBDBD]">{latestWarden?.content ?? "Nothing to hide behind. Log the day."}</p>
        </div>
      </aside>
    </div>
  );
}

function Overview({ snapshot }: { snapshot: Snapshot }) {
  const participants = snapshot?.participants ?? [];
  const logs = snapshot?.logs ?? [];
  const chartData = useMemo(() => {
    const dayCount = Math.max(snapshot?.challenge?.currentDay ?? 1, 10);
    return Array.from({ length: dayCount }, (_, index) => {
      const day = index + 1;
      const row: Record<string, number> = { day };
      participants.forEach((participant: any) => {
        row[participant.displayName] = logs.filter((log: any) => log.participantId === participant.id && log.dayNumber <= day && log.dayComplete).length;
      });
      return row;
    });
  }, [participants, logs, snapshot?.challenge?.currentDay]);

  return (
    <div className="space-y-5">
      <div className="grid gap-2 bg-[#2A2A2A] p-[2px] md:grid-cols-4">
        <PosterStat label="Challenge day" value={snapshot?.challenge?.currentDay ?? 1} tone="gold" />
        <PosterStat label="Participants" value={participants.length} tone="white" />
        <PosterStat label="Pending payments" value={(snapshot?.payments ?? []).filter((p: any) => p.status === "pending").length} tone="red" />
        <PosterStat label="Reward requests" value={(snapshot?.redemptions ?? []).filter((r: any) => r.status === "pending").length} tone="purple" />
      </div>
      <section className="border border-[#2A2A2A] bg-[#101010] p-5">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <MicroLabel tone="gold">Live tracker</MicroLabel>
            <h2 className="mt-2 text-3xl font-black uppercase tracking-[-0.06em] text-white">People plotted, not listed.</h2>
          </div>
          <p className="max-w-sm text-xs font-bold uppercase tracking-[0.14em] text-[#777]">Each line shows completed days by participant.</p>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ left: -20, right: 16, top: 10, bottom: 0 }}>
              <CartesianGrid stroke="#242424" strokeDasharray="3 3" />
              <XAxis dataKey="day" stroke="#777" tick={{ fill: "#777", fontSize: 11, fontWeight: 900 }} />
              <YAxis allowDecimals={false} stroke="#777" tick={{ fill: "#777", fontSize: 11, fontWeight: 900 }} />
              <Tooltip contentStyle={{ background: "#0D0D0D", border: "1px solid #C8A96E", borderRadius: 0, color: "#fff" }} />
              {participants.map((participant: any, index: number) => (
                <Line key={participant.id} type="monotone" dataKey={participant.displayName} stroke={chartColors[index % chartColors.length]} strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="border border-[#2A2A2A] bg-[#101010] p-5">
        <MicroLabel tone="red">Lives grid</MicroLabel>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {participants.map((p: any) => (
            <div key={p.id} className="border border-[#2A2A2A] bg-[#0D0D0D] p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="grid h-12 w-12 place-items-center border border-[#C8A96E] text-sm font-black text-[#C8A96E]">{p.avatarInitials}</span>
                <span className="poster-label text-[#C0392B]">{p.livesRemaining}/4</span>
              </div>
              <p className="mt-4 text-lg font-black uppercase text-white">{p.displayName}</p>
              <div className="mt-3"><HealthBar lives={p.livesRemaining} label="" compact /></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ParticipantSheet({ participant, onClose }: { participant: any; onClose: () => void }) {
  if (!participant) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70" onClick={onClose}>
      <div className="w-full border-t-2 border-[#C8A96E] bg-[#0D0D0D] p-5 shadow-2xl md:mx-auto md:mb-8 md:max-w-xl md:border" onClick={event => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <MicroLabel tone="gold">Participant stats</MicroLabel>
            <h3 className="mt-2 text-4xl font-black uppercase tracking-[-0.07em] text-white">{participant.displayName}</h3>
          </div>
          <button onClick={onClose} className="border border-[#2A2A2A] p-3 text-[#777] hover:border-[#C8A96E] hover:text-[#C8A96E]"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 bg-[#2A2A2A] p-[2px]">
          <PosterStat label="Points" value={participant.totalPoints} tone="gold" />
          <PosterStat label="Streak" value={participant.currentStreak} tone="green" />
          <PosterStat label="Days" value={participant.daysComplete} tone="white" />
        </div>
        <div className="mt-5"><HealthBar lives={participant.livesRemaining} label="Lives status" /></div>
      </div>
    </div>
  );
}

function Leaderboard({ snapshot }: { snapshot: Snapshot }) {
  const [selected, setSelected] = useState<any>(null);
  const ranked = [...(snapshot?.participants ?? [])].sort((a: any, b: any) => b.totalPoints - a.totalPoints || b.currentStreak - a.currentStreak);
  return (
    <section className="border border-[#2A2A2A] bg-[#101010] p-5">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <MicroLabel tone="gold">Leaderboard</MicroLabel>
          <h2 className="mt-2 text-4xl font-black uppercase leading-none tracking-[-0.07em] text-white">Tap a line. Feel the chase.</h2>
        </div>
        <p className="max-w-sm text-xs font-bold uppercase tracking-[0.14em] text-[#777]">Ranked by points first, then streak. Tap any row for the stat sheet.</p>
      </div>
      <div className="space-y-2">
        {ranked.map((p: any, index) => (
          <button key={p.id} onClick={() => { pulse(14); setSelected(p); }} className={classNames("grid w-full grid-cols-[56px_1fr_auto] items-center gap-4 border bg-[#0D0D0D] p-4 text-left transition hover:border-[#C8A96E]", index === 0 ? "border-l-4 border-l-[#C8A96E] border-[#3C3423]" : "border-[#2A2A2A]")}> 
            <span className={classNames("text-3xl font-black", index === 0 ? "text-[#C8A96E]" : "text-[#777]")}>#{index + 1}</span>
            <span>
              <span className="block text-xl font-black uppercase tracking-[-0.04em] text-white">{p.displayName}</span>
              <span className="mt-1 block text-xs font-bold uppercase tracking-[0.14em] text-[#777]">{p.currentStreak} day streak · {p.daysComplete} days complete</span>
              <span className="mt-3 block max-w-[260px]"><HealthBar lives={p.livesRemaining} label="" compact /></span>
            </span>
            <span className="text-right">
              <span className="block text-3xl font-black text-[#C8A96E]">{p.totalPoints}</span>
              <span className="poster-label text-[#777]">points</span>
            </span>
          </button>
        ))}
      </div>
      <ParticipantSheet participant={selected} onClose={() => setSelected(null)} />
    </section>
  );
}

function ProofFeed({ snapshot }: { snapshot: Snapshot }) {
  const publicLogs = (snapshot?.logs ?? []).filter((log: any) => log.reflectionShared || log.exerciseProofUrl || log.readTeachText);
  return (
    <section className="border border-[#2A2A2A] bg-[#101010] p-5">
      <MicroLabel tone="green">Proof feed</MicroLabel>
      <h2 className="mt-2 text-4xl font-black uppercase tracking-[-0.07em] text-white">Receipts. Insights. Momentum.</h2>
      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {publicLogs.map((log: any) => {
          const owner = snapshot?.participants.find((p: any) => p.id === log.participantId);
          return (
            <article key={log.id} className="border border-[#2A2A2A] bg-[#0D0D0D] p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center border border-[#C8A96E] text-xs font-black text-[#C8A96E]">{owner?.avatarInitials ?? "?"}</span>
                  <div>
                    <p className="font-black uppercase text-white">{owner?.displayName ?? "Participant"}</p>
                    <MicroLabel>Day {log.dayNumber}</MicroLabel>
                  </div>
                </div>
                <span className="border border-[#2ECC71]/50 bg-[#102018] px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-[#2ECC71]">Public</span>
              </div>
              {log.readTeachText && <p className="mt-4 border-l-2 border-[#C8A96E] pl-4 text-sm font-bold leading-6 text-[#D8D8D8]">{log.readTeachText}</p>}
              {log.reflectionShared && log.reflectionText && <p className="mt-3 text-sm font-bold leading-6 text-[#999]">{log.reflectionText}</p>}
              {log.exerciseProofUrl && <p className="mt-3 border border-[#2A2A2A] bg-[#111] p-3 text-xs font-bold text-[#C8A96E] break-all">Proof: {log.exerciseProofUrl}</p>}
            </article>
          );
        })}
        {publicLogs.length === 0 && <p className="border border-[#2A2A2A] bg-[#0D0D0D] p-6 text-sm font-bold uppercase tracking-[0.12em] text-[#777]">No public proof yet. The feed wakes up when people submit.</p>}
      </div>
    </section>
  );
}

function Rewards({ snapshot, refetch }: { snapshot: Snapshot; refetch: () => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [deliveryName, setDeliveryName] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const redeem = trpc.challenge.redeemReward.useMutation({ onSuccess: () => { pulse([15, 35, 15]); toast("Redemption request logged for founders."); refetch(); }, onError: e => toast.error(e.message) });
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
      <div className="grid gap-3 md:grid-cols-2">
        {snapshot?.rewards.map((reward: any) => (
          <button key={reward.id} className={classNames("border bg-[#101010] p-5 text-left transition hover:border-[#C8A96E]", selected === reward.id ? "border-[#C8A96E]" : "border-[#2A2A2A]")} onClick={() => { pulse(12); setSelected(reward.id); }}>
            <MicroLabel tone="gold">Pure Sport</MicroLabel>
            <h3 className="mt-3 text-2xl font-black uppercase tracking-[-0.05em] text-white">{reward.name}</h3>
            <p className="mt-3 text-sm font-bold leading-6 text-[#999]">{reward.description}</p>
            <p className="mt-5 text-3xl font-black text-[#C8A96E]">{reward.pointsCost}</p>
            <MicroLabel>points</MicroLabel>
          </button>
        ))}
      </div>
      <section className="border border-[#2A2A2A] bg-[#101010] p-5">
        <MicroLabel tone="purple">Request reward</MicroLabel>
        <h3 className="mt-2 text-3xl font-black uppercase tracking-[-0.06em] text-white">Earned, then fulfilled manually.</h3>
        <div className="mt-5 space-y-3">
          <Field label="Delivery name"><TextInput value={deliveryName} onChange={event => setDeliveryName(event.target.value)} /></Field>
          <Field label="Delivery address"><TextArea value={deliveryAddress} onChange={event => setDeliveryAddress(event.target.value)} /></Field>
          <SharpButton className="w-full" disabled={!selected || redeem.isPending} onClick={() => selected && redeem.mutate({ rewardId: selected, deliveryName, deliveryAddress, checkpointEarned: `Day ${snapshot?.challenge.currentDay ?? 1}` })}>Submit redemption</SharpButton>
        </div>
      </section>
    </div>
  );
}

function AdminPanel({ snapshot, refetch }: { snapshot: Snapshot; refetch: () => void }) {
  const confirmPayment = trpc.admin.confirmPayment.useMutation({ onSuccess: () => { toast("Payment marked received."); refetch(); } });
  const fulfill = trpc.admin.fulfillRedemption.useMutation({ onSuccess: () => { toast("Redemption marked fulfilled."); refetch(); } });
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="border border-[#2A2A2A] bg-[#101010] p-5">
        <MicroLabel tone="red">Monzo obligations</MicroLabel>
        <h2 className="mt-2 text-3xl font-black uppercase tracking-[-0.06em] text-white">Offline confirmation.</h2>
        <div className="mt-5 space-y-3">
          {snapshot?.payments.map((payment: any) => {
            const owner = snapshot?.participants.find((p: any) => p.id === payment.participantId);
            return (
              <div key={payment.id} className="border border-[#2A2A2A] bg-[#0D0D0D] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black uppercase text-white">{owner?.displayName ?? "Participant"}</p>
                    <p className="mt-2 text-sm font-bold text-[#C0392B]">£{(payment.amountPence / 100).toFixed(2)} · {payment.reason}</p>
                    <p className="mt-2 break-all text-xs font-bold text-[#777]">{payment.paymentLink}</p>
                  </div>
                  <span className="border border-[#2A2A2A] px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-[#C8A96E]">{payment.status}</span>
                </div>
                {payment.status === "pending" && <SharpButton className="mt-4 min-h-10 px-4 py-2" onClick={() => confirmPayment.mutate({ paymentId: payment.id })}>Mark received</SharpButton>}
              </div>
            );
          })}
        </div>
      </section>
      <section className="border border-[#2A2A2A] bg-[#101010] p-5">
        <MicroLabel tone="purple">Pure Sport</MicroLabel>
        <h2 className="mt-2 text-3xl font-black uppercase tracking-[-0.06em] text-white">Founder fulfilment.</h2>
        <div className="mt-5 space-y-3">
          {snapshot?.redemptions.map((request: any) => {
            const owner = snapshot?.participants.find((p: any) => p.id === request.participantId);
            const reward = snapshot?.rewards.find((r: any) => r.id === request.rewardId);
            return (
              <div key={request.id} className="border border-[#2A2A2A] bg-[#0D0D0D] p-4">
                <p className="font-black uppercase text-white">{owner?.displayName ?? "Participant"} · {reward?.name ?? "Reward"}</p>
                <p className="mt-2 text-sm font-bold text-[#999]">{request.checkpointEarned}</p>
                <p className="mt-2 whitespace-pre-wrap text-xs font-bold text-[#777]">{request.deliveryAddress}</p>
                {request.status === "pending" && <SharpButton className="mt-4 min-h-10 px-4 py-2" onClick={() => fulfill.mutate({ redemptionId: request.id })}>Mark fulfilled</SharpButton>}
              </div>
            );
          })}
        </div>
      </section>
      <section className="border border-[#2A2A2A] bg-[#101010] p-5 xl:col-span-2">
        <MicroLabel tone="red">Warden and WhatsApp context</MicroLabel>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          <div className="space-y-3">{snapshot?.wardenMessages.map((m: any) => <div key={m.id} className="border-l-4 border-[#C0392B] bg-[#130F0F] p-4"><MicroLabel tone="red">{m.mode}</MicroLabel><p className="mt-2 text-sm font-bold leading-6 text-[#D8D8D8]">{m.content}</p></div>)}</div>
          <div className="space-y-3">{snapshot?.chatHistory.map((m: any) => <div key={m.id} className="border border-[#2A2A2A] bg-[#0D0D0D] p-4"><p className="font-black uppercase text-white">{m.senderName || m.senderId}</p><p className="mt-2 text-sm font-bold text-[#999]">{m.messageText}</p></div>)}</div>
        </div>
      </section>
    </div>
  );
}

const tabs: Array<{ key: TabKey; label: string; icon: any }> = [
  { key: "myday", label: "My Day", icon: Lock },
  { key: "overview", label: "Overview", icon: Activity },
  { key: "leaderboard", label: "Board", icon: Trophy },
  { key: "proof", label: "Proof", icon: MessageSquare },
  { key: "rewards", label: "Rewards", icon: Gift },
  { key: "admin", label: "Founder", icon: Crown },
];

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("myday");
  const snapshotQuery = trpc.challenge.snapshot.useQuery(undefined, { enabled: isAuthenticated });
  const snapshot = snapshotQuery.data;

  if (loading) return <div className="poster-grid grid min-h-screen place-items-center bg-[#0D0D0D] text-sm font-black uppercase tracking-[0.24em] text-[#C8A96E]">Loading the challenge...</div>;
  if (!isAuthenticated) return <Landing />;

  const visibleTabs = tabs.filter(tab => tab.key !== "admin" || user?.role === "admin");

  return (
    <main className="poster-grid min-h-screen bg-[#0D0D0D] pb-24 text-white md:pb-0">
      <header className="sticky top-0 z-40 border-b border-[#2A2A2A] bg-[#0D0D0D]/95 backdrop-blur">
        <div className="container flex items-center justify-between gap-4 py-4">
          <button onClick={() => setActiveTab("myday")} className="flex items-center gap-3 text-left">
            <div className="grid h-11 w-11 place-items-center border border-[#C8A96E] font-black text-[#C8A96E]">6+1</div>
            <div>
              <MicroLabel tone="gold">Four Lives Challenge</MicroLabel>
              <p className="mt-1 hidden text-xs font-black uppercase tracking-[0.18em] text-white sm:block">Today’s log first. Everything else second.</p>
            </div>
          </button>
          <div className="flex items-center gap-3">
            <span className="hidden border border-[#2A2A2A] px-3 py-2 text-[9px] font-black uppercase tracking-[0.22em] text-[#777] sm:inline-block">{user?.role === "admin" ? "Founder" : "Participant"}</span>
            <button className="border border-[#2A2A2A] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white hover:border-[#C8A96E] hover:text-[#C8A96E]" onClick={() => logout()}>Logout</button>
          </div>
        </div>
      </header>

      <section className="container py-6 md:py-8">
        {snapshotQuery.isLoading ? (
          <div className="border border-[#2A2A2A] bg-[#101010] p-10 text-center text-sm font-black uppercase tracking-[0.22em] text-[#777]">Loading challenge data...</div>
        ) : (
          <>
            <div className="mb-5 hidden grid-cols-6 gap-[2px] bg-[#2A2A2A] p-[2px] md:grid">
              {visibleTabs.map(tab => {
                const Icon = tab.icon;
                const active = activeTab === tab.key;
                return (
                  <button key={tab.key} onClick={() => { pulse(10); setActiveTab(tab.key); }} className={classNames("flex items-center justify-center gap-2 bg-[#101010] px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition", active ? "text-[#C8A96E]" : "text-[#777] hover:text-white")}>
                    <Icon className="h-4 w-4" /> {tab.label}
                  </button>
                );
              })}
            </div>

            {activeTab === "myday" && <MyDay snapshot={snapshot} refetch={snapshotQuery.refetch} />}
            {activeTab === "overview" && <Overview snapshot={snapshot} />}
            {activeTab === "leaderboard" && <Leaderboard snapshot={snapshot} />}
            {activeTab === "proof" && <ProofFeed snapshot={snapshot} />}
            {activeTab === "rewards" && <Rewards snapshot={snapshot} refetch={snapshotQuery.refetch} />}
            {activeTab === "admin" && (user?.role === "admin" ? <AdminPanel snapshot={snapshot} refetch={snapshotQuery.refetch} /> : <div className="border border-[#2A2A2A] bg-[#101010] p-8"><MicroLabel tone="red">Restricted</MicroLabel><p className="mt-3 text-xl font-black uppercase text-white">Founder dashboard is restricted to admin users.</p></div>)}
          </>
        )}
      </section>

      <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-[#2A2A2A] bg-[#0D0D0D] md:hidden">
        {visibleTabs.filter(tab => tab.key !== "admin").map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => { pulse(10); setActiveTab(tab.key); }} className={classNames("flex flex-col items-center justify-center gap-1 border-r border-[#2A2A2A] px-2 py-3 text-[9px] font-black uppercase tracking-[0.12em]", active ? "border-t-2 border-t-[#C8A96E] text-[#C8A96E]" : "text-[#777]")}> 
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </nav>
    </main>
  );
}
