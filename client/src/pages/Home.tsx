import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { CalendarView } from "./Calendar";
import { trpc } from "@/lib/trpc";
import { DAILY_PASS_THRESHOLD, DAILY_RULE_COUNT, clampLives, getDailyLogProgress } from "@/lib/challengeUi";
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
  Calendar,
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

type TabKey = "myday" | "overview" | "leaderboard" | "proof" | "rewards" | "calendar" | "admin";

type RuleKey = keyof MyDayForm | "exercise" | "reflection" | "readTeach";

const GOLD = "#C8A96E";
const RED = "#C0392B";
const GREEN = "#2ECC71";
const PURPLE = "#9B59B6";
const chartColors = [GOLD, RED, GREEN, PURPLE, "#4CA3C9", "#E67E22", "#F1C40F", "#ECF0F1"];
// Use the optimized WebP logo through the same-origin image proxy so mobile browsers avoid the heavy PNG redirect path.
const BRAND_LOGO_STORAGE_KEY = "six-plus-one-reference-palette-logo-transparent-optimized_2e84b980.webp";
const BRAND_LOGO_STORAGE_URL = `/manus-storage/${BRAND_LOGO_STORAGE_KEY}`;
const BRAND_LOGO_URL = `/api/storage-image/${encodeURIComponent(BRAND_LOGO_STORAGE_KEY)}`;

function BrandLogoImageWithRetry({ alt, className = "h-full w-full object-contain", decorative = false, placement }: { alt: string; className?: string; decorative?: boolean; placement?: "top-left-corner" | "loading-page" }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        role={decorative ? undefined : "img"}
        aria-label={decorative ? undefined : alt}
        data-testid="brand-logo-fallback"
        data-logo-source="optimized-webp-fallback"
        data-logo-placement={placement}
        className={classNames("grid h-full w-full place-items-center bg-black text-center font-black uppercase tracking-[-0.16em] text-white", className)}
      >
        6+1
      </div>
    );
  }
  return (
    <img
      src={BRAND_LOGO_URL}
      alt={decorative ? "" : alt}
      data-testid="brand-logo"
      data-logo-source="optimized-webp-proxy"
      data-logo-storage-url={BRAND_LOGO_STORAGE_URL}
      data-logo-placement={placement}
      className={className}
      decoding="async"
      loading="eager"
      fetchPriority="high"
      onError={() => setFailed(true)}
    />
  );
}

function CleanBrandMark({ compact = false, decorative = false, placement }: { compact?: boolean; decorative?: boolean; placement?: "top-left-corner" | "loading-page" }) {
  return (
    <BrandLogoImageWithRetry
      alt="6+1 Four Lives Challenge logo"
      decorative={decorative}
      placement={placement}
      className={classNames(
        "brand-logo-image block h-full w-full object-contain",
        compact ? "max-h-12" : "max-h-32",
      )}
    />
  );
}

function proofImageSrc(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/manus-storage/")) return `/api/storage-image/${encodeURIComponent(trimmed.slice("/manus-storage/".length))}`;
  if (trimmed.startsWith("/api/storage-image/")) return encodeURI(trimmed);
  if (/^https?:\/\//i.test(trimmed) && /\.(png|jpe?g|webp)(\?|#|$)/i.test(trimmed)) return trimmed;
  return "";
}
const emptyDay: MyDayForm = {
  noAlcohol: false,
  cleanEating: false,
  cleanEatingNote: "",
  exerciseDuration: 0,
  exerciseType: "",
  exerciseProofUrl: "",
  reflectionText: "",
  reflectionShared: false,
  readTeachText: "",
  trackedEverything: false,
};

const DRAFT_STORAGE_PREFIX = "draft_6plus1";

function getDraftStorageKey(userId: string | number | undefined, dayNumber: number | undefined) {
  if (!userId || !dayNumber) return "";
  return `${DRAFT_STORAGE_PREFIX}_${userId}_day${dayNumber}`;
}

function dailyLogToForm(log: Partial<MyDayForm> | null | undefined): MyDayForm {
  if (!log) return emptyDay;
  return {
    noAlcohol: Boolean(log.noAlcohol),
    cleanEating: Boolean(log.cleanEating),
    cleanEatingNote: String(log.cleanEatingNote ?? ""),
    exerciseDuration: Number(log.exerciseDuration ?? 0),
    exerciseType: String(log.exerciseType ?? ""),
    exerciseProofUrl: String(log.exerciseProofUrl ?? ""),
    reflectionText: String(log.reflectionText ?? ""),
    reflectionShared: Boolean(log.reflectionShared),
    readTeachText: String(log.readTeachText ?? ""),
    trackedEverything: Boolean(log.trackedEverything),
  };
}

function hasDraftContent(draft: MyDayForm) {
  return draft.noAlcohol || draft.cleanEating || draft.cleanEatingNote.trim().length > 0 || draft.exerciseDuration > 0 || draft.exerciseType.trim().length > 0 || draft.exerciseProofUrl.trim().length > 0 || draft.reflectionText.trim().length > 0 || draft.reflectionShared || draft.readTeachText.trim().length > 0 || draft.trackedEverything;
}

function readStoredDraft(storageKey: string): MyDayForm | null {
  if (typeof window === "undefined" || !storageKey) return null;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { form?: Partial<MyDayForm> } | Partial<MyDayForm>;
    const restored = dailyLogToForm("form" in parsed && parsed.form ? parsed.form : parsed as Partial<MyDayForm>);
    return hasDraftContent(restored) ? restored : null;
  } catch {
    return null;
  }
}

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

function playAllGreenSubmitHaptic() {
  if (!haptics.submit()) {
    hapticFallback([28, 42, 28, 64, 72]);
  }
}

function playDoneCue() {
  if (typeof window === "undefined") return;
  const audioHost = window as typeof window & { webkitAudioContext?: typeof AudioContext };
  const AudioContextClass = audioHost.AudioContext ?? audioHost.webkitAudioContext;
  if (!AudioContextClass) return;

  try {
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(520, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(760, context.currentTime + 0.08);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.045, context.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.14);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.16);
  } catch {
    // Audio feedback is progressive enhancement only.
  }
}

function AnimatedLoadPage({ label = "Loading the challenge" }: { label?: string }) {
  return (
    <div className="poster-grid animated-load-page grid min-h-screen place-items-center overflow-hidden bg-black text-white">
      <div className="load-mark load-mark-image" aria-hidden="true">
        <CleanBrandMark decorative placement="loading-page" />
      </div>
      <div className="load-lines" aria-hidden="true" />
      <div className="load-crosshair" aria-hidden="true" />
      <div className="load-status-panel relative z-10 text-center">
        <p className="poster-label text-[#C8A96E]">Four Lives Challenge</p>
        <p className="mt-3 text-[10px] font-black uppercase tracking-[0.28em] text-white sm:text-xs">{label}</p>
        <div className="mt-5 h-[2px] w-full overflow-hidden bg-white/10" aria-hidden="true">
          <div className="load-progress h-full bg-[#C8A96E]" />
        </div>
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
    <span
      className={classNames(
        "brand-logo-shell brand-logo-top-left flex shrink-0 items-center justify-center overflow-visible",
        compact ? "h-12 w-[8.5rem] sm:h-12 sm:w-[9.75rem]" : "h-16 w-[10rem] sm:h-20 sm:w-[12.5rem]",
      )}
    >
      <CleanBrandMark compact={compact} placement="top-left-corner" />
    </span>
  );
}

function normaliseProfilePhotoUrl(value?: string | null) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";
  if (trimmed.startsWith("/manus-storage/")) return `/api/storage-image/${encodeURIComponent(trimmed.slice("/manus-storage/".length))}`;
  if (trimmed.startsWith("/api/storage-image/")) return encodeURI(trimmed);
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^data:image\/(png|jpeg|webp);base64,/i.test(trimmed)) return trimmed;
  return "";
}

function ProfilePhoto({ participant, className = "h-11 w-11", enlargeable = false, onOpen }: { participant: any; className?: string; enlargeable?: boolean; onOpen?: () => void }) {
  const photoUrl = normaliseProfilePhotoUrl(participant?.profilePhotoUrl);
  const image = photoUrl ? <img src={photoUrl} alt={`${participant?.displayName ?? "Participant"} profile`} className={classNames(className, "border border-[#C8A96E] bg-black object-cover")} loading="lazy" decoding="async" onError={event => { event.currentTarget.style.display = "none"; }} /> : <span className={classNames("grid place-items-center border border-[#C8A96E] bg-black text-xs font-black text-[#C8A96E]", className)} aria-label={`${participant?.displayName ?? "Participant"} initials`}>{participant?.avatarInitials ?? "?"}</span>;

  if (!enlargeable || !photoUrl || !onOpen) return image;

  return (
    <button type="button" className="group relative shrink-0 text-left" onClick={event => { event.stopPropagation(); pulse(12); onOpen(); }} aria-label={`Enlarge ${participant?.displayName ?? "participant"} display picture`}>
      {image}
      <span className="absolute inset-x-0 bottom-0 bg-black/70 px-1 py-0.5 text-center text-[8px] font-black uppercase tracking-[0.12em] text-[#C8A96E] opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">View</span>
    </button>
  );
}

function RewardVisual({ reward, compact = false }: { reward: any; compact?: boolean }) {
  return (
    <div className={classNames("relative overflow-hidden border border-[#C8A96E]/40 bg-[#070707]", compact ? "h-16 w-16 shrink-0" : "mb-4 aspect-[4/3] w-full")}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_18%,rgba(200,169,110,0.28),transparent_34%),linear-gradient(135deg,rgba(46,204,113,0.18),transparent_44%),linear-gradient(315deg,rgba(192,57,43,0.24),transparent_48%)]" />
      <div className="absolute inset-3 border border-white/10" />
      <div className="absolute left-3 top-3 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center border border-[#C8A96E] bg-black text-[#C8A96E]"><Gift className="h-4 w-4" /></span>
        {!compact && <span className="poster-label text-[#C8A96E]">Pure Sport</span>}
      </div>
      <div className="absolute bottom-3 left-3 right-3">
        <p className={classNames("font-black uppercase tracking-[-0.04em] text-white", compact ? "text-xs" : "text-lg")}>{reward?.name ?? "Reward"}</p>
        {!compact && <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#C8A96E]">{reward?.pointsCost ?? 0} points</p>}
      </div>
    </div>
  );
}

