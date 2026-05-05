import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { clampLives, getDailyLogProgress } from "@/lib/challengeUi";
import { haptics } from "@/lib/haptics";
import { toast } from "sonner";
import {
  Activity,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Camera,
  Crown,
  Dumbbell,
  Flame,
  Gift,
  HeartPulse,
  Lock,
  Mail,
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
const BRAND_LOGO_URL = "/manus-storage/six-plus-one-brand-logo-visible_52856d30.webp";

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
  haptics.tap();
  if (Array.isArray(pattern) || pattern !== 18) {
    hapticFallback(pattern);
  }
}

function hapticFallback(pattern: number | number[] = 18) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

function AnimatedLoadPage({ label = "Loading the challenge" }: { label?: string }) {
  return (
    <div className="poster-grid animated-load-page grid min-h-screen place-items-center overflow-hidden bg-black text-white">
      <div className="load-mark" aria-hidden="true">6+1</div>
      <div className="load-lines" aria-hidden="true" />
      <div className="relative z-10 border border-[#191919] bg-black/62 px-6 py-5 text-center backdrop-blur-sm">
        <p className="poster-label text-[#211832]">Four Lives Challenge</p>
        <p className="mt-3 text-xs font-black uppercase tracking-[0.28em] text-[#C8A96E]">{label}</p>
      </div>
    </div>
  );
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


export function LogoMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={classNames("flex shrink-0 items-center justify-center overflow-hidden bg-black", compact ? "h-12 w-36 sm:w-44" : "h-16 w-48 sm:w-56")}>
      <img src={BRAND_LOGO_URL} alt="6+1 Four Lives Challenge logo" data-testid="brand-logo" className="h-full w-full object-contain drop-shadow-[0_0_18px_rgba(155,89,182,0.45)]" />
    </span>
  );
}

function ProfilePhoto({ participant, className = "h-11 w-11" }: { participant: any; className?: string }) {
  if (participant?.profilePhotoUrl) {
    return <img src={participant.profilePhotoUrl} alt={`${participant.displayName ?? "Participant"} profile`} className={classNames(className, "border border-[#C8A96E] object-cover")} />;
  }
  return <span className={classNames("grid place-items-center border border-[#C8A96E] text-xs font-black text-[#C8A96E]", className)}>{participant?.avatarInitials ?? "?"}</span>;
}

function SignupAccessForm() {
  const [email, setEmail] = useState("");
  const requestAccess = trpc.signup.requestAccess.useMutation({
    onSuccess: () => {
      haptics.success();
      toast("Request received. Founder approval happens in the database/admin queue.");
      setEmail("");
    },
    onError: error => {
      haptics.warning();
      toast(error.message || "Could not submit access request.");
    },
  });

  return (
    <form
      className="mt-8 border border-[#2A2A2A] bg-[#090909]/92 p-4 shadow-[0_18px_70px_rgba(0,0,0,0.42)] transition duration-500 hover:border-[#C8A96E]/70"
      onSubmit={event => {
        event.preventDefault();
        haptics.submit();
        requestAccess.mutate({ email, source: "landing-load-gate" });
      }}
    >
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center border border-[#C8A96E]/70 text-[#C8A96E]">
          <Mail className="h-4 w-4" />
        </div>
        <div>
          <MicroLabel tone="gold">Need access?</MicroLabel>
          <p className="mt-2 text-sm font-bold leading-6 text-[#AFAFAF]">
            Drop your email. The founder approves it from the database/admin section before you join the challenge.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          required
          type="email"
          value={email}
          onChange={event => setEmail(event.target.value)}
          placeholder="you@email.com"
          className="min-h-12 border border-[#2A2A2A] bg-black px-4 text-sm font-bold text-white outline-none transition placeholder:text-[#555] focus:border-[#C8A96E]"
        />
        <SharpButton type="submit" disabled={requestAccess.isPending} className="min-w-40">
          {requestAccess.isPending ? "Sending" : "Request access"}
        </SharpButton>
      </div>
      <button
        type="button"
        onClick={() => { haptics.tap(); window.location.href = getLoginUrl(); }}
        className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-[#777] transition hover:text-[#C8A96E]"
      >
        Already approved? Log in.
      </button>
    </form>
  );
}

function Landing() {
  return (
    <main className="poster-grid min-h-screen overflow-hidden bg-[#0D0D0D] text-white">
      <section className="container flex min-h-screen flex-col justify-between py-8">
        <nav className="flex items-center justify-between gap-4 border-b border-[#2A2A2A] pb-5">
          <div className="flex items-center gap-3">
            <LogoMark />
            <div>
              <MicroLabel tone="gold">6+1 Four Lives</MicroLabel>
              <p className="mt-2 text-sm font-black uppercase tracking-[0.22em] text-white">50 days. 4 lives. No hiding.</p>
            </div>
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
              <SharpButton onClick={() => { haptics.tap(); window.location.href = getLoginUrl(); }}>Start today’s log</SharpButton>
              <button onClick={() => haptics.tap()} className="min-h-12 border border-[#2A2A2A] bg-[#111] px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:border-[#C8A96E] hover:text-[#C8A96E]">
                See the rules
              </button>
            </div>
            <SignupAccessForm />
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
    <article className={classNames("border transition-all duration-300 hover:-translate-y-0.5", complete ? "border-[#174D2B] bg-[#0F1E15]" : active ? "border-[#C8A96E] bg-[#14120B] shadow-[0_18px_55px_rgba(200,169,110,0.08)]" : "border-[#2A2A2A] bg-[#101010]")}> 
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
      {active && <div className="rule-open border-t border-[#2A2A2A] p-4">{children}</div>}
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

function JournalReflectionCard({
  value,
  shared,
  onChange,
  onShareChange,
}: {
  value: string;
  shared: boolean;
  onChange: (value: string) => void;
  onShareChange: (shared: boolean) => void;
}) {
  const characterCount = value.trim().length;
  return (
    <div className="journal-letter-card group relative overflow-hidden border border-[#2A2A2A] bg-[#080808] p-4 transition duration-500 hover:border-[#C8A96E]/70">
      <div className="journal-letter-mark" aria-hidden="true">“</div>
      <div className="relative z-10 grid gap-4 md:grid-cols-[1fr_170px]">
        <label className="block">
          <MicroLabel tone="gold">Reflection</MicroLabel>
          <textarea
            value={value}
            onFocus={() => haptics.tap()}
            onChange={event => onChange(event.target.value)}
            placeholder="One honest line for the group."
            className="journal-letter-input mt-3 min-h-44 w-full resize-none border border-[#1F1F1F] bg-black/50 px-5 py-5 text-base font-extrabold leading-8 text-white outline-none transition duration-300 placeholder:text-[#4E4E4E] focus:border-[#C8A96E] focus:bg-black/80"
          />
        </label>
        <aside className="flex flex-col justify-between border border-[#1F1F1F] bg-[#0D0D0D]/90 p-4">
          <div>
            <MicroLabel tone={characterCount > 0 ? "green" : "muted"}>Signal</MicroLabel>
            <p className="mt-3 text-3xl font-black uppercase leading-none tracking-[-0.07em] text-white">{characterCount || "—"}</p>
            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#777]">chars</p>
          </div>
          <label className="mt-6 flex items-center justify-between gap-3 border-t border-[#242424] pt-4">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#BDBDBD]">Public</span>
            <input type="checkbox" checked={shared} onChange={event => { haptics.tap(); onShareChange(event.target.checked); }} className="h-5 w-5 accent-[#C8A96E]" />
          </label>
        </aside>
      </div>
    </div>
  );
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
              <MicroLabel tone="gold">Day {snapshot?.challenge.currentDay ?? "—"} / 50</MicroLabel>
              <h1 className="mt-3 text-5xl font-black uppercase leading-[0.86] tracking-[-0.08em] text-white md:text-7xl">Log today.</h1>
              <p className="mt-4 max-w-xl text-sm font-bold leading-6 text-[#A7A7A7]">Six checks. One submission. No hiding.</p>
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

          <RuleCard title="Exercise" label="Rule 03" icon={Dumbbell} complete={rules[2].done} active={openRule === "exercise"} onToggle={() => setOpenRule(openRule === "exercise" ? "reflection" : "exercise")}>
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

          <RuleCard title="Reflect" label="Rule 04" icon={MessageSquare} complete={rules[3].done} active={openRule === "reflection"} onToggle={() => setOpenRule(openRule === "reflection" ? "readTeach" : "reflection")}>
            <JournalReflectionCard
              value={form.reflectionText}
              shared={form.reflectionShared}
              onChange={reflectionText => setForm({ ...form, reflectionText })}
              onShareChange={reflectionShared => setForm({ ...form, reflectionShared })}
            />
          </RuleCard>

          <RuleCard title="Read & Teach" label="Rule 05" icon={BookOpen} complete={rules[4].done} active={openRule === "readTeach"} onToggle={() => setOpenRule(openRule === "readTeach" ? "trackedEverything" : "readTeach")}>
            <Field label="One useful idea"><TextArea value={form.readTeachText} onChange={event => setForm({ ...form, readTeachText: event.target.value })} placeholder="Teach the group one thing." /></Field>
          </RuleCard>

          <RuleCard title="Track everything" label="Rule 06" icon={Activity} complete={form.trackedEverything} active={openRule === "trackedEverything"} onToggle={() => setOpenRule(openRule === "trackedEverything" ? "exercise" : "trackedEverything")}>
            <label className="flex items-center justify-between gap-4 border border-[#2A2A2A] bg-[#0D0D0D] p-4">
              <span className="text-sm font-black uppercase tracking-[0.12em] text-white">Logged honestly</span>
              <input type="checkbox" checked={form.trackedEverything} onChange={event => { pulse(18); setForm({ ...form, trackedEverything: event.target.checked }); }} className="h-5 w-5 accent-[#C8A96E]" />
            </label>
          </RuleCard>
        </div>

        <div className={classNames("submit-dock sticky bottom-[74px] z-20 border border-[#2A2A2A] bg-[#0D0D0D]/95 p-3 backdrop-blur transition-all duration-300 md:static md:bg-transparent md:p-0", submit.isPending && "submit-dock-pending", allAddressed && !submit.isPending && "submit-dock-ready")}>
          <SharpButton className={classNames("w-full py-5 text-sm transition-all duration-300", submit.isPending && "submit-button-pending")} disabled={!allAddressed || submit.isPending} onClick={() => submit.mutate({ ...form, dayNumber: snapshot?.challenge.currentDay ?? 1 })}>
            {submit.isPending ? "Submitting the log" : allAddressed ? "Submit today" : `Address ${6 - completedRules} more`}
          </SharpButton>
          {lastMissed.length > 0 && <div className="mt-3 border-l-4 border-[#C0392B] bg-[#180F0F] p-4 text-sm font-bold text-[#F0B7AE]">Missed: {lastMissed.join(", ")}. Penalty logged.</div>}
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
                <ProfilePhoto participant={p} className="h-12 w-12" />
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
  const [visibleParticipant, setVisibleParticipant] = useState<any>(participant);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (participant) {
      setVisibleParticipant(participant);
      setClosing(false);
      return;
    }

    if (!visibleParticipant) return;
    const reducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setVisibleParticipant(null);
      setClosing(false);
      return;
    }

    setClosing(true);
    const timer = window.setTimeout(() => {
      setVisibleParticipant(null);
      setClosing(false);
    }, 240);
    return () => window.clearTimeout(timer);
  }, [participant, visibleParticipant]);

  if (!visibleParticipant) return null;
  return (
    <div className={classNames("sheet-backdrop fixed inset-0 z-50 flex items-end bg-black/70", closing && "sheet-backdrop-out")} onClick={onClose}>
      <div className={classNames("sheet-panel w-full border-t-2 border-[#C8A96E] bg-[#0D0D0D] p-5 shadow-2xl md:mx-auto md:mb-8 md:max-w-xl md:border", closing && "sheet-panel-out")} onClick={event => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <MicroLabel tone="gold">Participant stats</MicroLabel>
            <h3 className="mt-2 text-4xl font-black uppercase tracking-[-0.07em] text-white">{visibleParticipant.displayName}</h3>
          </div>
          <button onClick={onClose} className="border border-[#2A2A2A] p-3 text-[#777] hover:border-[#C8A96E] hover:text-[#C8A96E]"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 bg-[#2A2A2A] p-[2px]">
          <PosterStat label="Points" value={visibleParticipant.totalPoints} tone="gold" />
          <PosterStat label="Streak" value={visibleParticipant.currentStreak} tone="green" />
          <PosterStat label="Days" value={visibleParticipant.daysComplete} tone="white" />
        </div>
        <div className="mt-5"><HealthBar lives={visibleParticipant.livesRemaining} label="Lives status" /></div>
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
                  <ProfilePhoto participant={owner} className="h-11 w-11" />
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
      <section className={classNames("reward-detail-panel border border-[#2A2A2A] bg-[#101010] p-5 transition-all duration-300", selected ? "reward-detail-panel-open" : "reward-detail-panel-closed")}>
        <MicroLabel tone="gold">Redemption desk</MicroLabel>
        {selected ? (
          <div className="reward-detail-content">
            <h3 className="mt-2 text-3xl font-black uppercase tracking-[-0.06em] text-white">Earned, then fulfilled manually.</h3>
            <div className="mt-5 space-y-3">
              <Field label="Delivery name"><TextInput value={deliveryName} onChange={event => setDeliveryName(event.target.value)} /></Field>
              <Field label="Delivery address"><TextArea value={deliveryAddress} onChange={event => setDeliveryAddress(event.target.value)} /></Field>
              <SharpButton className="w-full" disabled={redeem.isPending} onClick={() => redeem.mutate({ rewardId: selected, deliveryName, deliveryAddress, checkpointEarned: `Day ${snapshot?.challenge.currentDay ?? 1}` })}>{redeem.isPending ? "Submitting redemption" : "Submit redemption"}</SharpButton>
            </div>
          </div>
        ) : (
          <div className="reward-detail-empty">
            <h3 className="mt-2 text-3xl font-black uppercase tracking-[-0.06em] text-white">Choose a reward to open the desk.</h3>
            <p className="mt-4 text-sm font-bold leading-6 text-[#777]">The delivery form stays closed until a Pure Sport reward is selected, keeping the redemption step intentional.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function OnboardingGate({ user, refetch }: { user: any; refetch: () => void }) {
  const [displayName, setDisplayName] = useState(user?.name || "");
  const [primaryGoal, setPrimaryGoal] = useState("");
  const [biggestObstacle, setBiggestObstacle] = useState("");
  const [trainingLevel, setTrainingLevel] = useState("building");
  const [motivationStyle, setMotivationStyle] = useState("direct");
  const [profilePhotoDataUrl, setProfilePhotoDataUrl] = useState<string | undefined>();
  const complete = trpc.challenge.completeOnboarding.useMutation({
    onSuccess: () => { haptics.success(); toast("Profile personalised. Welcome into the challenge."); refetch(); },
    onError: error => { haptics.warning(); toast(error.message || "Could not complete onboarding."); },
  });

  function handlePhoto(file?: File) {
    if (!file) return;
    if (!file.type.match(/^image\/(png|jpeg|webp)$/)) { toast.error("Use a PNG, JPG, or WEBP profile photo."); return; }
    if (file.size > 2_000_000) { toast.error("Profile photo must be under 2MB."); return; }
    const reader = new FileReader();
    reader.onload = () => setProfilePhotoDataUrl(String(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <main className="poster-grid min-h-screen bg-[#0D0D0D] text-white">
      <section className="container py-6 md:py-8">
        <div className="mb-6 flex items-center gap-3 border-b border-[#2A2A2A] pb-5">
          <LogoMark />
          <div>
            <MicroLabel tone="gold">6+1 entry gate</MicroLabel>
            <p className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-white">New email found. Personalise the challenge first.</p>
          </div>
        </div>
        <form className="mx-auto max-w-3xl border border-[#2A2A2A] bg-[#101010] p-5 shadow-[0_22px_90px_rgba(0,0,0,0.38)]" onSubmit={event => { event.preventDefault(); haptics.submit(); complete.mutate({ displayName, primaryGoal, biggestObstacle, trainingLevel: trainingLevel as any, motivationStyle: motivationStyle as any, profilePhotoDataUrl }); }}>
          <MicroLabel tone="red">Unknown email</MicroLabel>
          <h1 className="mt-3 text-5xl font-black uppercase leading-none tracking-[-0.08em] text-white">Make it yours.</h1>
          <p className="mt-4 text-sm font-bold leading-6 text-[#999]">{user?.email ?? "This account"} is signed in, but it is not yet recognised in the 6+1 platform. Answer the quick setup and the app will open with your profile, goal, and photo.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-[160px_1fr]">
            <label className="grid min-h-40 cursor-pointer place-items-center border border-dashed border-[#C8A96E]/70 bg-black/40 p-4 text-center text-[#C8A96E] transition hover:bg-[#17120A]">
              {profilePhotoDataUrl ? <img src={profilePhotoDataUrl} alt="Profile preview" className="h-28 w-28 object-cover" /> : <span className="flex flex-col items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em]"><Camera className="h-6 w-6" />Upload photo</span>}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={event => handlePhoto(event.target.files?.[0])} />
            </label>
            <div className="space-y-3">
              <Field label="Display name"><TextInput value={displayName} onChange={event => setDisplayName(event.target.value)} placeholder="How the board should show you" /></Field>
              <Field label="Main goal"><TextInput value={primaryGoal} onChange={event => setPrimaryGoal(event.target.value)} placeholder="Lose weight, rebuild discipline, build fitness..." /></Field>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Field label="Training level"><select value={trainingLevel} onChange={event => setTrainingLevel(event.target.value)} className="min-h-12 w-full border border-[#2A2A2A] bg-black px-4 text-sm font-bold text-white outline-none focus:border-[#C8A96E]"><option value="starting">Starting again</option><option value="building">Building consistency</option><option value="consistent">Already consistent</option><option value="advanced">Advanced</option></select></Field>
            <Field label="Motivation style"><select value={motivationStyle} onChange={event => setMotivationStyle(event.target.value)} className="min-h-12 w-full border border-[#2A2A2A] bg-black px-4 text-sm font-bold text-white outline-none focus:border-[#C8A96E]"><option value="direct">Direct pressure</option><option value="supportive">Supportive nudge</option><option value="competitive">Leaderboard chase</option><option value="quiet">Quiet accountability</option></select></Field>
          </div>
          <Field label="What usually gets in the way?"><TextArea value={biggestObstacle} onChange={event => setBiggestObstacle(event.target.value)} placeholder="Time, weekends, travel, stress, motivation dips..." /></Field>
          <SharpButton type="submit" disabled={complete.isPending} className="mt-5 w-full">{complete.isPending ? "Personalising" : "Enter personalised challenge"}</SharpButton>
        </form>
      </section>
    </main>
  );
}

function AdminPanel({ snapshot, refetch }: { snapshot: Snapshot; refetch: () => void }) {
  const confirmPayment = trpc.admin.confirmPayment.useMutation({ onSuccess: () => { haptics.success(); toast("Payment marked received."); refetch(); } });
  const fulfill = trpc.admin.fulfillRedemption.useMutation({ onSuccess: () => { haptics.success(); toast("Redemption marked fulfilled."); refetch(); } });
  const approveSignup = trpc.admin.approveSignup.useMutation({ onSuccess: () => { haptics.success(); toast("Access request approved."); refetch(); } });
  const rejectSignup = trpc.admin.rejectSignup.useMutation({ onSuccess: () => { haptics.warning(); toast("Access request rejected."); refetch(); } });
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
        <MicroLabel tone="gold">Access requests</MicroLabel>
        <h2 className="mt-2 text-3xl font-black uppercase tracking-[-0.06em] text-white">Approve the gate.</h2>
        <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-[#999]">
          Email-only requests land here and in the database. Approving marks the request as founder-cleared before the participant logs in.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {(snapshot?.signupRequests ?? []).length === 0 && (
            <div className="border border-[#2A2A2A] bg-[#0D0D0D] p-4 text-sm font-bold text-[#777]">No access requests yet.</div>
          )}
          {(snapshot?.signupRequests ?? []).map((request: any) => (
            <div key={request.id} className="border border-[#2A2A2A] bg-[#0D0D0D] p-4 transition duration-300 hover:border-[#C8A96E]/60">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="break-all font-black uppercase text-white">{request.email}</p>
                  <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#777]">{request.source} · {new Date(request.createdAt).toLocaleString()}</p>
                  {request.displayName && <p className="mt-3 text-sm font-black uppercase text-[#C8A96E]">{request.displayName}</p>}
                  {request.primaryGoal && <p className="mt-2 text-sm font-bold text-[#D8D8D8]">Goal: {request.primaryGoal}</p>}
                  {request.biggestObstacle && <p className="mt-2 text-xs font-bold leading-5 text-[#999]">Obstacle: {request.biggestObstacle}</p>}
                  {(request.trainingLevel || request.motivationStyle) && <p className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#777]">{request.trainingLevel} · {request.motivationStyle}</p>}
                </div>
                <span className={classNames("border px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em]", request.status === "approved" ? "border-[#2ECC71] text-[#2ECC71]" : request.status === "rejected" ? "border-[#C0392B] text-[#C0392B]" : "border-[#C8A96E] text-[#C8A96E]")}>{request.status}</span>
              </div>
              {request.status === "pending" && (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <SharpButton className="min-h-10 px-4 py-2" disabled={approveSignup.isPending} onClick={() => approveSignup.mutate({ requestId: request.id })}>Approve</SharpButton>
                  <button disabled={rejectSignup.isPending} className="min-h-10 border border-[#2A2A2A] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#C0392B] transition hover:border-[#C0392B] disabled:opacity-50" onClick={() => rejectSignup.mutate({ requestId: request.id })}>Reject</button>
                </div>
              )}
            </div>
          ))}
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
  const [entryVisible, setEntryVisible] = useState(() => typeof window !== "undefined" && window.sessionStorage.getItem("sixone-entry-seen") !== "true");
  const snapshotQuery = trpc.challenge.snapshot.useQuery(undefined, { enabled: isAuthenticated });
  const snapshot = snapshotQuery.data;

  useEffect(() => {
    if (loading || !entryVisible || typeof window === "undefined") return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(() => {
      window.sessionStorage.setItem("sixone-entry-seen", "true");
      setEntryVisible(false);
    }, prefersReducedMotion ? 120 : 950);
    return () => window.clearTimeout(timer);
  }, [entryVisible, loading]);

  if (loading || entryVisible) return <AnimatedLoadPage label={loading ? "Authenticating" : "Entering the log"} />;
  if (!isAuthenticated) return <Landing />;
  if (snapshot?.accessState?.status === "questionnaire_required") return <OnboardingGate user={user} refetch={snapshotQuery.refetch} />;

  const visibleTabs = tabs.filter(tab => tab.key !== "admin" || user?.role === "admin");

  return (
    <main className="poster-grid min-h-screen bg-[#0D0D0D] pb-24 text-white md:pb-0">
      <header className="sticky top-0 z-40 border-b border-[#2A2A2A] bg-[#0D0D0D]/95 backdrop-blur">
        <div className="container flex items-center justify-between gap-4 py-4">
          <button onClick={() => setActiveTab("myday")} className="flex items-center gap-3 text-left">
            <LogoMark compact />
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

            <div key={activeTab} className="tab-stage">
              {activeTab === "myday" && <MyDay snapshot={snapshot} refetch={snapshotQuery.refetch} />}
              {activeTab === "overview" && <Overview snapshot={snapshot} />}
              {activeTab === "leaderboard" && <Leaderboard snapshot={snapshot} />}
              {activeTab === "proof" && <ProofFeed snapshot={snapshot} />}
              {activeTab === "rewards" && <Rewards snapshot={snapshot} refetch={snapshotQuery.refetch} />}
              {activeTab === "admin" && (user?.role === "admin" ? <AdminPanel snapshot={snapshot} refetch={snapshotQuery.refetch} /> : <div className="border border-[#2A2A2A] bg-[#101010] p-8"><MicroLabel tone="red">Restricted</MicroLabel><p className="mt-3 text-xl font-black uppercase text-white">Founder dashboard is restricted to admin users.</p></div>)}
            </div>
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