function scrollToEntryPanel() {
  haptics.tap();
  if (typeof document === "undefined") return;
  document.getElementById("site-entry-panel")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function SiteEntryPanel() {
  const [email, setEmail] = useState("");
  const utils = trpc.useUtils();
  const siteLogin = trpc.auth.siteLogin.useMutation({
    onSuccess: async data => {
      haptics.success();
      toast("Welcome back. You are in.");
      utils.auth.me.setData(undefined, data.user);
      await utils.auth.me.invalidate();
      await utils.challenge.snapshot.invalidate();
    },
    onError: error => {
      haptics.warning();
      toast(error.message || "Could not start your 6+1 session.");
    },
  });

  return (
    <section
      id="site-entry-panel"
      className="mt-8 scroll-mt-10 border border-[#2A2A2A] bg-[#090909]/94 p-4 shadow-[0_18px_70px_rgba(0,0,0,0.42)] transition duration-500 hover:border-[#C8A96E]/70 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center border border-[#C8A96E]/70 text-[#C8A96E]">
          <Mail className="h-4 w-4" />
        </div>
        <div>
          <MicroLabel tone="gold">Start here</MicroLabel>
          <p className="mt-2 text-sm font-bold leading-6 text-[#AFAFAF]">
            New challenger? Register on the dedicated page. Already made your profile? Log in with email only.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr]" data-testid="entry-choice-panel">
        <Link href="/register" className="group min-h-32 border border-[#C8A96E]/70 bg-[#C8A96E] p-4 text-left text-black transition hover:-translate-y-0.5 hover:shadow-[0_14px_40px_rgba(200,169,110,0.20)] focus:outline-none focus:ring-2 focus:ring-[#C8A96E] focus:ring-offset-2 focus:ring-offset-black">
          <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-black/60">New challenger</span>
          <span className="mt-2 block text-3xl font-black uppercase tracking-[-0.06em]">Register</span>
          <span className="mt-2 block text-xs font-black uppercase tracking-[0.12em] text-black/70">A focused page for the five setup questions.</span>
        </Link>

        <form
          className="border border-[#2A2A2A] bg-black p-4"
          data-testid="login-flow-panel"
          onSubmit={event => {
            event.preventDefault();
            haptics.submit();
            siteLogin.mutate({ email, mode: "login" });
          }}
        >
          <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-[#777]">Returning member</span>
          <span className="mt-2 block text-3xl font-black uppercase tracking-[-0.06em] text-white">Log in</span>
          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              required
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="you@email.com"
              aria-label="Returning member email"
              className="min-h-12 border border-[#2A2A2A] bg-[#0D0D0D] px-4 text-sm font-bold text-white outline-none transition placeholder:text-[#555] focus:border-[#C8A96E]"
            />
            <SharpButton type="submit" disabled={siteLogin.isPending} className="min-w-28">
              {siteLogin.isPending ? "Opening" : "Log in"}
            </SharpButton>
          </div>
          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.16em] text-[#777]">Email only. No questionnaire for existing members.</p>
        </form>
      </div>
    </section>
  );
}
const challengeStats = [
  ["DURATION", "50 Days"],
  ["LIVES", "4"],
  ["ENTRY", "No deposit"],
  ["FAIL COST", "£25"],
] as const;

const landingRules = [
  ["1", "🚫", "Forget the Alcohol", "Zero alcohol for the full 50 days. No exceptions for weekends, events, or celebrations. You don't need it.", "Full abstinence. 50 days."],
  ["2", "🥗", "We Don't Eat Junk", "Clean eating every day. No fast food, no processed snacks, no shortcuts. Eat like you mean it.", "Eat with intention. Every meal."],
  ["3", "🏃", "Exercise is a Privilege", "Minimum 30 minutes of intentional movement every single day. Not everyone can. You can. Act like it. Missing this loses a life.", "30 mins minimum. Any movement."],
  ["4", "📓", "Daily Reflection", "Write something every day. A thought, a lesson, a feeling. No minimum length. Just honesty on the page. Use your 6+1 journal.", "Journal daily. No length requirement."],
  ["5", "📖", "Read and Teach", "Read something every day and share one insight with the group. Book, article, podcast, conversation. The teaching part is what makes it stick. Bring it to the Sunday morning check in at 10:00am.", "1 insight shared daily to the group."],
  ["6", "📊", "Track Everything", "Log your activity on the tracker every day. If it isn't recorded, it didn't happen. The tracker is the source of truth.", "Daily log. No exceptions."],
] as const;

const dailyChecklist = [
  ["Forgot the alcohol today", "Zero. All day."],
  ["Didn't eat junk", "Clean eating all day"],
  ["Used the privilege", "Minimum 30 minutes any movement"],
  ["Reflected", "At least one honest thought written down"],
  ["Read and taught something", "One insight shared with the group"],
  ["Logged on tracker", "Activity recorded and up to date"],
] as const;

const journeySteps = [
  ["Day 1", "No upfront deposit. Challenge begins.", "Group chat active. Tracker live. No excuses from here."],
  ["Day 1–10", "Building the habit", "The hardest stretch. Routines are forming, resistance is highest. Lean on the group."],
  ["Weekly", "Sunday morning check in at 10:00am", "Every week without fail. Reflect on the week. Hold each other accountable. Recharge for what's ahead."],
  ["Day 25", "Halfway check-in", "Group check-in. Lives tallied. Momentum assessed. The second half starts here."],
  ["Day 40–50", "The final push", "You can see the finish line. This is where it separates the ones who said they would from the ones who did."],
  ["Day 50", "Challenge complete.", "Everyone who finished protects their lives and finishes with the group. The group celebrates together. You earned it."],
] as const;

const moverPrinciples = [
  "Respect yourself. Mind and body. Both.",
  "Exercise is a privilege. Make sure you get it in.",
  "Give gratitude. Every day you wake up is a reason.",
  "The giver is the receiver. The more you give, the more you get.",
  "Don't be scared to fail. Failure is just the beginning of figuring it out.",
  "Build. Share. Reflect. Then do it again.",
  "Look good. Feel good. The two are connected.",
  "Remember where you came from. Stay humble.",
  "Stay sharp. Be a student of life. Never stop learning.",
  "Winners always find a way. Always.",
  "I hear but I don't hear. Trust your instincts.",
  "If you're not premium, why are you getting premium me.",
] as const;

function LandingSection({ marker, title, children }: { marker: string; title: string; children: React.ReactNode }) {
  return (
    <section className="border border-[#2A2A2A] bg-[#101010]/88 p-4 sm:p-5">
      <div className="mb-4 flex items-end justify-between gap-4 border-b border-[#2A2A2A] pb-3">
        <h2 className="text-2xl font-black uppercase tracking-[-0.05em] text-white sm:text-3xl">{title}</h2>
        <span className="text-3xl font-black text-[#C8A96E]/40">{marker}</span>
      </div>
      {children}
    </section>
  );
}

function Landing() {
  const moneyCards = [
    ["UPFRONT DEPOSIT", "£0", "There is no £100 upfront deposit before the challenge starts. You enter without paying a deposit."],
    ["COST PER FAIL", "£25", "Every missed workout creates a £25 Monzo obligation. Miss 4 workouts and all 4 lives are gone."],
    ["IF YOU COMPLETE", "Lives kept", "Finish all 50 days with at least one life remaining and you complete the challenge with the group."],
  ] as const;

  return (
    <main className="poster-grid min-h-screen bg-[#0D0D0D] text-white">
      <section className="container py-5 sm:py-6">
        <nav className="flex flex-col items-start gap-4 overflow-hidden border-b border-[#2A2A2A] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex w-full min-w-0 items-center gap-3 sm:w-auto sm:gap-4">
            <LogoMark compact />
            <div className="min-w-0 flex-1">
              <MicroLabel tone="gold">6+1 4 Lives Challenge</MicroLabel>
              <p className="mt-2 max-w-[12.5rem] whitespace-normal break-words text-[0.68rem] font-black uppercase leading-4 tracking-[0.12em] text-white min-[380px]:max-w-[14.5rem] sm:max-w-none sm:text-sm sm:leading-5 sm:tracking-[0.22em]">4 Lives. 50 days. Make it count.</p>
            </div>
          </div>
          <SharpButton className="w-full sm:w-auto" onClick={scrollToEntryPanel}>
            <UserRound className="h-4 w-4" /> Register / Log in
          </SharpButton>
        </nav>

        <div className="grid gap-4 py-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)] xl:items-stretch">
          <section className="relative overflow-hidden border border-[#2A2A2A] bg-[#080808]/92 p-5 sm:p-6 lg:p-7">
                <div className="absolute -right-2 -top-10 text-[11rem] font-black leading-none tracking-[-0.14em] text-white/[0.025] sm:-right-8 sm:text-[14rem]" aria-hidden="true">4</div>
            <div className="relative z-10 flex h-full flex-col justify-between gap-6">
              <div>
                <MicroLabel tone="red">6+1 4 LIVES CHALLENGE</MicroLabel>
                <h1 className="mt-4 max-w-3xl text-6xl font-black uppercase leading-[0.78] tracking-[-0.1em] sm:text-8xl lg:text-9xl">
                  4<br />Lives.
                </h1>
                <p className="mt-5 max-w-full whitespace-normal break-words text-lg font-black leading-7 text-white sm:max-w-2xl sm:text-2xl sm:leading-8"><span className="block sm:inline">50 days. Make it count.</span><span className="block sm:inline sm:before:content-['\00a0']">Remember you're</span><span className="block sm:inline sm:before:content-['\00a0']">not a civilian.</span></p>
                <p className="mt-5 max-w-full whitespace-normal break-words text-sm font-bold leading-6 text-[#BDBDBD] sm:max-w-3xl sm:text-base sm:leading-7">6+1. There are 7 days in a week and every single one is an opportunity to be better. Not just for you. For the people next to you. Better everyday. Better together. You have 50 days. Make it count.</p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {challengeStats.map(([label, value]) => (
                  <div key={label} className="border border-[#2A2A2A] bg-[#111] p-3">
                    <MicroLabel tone="gold">{label}</MicroLabel>
                    <p className="mt-2 text-2xl font-black uppercase text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="grid gap-4">
            <SiteEntryPanel />
            <section className="border-l-4 border-[#C0392B] bg-[#130F0F] p-4">
              <MicroLabel tone="red">Your Lives</MicroLabel>
              <p className="mt-2 text-base font-black leading-7 text-white">Miss a workout. Lose a life. Lose 4 lives and you're done.</p>
              <div className="mt-4 grid grid-cols-4 gap-1 bg-[#2A2A2A] p-[2px]" aria-hidden="true">
                {Array.from({ length: 4 }).map((_, index) => <span key={index} className="h-7 bg-[#C0392B]" />)}
              </div>
            </section>
            <section className="border border-[#2A2A2A] bg-[#101010]/88 p-4">
              <div className="flex items-end justify-between gap-4 border-b border-[#2A2A2A] pb-3">
                <div>
                  <MicroLabel tone="gold">00 · What This Is</MicroLabel>
                  <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.05em] text-white">Tested together.</h2>
                </div>
                <span className="text-4xl font-black text-[#C8A96E]/35">00</span>
              </div>
              <div className="mt-4 space-y-3 text-sm font-bold leading-6 text-[#CFCFCF]">
                <p>The team only functions like a dream team when we are tested. We need to suffer together. That's what this challenge is about.</p>
                <p>50 days of mashing work. Side by side. The Movers holding each other to the standard we talk about. Not just on runs. Not just at events. Every. Single. Day.</p>
                <p>This challenge isn't for everyone. It's for the ones ready to mash work. The ones who understand that doing hard things is the price you pay to be the best version of yourself. Are you on it?</p>
              </div>
              <div className="mt-4 border border-[#C8A96E]/50 bg-black p-3">
                <MicroLabel tone="gold">Weekly Check In</MicroLabel>
                <p className="mt-2 text-sm font-black leading-6 text-white">Every Sunday morning at 10:00am. Show up. Be honest. Move forward.</p>
                <p className="mt-1 text-xs font-bold leading-5 text-[#BDBDBD]">Challenge each other to continue getting better.</p>
              </div>
            </section>
          </aside>
        </div>

        <div className="grid gap-4 pb-8">
          <section className="border border-[#2A2A2A] bg-[#101010]/88 p-4 sm:p-5">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#2A2A2A] pb-3">
              <div>
                <MicroLabel tone="gold">01 · The Rules</MicroLabel>
                <h2 className="mt-2 text-3xl font-black uppercase tracking-[-0.06em] text-white">Six rules. One source of truth.</h2>
              </div>
              <p className="max-w-xs text-[10px] font-black uppercase tracking-[0.18em] text-[#777]">Compact by default. Tap open for the exact brief.</p>
            </div>
            <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {landingRules.map(([number, icon, title, body, footer]) => (
                <details key={number} className="group border border-[#2A2A2A] bg-black p-4 open:border-[#C8A96E]/70">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                    <span>
                      <span className="poster-label text-[#C8A96E]">{number} · {footer}</span>
                      <span className="mt-2 block text-lg font-black uppercase tracking-[-0.04em] text-white">{title}</span>
                    </span>
                    <span className="grid h-10 w-10 shrink-0 place-items-center border border-[#2A2A2A] text-xl" aria-hidden="true">{icon}</span>
                  </summary>
                  <p className="mt-3 border-t border-[#2A2A2A] pt-3 text-sm font-bold leading-6 text-[#BDBDBD]">{body}</p>
                </details>
              ))}
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="border border-[#2A2A2A] bg-[#101010]/88 p-4 sm:p-5">
              <div className="flex items-end justify-between gap-4 border-b border-[#2A2A2A] pb-3">
                <div>
                  <MicroLabel tone="gold">02 · Daily Checklist</MicroLabel>
                  <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.05em] text-white">What must be true today.</h2>
                </div>
                <span className="text-4xl font-black text-[#C8A96E]/35">02</span>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {dailyChecklist.map(([title, detail]) => (
                  <div key={title} className="border border-[#2A2A2A] bg-black p-3">
                    <p className="text-sm font-black uppercase tracking-[-0.03em] text-white">{title}</p>
                    <p className="mt-1 text-xs font-bold text-[#BDBDBD]">{detail}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="border border-[#2A2A2A] bg-[#101010]/88 p-4 sm:p-5">
              <div className="flex items-end justify-between gap-4 border-b border-[#2A2A2A] pb-3">
                <div>
                  <MicroLabel tone="red">03 · The Lives System / 04 · The Money</MicroLabel>
                  <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.05em] text-white">The cost is visible.</h2>
                </div>
                <span className="text-4xl font-black text-[#C0392B]/35">03</span>
              </div>
              <p className="mt-4 text-sm font-bold leading-6 text-[#CFCFCF]">You start with 4 lives. The only way to lose a life is to miss your daily workout. Every life lost costs you £25. Lose all 4 and you're out.</p>
              <div className="mt-4 grid grid-cols-4 gap-2">
                {[["1", "STILL IN IT"], ["2", "STILL IN IT"], ["3", "LAST WARNING"], ["4", "GONE. DONE."]].map(([number, label]) => (
                  <div key={number} className="border border-[#2A2A2A] bg-black p-3">
                    <p className="text-2xl font-black text-[#C0392B]">{number}</p>
                    <p className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-white">{label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {moneyCards.map(([label, amount, body]) => (
                  <div key={label} className="border border-[#2A2A2A] bg-black p-3">
                    <MicroLabel tone="gold">{label}</MicroLabel>
                    <p className="mt-2 text-2xl font-black text-white">{amount}</p>
                    <p className="mt-2 text-xs font-bold leading-5 text-[#BDBDBD]">{body}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="border border-[#2A2A2A] bg-[#101010]/88 p-4 sm:p-5">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#2A2A2A] pb-3">
              <div>
                <MicroLabel tone="gold">05 · The Journey / The Movers</MicroLabel>
                <h2 className="mt-2 text-3xl font-black uppercase tracking-[-0.06em] text-white">From day one to the finish line.</h2>
              </div>
              <p className="max-w-sm text-[10px] font-black uppercase tracking-[0.18em] text-[#777]">Timeline and standards stay on one compact board.</p>
            </div>
            <div className="mt-4 grid gap-3 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2">
                {journeySteps.map(([day, title, detail]) => (
                  <article key={day} className="border border-[#2A2A2A] bg-black p-3">
                    <MicroLabel tone="gold">{day}</MicroLabel>
                    <h3 className="mt-2 text-sm font-black uppercase tracking-[-0.03em] text-white">{title}</h3>
                    <p className="mt-2 text-xs font-bold leading-5 text-[#BDBDBD]">{detail}</p>
                  </article>
                ))}
              </div>
              <details className="border border-[#2A2A2A] bg-black p-4 open:border-[#C8A96E]/70" open>
                <summary className="cursor-pointer list-none">
                  <MicroLabel tone="gold">The Movers · Rules for the Movers</MicroLabel>
                  <p className="mt-2 text-sm font-bold leading-6 text-[#CFCFCF]">These aren't challenge rules. These are the principles and standards we should live by. You're not a civilian.</p>
                </summary>
                <div className="mt-3 grid max-h-80 gap-2 overflow-auto pr-1 sm:grid-cols-2">
                  {moverPrinciples.map((principle, index) => (
                    <div key={principle} className="grid grid-cols-[2.5rem_1fr] border border-[#2A2A2A] bg-[#080808]">
                      <div className="grid place-items-center border-r border-[#2A2A2A] text-xs font-black text-[#C8A96E]">{String(index + 1).padStart(2, "0")}</div>
                      <p className="p-2 text-xs font-bold leading-5 text-white">{principle}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-sm font-black uppercase tracking-[-0.03em] text-white">Better everyday. Better together. This is what that looks like in practice.</p>
                <p className="mt-1 text-2xl font-black uppercase text-[#C8A96E]">6+1</p>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-white">4 LIVES CHALLENGE</p>
              </details>
            </div>
          </section>
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
    <article className={classNames("border transition-all duration-300 hover:-translate-y-0.5", complete ? "border-[#2ECC71] bg-[#0F1E15] shadow-[0_0_0_1px_rgba(46,204,113,0.2)]" : active ? "border-[#C0392B] bg-[#1A0D0A] shadow-[0_18px_55px_rgba(192,57,43,0.14)]" : "border-[#7A241B] bg-[#101010]")}> 
      <button className="flex w-full items-center justify-between gap-4 p-4 text-left" onClick={() => { pulse(12); onToggle(); }}>
        <div className="flex min-w-0 items-center gap-4">
          <div className={classNames("grid h-11 w-11 place-items-center border", complete ? "border-[#2ECC71] text-[#2ECC71]" : "border-[#343434] text-[#C8A96E]")}>{complete ? <Check className="h-5 w-5 animate-gold-pop" /> : <Icon className="h-5 w-5" />}</div>
          <div className="min-w-0">
            <MicroLabel tone={complete ? "green" : "red"}>{complete ? `${label} · done` : `${label} · must do`}</MicroLabel>
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
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const characterCount = value.trim().length;
  return (
    <div className="journal-letter-card group relative overflow-hidden border border-[#2A2A2A] bg-[#080808] p-4 transition duration-500 hover:border-[#C8A96E]/70">
      <div className="journal-letter-mark" aria-hidden="true">“</div>
      <div className="relative z-10 grid gap-4 md:grid-cols-[1fr_170px]">
        <label className="block min-w-0">
          <MicroLabel tone="gold">Reflection</MicroLabel>
          <textarea
            value={value}
            onFocus={() => haptics.tap()}
            onChange={event => onChange(event.target.value)}
            placeholder="One honest private line for the log."
            className="journal-letter-input mt-3 min-h-44 w-full resize-none border border-[#1F1F1F] bg-black/50 px-5 py-5 text-base font-extrabold leading-8 text-white outline-none transition duration-300 placeholder:text-[#4E4E4E] focus:border-[#C8A96E] focus:bg-black/80"
          />
        </label>
        <aside className="flex flex-col justify-between border border-[#1F1F1F] bg-[#0D0D0D]/90 p-4">
          <div>
            <MicroLabel tone={characterCount > 0 ? "green" : "muted"}>Private log</MicroLabel>
            <p className="mt-3 text-3xl font-black uppercase leading-none tracking-[-0.07em] text-white">{characterCount || "—"}</p>
            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#777]">chars</p>
          </div>
          <p className="mt-6 border-t border-[#242424] pt-4 text-[10px] font-black uppercase leading-5 tracking-[0.18em] text-[#BDBDBD]">No public reflection option. Saved privately to your challenge log.</p>
        </aside>
      </div>
    </div>
  );
}

function MyDay({ snapshot, refetch }: { snapshot: Snapshot; refetch: () => void }) {
  const [form, setForm] = useState<MyDayForm>(emptyDay);
  const [openRule, setOpenRule] = useState<RuleKey>("exercise");
  const [lastMissed, setLastMissed] = useState<string[]>([]);
  const [saveNotice, setSaveNotice] = useState<{ title: string; complete: boolean } | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const cameraProofInputRef = useRef<HTMLInputElement | null>(null);
  const libraryProofInputRef = useRef<HTMLInputElement | null>(null);
  const participant = snapshot?.participant;
  const currentDayNumber = snapshot?.challenge?.currentDay ?? 1;
  const draftStorageKey = getDraftStorageKey(participant?.userId ?? participant?.id, currentDayNumber);
  const latestWarden = [...(snapshot?.wardenMessages ?? [])].reverse()[0];
  const { rules, completedRules, allAddressed, passThreshold, totalRules } = getDailyLogProgress(form);
  const ghostLifeLocked = Boolean(participant?.ghostLifeUsed);

  useEffect(() => {
    setDraftReady(false);
    setDraftRestored(false);
    if (!draftStorageKey) {
      setForm(emptyDay);
      return;
    }

    const storedDraft = readStoredDraft(draftStorageKey);
    if (storedDraft) {
      setForm(storedDraft);
      setDraftRestored(true);
      window.setTimeout(() => setDraftRestored(false), 2600);
      setDraftReady(true);
      return;
    }

    setForm(dailyLogToForm(snapshot?.myLog));
    setDraftReady(true);
  }, [draftStorageKey, snapshot?.myLog]);

  useEffect(() => {
    if (typeof window === "undefined" || !draftReady || !draftStorageKey) return;
    const timeout = window.setTimeout(() => {
      if (hasDraftContent(form)) {
        window.localStorage.setItem(draftStorageKey, JSON.stringify({ savedAt: Date.now(), form }));
      } else {
        window.localStorage.removeItem(draftStorageKey);
      }
    }, 800);
    return () => window.clearTimeout(timeout);
  }, [draftReady, draftStorageKey, form]);

  const submit = trpc.challenge.submitMyDay.useMutation({
    onSuccess: data => {
      setLastMissed(data.deadlinePassed ? data.missedRules : []);
      if (data.complete) {
        playAllGreenSubmitHaptic();
        playDoneCue();
      } else {
        pulse([18, 28, 45]);
      }
      setSaveNotice({
        title: data.complete ? "Submitted" : "Saved",
        complete: data.complete,
      });
      if (draftStorageKey && typeof window !== "undefined") {
        window.localStorage.removeItem(draftStorageKey);
      }
      window.setTimeout(() => setSaveNotice(null), 2200);
      refetch();
    },
    onError: error => toast.error(error.message),
  });
  const ghost = trpc.challenge.applyGhostLife.useMutation({
    onSuccess: data => {
      pulse(data.applied ? [22, 40, 22, 80, 22] : [90, 35, 90]);
      toast(data.applied ? "Purple Ghost Life restored. This one-shot is now used." : "Ghost Life not applied — it only works once after a life has been lost.");
      refetch();
    },
    onError: error => toast.error(error.message),
  });
  const uploadProof = trpc.challenge.uploadProof.useMutation({
    onSuccess: data => {
      setForm(current => ({ ...current, exerciseProofUrl: data.url }));
      pulse([12, 28, 12]);
      toast("Proof image uploaded and attached to today’s exercise log.");
    },
    onError: error => toast.error(error.message || "Could not upload proof image."),
  });

  function markChecklistItem(key: "noAlcohol" | "cleanEating" | "trackedEverything", checked: boolean) {
    pulse(checked ? [18, 30, 18] : 12);
    if (checked) playDoneCue();
    setForm(current => ({ ...current, [key]: checked }));
  }

  function handleProofFile(file?: File) {
    if (!file) return;
    if (!file.type.match(/^image\/(png|jpeg|webp)$/)) { toast.error("Use a PNG, JPG, or WEBP proof image."); return; }
    if (file.size > 4_000_000) { toast.error("Proof image must be under 4MB."); return; }
    const reader = new FileReader();
    const mimeType = file.type as "image/png" | "image/jpeg" | "image/webp";
    reader.onload = () => uploadProof.mutate({ fileName: file.name || "exercise-proof", mimeType, dataUrl: String(reader.result) });
    reader.onerror = () => toast.error("Could not read that proof image.");
    reader.readAsDataURL(file);
  }

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
            <PosterStat label="Rules addressed" value={`${completedRules}/${totalRules}`} tone={allAddressed ? "green" : "gold"} />
            <PosterStat label="Current streak" value={participant?.currentStreak ?? 0} tone="green" />
            <PosterStat label="Points" value={participant?.totalPoints ?? 0} tone="gold" />
          </div>
        </div>

        <div className={classNames("must-do-rules border-2 p-3 transition-all duration-300 sm:p-4", allAddressed ? "must-do-rules-complete border-[#2ECC71] bg-[#07150D]" : "border-[#C0392B] bg-[#190B0A]")}> 
          <div className="mb-3 flex flex-col gap-2 border-b border-white/10 pb-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <MicroLabel tone={allAddressed ? "green" : "red"}>{allAddressed ? "Pass secured" : "Must-do today"}</MicroLabel>
              <h2 className="mt-2 text-2xl font-black uppercase leading-none tracking-[-0.06em] text-white">Six rules. Five gets the day.</h2>
            </div>
            <div className={classNames("border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em]", allAddressed ? "border-[#2ECC71] bg-[#0F2A18] text-[#2ECC71]" : "border-[#C0392B] bg-[#2A0F0C] text-[#FFB3A8]")}>{allAddressed ? `${completedRules}/${totalRules} passed` : `${Math.max(0, passThreshold - completedRules)} more for pass`}</div>
          </div>
          {allAddressed && <div className="mb-3 border border-[#2ECC71]/50 bg-[#0F2A18] p-3 text-xs font-black uppercase tracking-[0.16em] text-[#2ECC71]">5/6 is a pass. Submit the day.</div>}
          <div className="space-y-2">
          <RuleCard title="No alcohol" label="Rule 01" icon={Shield} complete={form.noAlcohol} active={openRule === "noAlcohol"} onToggle={() => setOpenRule(openRule === "noAlcohol" ? "exercise" : "noAlcohol")}>
            <label className="flex items-center justify-between gap-4 border border-[#2A2A2A] bg-[#0D0D0D] p-4">
              <span className="text-sm font-black uppercase tracking-[0.12em] text-white">Kept clean today</span>
              <input type="checkbox" checked={form.noAlcohol} onChange={event => markChecklistItem("noAlcohol", event.target.checked)} className="h-6 w-6 accent-[#2ECC71]" />
            </label>
          </RuleCard>

          <RuleCard title="Clean eating" label="Rule 02" icon={Utensils} complete={form.cleanEating} active={openRule === "cleanEating"} onToggle={() => setOpenRule(openRule === "cleanEating" ? "exercise" : "cleanEating")}>
            <div className="space-y-3">
              <label className="flex items-center justify-between gap-4 border border-[#2A2A2A] bg-[#0D0D0D] p-4">
                <span className="text-sm font-black uppercase tracking-[0.12em] text-white">Food stayed inside the rules</span>
                <input type="checkbox" checked={form.cleanEating} onChange={event => markChecklistItem("cleanEating", event.target.checked)} className="h-6 w-6 accent-[#2ECC71]" />
              </label>
              <Field label="Optional food note"><TextInput value={form.cleanEatingNote} onChange={event => setForm({ ...form, cleanEatingNote: event.target.value })} placeholder="Anything the group should know?" /></Field>
            </div>
          </RuleCard>

          <RuleCard title="Exercise" label="Rule 03" icon={Dumbbell} complete={rules[2].done} active={openRule === "exercise"} onToggle={() => setOpenRule(openRule === "exercise" ? "reflection" : "exercise")}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Minutes"><TextInput type="number" value={form.exerciseDuration || ""} onChange={event => setForm({ ...form, exerciseDuration: event.target.value === "" ? 0 : Number(event.target.value) })} placeholder="30+" /></Field>
              <Field label="Workout type"><TextInput value={form.exerciseType} onChange={event => setForm({ ...form, exerciseType: event.target.value })} placeholder="Run, gym, mobility..." /></Field>
              <div className="sm:col-span-2">
                <Field label="Proof image / link"><TextInput value={form.exerciseProofUrl} onChange={event => setForm({ ...form, exerciseProofUrl: event.target.value })} placeholder="Upload a gym proof image, paste Strava, or add a proof note" /></Field>
                <input ref={cameraProofInputRef} type="file" accept="image/png,image/jpeg,image/webp" capture="environment" className="sr-only" onChange={event => { handleProofFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />
                <input ref={libraryProofInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={event => { handleProofFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" disabled={uploadProof.isPending} className="border border-[#C8A96E]/50 bg-[#16130B] px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-[#C8A96E] disabled:opacity-50" onClick={() => { pulse(12); cameraProofInputRef.current?.click(); }}>{uploadProof.isPending ? "Uploading" : "Camera"}</button>
                  <button type="button" disabled={uploadProof.isPending} className="border border-[#2A2A2A] bg-[#111] px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-white disabled:opacity-50" onClick={() => { pulse(12); libraryProofInputRef.current?.click(); }}>{uploadProof.isPending ? "Uploading" : "Library"}</button>
                </div>
                {form.exerciseProofUrl.startsWith("/manus-storage/") && <p className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#2ECC71]">Image attached</p>}
              </div>
            </div>
          </RuleCard>

          <RuleCard title="Reflect" label="Rule 04" icon={MessageSquare} complete={rules[3].done} active={openRule === "reflection"} onToggle={() => setOpenRule(openRule === "reflection" ? "readTeach" : "reflection")}>
            <JournalReflectionCard
              value={form.reflectionText}
              onChange={reflectionText => setForm({ ...form, reflectionText, reflectionShared: false })}
            />
          </RuleCard>

          <RuleCard title="Read & Teach" label="Rule 05" icon={BookOpen} complete={rules[4].done} active={openRule === "readTeach"} onToggle={() => setOpenRule(openRule === "readTeach" ? "trackedEverything" : "readTeach")}>
            <Field label="One useful idea"><TextArea value={form.readTeachText} onChange={event => setForm({ ...form, readTeachText: event.target.value })} placeholder="Teach the group one thing." /></Field>
          </RuleCard>

          <RuleCard title="Track everything" label="Rule 06" icon={Activity} complete={form.trackedEverything} active={openRule === "trackedEverything"} onToggle={() => setOpenRule(openRule === "trackedEverything" ? "exercise" : "trackedEverything")}>
            <label className="flex items-center justify-between gap-4 border border-[#2A2A2A] bg-[#0D0D0D] p-4">
              <span className="text-sm font-black uppercase tracking-[0.12em] text-white">Logged honestly</span>
              <input type="checkbox" checked={form.trackedEverything} onChange={event => markChecklistItem("trackedEverything", event.target.checked)} className="h-6 w-6 accent-[#2ECC71]" />
            </label>
          </RuleCard>
          </div>
        </div>

        <div className={classNames("submit-dock relative sticky bottom-[74px] z-20 border border-[#2A2A2A] bg-[#0D0D0D]/95 p-3 backdrop-blur transition-all duration-300 md:static md:bg-transparent md:p-0", submit.isPending && "submit-dock-pending", allAddressed && !submit.isPending && "submit-dock-ready")}>
          <SharpButton className={classNames("w-full py-5 text-sm transition-all duration-300", submit.isPending && "submit-button-pending")} disabled={submit.isPending} onClick={() => submit.mutate({ ...form, reflectionShared: false, dayNumber: snapshot?.challenge.currentDay ?? 1 })}>
            {submit.isPending ? (allAddressed ? "Submitting the log" : "Saving progress") : allAddressed ? `Submit day ${snapshot?.challenge.currentDay ?? 1}` : `Save progress — ${Math.max(0, passThreshold - completedRules)} more for pass`}
          </SharpButton>
          {!allAddressed && <p className="mt-2 text-center text-[10px] font-black uppercase tracking-[0.16em] text-[#C8A96E]/80">Draft only until 5/6 is reached. Lives judged after rollover.</p>}
          {saveNotice && <div role="status" className={classNames("pointer-events-none absolute -top-3 right-3 rounded-full border bg-black/90 px-2 py-1 text-[9px] font-black uppercase leading-none tracking-[0.16em] shadow-[0_0_18px_rgba(0,0,0,0.45)]", saveNotice.complete ? "border-[#2ECC71]/70 text-[#2ECC71]" : "border-[#C8A96E]/70 text-[#C8A96E]")}>{saveNotice.title}</div>}
          {draftRestored && <div role="status" className="pointer-events-none absolute -top-3 left-3 rounded-full border border-[#C8A96E]/70 bg-black/90 px-2 py-1 text-[9px] font-black uppercase leading-none tracking-[0.16em] text-[#C8A96E] shadow-[0_0_18px_rgba(0,0,0,0.45)]">Draft restored</div>}
          {lastMissed.length > 0 && <div className="mt-3 border-l-4 border-[#C0392B] bg-[#180F0F] p-4 text-sm font-bold text-[#F0B7AE]">Missed after rollover: {lastMissed.join(", ")}. Penalty logged.</div>}
        </div>
      </section>

      <aside className="space-y-5">
        <WardenPresence snapshot={snapshot} />
        <HealthBar lives={participant?.livesRemaining ?? 4} label="Lives remain" />
        <div className={classNames("border p-4 transition", ghostLifeLocked ? "border-[#4A315D] bg-[#120F18] opacity-80" : "border-[#2A2A2A] bg-[#101010]")} data-ghost-life-state={ghostLifeLocked ? "locked" : "available"}>
          <div className="flex items-start justify-between gap-3">
            <MicroLabel tone="purple">Ghost Life</MicroLabel>
            {ghostLifeLocked && <span className="border border-[#9B59B6]/60 bg-[#1B1024] px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#D8B4FE]">Locked</span>}
          </div>
          <p className="mt-3 text-2xl font-black uppercase leading-none text-white">{ghostLifeLocked ? "Used. Locked." : "One shot. No repeats."}</p>
          <p className="mt-3 text-sm font-bold leading-6 text-[#999]">{ghostLifeLocked ? "Your Purple Ghost Life has already restored a life. It is now locked for the rest of the challenge." : "Tap once after a lost life to restore one purple Ghost Life. It cannot be used twice."}</p>
          <SharpButton className={classNames("mt-4 w-full", ghostLifeLocked ? "border-[#4A315D] bg-[#1B1420] text-[#8D7898] shadow-none" : "border-[#9B59B6] bg-[#9B59B6] text-white shadow-[0_0_28px_rgba(155,89,182,0.24)]")} disabled={ghost.isPending || ghostLifeLocked} aria-disabled={ghostLifeLocked} onClick={() => ghost.mutate({ exerciseDuration: form.exerciseDuration, insightCount: form.readTeachText.split(".").filter(Boolean).length })}>
            {ghostLifeLocked ? "Ghost Life locked" : ghost.isPending ? "Summoning ghost life" : "Use purple Ghost Life"}
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

function pct(part: number, whole: number) {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

function OverviewMetricCard({ label, value, detail, tone = "gold" }: { label: string; value: string | number; detail: string; tone?: "gold" | "red" | "green" | "purple" | "white" }) {
  const tones = {
    gold: "text-[#C8A96E] border-[#C8A96E]/45 bg-[#16130B]",
    red: "text-[#C0392B] border-[#C0392B]/45 bg-[#190B0A]",
    green: "text-[#2ECC71] border-[#2ECC71]/45 bg-[#07150D]",
    purple: "text-[#9B59B6] border-[#9B59B6]/45 bg-[#150E1A]",
    white: "text-white border-[#444] bg-[#111]",
  };
  return (
    <article className={classNames("border p-4", tones[tone])}>
      <MicroLabel tone={tone === "white" ? "muted" : tone}>{label}</MicroLabel>
      <p className="mt-3 text-4xl font-black uppercase leading-none tracking-[-0.08em]">{value}</p>
      <p className="mt-3 text-[10px] font-black uppercase leading-5 tracking-[0.14em] text-[#BDBDBD]">{detail}</p>
    </article>
  );
}

function OverviewBar({ label, value, detail, tone = "gold" }: { label: string; value: number; detail: string; tone?: "gold" | "red" | "green" | "purple" }) {
  const fill = tone === "green" ? "bg-[#2ECC71]" : tone === "red" ? "bg-[#C0392B]" : tone === "purple" ? "bg-[#9B59B6]" : "bg-[#C8A96E]";
  return (
    <div className="border border-[#2A2A2A] bg-black p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white">{label}</p>
        <span className="text-sm font-black text-[#C8A96E]">{value}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden bg-[#242424]" aria-hidden="true">
        <div className={classNames("h-full", fill)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#777]">{detail}</p>
    </div>
  );
}

function Overview({ snapshot }: { snapshot: Snapshot }) {
  const [selected, setSelected] = useState<any>(null);
  const participants = snapshot?.participants ?? [];
  const logs = snapshot?.logs ?? [];
  const payments = snapshot?.payments ?? [];
  const redemptions = snapshot?.redemptions ?? [];
  const currentDay = Math.max(Number(snapshot?.challenge?.currentDay ?? 1), 1);
  const participantCount = participants.length;
  const expectedSlots = participantCount * currentDay;
  const completedLogs = logs.filter((log: any) => log.dayComplete);
  const todayLogs = logs.filter((log: any) => log.dayNumber === currentDay);
  const todayComplete = todayLogs.filter((log: any) => log.dayComplete).length;
  const yesterdayLogs = logs.filter((log: any) => log.dayNumber === currentDay - 1);
  const yesterdayComplete = yesterdayLogs.filter((log: any) => log.dayComplete).length;
  const totalLivesLost = participants.reduce((sum: number, p: any) => sum + Math.max(0, 4 - Number(p.livesRemaining ?? 4)), 0);
  const averageStreak = participantCount ? Math.round(participants.reduce((sum: number, p: any) => sum + Number(p.currentStreak ?? 0), 0) / participantCount) : 0;
  const strongestStreak = participants.reduce((max: number, p: any) => Math.max(max, Number(p.currentStreak ?? 0), Number(p.longestStreak ?? 0)), 0);
  const pendingPayments = payments.filter((p: any) => p.status === "pending").length;
  const pendingRewards = redemptions.filter((r: any) => r.status === "pending").length;
  const todayLoggedIds = new Set(todayLogs.map((log: any) => log.participantId));
  const atRisk = participants.filter((p: any) => Number(p.livesRemaining ?? 4) <= 1 || !todayLoggedIds.has(p.id));

  const chartKeys = participants.map((participant: any, index: number) => ({ ...participant, chartKey: `participant_${participant.id ?? index}` }));
  const chartData = useMemo(() => {
    const dayCount = Math.max(currentDay, 10);
    return Array.from({ length: dayCount }, (_, index) => {
      const day = index + 1;
      const row: Record<string, number> = { day };
      chartKeys.forEach((participant: any) => {
        row[participant.chartKey] = logs.filter((log: any) => log.participantId === participant.id && log.dayNumber <= day && log.dayComplete).length;
      });
      return row;
    });
  }, [chartKeys, currentDay, logs]);

  const recentDays = Array.from({ length: Math.min(7, currentDay) }, (_, index) => currentDay - Math.min(6, currentDay - 1) + index);
  const trendRows = recentDays.map(day => {
    const dayLogs = logs.filter((log: any) => log.dayNumber === day);
    const dayComplete = dayLogs.filter((log: any) => log.dayComplete).length;
    return {
      day,
      submittedRate: pct(dayLogs.length, participantCount),
      completeRate: pct(dayComplete, participantCount),
      missing: Math.max(participantCount - dayLogs.length, 0),
    };
  });

  const ruleMetrics = [
    { label: "No alcohol", done: logs.filter((log: any) => log.noAlcohol).length },
    { label: "Clean eating", done: logs.filter((log: any) => log.cleanEating).length },
    { label: "Exercise proof", done: logs.filter((log: any) => Number(log.exerciseDuration ?? 0) >= 30 && String(log.exerciseType ?? "").trim()).length },
    { label: "Reflect", done: logs.filter((log: any) => String(log.reflectionText ?? "").trim()).length },
    { label: "Read & Teach", done: logs.filter((log: any) => String(log.readTeachText ?? "").trim()).length },
    { label: "Track everything", done: logs.filter((log: any) => log.trackedEverything).length },
  ];

  const participantMetrics = participants.map((p: any) => {
    const ownedLogs = logs.filter((log: any) => log.participantId === p.id);
    const completeCount = ownedLogs.filter((log: any) => log.dayComplete).length;
    const submitRate = pct(ownedLogs.length, currentDay);
    const completionRate = pct(completeCount, currentDay);
    const latestLog = ownedLogs.reduce((latest: any, log: any) => Number(log.dayNumber ?? 0) > Number(latest?.dayNumber ?? 0) ? log : latest, null);
    const riskScore = Math.max(0, 100 - completionRate) + Math.max(0, 4 - Number(p.livesRemaining ?? 4)) * 12 + (todayLoggedIds.has(p.id) ? 0 : 18);
    return { ...p, ownedLogs, completeCount, submitRate, completionRate, latestLog, riskScore };
  }).sort((a: any, b: any) => b.riskScore - a.riskScore || b.totalPoints - a.totalPoints);

  return (
    <div className="space-y-5" data-testid="overview-metrics-dashboard">
      <section className="border border-[#2A2A2A] bg-[#101010] p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#2A2A2A] pb-4">
          <div>
            <MicroLabel tone="gold">Overview · all participants</MicroLabel>
            <h2 className="mt-2 text-3xl font-black uppercase leading-none tracking-[-0.07em] text-white sm:text-5xl">Group command centre.</h2>
          </div>
          <p className="max-w-md text-[10px] font-black uppercase leading-5 tracking-[0.16em] text-[#777]">A lighter command view for progress, lives, streaks, payments, and rewards. Detailed compliance now lives inside tapped Board profiles.</p>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
          <OverviewMetricCard label="Participants" value={participantCount} detail="Active competitors tracked" tone="white" />
          <OverviewMetricCard label="Today green" value={`${todayComplete}/${participantCount}`} detail={`Yesterday closed ${yesterdayComplete}/${participantCount}`} tone={todayComplete === participantCount && participantCount > 0 ? "green" : "gold"} />
          <OverviewMetricCard label="Group pass rate" value={`${pct(completedLogs.length, expectedSlots)}%`} detail={`${completedLogs.length}/${expectedSlots || 0} 5/6 pass slots`} tone="green" />
          <OverviewMetricCard label="Average streak" value={averageStreak} detail={`Best active/longest: ${strongestStreak}`} tone="gold" />
          <OverviewMetricCard label="Lives lost" value={totalLivesLost} detail={`${atRisk.length} participant risk flags`} tone={totalLivesLost > 0 ? "red" : "green"} />
          <OverviewMetricCard label="Ops queue" value={pendingPayments + pendingRewards} detail={`${pendingPayments} payments · ${pendingRewards} rewards`} tone={pendingPayments + pendingRewards ? "purple" : "white"} />
        </div>
      </section>

      <section className="sticky top-[58px] z-30 min-w-0 overflow-hidden border border-[#2A2A2A] bg-[#101010]/98 p-3 shadow-[0_18px_55px_rgba(0,0,0,0.35)] backdrop-blur sm:top-[68px] sm:p-5 md:top-[78px]">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <MicroLabel tone="gold">Complex tracker</MicroLabel>
            <h2 className="mt-2 break-words text-xl font-black uppercase tracking-[-0.06em] text-white sm:text-3xl">Progress curves by participant.</h2>
          </div>
          <p className="max-w-sm text-[10px] font-bold uppercase tracking-[0.12em] text-[#777] sm:text-xs">Lines show cumulative complete days, not just raw check-ins.</p>
        </div>
        <div className="h-56 min-w-0 overflow-hidden sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ left: -18, right: 4, top: 10, bottom: 0 }}>
              <CartesianGrid stroke="#242424" strokeDasharray="3 3" />
              <XAxis dataKey="day" stroke="#777" tick={{ fill: "#777", fontSize: 11, fontWeight: 900 }} />
              <YAxis allowDecimals={false} stroke="#777" tick={{ fill: "#777", fontSize: 11, fontWeight: 900 }} />
              <Tooltip contentStyle={{ background: "#0D0D0D", border: "1px solid #C8A96E", borderRadius: 0, color: "#fff" }} />
              {chartKeys.map((participant: any, index: number) => (
                <Line key={participant.id} type="monotone" dataKey={participant.chartKey} name={participant.displayName} stroke={chartColors[index % chartColors.length]} strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="border border-[#2A2A2A] bg-[#101010] p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <MicroLabel tone="gold">Overview simplified</MicroLabel>
            <h3 className="mt-2 text-2xl font-black uppercase tracking-[-0.06em] text-white sm:text-4xl">High-level signal only.</h3>
          </div>
          <p className="max-w-sm text-[10px] font-black uppercase tracking-[0.16em] text-[#777]">Compliance drill-downs moved to the Board: tap any participant to see their latest rule breakdown and recent pass history.</p>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <OverviewMetricCard label="Today submitted" value={`${todayLogs.length}/${participantCount}`} detail="Tap Board rows for individual rule detail" tone="gold" />
          <OverviewMetricCard label="Today passed" value={`${todayComplete}/${participantCount}`} detail={`Pass now means ${DAILY_PASS_THRESHOLD}/${DAILY_RULE_COUNT} rules`} tone={todayComplete === participantCount && participantCount > 0 ? "green" : "gold"} />
          <OverviewMetricCard label="Need attention" value={atRisk.length} detail="Missed today or low lives" tone={atRisk.length ? "red" : "green"} />
        </div>
      </section>

      <section className="border border-[#2A2A2A] bg-[#101010] p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <MicroLabel tone="red">Participant comparison</MicroLabel>
            <h3 className="mt-2 text-2xl font-black uppercase tracking-[-0.06em] text-white sm:text-4xl">Who is safe. Who needs heat.</h3>
          </div>
          <p className="max-w-sm text-[10px] font-black uppercase tracking-[0.16em] text-[#777]">Sorted by risk score. Tap a participant to open the Board-style compliance drill-down.</p>
        </div>
        <div className="mt-5 space-y-2">
          {participantMetrics.map((p: any, index: number) => (
            <button key={p.id} type="button" onClick={() => { pulse(14); setSelected(p); }} className="grid w-full gap-3 border border-[#2A2A2A] bg-[#0D0D0D] p-3 text-left transition hover:border-[#C8A96E] focus-visible:border-[#C8A96E] focus-visible:outline-none sm:grid-cols-[2.5rem_3.5rem_minmax(0,1fr)_minmax(220px,0.9fr)] sm:items-center" aria-label={`Open ${p.displayName} participant stats`}>
              <span className={classNames("text-2xl font-black", index === 0 && p.riskScore > 30 ? "text-[#C0392B]" : "text-[#777]")}>#{index + 1}</span>
              <ProfilePhoto participant={p} className="h-12 w-12" />
              <span className="min-w-0">
                <span className="block break-words text-lg font-black uppercase tracking-[-0.04em] text-white">{p.displayName}</span>
                <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.14em] text-[#777]">{p.completeCount}/{currentDay} complete · {p.currentStreak ?? 0} streak · {p.totalPoints ?? 0} pts</span>
                <span className="mt-2 block max-w-[260px]"><HealthBar lives={p.livesRemaining} label="" compact /></span>
              </span>
              <span className="grid gap-2 sm:grid-cols-3">
                <span className="border border-[#2A2A2A] bg-black px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#2ECC71]">{p.completionRate}% passed</span>
                <span className={classNames("border bg-black px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em]", todayLoggedIds.has(p.id) ? "border-[#C8A96E] text-[#C8A96E]" : "border-[#C0392B] text-[#FFB3A8]")}>{todayLoggedIds.has(p.id) ? "Today logged" : "Not today"}</span>
                <span className="border border-[#2A2A2A] bg-black px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#777]">Tap for rules</span>
              </span>
            </button>
          ))}
        </div>
      </section>
      <ParticipantSheet participant={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

const COMPLIANCE_RULE_LABELS = [
  { key: "noAlcohol", label: "No alcohol" },
  { key: "cleanEating", label: "Clean eating" },
  { key: "exercise", label: "30m exercise" },
  { key: "reflection", label: "Reflection" },
  { key: "readTeach", label: "Read / teach" },
  { key: "trackedEverything", label: "Tracked all" },
] as const;

function getLogRuleStates(log: any) {
  return [
    { key: "noAlcohol", done: Boolean(log?.noAlcohol) },
    { key: "cleanEating", done: Boolean(log?.cleanEating) },
    { key: "exercise", done: Number(log?.exerciseDuration ?? 0) >= 30 && String(log?.exerciseType ?? "").trim().length > 1 },
    { key: "reflection", done: String(log?.reflectionText ?? "").trim().length > 1 },
    { key: "readTeach", done: String(log?.readTeachText ?? "").trim().length > 1 },
    { key: "trackedEverything", done: Boolean(log?.trackedEverything) },
  ];
}

function getLogCompletedRuleCount(log: any) {
  return getLogRuleStates(log).filter(rule => rule.done).length;
}

function ParticipantSheet({ participant, onClose }: { participant: any; onClose: () => void }) {
  const [visibleParticipant, setVisibleParticipant] = useState<any>(participant);
  const [photoExpanded, setPhotoExpanded] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (participant) {
      setVisibleParticipant(participant);
      setPhotoExpanded(false);
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
  const sheetLogs = [...(visibleParticipant.ownedLogs ?? [])].sort((a: any, b: any) => Number(b.dayNumber ?? 0) - Number(a.dayNumber ?? 0));
  const latestLog = sheetLogs[0];
  const latestRules = latestLog ? getLogRuleStates(latestLog) : [];
  const latestCompletedRules = latestLog ? latestRules.filter(rule => rule.done).length : 0;
  const recentLogs = sheetLogs.slice(0, 7);
  const recentPassed = recentLogs.filter((log: any) => log.completed || getLogCompletedRuleCount(log) >= DAILY_PASS_THRESHOLD).length;
  return (
    <div className={classNames("sheet-backdrop fixed inset-0 z-50 flex items-end overflow-y-auto bg-black/70 sm:items-center sm:p-4", closing && "sheet-backdrop-out")} onClick={onClose}>
      <div className={classNames("sheet-panel max-h-[100svh] w-full overflow-y-auto border-t-2 border-[#C8A96E] bg-[#0D0D0D] p-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:max-h-[calc(100svh-2rem)] sm:p-5 md:mx-auto md:max-w-xl md:border", closing && "sheet-panel-out")} onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={`${visibleParticipant.displayName} Board participant details`}>
        <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-4 flex items-center justify-between gap-3 border-b border-[#2A2A2A] bg-[#0D0D0D]/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:mt-0 sm:mb-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <button type="button" onClick={onClose} className="min-h-11 border border-[#C8A96E]/60 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#C8A96E] hover:bg-[#C8A96E] hover:text-black" aria-label="Back to Board list">Back to Board</button>
          <button type="button" onClick={onClose} className="grid min-h-11 min-w-11 shrink-0 place-items-center border border-[#2A2A2A] text-[#777] hover:border-[#C8A96E] hover:text-[#C8A96E]" aria-label="Close participant details"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <ProfilePhoto participant={visibleParticipant} className="h-14 w-14 shrink-0 sm:h-20 sm:w-20" enlargeable onOpen={() => setPhotoExpanded(true)} />
          <div className="min-w-0 flex-1">
            <MicroLabel tone="gold">Participant stats</MicroLabel>
            <h3 className="mt-2 break-words text-2xl font-black uppercase leading-none tracking-[-0.07em] text-white sm:text-4xl">{visibleParticipant.displayName}</h3>
            <p className="mt-2 text-[10px] font-black uppercase leading-4 tracking-[0.16em] text-[#777]">Tap the display picture to enlarge it.</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-2 bg-[#2A2A2A] p-[2px] min-[380px]:grid-cols-3">
          <PosterStat label="Points" value={visibleParticipant.totalPoints} tone="gold" />
          <PosterStat label="Streak" value={visibleParticipant.currentStreak} tone="green" />
          <PosterStat label="Days" value={visibleParticipant.daysComplete} tone="white" />
        </div>
        <div className="mt-5"><HealthBar lives={visibleParticipant.livesRemaining} label="Lives status" /></div>
        <section className="mt-5 border border-[#2A2A2A] bg-black/35 p-3 sm:p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <MicroLabel tone="green">Board compliance</MicroLabel>
              <h4 className="mt-2 text-2xl font-black uppercase tracking-[-0.06em] text-white">Tapped profile detail.</h4>
            </div>
            <span className={classNames("border px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em]", latestLog && latestCompletedRules >= DAILY_PASS_THRESHOLD ? "border-[#2ECC71] text-[#2ECC71]" : "border-[#C8A96E] text-[#C8A96E]")}>{latestLog ? `${latestCompletedRules}/${DAILY_RULE_COUNT} latest` : "No log yet"}</span>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <PosterStat label="Recent passes" value={`${recentPassed}/${recentLogs.length || 0}`} tone="green" />
            <PosterStat label="Latest day" value={latestLog?.dayNumber ?? "—"} tone="gold" />
            <PosterStat label="Pass rule" value={`${DAILY_PASS_THRESHOLD}/${DAILY_RULE_COUNT}`} tone="white" />
          </div>
          {latestLog ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {COMPLIANCE_RULE_LABELS.map(label => {
                const state = latestRules.find(rule => rule.key === label.key);
                return <div key={label.key} className={classNames("flex items-center justify-between gap-3 border px-3 py-3 text-[10px] font-black uppercase leading-4 tracking-[0.12em]", state?.done ? "border-[#2ECC71]/50 bg-[#07150D] text-[#2ECC71]" : "border-[#C0392B]/55 bg-[#190B0A] text-[#FFB3A8]")}><span className="min-w-0 break-words">{label.label}</span><span className="shrink-0">{state?.done ? "Done" : "Open"}</span></div>;
              })}
            </div>
          ) : (
            <p className="mt-4 border border-[#2A2A2A] bg-[#0D0D0D] p-4 text-xs font-black uppercase tracking-[0.14em] text-[#777]">No submitted rules yet for this participant.</p>
          )}
        </section>
        {photoExpanded && normaliseProfilePhotoUrl(visibleParticipant.profilePhotoUrl) && (
          <div className="fixed inset-0 z-[60] grid place-items-center bg-black/88 p-5" onClick={() => setPhotoExpanded(false)} role="dialog" aria-modal="true" aria-label={`${visibleParticipant.displayName} display picture`}>
            <button type="button" className="absolute right-4 top-4 border border-[#2A2A2A] bg-black p-3 text-[#C8A96E]" onClick={() => setPhotoExpanded(false)} aria-label="Close enlarged display picture"><X className="h-5 w-5" /></button>
            <img src={normaliseProfilePhotoUrl(visibleParticipant.profilePhotoUrl)} alt={`${visibleParticipant.displayName} enlarged display picture`} className="max-h-[82vh] max-w-full border border-[#C8A96E] bg-black object-contain" loading="eager" decoding="async" onClick={event => event.stopPropagation()} />
          </div>
        )}
      </div>
    </div>
  );
}

function ProofImage({ url, dayNumber }: { url: string; dayNumber: number }) {
  const [failed, setFailed] = useState(false);
  const src = proofImageSrc(url);

  if (!src) {
    return <p className="mt-3 break-all border border-[#2A2A2A] bg-[#111] p-3 text-xs font-bold text-[#C8A96E]">Proof: {url}</p>;
  }

  return (
    <div className="mt-3">
      {!failed && (
        <a href={src} target="_blank" rel="noreferrer" className="block" aria-label={`Open proof image for day ${dayNumber}`}>
          <img src={src} alt={`Exercise proof for day ${dayNumber}`} className="max-h-80 w-full border border-[#2A2A2A] bg-black object-contain" loading="lazy" decoding="async" onError={() => setFailed(true)} />
        </a>
      )}
      {failed && (
        <div className="border border-[#2A2A2A] bg-[#111] p-4 text-xs font-bold leading-5 text-[#D8D8D8]">
          <p className="font-black uppercase tracking-[0.14em] text-[#C8A96E]">Proof image could not preview inline.</p>
          <p className="mt-2 text-[#777]">Tap the link below to open the stored image directly.</p>
        </div>
      )}
      <a href={src} target="_blank" rel="noreferrer" className="mt-2 block break-all text-[10px] font-black uppercase tracking-[0.14em] text-[#C8A96E]">Open proof image</a>
    </div>
  );
}

function Leaderboard({ snapshot }: { snapshot: Snapshot }) {
  const [selected, setSelected] = useState<any>(null);
  const logs = snapshot?.logs ?? [];
  const currentDay = snapshot?.challenge?.currentDay ?? 1;
  const ranked = [...(snapshot?.participants ?? [])]
    .map((participant: any) => {
      const ownedLogs = logs.filter((log: any) => log.participantId === participant.id);
      const expectedDays = Math.max(1, currentDay);
      const passedLogs = ownedLogs.filter((log: any) => log.completed || getLogCompletedRuleCount(log) >= DAILY_PASS_THRESHOLD);
      return {
        ...participant,
        ownedLogs,
        completionRate: pct(passedLogs.length, expectedDays),
        submitRate: pct(ownedLogs.length, expectedDays),
      };
    })
    .sort((a: any, b: any) => b.totalPoints - a.totalPoints || b.currentStreak - a.currentStreak);
  return (
    <section className="border border-[#2A2A2A] bg-[#101010] p-5">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <MicroLabel tone="gold">Leaderboard</MicroLabel>
          <h2 className="mt-2 break-words text-3xl font-black uppercase leading-none tracking-[-0.07em] text-white sm:text-4xl">Tap a line. Feel the chase.</h2>
        </div>
        <p className="max-w-sm text-xs font-bold uppercase tracking-[0.14em] text-[#777]">Ranked by points first, then streak. Tap any row for the individual compliance board.</p>
      </div>
      <div className="space-y-2">
        {ranked.map((p: any, index) => (
          <button key={p.id} onClick={() => { pulse(14); setSelected(p); }} className={classNames("grid w-full grid-cols-[48px_minmax(0,1fr)] items-center gap-3 border bg-[#0D0D0D] p-3 text-left transition hover:border-[#C8A96E] sm:grid-cols-[56px_56px_minmax(0,1fr)_auto] sm:gap-4 sm:p-4", index === 0 ? "border-l-4 border-l-[#C8A96E] border-[#3C3423]" : "border-[#2A2A2A]")}> 
            <span className={classNames("text-2xl font-black sm:text-3xl", index === 0 ? "text-[#C8A96E]" : "text-[#777]")}>#{index + 1}</span>
            <span className="hidden sm:block"><ProfilePhoto participant={p} className="h-12 w-12" /></span>
            <span className="min-w-0">
              <span className="block break-words text-lg font-black uppercase tracking-[-0.04em] text-white sm:text-xl">{p.displayName}</span>
              <span className="mt-1 block break-words text-[11px] font-bold uppercase tracking-[0.1em] text-[#777] sm:text-xs sm:tracking-[0.14em]">{p.currentStreak} day streak · {p.daysComplete} days complete</span>
              <span className="mt-3 block max-w-[260px]"><HealthBar lives={p.livesRemaining} label="" compact /></span>
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

function ProofFeed({ snapshot }: { snapshot: Snapshot }) {
  const publicLogs = (snapshot?.logs ?? []).filter((log: any) => log.exerciseProofUrl || log.readTeachText);
  return (
    <section className="border border-[#2A2A2A] bg-[#101010] p-5">
      <MicroLabel tone="green">Proof feed</MicroLabel>
      <h2 className="mt-2 break-words text-3xl font-black uppercase tracking-[-0.07em] text-white sm:text-4xl">Receipts. Insights. Momentum.</h2>
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
                <span className="border border-[#2ECC71]/50 bg-[#102018] px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-[#2ECC71]">Proof</span>
              </div>
              {log.readTeachText && <p className="mt-4 border-l-2 border-[#C8A96E] pl-4 text-sm font-bold leading-6 text-[#D8D8D8]">{log.readTeachText}</p>}
              {log.exerciseProofUrl && <ProofImage url={log.exerciseProofUrl} dayNumber={log.dayNumber} />}
            </article>
          );
        })}
        {publicLogs.length === 0 && <p className="border border-[#2A2A2A] bg-[#0D0D0D] p-6 text-sm font-bold uppercase tracking-[0.12em] text-[#777]">No proof yet. The feed wakes up when people submit exercise receipts or teachings.</p>}
      </div>
    </section>
  );
}

function Rewards({ snapshot, refetch }: { snapshot: Snapshot; refetch: () => void }) {
  const participantPoints = snapshot?.participant?.totalPoints ?? 0;
  const redeem = trpc.challenge.redeemReward.useMutation({ onSuccess: () => { pulse([15, 35, 15]); toast("Redemption request sent to the admin."); refetch(); }, onError: e => toast.error(e.message) });
  return (
    <section className="border border-[#2A2A2A] bg-[#101010] p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <MicroLabel tone="gold">Rewards</MicroLabel>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-[-0.07em] text-white sm:text-4xl">Tap to redeem.</h2>
        </div>
        <p className="max-w-sm text-xs font-bold uppercase tracking-[0.14em] text-[#777]">Only the three agreed rewards are shown. A tap logs the request and sends an admin notification.</p>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {snapshot?.rewards.map((reward: any) => {
          const canRedeem = participantPoints >= reward.pointsCost;
          return (
            <button key={reward.id} className={classNames("border bg-[#101010] p-5 text-left transition hover:border-[#C8A96E] disabled:cursor-not-allowed disabled:opacity-60", canRedeem ? "border-[#2A2A2A]" : "border-[#2A2A2A]/70")} disabled={!canRedeem || redeem.isPending} onClick={() => { pulse(12); redeem.mutate({ rewardId: reward.id }); }}>
              <RewardVisual reward={reward} />
              <MicroLabel tone="gold">{reward.pointsCost} points</MicroLabel>
              <h3 className="mt-3 text-2xl font-black uppercase tracking-[-0.05em] text-white">{reward.name}</h3>
              <p className="mt-3 text-sm font-bold leading-6 text-[#999]">{reward.description}</p>
              <span className={classNames("mt-5 inline-flex border px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em]", canRedeem ? "border-[#2ECC71] text-[#2ECC71]" : "border-[#C8A96E] text-[#C8A96E]")}>{canRedeem ? (redeem.isPending ? "Sending" : "Tap to redeem") : `${reward.pointsCost - participantPoints} pts needed`}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function OnboardingGate({ user, refetch }: { user: any; refetch: () => void }) {
  const [displayName, setDisplayName] = useState(user?.name || "");
  const [primaryGoal, setPrimaryGoal] = useState("");
  const [biggestObstacle, setBiggestObstacle] = useState("");
  const [trainingLevel, setTrainingLevel] = useState("building");
  const [profilePhotoDataUrl, setProfilePhotoDataUrl] = useState<string | undefined>();
  const complete = trpc.challenge.completeOnboarding.useMutation({
    onSuccess: () => { haptics.success(); toast("Profile saved. Welcome into the challenge."); refetch(); },
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
            <p className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-white">New email found. Set your profile first.</p>
          </div>
        </div>
        <form className="mx-auto max-w-3xl border border-[#2A2A2A] bg-[#101010] p-5 shadow-[0_22px_90px_rgba(0,0,0,0.38)]" onSubmit={event => { event.preventDefault(); haptics.submit(); complete.mutate({ displayName, primaryGoal, biggestObstacle, trainingLevel: trainingLevel as any, motivationStyle: "adaptive", profilePhotoDataUrl }); }}>
          <MicroLabel tone="red">Unknown email</MicroLabel>
          <h1 className="mt-3 text-5xl font-black uppercase leading-none tracking-[-0.08em] text-white">Make it yours.</h1>
          <p className="mt-4 text-sm font-bold leading-6 text-[#999]">{user?.email ?? "This account"} is signed in, but it is not yet recognised in the 6+1 platform. Answer the quick setup and the app will open with your profile, goal, and photo. The Warden adapts from your app activity and group-chat signals rather than a selected style.</p>
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
          <div className="mt-4 grid gap-3">
            <Field label="Training level"><select value={trainingLevel} onChange={event => setTrainingLevel(event.target.value)} className="min-h-12 w-full border border-[#2A2A2A] bg-black px-4 text-sm font-bold text-white outline-none focus:border-[#C8A96E]"><option value="starting">Starting again</option><option value="building">Building consistency</option><option value="consistent">Already consistent</option><option value="advanced">Advanced</option></select></Field>
            <div className="border border-[#2A2A2A] bg-black p-4">
              <MicroLabel tone="gold">Universal Warden</MicroLabel>
              <p className="mt-2 text-sm font-bold leading-6 text-[#AFAFAF]">There is no Warden type to pick. The Warden reads your logs, consistency, misses, wins, and group-chat signals, then adapts its feedback from the data.</p>
            </div>
          </div>
          <Field label="What usually gets in the way?"><TextArea value={biggestObstacle} onChange={event => setBiggestObstacle(event.target.value)} placeholder="Time, weekends, travel, stress, motivation dips..." /></Field>
          <SharpButton type="submit" disabled={complete.isPending} className="mt-5 w-full">{complete.isPending ? "Personalising" : "Enter challenge"}</SharpButton>
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
                  <div className="flex min-w-0 items-start gap-3">
                    <ProfilePhoto participant={owner} className="h-12 w-12 shrink-0" />
                    <div className="min-w-0">
                    <p className="font-black uppercase text-white">{owner?.displayName ?? "Participant"}</p>
                    <p className="mt-2 text-sm font-bold text-[#C0392B]">£{(payment.amountPence / 100).toFixed(2)} · {payment.reason}</p>
                    <p className="mt-2 break-all text-xs font-bold text-[#777]">{payment.paymentLink}</p>
                    </div>
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
                <div className="flex items-start gap-3">
                  <RewardVisual reward={reward} compact />
                  <div className="min-w-0">
                    <p className="font-black uppercase text-white">{owner?.displayName ?? "Participant"} · {reward?.name ?? "Reward"}</p>
                    <p className="mt-2 text-sm font-bold text-[#999]">{request.checkpointEarned}</p>
                  </div>
                </div>
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
                  <p className="min-w-0 break-words font-black uppercase text-white">{request.displayName || "Pending participant"}</p>
                  <p className="mt-2 break-all text-xs font-bold text-[#777]">{request.email}</p>
                  <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-[#777]">{request.source} · {new Date(request.createdAt).toLocaleString()}</p>
                  {request.primaryGoal && <p className="mt-2 text-sm font-bold text-[#D8D8D8]">Goal: {request.primaryGoal}</p>}
                  {request.biggestObstacle && <p className="mt-2 text-xs font-bold leading-5 text-[#999]">Obstacle: {request.biggestObstacle}</p>}
                  {request.trainingLevel && <p className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#777]">{request.trainingLevel} · universal adaptive Warden</p>}
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
  { key: "calendar", label: "Journey", icon: Calendar },
  { key: "admin", label: "Founder", icon: Crown },
];

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("myday");
  const [entryVisible, setEntryVisible] = useState(() => typeof window !== "undefined" && window.sessionStorage.getItem("sixone-entry-seen") !== "true");
  const [loginEntryVisible, setLoginEntryVisible] = useState(false);
  const previousAuthRef = useRef(isAuthenticated);
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

  useEffect(() => {
    if (loading) return;
    const justAuthenticated = isAuthenticated && !previousAuthRef.current;
    previousAuthRef.current = isAuthenticated;
    if (!justAuthenticated || typeof window === "undefined") return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setLoginEntryVisible(true);
    const timer = window.setTimeout(() => setLoginEntryVisible(false), prefersReducedMotion ? 120 : 950);
    return () => window.clearTimeout(timer);
  }, [isAuthenticated, loading]);

  if (loading || entryVisible || loginEntryVisible) return <AnimatedLoadPage label={loading ? "Authenticating" : loginEntryVisible ? "Opening your challenge" : "Entering the log"} />;
  if (!isAuthenticated) return <Landing />;
  if (snapshot?.accessState?.status === "questionnaire_required") return <OnboardingGate user={user} refetch={snapshotQuery.refetch} />;

  const visibleTabs = tabs.filter(tab => tab.key !== "admin" || user?.role === "admin");

  return (
    <main className="poster-grid min-h-screen bg-[#0D0D0D] pb-24 text-white md:pb-0">
      <header className="sticky top-0 z-40 border-b border-[#2A2A2A] bg-[#0D0D0D]/95 backdrop-blur">
        <div className="container flex items-center justify-between gap-3 py-3 sm:gap-4 sm:py-4">
          <button onClick={() => setActiveTab("myday")} className="flex min-w-0 items-center gap-3 text-left">
            <LogoMark compact />
            <div className="min-w-0">
              <MicroLabel tone="gold">Four Lives Challenge</MicroLabel>
              <p className="mt-1 hidden text-xs font-black uppercase tracking-[0.18em] text-white sm:block">Today’s log first. Everything else second.</p>
            </div>
          </button>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span className="hidden border border-[#2A2A2A] px-3 py-2 text-[9px] font-black uppercase tracking-[0.22em] text-[#777] sm:inline-block">{user?.role === "admin" ? "Founder" : "Participant"}</span>
            <button className="border border-[#2A2A2A] px-3 py-2.5 text-[9px] font-black uppercase tracking-[0.16em] text-white hover:border-[#C8A96E] hover:text-[#C8A96E] sm:px-4 sm:py-3 sm:text-[10px] sm:tracking-[0.18em]" onClick={() => logout()}>Logout</button>
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
              {activeTab === "calendar" && <CalendarView />}
              {activeTab === "admin" && (user?.role === "admin" ? <AdminPanel snapshot={snapshot} refetch={snapshotQuery.refetch} /> : <div className="border border-[#2A2A2A] bg-[#101010] p-8"><MicroLabel tone="red">Restricted</MicroLabel><p className="mt-3 text-xl font-black uppercase text-white">Founder dashboard is restricted to admin users.</p></div>)}
            </div>
          </>
        )}
      </section>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#2A2A2A] bg-[#0D0D0D] md:hidden overflow-x-auto">
        <div className="flex min-w-full">
          {visibleTabs.filter(tab => tab.key !== "admin").map((tab, idx) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            const isLast = idx === visibleTabs.filter(t => t.key !== "admin").length - 1;
            return (
              <button 
                key={tab.key} 
                onClick={() => { pulse(10); setActiveTab(tab.key); }} 
                className={classNames(
                  "flex flex-col items-center justify-center gap-1 flex-1 min-w-max px-2 py-3 text-[9px] font-black uppercase tracking-[0.12em] transition",
                  !isLast && "border-r border-[#2A2A2A]",
                  active ? "border-t-2 border-t-[#C8A96E] text-[#C8A96E]" : "text-[#777]"
                )}
              > 
                <Icon className="h-4 w-4" />
                <span className="whitespace-nowrap">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </main>
  );
}
