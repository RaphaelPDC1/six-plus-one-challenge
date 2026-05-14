import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { CalendarView } from "./Calendar";
import { trpc } from "@/lib/trpc";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { DAILY_PASS_THRESHOLD, DAILY_RULE_COUNT, clampLives, getDailyLogProgress } from "@/lib/challengeUi";
import { buildFocusedChartData, buildParticipantInsights, calculateLiveTaskPoints, logHasInsight, logHasProof, rankForPodium } from "@/lib/challengeInsights";
import { haptics } from "@/lib/haptics";
import { getBrowserPushSupport, getExistingChallengePushSubscription, serializePushSubscription, subscribeToChallengePush } from "@/lib/pwaPush";
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
  Bell,
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

const LIFE_LOSS_ALERT_BASELINE_KEY = "sixone-life-loss-alert-baseline-v2";
const LIFE_LOSS_ALERT_SEEN_PREFIX = "sixone-life-loss-alert-seen-v2";

function getLifeLossAlertId(payment: any) {
  return payment?.id === undefined || payment?.id === null ? "" : String(payment.id);
}

export function isLifeLossPaymentEvent(payment: any, participants: any[] = []) {
  const id = getLifeLossAlertId(payment);
  if (!id) return false;
  const amountPence = Number(payment?.amountPence ?? 0);
  if (!Number.isFinite(amountPence) || amountPence < 2500) return false;
  if (!["pending", "received"].includes(String(payment?.status ?? "pending"))) return false;
  const participantExists = participants.some((item: any) => String(item.id) === String(payment?.participantId));
  if (!participantExists) return false;
  const reason = String(payment?.reason ?? "").toLowerCase();
  if (/\b(join|joined|new player|onboard|onboarding|register|registration|signup|sign-up)\b/.test(reason)) return false;
  return true;
}

export function selectNewLifeLossAlertEvent(payments: any[] = [], participants: any[] = [], seenIds: Iterable<string> = []) {
  const seen = new Set(Array.from(seenIds).map(String));
  return [...payments]
    .filter((payment: any) => isLifeLossPaymentEvent(payment, participants))
    .filter((payment: any) => !seen.has(getLifeLossAlertId(payment)))
    .sort((a: any, b: any) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())[0] ?? null;
}

function readLifeLossAlertBaseline() {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LIFE_LOSS_ALERT_BASELINE_KEY) ?? "[]");
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set<string>();
  }
}

function writeLifeLossAlertBaseline(ids: Iterable<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LIFE_LOSS_ALERT_BASELINE_KEY, JSON.stringify(Array.from(new Set(Array.from(ids).filter(Boolean))).sort()));
}

function hasDismissedLifeLossAlert(id: string) {
  if (typeof window === "undefined" || !id) return true;
  return window.localStorage.getItem(`${LIFE_LOSS_ALERT_SEEN_PREFIX}-${id}`) === "true" || window.localStorage.getItem(`sixone-life-loss-alert-seen-${id}`) === "true";
}

function persistLifeLossAlertDismissal(id: string) {
  if (typeof window === "undefined" || !id) return;
  window.localStorage.setItem(`${LIFE_LOSS_ALERT_SEEN_PREFIX}-${id}`, "true");
  window.localStorage.setItem(`sixone-life-loss-alert-seen-${id}`, "true");
}

type ProofMediaItem = {
  url: string;
  type: "image" | "video" | "link";
  mimeType?: string;
  name?: string;
};

function proofLogTimestamp(log: any) {
  const candidates = [log?.submittedAt, log?.createdAt, log?.updatedAt];
  for (const candidate of candidates) {
    const timestamp = new Date(candidate ?? 0).getTime();
    if (Number.isFinite(timestamp) && timestamp > 0) return timestamp;
  }
  return Number(log?.id ?? 0);
}

export function sortProofLogsNewestFirst<T extends any>(logs: T[] = []) {
  return [...logs].sort((a: any, b: any) => {
    const dayDelta = Number(b?.dayNumber ?? 0) - Number(a?.dayNumber ?? 0);
    if (dayDelta !== 0) return dayDelta;
    return proofLogTimestamp(b) - proofLogTimestamp(a);
  });
}

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

type SwipeDirection = -1 | 0 | 1;

const pageSwipeVariants = {
  enter: (direction: SwipeDirection) => ({
    opacity: 0,
    x: direction >= 0 ? 72 : -72,
    scale: 0.982,
    filter: "blur(7px)",
  }),
  center: {
    opacity: 1,
    x: 0,
    scale: 1,
    filter: "blur(0px)",
  },
  exit: (direction: SwipeDirection) => ({
    opacity: 0,
    x: direction >= 0 ? -72 : 72,
    scale: 0.982,
    filter: "blur(7px)",
  }),
};

const boostCollapseVariants = {
  closed: { opacity: 0, height: 0, y: -8, filter: "blur(3px)" },
  open: { opacity: 1, height: "auto", y: 0, filter: "blur(0px)" },
};

type RuleKey = keyof MyDayForm | "exercise" | "reflection" | "readTeach";

const GOLD = "#C8A96E";
const RED = "#C0392B";
const GREEN = "#2ECC71";
const PURPLE = "#9B59B6";
const chartColors = [GOLD, RED, GREEN, PURPLE, "#4CA3C9", "#E67E22", "#F1C40F", "#ECF0F1"];

export const PAGE_SWIPE_MIN_DISTANCE = 56;
export const PAGE_SWIPE_AXIS_LOCK_RATIO = 1.2;

export function isPageSwipeExcludedTarget(target: EventTarget | null) {
  if (typeof Element === "undefined" || !(target instanceof Element)) return false;
  return Boolean(target.closest('[data-page-swipe-exclusion="true"], input, textarea, select, button, a, video, [role="button"], [role="slider"]'));
}

export function isIntentionalPageSwipe(deltaX: number, deltaY: number, startedInExcludedContent = false) {
  if (startedInExcludedContent) return false;
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);
  return absX >= PAGE_SWIPE_MIN_DISTANCE && absX > absY * PAGE_SWIPE_AXIS_LOCK_RATIO;
}
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
  if (isProofVideoUrl(trimmed)) return "";
  if (trimmed.startsWith("/manus-storage/")) return `/api/storage-image/${encodeURIComponent(trimmed.slice("/manus-storage/".length))}`;
  if (trimmed.startsWith("/api/storage-image/")) return encodeURI(trimmed);
  if (/^https?:\/\//i.test(trimmed) && /\.(png|jpe?g|webp)(\?|#|$)/i.test(trimmed)) return trimmed;
  return "";
}

function proofVideoMimeType(url: string, mimeType?: string) {
  if (mimeType?.startsWith("video/")) return mimeType;
  const trimmed = url.trim().toLowerCase();
  if (/\.(mp4|m4v)(\?|#|$)/i.test(trimmed)) return "video/mp4";
  if (/\.webm(\?|#|$)/i.test(trimmed)) return "video/webm";
  if (/\.mov(\?|#|$)/i.test(trimmed)) return "video/quicktime";
  return undefined;
}

function isProofVideoUrl(url: string, mimeType?: string) {
  return Boolean(proofVideoMimeType(url, mimeType));
}

function proofMediaType(item: ProofMediaItem): ProofMediaItem["type"] {
  if (item.type === "video" || isProofVideoUrl(item.url, item.mimeType)) return "video";
  if (item.type === "link") return "link";
  return proofImageSrc(item.url) ? "image" : "link";
}

function parseProofMedia(value: string | null | undefined): ProofMediaItem[] {
  const raw = String(value ?? "").trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item: any) => {
          const url = String(item?.url ?? "").trim();
          const mimeType = item?.mimeType ? String(item.mimeType) : undefined;
          const declaredType = item?.type === "video" ? "video" : item?.type === "link" ? "link" : item?.type === "image" ? "image" : undefined;
          const type = declaredType === "video" || isProofVideoUrl(url, mimeType) ? "video" : declaredType === "link" ? "link" : proofImageSrc(url) ? "image" : "link";
          return { url, type: type as ProofMediaItem["type"], mimeType, name: item?.name ? String(item.name) : undefined };
        })
        .filter(item => item.url.length > 0);
    }
  } catch {
    // Existing logs stored a single proof URL or note. Keep them visible.
  }
  return [{ url: raw, type: isProofVideoUrl(raw) ? "video" : proofImageSrc(raw) ? "image" : "link", mimeType: proofVideoMimeType(raw) }];
}

function encodeProofMedia(items: ProofMediaItem[]) {
  const cleaned: ProofMediaItem[] = items
    .map(item => ({ url: item.url.trim(), type: item.type as ProofMediaItem["type"], mimeType: item.mimeType, name: item.name }))
    .filter(item => item.url.length > 0);
  if (cleaned.length === 0) return "";
  return JSON.stringify(cleaned).slice(0, 12000);
}

function appendProofMedia(value: string, item: ProofMediaItem) {
  return encodeProofMedia([...parseProofMedia(value), item]);
}

function encodeProofMediaAfterRemoval(value: string, removeIndex: number) {
  const remaining = parseProofMedia(value).filter((_, itemIndex) => itemIndex !== removeIndex);
  return remaining.length > 0 ? encodeProofMedia(remaining) : "[]";
}

function proofMediaSrc(item: ProofMediaItem) {
  const trimmed = item.url.trim();
  if (proofMediaType(item) === "video") {
    if (trimmed.startsWith("/manus-storage/")) return `/api/storage-image/${encodeURIComponent(trimmed.slice("/manus-storage/".length))}`;
    if (trimmed.startsWith("/api/storage-image/")) return encodeURI(trimmed);
    return trimmed;
  }
  return proofImageSrc(trimmed) || trimmed;
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
const CHALLENGE_TIME_ZONE = "Europe/London";

function getZonedParts(date: Date, timeZone = CHALLENGE_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: string) => Number(parts.find(item => item.type === type)?.value ?? 0);
  return {
    year: part("year"),
    month: part("month"),
    day: part("day"),
    hour: part("hour"),
    minute: part("minute"),
    second: part("second"),
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone = CHALLENGE_TIME_ZONE) {
  const parts = getZonedParts(date, timeZone);
  const zonedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, date.getUTCMilliseconds());
  return zonedAsUtc - date.getTime();
}

function zonedLocalTimeToUtc(input: { year: number; month: number; day: number; hour?: number; minute?: number; second?: number; millisecond?: number }, timeZone = CHALLENGE_TIME_ZONE) {
  const localAsUtc = Date.UTC(input.year, input.month - 1, input.day, input.hour ?? 0, input.minute ?? 0, input.second ?? 0, input.millisecond ?? 0);
  const firstPass = new Date(localAsUtc - getTimeZoneOffsetMs(new Date(localAsUtc), timeZone));
  return new Date(localAsUtc - getTimeZoneOffsetMs(firstPass, timeZone));
}

export function getMillisecondsUntilNextLondonDay(now = new Date()) {
  const londonNow = getZonedParts(now);
  const nextLondonMidnight = zonedLocalTimeToUtc({ year: londonNow.year, month: londonNow.month, day: londonNow.day + 1 });
  return Math.max(1000, nextLondonMidnight.getTime() - now.getTime());
}

function getDraftStorageKey(userId: string | number | undefined, dayNumber: number | undefined) {
  if (!userId || !dayNumber) return "";
  return `${DRAFT_STORAGE_PREFIX}_${userId}_day${dayNumber}`;
}

export function dailyLogToForm(log: Partial<MyDayForm> | null | undefined): MyDayForm {
  if (!log) return { ...emptyDay };
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

function preferFilledText(primary: string, fallback: string) {
  return primary.trim().length > 0 ? primary : fallback;
}

export function mergeTodayFormWithoutWipingSavedWork(saved: MyDayForm, draft: MyDayForm): MyDayForm {
  const savedExerciseComplete = saved.exerciseDuration >= 30 && saved.exerciseType.trim().length > 1;
  const draftExerciseComplete = draft.exerciseDuration >= 30 && draft.exerciseType.trim().length > 1;
  return {
    noAlcohol: saved.noAlcohol || draft.noAlcohol,
    cleanEating: saved.cleanEating || draft.cleanEating,
    cleanEatingNote: preferFilledText(draft.cleanEatingNote, saved.cleanEatingNote),
    exerciseDuration: Math.max(saved.exerciseDuration, draft.exerciseDuration),
    exerciseType: savedExerciseComplete && !draftExerciseComplete ? saved.exerciseType : preferFilledText(draft.exerciseType, saved.exerciseType),
    exerciseProofUrl: preferFilledText(draft.exerciseProofUrl, saved.exerciseProofUrl),
    reflectionText: preferFilledText(draft.reflectionText, saved.reflectionText),
    reflectionShared: saved.reflectionShared || draft.reflectionShared,
    readTeachText: preferFilledText(draft.readTeachText, saved.readTeachText),
    trackedEverything: saved.trackedEverything || draft.trackedEverything,
  };
}

export function getLeaderboardVisiblePoints(participant: any): number {
  return Number(participant?.canonicalTotalPoints ?? participant?.totalPoints ?? 0);
}

export function patchDailyLogIntoSnapshot(snapshot: Snapshot | undefined, updatedLog: any, updatedParticipant?: any): Snapshot | undefined {
  if (!snapshot || !updatedLog) return snapshot;
  const logs = Array.isArray(snapshot.logs) ? snapshot.logs : [];
  const matchesUpdatedLog = (log: any) => {
    if (!log) return false;
    if (updatedLog.id != null && log.id != null) return String(log.id) === String(updatedLog.id);
    return String(log.participantId) === String(updatedLog.participantId) && Number(log.dayNumber) === Number(updatedLog.dayNumber);
  };
  const hasExistingLog = logs.some(matchesUpdatedLog);
  const nextLogs = hasExistingLog ? logs.map((log: any) => matchesUpdatedLog(log) ? { ...log, ...updatedLog } : log) : [updatedLog, ...logs];
  const shouldPatchMyLog = Boolean(snapshot.myLog && matchesUpdatedLog(snapshot.myLog)) || String(snapshot?.participant?.id ?? "") === String(updatedLog.participantId ?? "");
  const updatedParticipantId = updatedParticipant?.id ?? updatedLog.participantId;
  const shouldPatchParticipant = updatedParticipant && String(snapshot?.participant?.id ?? "") === String(updatedParticipantId ?? "");
  const matchingParticipantRow = Array.isArray(snapshot.participants)
    ? snapshot.participants.find((participantRow: any) => String(participantRow?.id ?? "") === String(updatedParticipantId ?? ""))
    : null;
  const mergeCanonicalParticipantScore = (participantRow: any) => {
    const baseTotalPoints = Number(updatedParticipant?.totalPoints ?? participantRow?.baseTotalPoints ?? participantRow?.totalPoints ?? 0);
    const boostPoints = Number(participantRow?.boostPoints ?? matchingParticipantRow?.boostPoints ?? 0);
    const canonicalTotalPoints = baseTotalPoints + boostPoints;
    return {
      ...participantRow,
      ...updatedParticipant,
      baseTotalPoints,
      boostPoints,
      canonicalTotalPoints,
      totalPoints: canonicalTotalPoints,
    };
  };
  const nextParticipant = shouldPatchParticipant ? mergeCanonicalParticipantScore(snapshot.participant ?? matchingParticipantRow ?? {}) : snapshot.participant;
  const nextParticipants = updatedParticipant && Array.isArray(snapshot.participants)
    ? snapshot.participants.map((participantRow: any) => String(participantRow?.id ?? "") === String(updatedParticipantId ?? "") ? mergeCanonicalParticipantScore(participantRow) : participantRow)
    : snapshot.participants;

  return {
    ...snapshot,
    participant: nextParticipant,
    participants: nextParticipants,
    myLog: shouldPatchMyLog ? { ...(snapshot.myLog ?? {}), ...updatedLog } : snapshot.myLog,
    logs: nextLogs,
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

function PwaNotificationPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const support = useMemo(() => getBrowserPushSupport(), []);
  const pushConfig = trpc.notifications.pushConfig.useQuery(undefined, { enabled: open });
  const preferences = trpc.notifications.preferences.useQuery(undefined, { enabled: open });
  const notifications = trpc.notifications.list.useQuery(undefined, { enabled: open });
  const [working, setWorking] = useState(false);
  const updatePreferences = trpc.notifications.updatePreferences.useMutation({
    onSuccess: () => {
      void preferences.refetch();
      toast("Notification preferences saved.");
    },
    onError: error => toast.error(error.message || "Could not save notification preferences."),
  });
  const registerPush = trpc.notifications.registerPush.useMutation({
    onSuccess: () => {
      void preferences.refetch();
      void notifications.refetch();
      toast("PWA notifications are on.");
    },
    onError: error => toast.error(error.message || "Could not register this device for push notifications."),
  });
  const unregisterPush = trpc.notifications.unregisterPush.useMutation({
    onSuccess: () => {
      void preferences.refetch();
      toast("PWA notifications are paused on this device.");
    },
    onError: error => toast.error(error.message || "Could not pause push notifications."),
  });
  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      void notifications.refetch();
      void utils.notifications.list.invalidate();
    },
  });
  const sendTest = trpc.notifications.sendTest.useMutation({
    onSuccess: result => toast((result.push?.sentCount ?? 0) > 0 ? "Test notification sent to this device." : "Test saved in the in-app inbox. Push delivery needs permission and VAPID keys."),
    onError: error => toast.error(error.message || "Could not send a test notification."),
  });

  if (!open) return null;
  const pref = preferences.data;
  const unread = (notifications.data ?? []).filter((item: any) => !item.readAt);
  const enabled = Boolean(pref?.pushEnabled);
  const configured = Boolean(pushConfig.data?.enabled && pushConfig.data?.publicKey);

  const enablePush = async () => {
    setWorking(true);
    try {
      if (!support.supported) throw new Error(support.reason);
      if (!configured) throw new Error("Push keys are not configured yet. In-app alerts are still available.");
      const subscription = await subscribeToChallengePush(pushConfig.data?.publicKey ?? "");
      await registerPush.mutateAsync(serializePushSubscription(subscription));
      await updatePreferences.mutateAsync({ pushEnabled: true, inAppEnabled: true, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London" });
    } catch (error: any) {
      toast.error(error?.message || "Could not enable PWA notifications.");
    } finally {
      setWorking(false);
    }
  };

  const pausePush = async () => {
    setWorking(true);
    try {
      const subscription = await getExistingChallengePushSubscription();
      if (subscription) {
        await unregisterPush.mutateAsync({ endpoint: subscription.endpoint });
        await subscription.unsubscribe().catch(() => false);
      }
      await updatePreferences.mutateAsync({ pushEnabled: false });
    } finally {
      setWorking(false);
    }
  };

  const toggle = (key: "morningIntent" | "afternoonProof" | "eveningDeadline" | "lifeRisk" | "streakRewards" | "wardenUpdates") => {
    updatePreferences.mutate({ [key]: !Boolean((pref as any)?.[key]) });
  };

  const reminderToggles: Array<["morningIntent" | "afternoonProof" | "eveningDeadline" | "lifeRisk" | "streakRewards" | "wardenUpdates", string, string]> = [
    ["morningIntent", "Morning intent", "Start the day with the six rules front-of-mind."],
    ["afternoonProof", "Proof prompt", "Nudge training proof before the day slips away."],
    ["eveningDeadline", "Deadline warning", "Protect the log before midnight."],
    ["lifeRisk", "Life-risk alert", "Warn when a missed log could cost a life."],
    ["streakRewards", "Streak and reward wins", "Celebrate saved streaks and reward eligibility."],
    ["wardenUpdates", "Warden updates", "Allow challenge-drama and accountability nudges."],
  ];

  const panel = (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/72 p-3 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-label="PWA notification settings" data-testid="pwa-notification-panel" onClick={onClose}>
      <div className="max-h-[88svh] w-full max-w-xl overflow-y-auto border-2 border-[#C8A96E] bg-[#0D0D0D] p-5 shadow-[0_24px_90px_rgba(0,0,0,0.82)]" onClick={event => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <MicroLabel tone="gold">Training Advantage</MicroLabel>
            <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.04em] text-white">PWA Notifications</h2>
            <p className="mt-2 text-sm font-bold leading-relaxed text-[#BDB8AC]">Enable installed-app reminders for proof, deadline pressure, life risk and Warden updates. In-app alerts stay available as the fallback.</p>
          </div>
          <button onClick={onClose} className="border border-[#2A2A2A] p-2 text-[#777] hover:border-[#C8A96E] hover:text-[#C8A96E]" aria-label="Close notification settings"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="border border-[#2A2A2A] bg-[#101010] p-4"><MicroLabel tone={configured ? "green" : "red"}>{configured ? "Ready" : "Setup needed"}</MicroLabel><p className="mt-2 text-sm font-black uppercase text-white">{enabled ? "Push enabled" : "Push paused"}</p><p className="mt-2 text-xs font-bold leading-relaxed text-[#8F8A80]">{support.supported ? "This installed app can request device notification permission." : support.reason}</p></div>
          <div className="border border-[#2A2A2A] bg-[#101010] p-4"><MicroLabel tone="gold">Inbox</MicroLabel><p className="mt-2 text-sm font-black uppercase text-white">{unread.length} unread</p><p className="mt-2 text-xs font-bold leading-relaxed text-[#8F8A80]">Important reminders also appear here when push delivery is unavailable.</p></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <SharpButton type="button" disabled={working || registerPush.isPending || updatePreferences.isPending || !support.supported || !configured} onClick={enablePush}>{enabled ? "Refresh device" : "Enable push"}</SharpButton>
          <button type="button" disabled={working || !enabled} onClick={pausePush} className="border border-[#2A2A2A] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#BDB8AC] hover:border-[#E56B6F] hover:text-[#E56B6F] disabled:opacity-40">Pause push</button>
          <button type="button" disabled={sendTest.isPending} onClick={() => sendTest.mutate()} className="border border-[#2A2A2A] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#BDB8AC] hover:border-[#C8A96E] hover:text-[#C8A96E] disabled:opacity-40">Send test</button>
        </div>
        <div className="mt-5 grid gap-2">
          {reminderToggles.map(([key, label, copy]) => (
            <button key={key} type="button" onClick={() => toggle(key)} className="flex items-center justify-between gap-3 border border-[#2A2A2A] bg-[#101010] p-3 text-left hover:border-[#C8A96E]"><span><span className="block text-xs font-black uppercase tracking-[0.16em] text-white">{label}</span><span className="mt-1 block text-[11px] font-bold leading-relaxed text-[#8F8A80]">{copy}</span></span><span className={classNames("shrink-0 border px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em]", (pref as any)?.[key] !== false ? "border-[#4ADE80] text-[#4ADE80]" : "border-[#555] text-[#777]")}>{(pref as any)?.[key] !== false ? "On" : "Off"}</span></button>
          ))}
        </div>
        <div className="mt-5 border border-[#2A2A2A] bg-black/25 p-4">
          <div className="flex items-center justify-between gap-3"><MicroLabel tone="muted">Recent alerts</MicroLabel>{unread.length > 0 && <button type="button" onClick={() => markRead.mutate({})} className="text-[9px] font-black uppercase tracking-[0.18em] text-[#C8A96E]">Mark all read</button>}</div>
          <div className="mt-3 space-y-2">
            {(notifications.data ?? []).slice(0, 5).map((item: any) => <div key={item.id} className="border border-[#242424] p-3"><p className="text-xs font-black uppercase text-white">{item.title}</p><p className="mt-1 text-[11px] font-bold leading-relaxed text-[#8F8A80]">{item.body}</p></div>)}
            {(notifications.data ?? []).length === 0 && <p className="text-xs font-bold text-[#777]">No reminders yet. Send a test after enabling push.</p>}
          </div>
        </div>
      </div>
    </div>
  );
  return typeof document === "undefined" ? panel : createPortal(panel, document.body);
}

function SharpButton({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={classNames(
        "poster-button motion-press flex min-h-12 items-center justify-center gap-2 px-5 py-3 text-xs transition disabled:cursor-not-allowed",
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
    <section className={classNames("motion-card min-w-0 max-w-full overflow-hidden border border-[#2A2A2A] bg-[#101010]", compact ? "p-2" : "p-4")}> 
      <div className="mb-3 flex min-w-0 items-end justify-between gap-3">
        <MicroLabel tone={safeLives <= 1 ? "red" : "gold"}>{label}</MicroLabel>
        <span className={classNames("text-xs font-black uppercase tracking-[0.28em]", safeLives <= 1 ? "text-[#C0392B]" : "text-[#C8A96E]")}>{safeLives}/4</span>
      </div>
      <div className="grid min-w-0 grid-cols-4 gap-1 bg-[#2A2A2A] p-[2px]">
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
    <div className="motion-card min-w-0 max-w-full overflow-hidden border border-[#2A2A2A] bg-[#111] p-4">
      <MicroLabel tone={tone === "white" ? "muted" : tone}>{label}</MicroLabel>
      <p className={classNames("mt-3 max-w-full break-words text-4xl font-black uppercase leading-none tracking-[-0.08em] tabular-nums", tones[tone])}>{value}</p>
    </div>
  );
}

function WardenPresence({ snapshot }: { snapshot: Snapshot }) {
  const latest = [...(snapshot?.wardenMessages ?? [])].reverse()[0];
  return (
    <aside className="motion-card warden-pulse border-l-4 border-[#C0392B] bg-[#130F0F] p-4">
      <div className="flex items-center justify-between gap-4">
        <MicroLabel tone="red">The Warden is watching</MicroLabel>
        <span className="h-2 w-2 animate-pulse bg-[#C0392B]" />
      </div>
      <p className="mt-3 text-sm font-bold leading-6 text-[#D8D8D8]">
        <span className="type-caret pr-1">{latest?.content ?? "Log honestly. The group sees momentum. The Warden sees patterns."}</span>
      </p>
      <p className="mt-3 text-[10px] font-black uppercase tracking-[0.28em] text-[#777]">1–4 organic messages per day · drama-driven</p>
    </aside>
  );
}

function LifeLossAlert({ snapshot }: { snapshot: Snapshot | undefined }) {
  const [visibleEvent, setVisibleEvent] = useState<any>(null);
  const payments = snapshot?.payments ?? [];
  const participants = snapshot?.participants ?? [];
  const candidateIds = useMemo(() => payments.filter((payment: any) => isLifeLossPaymentEvent(payment, participants)).map(getLifeLossAlertId).filter(Boolean), [payments, participants]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasBaseline = window.localStorage.getItem(LIFE_LOSS_ALERT_BASELINE_KEY) !== null;
    const baseline = readLifeLossAlertBaseline();
    if (!hasBaseline) {
      writeLifeLossAlertBaseline(candidateIds);
      return;
    }
    if (!candidateIds.length) return;
    const seenIds = new Set([...Array.from(baseline), ...candidateIds.filter(hasDismissedLifeLossAlert)]);
    const latest = selectNewLifeLossAlertEvent(payments, participants, seenIds);
    if (!latest) {
      writeLifeLossAlertBaseline([...Array.from(baseline), ...candidateIds]);
      return;
    }
    const latestId = getLifeLossAlertId(latest);
    const participant = participants.find((item: any) => String(item.id) === String(latest.participantId));
    const event = { ...latest, participant };
    persistLifeLossAlertDismissal(latestId);
    writeLifeLossAlertBaseline([...Array.from(baseline), ...candidateIds, latestId]);
    setVisibleEvent(event);
    toast.error(`${participant?.displayName ?? "Someone"} lost a life`, { description: latest.reason ?? "A £25 life-loss payment is now pending." });
    pulse([34, 48, 34]);
    const timer = window.setTimeout(() => setVisibleEvent(null), 7200);
    return () => window.clearTimeout(timer);
  }, [candidateIds, payments, participants]);

  if (!visibleEvent) return null;
  const participant = visibleEvent.participant;
  const livesAfter = clampLives(participant?.livesRemaining ?? 4);
  const alert = (
    <div className="pointer-events-none fixed inset-0 z-[120] grid place-items-center bg-black/42 px-4 backdrop-blur-[2px]" role="status" aria-live="polite" data-testid="life-loss-alert-overlay">
      <section className="pointer-events-auto w-full max-w-md overflow-hidden rounded-[1.6rem] border border-[#C0392B]/70 bg-[#120706] p-5 text-white shadow-[0_0_80px_rgba(192,57,43,0.34)]">
        <div className="relative overflow-hidden rounded-[1.25rem] border border-[#C0392B]/45 bg-black p-4">
          <div className="absolute -right-10 -top-14 h-36 w-36 animate-pulse rounded-full bg-[#C0392B]/25 blur-3xl" aria-hidden="true" />
          <MicroLabel tone="red">Life lost · group alert</MicroLabel>
          <div className="relative mt-4 flex items-center gap-3">
            <ProfilePhoto participant={participant ?? { displayName: "Participant", avatarInitials: "?" }} className="h-14 w-14 rounded-full" />
            <div className="min-w-0">
              <h2 className="break-words text-3xl font-black uppercase leading-none tracking-[-0.08em] text-white">{participant?.displayName ?? "Participant"} lost a life.</h2>
              <p className="mt-2 text-xs font-black uppercase leading-5 tracking-[0.14em] text-[#FFB3A8]">Now on {livesAfter}/4 lives · £{(Number(visibleEvent.amountPence ?? 2500) / 100).toFixed(0)} pending</p>
            </div>
          </div>
          <p className="relative mt-4 text-sm font-bold leading-6 text-[#D8D8D8]">{visibleEvent.reason ?? "A challenge rule was missed before the deadline."}</p>
          <div className="relative mt-4 grid grid-cols-4 gap-1 bg-[#2A2A2A] p-[2px]" aria-label={`${livesAfter} lives remaining`}>
            {Array.from({ length: 4 }).map((_, index) => <span key={index} className={classNames("h-7 transition-all duration-700", index < livesAfter ? "bg-[#C0392B]" : "animate-danger-drain bg-[#171717]")} />)}
          </div>
          <button type="button" onClick={() => { persistLifeLossAlertDismissal(getLifeLossAlertId(visibleEvent)); setVisibleEvent(null); }} className="relative mt-4 w-full rounded-full border border-[#C0392B]/60 bg-[#190B0A] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#FFB3A8] hover:bg-[#240D0B]">Close alert</button>
        </div>
      </section>
    </div>
  );
  return typeof document === "undefined" ? alert : createPortal(alert, document.body);
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
    <div className={classNames("motion-reward-visual relative overflow-hidden border border-[#C8A96E]/40 bg-[#070707]", compact ? "h-16 w-16 shrink-0" : "mb-4 aspect-[4/3] w-full")}>
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
      className="motion-card motion-reveal mt-8 scroll-mt-10 border border-[#2A2A2A] bg-[#090909]/94 p-4 shadow-[0_18px_70px_rgba(0,0,0,0.42)] transition duration-500 hover:border-[#C8A96E]/70 sm:p-5"
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
        <Link href="/register" className="group motion-card motion-press min-h-32 border border-[#C8A96E]/70 bg-[#C8A96E] p-4 text-left text-black transition hover:-translate-y-0.5 hover:shadow-[0_14px_40px_rgba(200,169,110,0.20)] focus:outline-none focus:ring-2 focus:ring-[#C8A96E] focus:ring-offset-2 focus:ring-offset-black">
          <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-black/60">New challenger</span>
          <span className="mt-2 block text-3xl font-black uppercase tracking-[-0.06em]">Register</span>
          <span className="mt-2 block text-xs font-black uppercase tracking-[0.12em] text-black/70">A focused page for the five setup questions.</span>
        </Link>

        <form
          className="motion-card border border-[#2A2A2A] bg-black p-4"
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
    <main className="poster-grid motion-page min-h-screen bg-[#0D0D0D] text-white">
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
          <section className="motion-hero relative overflow-hidden border border-[#2A2A2A] bg-[#080808]/92 p-5 sm:p-6 lg:p-7">
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

              <div className="motion-list grid grid-cols-2 gap-2 sm:grid-cols-4">
                {challengeStats.map(([label, value]) => (
                  <div key={label} className="motion-card border border-[#2A2A2A] bg-[#111] p-3">
                    <MicroLabel tone="gold">{label}</MicroLabel>
                    <p className="mt-2 text-2xl font-black uppercase text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="motion-list grid gap-4">
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
            <div className="motion-list mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {landingRules.map(([number, icon, title, body, footer]) => (
                <details key={number} className="group motion-card motion-details border border-[#2A2A2A] bg-black p-4 open:border-[#C8A96E]/70">
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
              <div className="motion-list mt-4 grid gap-2 sm:grid-cols-2">
                {dailyChecklist.map(([title, detail]) => (
                  <div key={title} className="motion-card border border-[#2A2A2A] bg-black p-3">
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
                  <article key={day} className="motion-card border border-[#2A2A2A] bg-black p-3">
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
    <article className={classNames("motion-card rule-card-motion border transition-all duration-300 hover:-translate-y-0.5", complete ? "rule-card-complete border-[#2ECC71] bg-[#0F1E15] shadow-[0_0_0_1px_rgba(46,204,113,0.2)]" : active ? "rule-card-active border-[#C0392B] bg-[#1A0D0A] shadow-[0_18px_55px_rgba(192,57,43,0.14)]" : "border-[#2A2A2A] bg-[#101010]")}> 
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
  return <input {...props} className={classNames("motion-focus w-full border border-[#2A2A2A] bg-[#0D0D0D] px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-[#555] focus:border-[#C8A96E]", props.className)} />;
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={classNames("motion-focus min-h-28 w-full border border-[#2A2A2A] bg-[#0D0D0D] px-4 py-3 text-sm font-bold leading-6 text-white outline-none transition placeholder:text-[#555] focus:border-[#C8A96E]", props.className)} />;
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
    <div className="journal-letter-card motion-card group relative overflow-hidden border border-[#2A2A2A] bg-[#080808] p-4 transition duration-500 hover:border-[#C8A96E]/70">
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
  const utils = trpc.useUtils();
  const [form, setForm] = useState<MyDayForm>(emptyDay);
  const [openRule, setOpenRule] = useState<RuleKey>("exercise");
  const [lastMissed, setLastMissed] = useState<string[]>([]);
  const [saveNotice, setSaveNotice] = useState<{ title: string; complete: boolean } | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [saveProgressScale, setSaveProgressScale] = useState(0);
  const cameraProofInputRef = useRef<HTMLInputElement | null>(null);
  const libraryProofInputRef = useRef<HTMLInputElement | null>(null);
  const participant = snapshot?.participant;
  const currentDayNumber = snapshot?.challenge?.currentDay ?? 1;
  const draftStorageKey = getDraftStorageKey(participant?.userId ?? participant?.id, currentDayNumber);
  const latestWarden = [...(snapshot?.wardenMessages ?? [])].reverse()[0];
  const { rules, completedRules, allAddressed, passThreshold, totalRules } = getDailyLogProgress(form);
  const liveTaskPoints = calculateLiveTaskPoints(completedRules, {
    hasProof: parseProofMedia(form.exerciseProofUrl).length > 0 || String(form.exerciseProofUrl ?? "").trim().length > 0,
    hasInsight: String(form.reflectionText ?? "").trim().length > 0 || String(form.readTeachText ?? "").trim().length > 0,
    trackedEverything: Boolean(form.trackedEverything),
  });
  const todayAlreadyComplete = Boolean(snapshot?.myLog?.dayComplete && Number(snapshot.myLog.dayNumber) === currentDayNumber);
  const leaderboardVisiblePoints = getLeaderboardVisiblePoints(participant);
  const pointStripItems = [
    { label: "Ticks", value: `+${liveTaskPoints.rulePoints}`, detail: `${completedRules}/${totalRules}`, tone: "gold" as const },
    { label: "Pass", value: `+${liveTaskPoints.passBonus}`, detail: allAddressed ? "secured" : `${Math.max(0, passThreshold - completedRules)} left`, tone: allAddressed ? "green" as const : "white" as const },
    { label: "Proof", value: `+${liveTaskPoints.proofBonus + liveTaskPoints.insightBonus}`, detail: "proof/insight", tone: "purple" as const },
    { label: "Board", value: leaderboardVisiblePoints, detail: "leaderboard", tone: "green" as const },
  ];
  const ghostLifeLocked = Boolean(participant?.ghostLifeUsed);

  useEffect(() => {
    setDraftReady(false);
    setDraftRestored(false);
    if (!draftStorageKey) {
      setForm(emptyDay);
      return;
    }

    const savedToday = dailyLogToForm(snapshot?.myLog);
    const storedDraft = readStoredDraft(draftStorageKey);
    if (storedDraft) {
      setForm(mergeTodayFormWithoutWipingSavedWork(savedToday, storedDraft));
      setDraftRestored(true);
      window.setTimeout(() => setDraftRestored(false), 2600);
      setDraftReady(true);
      return;
    }

    setForm(savedToday);
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateSaveProgressScale = () => {
      const target = document.querySelector("[data-save-progress-anchor]");
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const viewport = Math.max(window.innerHeight, 1);
      const progress = 1 - Math.min(1, Math.max(0, rect.bottom / (viewport * 1.12)));
      setSaveProgressScale(Number(progress.toFixed(2)));
    };
    updateSaveProgressScale();
    window.addEventListener("scroll", updateSaveProgressScale, { passive: true });
    window.addEventListener("resize", updateSaveProgressScale);
    return () => {
      window.removeEventListener("scroll", updateSaveProgressScale);
      window.removeEventListener("resize", updateSaveProgressScale);
    };
  }, []);

  const saveProgressDocked = saveProgressScale >= 0.78;

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
      utils.challenge.snapshot.setData(undefined, previous => patchDailyLogIntoSnapshot(previous, data.log, data.participant));
      void utils.challenge.snapshot.invalidate();
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
      setForm(current => ({ ...current, exerciseProofUrl: appendProofMedia(current.exerciseProofUrl, { url: data.url, type: data.mediaType, mimeType: data.mimeType, name: data.fileName }) }));
      pulse([12, 28, 12]);
      toast(`${data.mediaType === "video" ? "Video" : "Image"} proof uploaded. ${parseProofMedia(form.exerciseProofUrl).length + 1} proof item${parseProofMedia(form.exerciseProofUrl).length + 1 === 1 ? "" : "s"} attached.`);
    },
    onError: error => toast.error(error.message || "Could not upload proof media."),
  });
  function markChecklistItem(key: "noAlcohol" | "cleanEating" | "trackedEverything", checked: boolean) {
    pulse(checked ? [18, 30, 18] : 12);
    if (checked) playDoneCue();
    setForm(current => ({ ...current, [key]: checked }));
  }

  function handleProofFiles(fileList?: FileList | null) {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) return;
    const availableSlots = Math.max(0, 6 - parseProofMedia(form.exerciseProofUrl).length);
    if (availableSlots === 0) { toast.error("You can attach up to 6 proof items per day."); return; }
    files.slice(0, availableSlots).forEach(file => {
      if (!file.type.match(/^(image\/(png|jpeg|webp)|video\/(mp4|webm|quicktime))$/)) { toast.error("Use PNG, JPG, WEBP, MP4, MOV, or WEBM proof media."); return; }
      const limit = file.type.startsWith("video/") ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > limit) { toast.error(file.type.startsWith("video/") ? "Proof video must be under 50MB." : "Proof image must be under 10MB."); return; }
      const reader = new FileReader();
      const mimeType = file.type as "image/png" | "image/jpeg" | "image/webp" | "video/mp4" | "video/webm" | "video/quicktime";
      reader.onload = () => uploadProof.mutate({ fileName: file.name || "exercise-proof", mimeType, dataUrl: String(reader.result) });
      reader.onerror = () => toast.error("Could not read that proof media.");
      reader.readAsDataURL(file);
    });
    if (files.length > availableSlots) toast("Only the first available proof slots were queued.");
  }

  return (
    <div className="motion-page grid min-w-0 max-w-full gap-5 overflow-x-hidden xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="min-w-0 max-w-full space-y-5 overflow-x-hidden">
        <div className="min-w-0 max-w-full overflow-hidden border border-[#2A2A2A] bg-[#101010] p-4 sm:p-5">
          <div className="grid min-w-0 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
            <div>
              <MicroLabel tone="gold">Day {snapshot?.challenge.currentDay ?? "—"} / 50</MicroLabel>
              <h1 className="mt-3 text-5xl font-black uppercase leading-[0.86] tracking-[-0.08em] text-white md:text-7xl">Log the day.</h1>
              <p className="mt-4 max-w-xl text-sm font-bold leading-6 text-[#A7A7A7]">Six standards. One honest submission. No cover.</p>
            </div>
            <HealthBar lives={participant?.livesRemaining ?? 4} label="Your lives" />
          </div>
        </div>

        <div data-save-progress-anchor className={classNames("must-do-rules motion-card min-w-0 max-w-full overflow-hidden border-2 p-3 transition-all duration-300 sm:p-4", allAddressed ? "must-do-rules-complete border-[#2ECC71] bg-[#07150D]" : "border-[#C0392B] bg-[#190B0A]")}> 
          <div className="mb-3 flex flex-col gap-2 border-b border-white/10 pb-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <MicroLabel tone={allAddressed ? "green" : "red"}>{allAddressed ? "Standard met" : "Today’s non-negotiables"}</MicroLabel>
              <h2 className="mt-2 text-2xl font-black uppercase leading-none tracking-[-0.06em] text-white">Six rules. Five banks the day.</h2>
            </div>
            <div className="flex min-w-0 flex-wrap gap-2">
              <div className={classNames("border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em]", allAddressed ? "border-[#2ECC71] bg-[#0F2A18] text-[#2ECC71]" : "border-[#C0392B] bg-[#2A0F0C] text-[#FFB3A8]")}>{allAddressed ? `${completedRules}/${totalRules} passed` : `${Math.max(0, passThreshold - completedRules)} more to bank it`}</div>
              <div className="border border-[#C8A96E]/60 bg-[#16130B] px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#C8A96E]">+{liveTaskPoints.visibleTotal} live pts</div>
            </div>
          </div>
          <div className="mb-2 min-w-0 max-w-full overflow-hidden border border-[#2A2A2A] bg-black/35 p-1.5 sm:p-2" data-testid="live-task-points-strip" aria-label="Live points compact strip">
            <div className="flex min-w-0 items-center justify-between gap-2 px-1 pb-1.5">
              <MicroLabel tone="gold">Live points</MicroLabel>
              <span className="shrink-0 text-[9px] font-black uppercase tracking-[0.16em] text-[#C8A96E] sm:text-[10px]">+{liveTaskPoints.visibleTotal} now</span>
            </div>
            <div className="grid min-w-0 max-w-full grid-cols-4 gap-1" role="list">
              {pointStripItems.map(item => {
                const toneClasses = {
                  gold: "border-[#C8A96E]/55 bg-[#16130B] text-[#C8A96E]",
                  green: "border-[#2ECC71]/55 bg-[#07150D] text-[#2ECC71]",
                  purple: "border-[#9B59B6]/55 bg-[#150E1A] text-[#B97DDA]",
                  white: "border-[#444] bg-[#111] text-white",
                }[item.tone];
                return (
                  <div key={item.label} role="listitem" className={classNames("min-w-0 overflow-hidden border px-1.5 py-1.5 sm:px-2 sm:py-2", toneClasses)}>
                    <div className="flex min-w-0 items-baseline justify-between gap-1">
                      <span className="min-w-0 truncate text-[8px] font-black uppercase tracking-[0.12em] text-[#BDBDBD] min-[390px]:text-[9px]">{item.label}</span>
                      <span className="max-w-[2.75rem] shrink-0 truncate text-right text-base font-black uppercase leading-none tracking-[-0.06em] tabular-nums min-[390px]:text-lg sm:max-w-[4.5rem] sm:text-xl">{item.value}</span>
                    </div>
                    <p className="mt-0.5 truncate text-[7px] font-black uppercase tracking-[0.1em] text-[#8F8F8F] min-[390px]:text-[8px] sm:mt-1 sm:text-[9px]">{item.detail}</p>
                  </div>
                );
              })}
            </div>
          </div>
          {allAddressed && <div className="mb-3 border border-[#2ECC71]/50 bg-[#0F2A18] p-3 text-xs font-black uppercase tracking-[0.16em] text-[#2ECC71]">5/6 banks the day. Submit once the work is real.</div>}
          <div className="motion-list space-y-2">
          <RuleCard title="No alcohol" label="Rule 01" icon={Shield} complete={form.noAlcohol} active={openRule === "noAlcohol"} onToggle={() => setOpenRule(openRule === "noAlcohol" ? "exercise" : "noAlcohol")}>
            <label className="flex items-center justify-between gap-4 border border-[#2A2A2A] bg-[#0D0D0D] p-4">
              <span className="text-sm font-black uppercase tracking-[0.12em] text-white">No alcohol. No negotiation.</span>
              <input type="checkbox" checked={form.noAlcohol} onChange={event => markChecklistItem("noAlcohol", event.target.checked)} className="h-6 w-6 accent-[#2ECC71]" />
            </label>
          </RuleCard>

          <RuleCard title="Clean eating" label="Rule 02" icon={Utensils} complete={rules[1].done} active={openRule === "cleanEating"} onToggle={() => setOpenRule(openRule === "cleanEating" ? "exercise" : "cleanEating")}>
            <div className="space-y-3">
              <div className="border border-[#C8A96E]/45 bg-[#16130B] p-3 text-[10px] font-black uppercase leading-5 tracking-[0.14em] text-[#F4D58D]">
                End-of-day rule. Do not tick this in the morning — confirm it only after the food has actually happened.
              </div>
              <Field label="Food evidence required"><TextInput value={form.cleanEatingNote} onChange={event => setForm({ ...form, cleanEatingNote: event.target.value, cleanEating: form.cleanEating && event.target.value.trim().length >= 10 })} placeholder="Example: eggs breakfast, chicken/rice lunch, salmon dinner" /></Field>
              <label className={classNames("flex items-center justify-between gap-4 border p-4", form.cleanEatingNote.trim().length >= 10 ? "border-[#2ECC71]/45 bg-[#07150D]" : "border-[#5A2C25] bg-[#180C0A]")}>
                <span className="text-sm font-black uppercase tracking-[0.12em] text-white">I confirm clean eating for the full day</span>
                <input type="checkbox" checked={form.cleanEating && form.cleanEatingNote.trim().length >= 10} disabled={form.cleanEatingNote.trim().length < 10} onChange={event => markChecklistItem("cleanEating", event.target.checked)} className="h-6 w-6 accent-[#2ECC71] disabled:opacity-40" />
              </label>
              {form.cleanEatingNote.trim().length < 10 && <p className="text-[10px] font-black uppercase leading-5 tracking-[0.16em] text-[#C0392B]">Add a real meal note before Clean Eating can count.</p>}
            </div>
          </RuleCard>

          <RuleCard title="Exercise" label="Rule 03" icon={Dumbbell} complete={rules[2].done} active={openRule === "exercise"} onToggle={() => setOpenRule(openRule === "exercise" ? "reflection" : "exercise")}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Minutes"><TextInput type="number" value={form.exerciseDuration || ""} onChange={event => setForm({ ...form, exerciseDuration: event.target.value === "" ? 0 : Number(event.target.value) })} placeholder="30+" /></Field>
              <Field label="Workout type"><TextInput value={form.exerciseType} onChange={event => setForm({ ...form, exerciseType: event.target.value })} placeholder="Run, gym, mobility…" /></Field>
              <div className="sm:col-span-2">
                <Field label="Proof media / link"><TextInput value={parseProofMedia(form.exerciseProofUrl).filter(item => item.type === "link").map(item => item.url).join(" ")} onChange={event => setForm({ ...form, exerciseProofUrl: appendProofMedia(encodeProofMedia(parseProofMedia(form.exerciseProofUrl).filter(item => item.type !== "link")), { url: event.target.value, type: "link" }) })} placeholder="Upload proof, paste Strava, or add a clear note" /></Field>
                <input ref={cameraProofInputRef} type="file" accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime" capture="environment" multiple className="sr-only" onChange={event => { handleProofFiles(event.target.files); event.currentTarget.value = ""; }} />
                <input ref={libraryProofInputRef} type="file" accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime" multiple className="sr-only" onChange={event => { handleProofFiles(event.target.files); event.currentTarget.value = ""; }} />
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" disabled={uploadProof.isPending} className="border border-[#C8A96E]/50 bg-[#16130B] px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-[#C8A96E] disabled:opacity-50" onClick={() => { pulse(12); cameraProofInputRef.current?.click(); }}>{uploadProof.isPending ? "Uploading" : "Take proof"}</button>
                  <button type="button" disabled={uploadProof.isPending} className="border border-[#2A2A2A] bg-[#111] px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-white disabled:opacity-50" onClick={() => { pulse(12); libraryProofInputRef.current?.click(); }}>{uploadProof.isPending ? "Uploading" : "Choose proof"}</button>
                </div>
                <ProofMediaStrip items={parseProofMedia(form.exerciseProofUrl)} onRemove={index => setForm(current => ({ ...current, exerciseProofUrl: encodeProofMediaAfterRemoval(current.exerciseProofUrl, index) }))} />
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
            <Field label="One useful idea"><TextArea value={form.readTeachText} onChange={event => setForm({ ...form, readTeachText: event.target.value })} placeholder="Teach one useful thing from today." /></Field>
          </RuleCard>

          <RuleCard title="Track everything" label="Rule 06" icon={Activity} complete={form.trackedEverything} active={openRule === "trackedEverything"} onToggle={() => setOpenRule(openRule === "trackedEverything" ? "exercise" : "trackedEverything")}>
            <label className="flex items-center justify-between gap-4 border border-[#2A2A2A] bg-[#0D0D0D] p-4">
              <span className="text-sm font-black uppercase tracking-[0.12em] text-white">Everything tracked honestly</span>
              <input type="checkbox" checked={form.trackedEverything} onChange={event => markChecklistItem("trackedEverything", event.target.checked)} className="h-6 w-6 accent-[#2ECC71]" />
            </label>
          </RuleCard>
          </div>
        </div>

        <div className="motion-list grid min-w-0 max-w-full gap-2 overflow-hidden bg-[#2A2A2A] p-[2px] sm:grid-cols-3" data-testid="myday-stats-after-must-do">
          <PosterStat label="Standards logged" value={`${completedRules}/${totalRules}`} tone={allAddressed ? "green" : "gold"} />
          <PosterStat label="Streak held" value={participant?.currentStreak ?? 0} tone="green" />
          <PosterStat label="Points in play" value={leaderboardVisiblePoints} tone="gold" />
        </div>

        <div className={classNames("submit-dock motion-submit-dock z-[70] mx-auto w-[min(100%,calc(100vw-2rem))] max-w-full transition-all duration-300 md:static md:w-full", saveProgressDocked ? "static translate-y-0" : "fixed inset-x-4 bottom-[calc(5.85rem+env(safe-area-inset-bottom))]", saveProgressScale < 0.35 ? "max-w-[9.5rem] rounded-full border border-[#C8A96E]/45 bg-[#070707]/94 p-1 shadow-[0_0_24px_rgba(200,169,110,0.18)] backdrop-blur" : saveProgressScale < 0.78 ? "max-w-[15rem] rounded-full border border-[#C8A96E]/55 bg-[#0D0D0D]/95 p-1.5 shadow-[0_0_32px_rgba(200,169,110,0.22)] backdrop-blur" : "max-w-none rounded-none border border-[#2A2A2A] bg-[#0D0D0D]/95 p-3 backdrop-blur md:border-transparent md:bg-transparent md:p-0 md:backdrop-blur-none", submit.isPending && "submit-dock-pending", allAddressed && !submit.isPending && "submit-dock-ready")} data-save-progress-scale={saveProgressScale} data-save-progress-docked={saveProgressDocked ? "true" : "false"} data-mobile-save-progress-mini-to-section="true" data-mobile-save-progress-above-nav="true">
          <SharpButton className={classNames("w-full max-w-full overflow-hidden whitespace-normal break-words text-center transition-all duration-300", saveProgressScale < 0.35 ? "rounded-full px-3 py-2 text-[0px] shadow-none before:content-['SAVE'] before:text-[9px] before:font-black before:tracking-[0.18em]" : saveProgressScale < 0.78 ? "rounded-full px-4 py-3 text-[10px]" : "py-5 text-sm", submit.isPending && "submit-button-pending")} disabled={submit.isPending} onClick={() => submit.mutate({ ...form, reflectionShared: false, dayNumber: snapshot?.challenge.currentDay ?? 1 })}>
            {submit.isPending ? (allAddressed ? "Banking the day" : "Saving the work") : allAddressed ? `Submit day ${snapshot?.challenge.currentDay ?? 1}` : `Save draft — ${Math.max(0, passThreshold - completedRules)} more to bank it`}
          </SharpButton>
          {saveProgressDocked && !allAddressed && <p className="mt-2 text-center text-[10px] font-black uppercase tracking-[0.16em] text-[#C8A96E]/80">Draft only until 5/6 is real. Lives are judged at rollover.</p>}
          {saveNotice && <div role="status" className={classNames("pointer-events-none absolute -top-3 right-3 rounded-full border bg-black/90 px-2 py-1 text-[9px] font-black uppercase leading-none tracking-[0.16em] shadow-[0_0_18px_rgba(0,0,0,0.45)]", saveNotice.complete ? "border-[#2ECC71]/70 text-[#2ECC71]" : "border-[#C8A96E]/70 text-[#C8A96E]")}>{saveNotice.title}</div>}
          {draftRestored && <div role="status" className="pointer-events-none absolute -top-3 left-3 rounded-full border border-[#C8A96E]/70 bg-black/90 px-2 py-1 text-[9px] font-black uppercase leading-none tracking-[0.16em] text-[#C8A96E] shadow-[0_0_18px_rgba(0,0,0,0.45)]">Draft recovered</div>}
          {lastMissed.length > 0 && <div className="mt-3 border-l-4 border-[#C0392B] bg-[#180F0F] p-4 text-sm font-bold text-[#F0B7AE]">Rollover miss: {lastMissed.join(", ")}. Penalty recorded.</div>}
        </div>
      </section>

      <aside className="min-w-0 max-w-full space-y-5 overflow-x-hidden">
        <WardenPresence snapshot={snapshot} />
        <HealthBar lives={participant?.livesRemaining ?? 4} label="Lives remaining" />
        <div className={classNames("motion-card ghost-life-card border p-4 transition", ghostLifeLocked ? "border-[#4A315D] bg-[#120F18] opacity-80" : "border-[#2A2A2A] bg-[#101010]")} data-ghost-life-state={ghostLifeLocked ? "locked" : "available"}>
          <div className="flex items-start justify-between gap-3">
            <MicroLabel tone="purple">Ghost Life</MicroLabel>
            {ghostLifeLocked && <span className="border border-[#9B59B6]/60 bg-[#1B1024] px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#D8B4FE]">Locked</span>}
          </div>
          <p className="mt-3 text-2xl font-black uppercase leading-none text-white">{ghostLifeLocked ? "Used. Locked." : "One rescue. No repeats."}</p>
          <p className="mt-3 text-sm font-bold leading-6 text-[#999]">{ghostLifeLocked ? "Your Purple Ghost Life has already restored a life. It is now locked for the rest of the challenge." : "Use it once after a lost life to restore one purple Ghost Life. After that, it is gone."}</p>
          <SharpButton className={classNames("mt-4 w-full", ghostLifeLocked ? "border-[#4A315D] bg-[#1B1420] text-[#8D7898] shadow-none" : "border-[#9B59B6] bg-[#9B59B6] text-white shadow-[0_0_28px_rgba(155,89,182,0.24)]")} disabled={ghost.isPending || ghostLifeLocked} aria-disabled={ghostLifeLocked} onClick={() => ghost.mutate({ exerciseDuration: form.exerciseDuration, insightCount: form.readTeachText.split(".").filter(Boolean).length })}>
            {ghostLifeLocked ? "Ghost Life locked" : ghost.isPending ? "Restoring Ghost Life" : "Use Purple Ghost Life"}
          </SharpButton>
        </div>
        <div className="border border-[#2A2A2A] bg-[#101010] p-4">
          <MicroLabel tone="red">Latest Warden note</MicroLabel>
          <p className="mt-3 text-sm font-bold leading-6 text-[#BDBDBD]">{latestWarden?.content ?? "No hiding place. Log the day."}</p>
        </div>
      </aside>
    </div>
  );
}

function pct(part: number, whole: number) {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

function OverviewMetricCard({
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
  const className = classNames("motion-card min-w-0 border p-4 text-left transition duration-300", tones[tone], onClick && "motion-press cursor-pointer hover:-translate-y-0.5 hover:border-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8A96E]/60");
  return onClick ? <button type="button" onClick={onClick} className={className}>{content}</button> : <article className={className}>{content}</article>;
}

function getDaysRemainingInsight(currentDay: number, participantCount: number, todayComplete: number, onPaceCount: number) {
  const totalDays = 50;
  const daysRemaining = Math.max(0, totalDays - currentDay);
  const completionRate = participantCount ? Math.round((todayComplete / participantCount) * 100) : 0;
  const paceRate = participantCount ? Math.round((onPaceCount / participantCount) * 100) : 0;
  if (daysRemaining <= 7) return { value: daysRemaining, tone: "red" as const, detail: `Final week. ${completionRate}% banked today.`, headline: "Close-out mode", body: `There are ${daysRemaining} days left after today. The useful signal now is simple: who is banking today and who is still exposed. ${onPaceCount}/${participantCount || 0} are on pace overall.` };
  if (daysRemaining <= 15) return { value: daysRemaining, tone: "red" as const, detail: `Closing stretch. ${paceRate}% still on pace.`, headline: "Pressure is real", body: "There is still room to move, but skipped days are expensive now. This view should help people see whether the room is protecting pace or drifting." };
  if (daysRemaining <= 30) return { value: daysRemaining, tone: "gold" as const, detail: `Middle stretch. ${todayComplete}/${participantCount || 0} banked.`, headline: "Momentum check", body: "This is where the challenge can feel normal. The key signal is whether people keep banking ordinary days before the final pressure arrives." };
  return { value: daysRemaining, tone: "green" as const, detail: `Early build. ${onPaceCount}/${participantCount || 0} on pace.`, headline: "Build the rhythm", body: "There is enough time to shape the leaderboard, but early consistency decides who gets to the hard part with lives and confidence still intact." };
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

function OverviewBar({ label, value, detail, tone = "gold" }: { label: string; value: number; detail: string; tone?: "gold" | "red" | "green" | "purple" }) {
  const fill = tone === "green" ? "bg-[#2ECC71]" : tone === "red" ? "bg-[#C0392B]" : tone === "purple" ? "bg-[#9B59B6]" : "bg-[#C8A96E]";
  return (
    <div className="motion-card border border-[#2A2A2A] bg-black p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white">{label}</p>
        <span className="text-sm font-black text-[#C8A96E]">{value}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden bg-[#242424]" aria-hidden="true">
        <div className={classNames("motion-progress-fill h-full", fill)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#777]">{detail}</p>
    </div>
  );
}

function InsightPill({ label, value, tone = "gold" }: { label: string; value: string | number; tone?: "gold" | "red" | "green" | "purple" | "white" }) {
  const tones = {
    gold: "border-[#C8A96E]/50 text-[#C8A96E]",
    red: "border-[#C0392B]/55 text-[#FFB3A8]",
    green: "border-[#2ECC71]/55 text-[#2ECC71]",
    purple: "border-[#9B59B6]/55 text-[#D9B3F0]",
    white: "border-[#444] text-white",
  };
  return <span className={classNames("inline-flex max-w-full min-w-0 items-center gap-1 overflow-hidden border bg-black px-3 py-2 text-[10px] font-black uppercase leading-tight tracking-[0.11em]", tones[tone])}><span className="shrink-0">{label}:</span><span className="min-w-0 truncate tabular-nums">{value}</span></span>;
}

function getBoostToneClass(tone?: string) {
  if (tone === "green") return "border-[#2ECC71]/55 bg-[#07150D] text-[#2ECC71]";
  if (tone === "red") return "border-[#C0392B]/55 bg-[#190B0A] text-[#FFB3A8]";
  if (tone === "purple") return "border-[#9B59B6]/55 bg-[#130F18] text-[#D8B4FE]";
  if (tone === "white") return "border-white/25 bg-white/[0.04] text-white";
  return "border-[#C8A96E]/55 bg-[#16130B] text-[#C8A96E]";
}

function WardenMoodCard({ mood, isLoading, currentDay, completedRules, totalRules }: { mood: any; isLoading?: boolean; currentDay?: number; completedRules?: number; totalRules?: number }) {
  const daysRemaining = Math.max(0, 50 - (currentDay ?? 1));
  const done = Math.max(0, Number(completedRules ?? 0));
  const total = Math.max(1, Number(totalRules ?? 6));
  const missing = Math.max(0, total - done);

  let interpreted = { label: "Reading today's shape", tone: "white", detail: "No judgement yet. The useful read appears once today's log starts moving.", confidence: 0.65, source: "progress" } as any;
  if (done >= 5 && daysRemaining <= 10) interpreted = { label: "Finish-line control", tone: "green", detail: `Today is protected: ${done}/${total} done with ${daysRemaining} days left. Keep proof tight and avoid cheap mistakes.`, confidence: 0.88, source: "progress" };
  else if (done >= 5) interpreted = { label: "Day is in hand", tone: "green", detail: `${done}/${total} done. This is the pace that keeps lives quiet and points moving.`, confidence: 0.84, source: "progress" };
  else if (done >= 3 && daysRemaining <= 10) interpreted = { label: "Close, but exposed", tone: "gold", detail: `${done}/${total} done with ${missing} still open. In the final stretch, unfinished rules turn into pressure fast.`, confidence: 0.82, source: "progress" };
  else if (done >= 3) interpreted = { label: "Half-built day", tone: "gold", detail: `${done}/${total} done. There is progress, but ${missing} rule${missing === 1 ? "" : "s"} still decide whether this becomes a banked day.`, confidence: 0.78, source: "progress" };
  else if (daysRemaining <= 10) interpreted = { label: "Needs action now", tone: "red", detail: `Only ${done}/${total} done and ${daysRemaining} days left. This is not panic, but it does need a clean finish today.`, confidence: 0.86, source: "progress" };
  else interpreted = { label: "Still forming", tone: "purple", detail: `Only ${done}/${total} done so far. The Warden is waiting for the day to show proof, effort, and tracking.`, confidence: 0.72, source: "progress" };

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

function Overview({ snapshot }: { snapshot: Snapshot }) {
  const [selected, setSelected] = useState<any>(null);
  const [boostLeaderOpen, setBoostLeaderOpen] = useState(false);
  const [expandedBoostId, setExpandedBoostId] = useState<string | null>(null);
  const [groupDetailsOpen, setGroupDetailsOpen] = useState(false);
  const participants = snapshot?.participants ?? [];
  const logs = snapshot?.logs ?? [];
  const payments = snapshot?.payments ?? [];
  const redemptions = snapshot?.redemptions ?? [];
  const currentDay = Math.max(Number(snapshot?.challenge?.currentDay ?? 1), 1);
  const participantCount = participants.length;
  const insights = useMemo(() => buildParticipantInsights({ participants, logs, currentDay }), [participants, logs, currentDay]);
  const rankedInsights = useMemo(() => rankForPodium(insights), [insights]);
  const currentParticipant = insights.find((participant: any) => String(participant.id) === String(snapshot?.participant?.id)) ?? rankedInsights[0];
  const currentParticipantId = currentParticipant?.id ?? snapshot?.participant?.id;
  const wardenMoodQuery = trpc.warden.getMood.useQuery(
    { participantId: Number(currentParticipantId), metric: "effort_vibe" },
    {
      enabled: Boolean(currentParticipantId),
      staleTime: 6 * 60 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      placeholderData: previousMood => previousMood,
    },
  );
  const activeBoosts = snapshot?.activeBoosts ?? [];
  const boostWins = snapshot?.boostWins ?? [];
  const todayBoostWins = boostWins.filter((win: any) => Number(win.day ?? 0) === currentDay);
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
  const unclaimedTodayBoosts = activeBoosts.filter((boost: any) => !todayBoostWins.some((win: any) => win.boostId === boost.id));
  const currentRank = Math.max(0, rankedInsights.findIndex((participant: any) => String(participant.id) === String(currentParticipant?.id)));
  const chasing = currentRank > 0 ? rankedInsights[currentRank - 1] : null;
  const beingChasedBy = currentRank >= 0 ? rankedInsights[currentRank + 1] : null;
  const onPaceCount = insights.filter((p: any) => Number(p.completeCount ?? 0) >= currentDay).length;
  const todayOpened = insights.filter((p: any) => p.todayLog).length;
  const todayComplete = insights.filter((p: any) => p.completedRulesToday >= DAILY_PASS_THRESHOLD).length;
  const totalLivesLost = insights.reduce((sum: number, p: any) => sum + p.livesLost, 0);
  const pendingPayments = payments.filter((p: any) => p.status === "pending").length;
  const pendingRewards = redemptions.filter((r: any) => r.status === "pending").length;
  const riskCount = insights.filter((p: any) => Number(p.riskPoints ?? 0) >= 42 || Number(p.livesRemaining ?? 4) <= 2).length;
  const riskLeader = [...insights].sort((a: any, b: any) => b.riskPoints - a.riskPoints || a.livesRemaining - b.livesRemaining)[0];
  const daysInsight = getDaysRemainingInsight(currentDay, participantCount, todayComplete, onPaceCount);
  const liveAppPoints = insights.reduce((sum: number, participant: any) => {
    const taskPoints = calculateLiveTaskPoints(participant.completedRulesToday, {
      hasProof: logHasProof(participant.todayLog),
      hasInsight: logHasInsight(participant.todayLog),
      trackedEverything: Boolean(participant.todayLog?.trackedEverything),
    });
    return sum + taskPoints.visibleTotal;
  }, 0);
  const compareRows = [...rankedInsights].sort((a: any, b: any) => b.riskPoints - a.riskPoints || b.totalPoints - a.totalPoints);
  const rivalryCards = [
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
    <div className="motion-page space-y-3 overflow-hidden pb-2" data-testid="overview-metrics-dashboard">
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
    { key: "cleanEating", done: Boolean(log?.cleanEating) && String(log?.cleanEatingNote ?? "").trim().length >= 10 },
    { key: "exercise", done: Number(log?.exerciseDuration ?? 0) >= 30 && String(log?.exerciseType ?? "").trim().length > 1 },
    { key: "reflection", done: Boolean(log?.privateReflectionLogged) || String(log?.reflectionText ?? "").trim().length > 1 },
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
  const [selectedHistoryDay, setSelectedHistoryDay] = useState<number | null>(null);

  useEffect(() => {
    if (participant) {
      setVisibleParticipant(participant);
      setPhotoExpanded(false);
      setClosing(false);
      setSelectedHistoryDay(null);
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

  const participantHistoryInput = useMemo(() => ({ participantId: Number(visibleParticipant?.id ?? 0) }), [visibleParticipant?.id]);
  const historyQuery = trpc.challenge.participantHistory.useQuery(
    participantHistoryInput,
    { enabled: Boolean(visibleParticipant?.id) }
  );

  if (!visibleParticipant) return null;
  const sheetLogs = [...(historyQuery.data?.logs ?? visibleParticipant.ownedLogs ?? [])].sort((a: any, b: any) => Number(b.dayNumber ?? 0) - Number(a.dayNumber ?? 0));
  const latestLog = sheetLogs[0];
  const selectedHistoryLog = sheetLogs.find((log: any) => Number(log.dayNumber) === Number(selectedHistoryDay)) ?? latestLog;
  const selectedHistoryRules = selectedHistoryLog ? getLogRuleStates(selectedHistoryLog) : [];
  const latestRules = latestLog ? getLogRuleStates(latestLog) : [];
  const latestCompletedRules = latestLog ? latestRules.filter(rule => rule.done).length : 0;
  const recentLogs = sheetLogs.slice(0, 7);
  const recentPassed = recentLogs.filter((log: any) => log.completed || getLogCompletedRuleCount(log) >= DAILY_PASS_THRESHOLD).length;
  const sheet = (
    <div className={classNames("sheet-backdrop fixed inset-0 z-[90] flex items-center justify-center overflow-hidden bg-black/78 p-3 sm:p-4", closing && "sheet-backdrop-out")} onClick={onClose} data-testid="participant-profile-overlay">
      <div className={classNames("sheet-panel motion-sheet-panel flex max-h-[min(92svh,46rem)] w-full max-w-xl flex-col overflow-hidden border-2 border-[#C8A96E] bg-[#0D0D0D] shadow-[0_24px_90px_rgba(0,0,0,0.82)]", closing && "sheet-panel-out")} onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={`${visibleParticipant.displayName} Board participant details`}>
        <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-3 border-b border-[#2A2A2A] bg-[#0D0D0D]/95 px-4 py-3 backdrop-blur">
          <button type="button" onClick={onClose} className="min-h-11 border border-[#C8A96E]/60 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#C8A96E] hover:bg-[#C8A96E] hover:text-black" aria-label="Back to Overview list">Back to Overview</button>
          <button type="button" onClick={onClose} className="grid min-h-11 min-w-11 shrink-0 place-items-center border border-[#2A2A2A] text-[#777] hover:border-[#C8A96E] hover:text-[#C8A96E]" aria-label="Close participant details"><X className="h-5 w-5" /></button>
        </div>
        <div className="overflow-y-auto p-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:p-5">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <ProfilePhoto participant={visibleParticipant} className="h-14 w-14 shrink-0 sm:h-20 sm:w-20" enlargeable onOpen={() => setPhotoExpanded(true)} />
          <div className="min-w-0 flex-1">
            <MicroLabel tone="gold">Participant dossier</MicroLabel>
            <h3 className="mt-2 break-words text-2xl font-black uppercase leading-none tracking-[-0.07em] text-white sm:text-4xl">{visibleParticipant.displayName}</h3>
            <p className="mt-2 text-[10px] font-black uppercase leading-4 tracking-[0.16em] text-[#777]">Tap the display picture for a closer look.</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-2 bg-[#2A2A2A] p-[2px] min-[380px]:grid-cols-3">
          <PosterStat label="Points" value={visibleParticipant.totalPoints} tone="gold" />
          <PosterStat label="Streak" value={visibleParticipant.currentStreak} tone="green" />
          <PosterStat label="Days" value={visibleParticipant.daysComplete} tone="white" />
        </div>
        <div className="mt-5"><HealthBar lives={visibleParticipant.livesRemaining} label="Life status" /></div>
        <section className="mt-5 border border-[#2A2A2A] bg-black/35 p-3 sm:p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <MicroLabel tone="green">Compliance read</MicroLabel>
              <h4 className="mt-2 text-2xl font-black uppercase tracking-[-0.06em] text-white">Latest proof of standard.</h4>
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
            <p className="mt-4 border border-[#2A2A2A] bg-[#0D0D0D] p-4 text-xs font-black uppercase tracking-[0.14em] text-[#777]">No submitted standards yet for this participant.</p>
          )}
        </section>
        <section className="mt-5 border border-[#2A2A2A] bg-black/35 p-3 sm:p-4" data-testid="participant-history-panel">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <MicroLabel tone="gold">Past-day logbook</MicroLabel>
              <h4 className="mt-2 text-2xl font-black uppercase tracking-[-0.06em] text-white">Review previous entries.</h4>
              <p className="mt-2 text-xs font-bold leading-5 text-[#999]">Scroll the day chips to inspect what this participant logged on earlier days.</p>
            </div>
            <span className="border border-[#2A2A2A] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#777]">{historyQuery.isLoading ? "Loading" : `${sheetLogs.length} logs`}</span>
          </div>
          {sheetLogs.length > 0 ? (
            <>
              <div className="mt-4 overflow-x-auto">
                <div className="flex gap-2 pb-1">
                  {sheetLogs.map((log: any) => {
                    const active = Number(selectedHistoryLog?.dayNumber) === Number(log.dayNumber);
                    const completeCount = getLogCompletedRuleCount(log);
                    return (
                      <button key={log.id} type="button" onClick={() => setSelectedHistoryDay(Number(log.dayNumber))} className={classNames("min-w-[5.5rem] border px-3 py-2 text-left text-[9px] font-black uppercase tracking-[0.12em] transition", active ? "border-[#C8A96E] bg-[#1A1408] text-[#F4D58D]" : "border-[#2A2A2A] bg-[#0D0D0D] text-[#777] hover:border-[#C8A96E]/60 hover:text-white")} aria-pressed={active}>
                        <span className="block text-sm text-white">Day {log.dayNumber}</span>
                        <span className="mt-1 block">{completeCount}/{DAILY_RULE_COUNT}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {selectedHistoryLog && (
                <div className="mt-4 border border-[#2A2A2A] bg-[#0D0D0D] p-4" data-testid="participant-history-selected-log">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <MicroLabel tone={getLogCompletedRuleCount(selectedHistoryLog) >= DAILY_PASS_THRESHOLD ? "green" : "red"}>Day {selectedHistoryLog.dayNumber}</MicroLabel>
                      <h5 className="mt-2 text-xl font-black uppercase tracking-[-0.05em] text-white">{getLogCompletedRuleCount(selectedHistoryLog)}/{DAILY_RULE_COUNT} standards logged.</h5>
                    </div>
                    <span className={classNames("border px-3 py-2 text-[9px] font-black uppercase tracking-[0.14em]", selectedHistoryLog.completed || getLogCompletedRuleCount(selectedHistoryLog) >= DAILY_PASS_THRESHOLD ? "border-[#2ECC71] text-[#2ECC71]" : "border-[#C0392B] text-[#FFB3A8]")}>{selectedHistoryLog.completed || getLogCompletedRuleCount(selectedHistoryLog) >= DAILY_PASS_THRESHOLD ? "Pass" : "At risk"}</span>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {COMPLIANCE_RULE_LABELS.map(label => {
                      const state = selectedHistoryRules.find(rule => rule.key === label.key);
                      return <div key={label.key} className={classNames("flex items-center justify-between gap-3 border px-3 py-2 text-[9px] font-black uppercase leading-4 tracking-[0.11em]", state?.done ? "border-[#2ECC71]/45 bg-[#07150D] text-[#2ECC71]" : "border-[#C0392B]/45 bg-[#190B0A] text-[#FFB3A8]")}><span>{label.label}</span><span>{state?.done ? "Done" : "Open"}</span></div>;
                    })}
                  </div>
                  {selectedHistoryLog.privateReflectionLogged && <p className="mt-4 border-l-4 border-[#C8A96E] bg-[#151108] p-3 text-[10px] font-black uppercase leading-5 tracking-[0.14em] text-[#C8A96E]">Reflection logged privately. The content is hidden on participant cards.</p>}
                  {(selectedHistoryLog.readTeachPreview || selectedHistoryLog.readTeachText) && <p className="mt-3 whitespace-pre-wrap border-l-4 border-[#9B59B6] bg-[#120D16] p-3 text-sm font-bold leading-6 text-[#D8D8D8]">Read/teach: {selectedHistoryLog.readTeachPreview || selectedHistoryLog.readTeachText}</p>}
                  <ProofMediaStrip items={parseProofMedia(selectedHistoryLog.exerciseProofUrl)} />
                </div>
              )}
            </>
          ) : (
            <p className="mt-4 border border-[#2A2A2A] bg-[#0D0D0D] p-4 text-xs font-black uppercase tracking-[0.14em] text-[#777]">No historical logs found for this participant yet.</p>
          )}
        </section>
        {photoExpanded && normaliseProfilePhotoUrl(visibleParticipant.profilePhotoUrl) && (
          <div className="fixed inset-0 z-[60] grid place-items-center bg-black/88 p-5" onClick={() => setPhotoExpanded(false)} role="dialog" aria-modal="true" aria-label={`${visibleParticipant.displayName} display picture`}>
            <button type="button" className="absolute right-4 top-4 border border-[#2A2A2A] bg-black p-3 text-[#C8A96E]" onClick={() => setPhotoExpanded(false)} aria-label="Close enlarged display picture"><X className="h-5 w-5" /></button>
            <img src={normaliseProfilePhotoUrl(visibleParticipant.profilePhotoUrl)} alt={`${visibleParticipant.displayName} enlarged display picture`} className="motion-image-zoom max-h-[82vh] max-w-full border border-[#C8A96E] bg-black object-contain" loading="eager" decoding="async" onClick={event => event.stopPropagation()} />
          </div>
        )}
        </div>
      </div>
    </div>
  );

  return typeof document === "undefined" ? sheet : createPortal(sheet, document.body);
}

function ProofMediaStrip({ items, onRemove }: { items: ProofMediaItem[]; onRemove?: (index: number) => void }) {
  if (items.length === 0) return <p className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#777]">No proof attached yet.</p>;
  return (
    <div className="mt-3 overflow-x-auto touch-pan-x" data-page-swipe-exclusion="true">
      <div className="flex gap-2 pb-1">
        {items.map((item, index) => (
          <div key={`${item.url}-${index}`} className="relative min-w-[8.5rem] max-w-[8.5rem] border border-[#2A2A2A] bg-[#080808] p-2">
            <div className="aspect-video overflow-hidden bg-black">
              {proofMediaType(item) === "video" ? <video className="h-full w-full object-cover" muted autoPlay loop playsInline controls preload="metadata" data-testid="proof-upload-video-preview" aria-label={`Proof video preview ${index + 1}`}><source src={proofMediaSrc(item)} type={proofVideoMimeType(item.url, item.mimeType)} />Your browser cannot play this proof video.</video> : proofImageSrc(item.url) ? <img src={proofImageSrc(item.url)} alt={`Proof media ${index + 1}`} className="h-full w-full object-cover" loading="lazy" decoding="async" /> : <div className="grid h-full place-items-center px-2 text-center text-[9px] font-black uppercase tracking-[0.12em] text-[#C8A96E]">Proof note</div>}
            </div>
            <p className="mt-2 truncate text-[9px] font-black uppercase tracking-[0.12em] text-[#777]">{proofMediaType(item)} {index + 1}</p>
            {onRemove && <button type="button" onClick={() => onRemove(index)} className="absolute right-1 top-1 grid h-6 w-6 place-items-center border border-[#2A2A2A] bg-black/80 text-[#C0392B]" aria-label={`Remove proof item ${index + 1}`}><X className="h-3 w-3" /></button>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProofCarousel({ items, dayNumber, ownerName }: { items: ProofMediaItem[]; dayNumber: number; ownerName?: string }) {
  if (items.length === 0) return null;
  const label = String(ownerName ?? "proof").trim().split(/\s+/)[0]?.toUpperCase() || "PROOF";
  const hasMultiple = items.length > 1;
  return (
    <div className="mt-3" data-testid="proof-carousel">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#E0B85A]">{items.length} proof item{items.length === 1 ? "" : "s"} · Day {dayNumber}</p>
        {hasMultiple && <p className="rounded-full border border-[#C8A96E]/40 bg-black/70 px-2 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-[#F4D58D]" data-testid="proof-swipe-prompt">Swipe to view all</p>}
      </div>
      <div className="overflow-x-auto overscroll-x-contain touch-pan-x pb-2" aria-label={`Day ${dayNumber} proof media rail`} data-testid="proof-native-scroll-rail" data-page-swipe-exclusion="true">
        <div className="flex snap-x snap-mandatory gap-2">
          {items.map((item, index) => {
            const imageSrc = proofImageSrc(item.url);
            const src = proofMediaSrc(item);
            const mediaType = proofMediaType(item);
            const isMedia = mediaType === "video" || Boolean(imageSrc);
            return (
              <div key={`${item.url}-${index}`} className="min-w-[88%] snap-start sm:min-w-[72%] md:min-w-[54%]">
                <div className={classNames("relative overflow-hidden border border-[#C8A96E]/45 bg-[#11100C] shadow-[0_0_22px_rgba(200,169,110,0.12)]", isMedia ? "aspect-[4/3] min-h-[12rem]" : "min-h-[5.5rem]")} data-testid="proof-content-visible">
                  <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_center,transparent_0,rgba(0,0,0,0.02)_42%,rgba(0,0,0,0.34)_100%)]" aria-hidden="true" />
                  {mediaType === "video" ? (
                    <video className="h-full w-full bg-black object-cover" muted autoPlay loop playsInline controls preload="metadata" data-testid="proof-feed-video-autoplay" aria-label={`Day ${dayNumber} proof video ${index + 1} of ${items.length}`}><source src={src} type={proofVideoMimeType(item.url, item.mimeType)} />Your browser cannot play this proof video.</video>
                  ) : imageSrc ? (
                    <img src={src} alt={`Day ${dayNumber} proof ${index + 1} of ${items.length}`} className="h-full w-full bg-black object-cover" loading="lazy" decoding="async" />
                  ) : (
                    <div className="flex min-h-[5.5rem] items-center border-l-4 border-[#C8A96E] bg-[#130F08] p-4">
                      <p className="break-words text-sm font-black leading-6 text-white">{item.url}</p>
                    </div>
                  )}
                  <div className="pointer-events-none absolute left-3 top-3 z-20 rounded-full border border-white/20 bg-black/70 px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-white/90">{index + 1}/{items.length}</div>
                  {isMedia && <p className="pointer-events-none absolute inset-x-4 top-1/2 z-20 -translate-y-1/2 text-center text-[9px] font-black uppercase tracking-[0.12em] text-white/80">{label} · {mediaType === "video" ? "training" : "proof"}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {hasMultiple && (
        <div className="mt-1 flex justify-center gap-1.5" aria-hidden="true">
          {items.map((item, index) => <span key={`${item.url}-dot-${index}`} className="h-1.5 w-1.5 rounded-full bg-[#C8A96E]/55" />)}
        </div>
      )}
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
        <a href={src} target="_blank" rel="noreferrer" className="block" aria-label={`Open proof for day ${dayNumber}`}>
          <img src={src} alt={`Exercise proof for day ${dayNumber}`} className="motion-image-zoom max-h-80 w-full border border-[#2A2A2A] bg-black object-contain" loading="lazy" decoding="async" onError={() => setFailed(true)} />
        </a>
      )}
      {failed && (
        <div className="border border-[#2A2A2A] bg-[#111] p-4 text-xs font-bold leading-5 text-[#D8D8D8]">
          <p className="font-black uppercase tracking-[0.14em] text-[#C8A96E]">Proof could not preview here.</p>
          <p className="mt-2 text-[#777]">Open the stored proof directly below.</p>
        </div>
      )}
      <a href={src} target="_blank" rel="noreferrer" className="mt-2 block break-all text-[10px] font-black uppercase tracking-[0.14em] text-[#C8A96E]">Open proof</a>
    </div>
  );
}

function LifeDots({ lives, compact = false }: { lives: number; compact?: boolean }) {
  const safeLives = Math.max(0, Math.min(4, Number(lives ?? 0)));
  return (
    <span className={classNames("inline-flex items-center", compact ? "gap-1" : "gap-1.5")} aria-label={`${safeLives} of 4 lives remaining`} data-testid="life-dots">
      {Array.from({ length: 4 }).map((_, index) => {
        const alive = index < safeLives;
        return <span key={index} className={classNames("rounded-full border", compact ? "h-2.5 w-2.5" : "h-3 w-3", alive ? "border-[#2ECC71] bg-[#2ECC71] shadow-[0_0_12px_rgba(46,204,113,0.42)]" : "border-[#3A1815] bg-[#180A08]")} />;
      })}
    </span>
  );
}

function PodiumCard({ participant, index, onSelect, className }: { participant: any; index: number; onSelect: () => void; className?: string }) {
  const rank = index + 1;
  const styles = rank === 1
    ? { label: "1st", border: "border-[#C8A96E]", bg: "bg-[#181207]", text: "text-[#C8A96E]", ring: "shadow-[0_0_56px_rgba(200,169,110,0.32)]", height: "min-h-[13rem] sm:min-h-[18rem]", crown: "STANDARD SETTER", motion: "gold-champion" }
    : rank === 2
      ? { label: "2nd", border: "border-[#BFC7D5]", bg: "bg-[#10131A]", text: "text-[#BFC7D5]", ring: "shadow-[0_0_32px_rgba(191,199,213,0.14)]", height: "min-h-[11.5rem] sm:min-h-[15.5rem]", crown: "NEAREST THREAT", motion: "silver-lift" }
      : { label: "3rd", border: "border-[#B87333]", bg: "bg-[#1A1009]", text: "text-[#D58A45]", ring: "shadow-[0_0_32px_rgba(184,115,51,0.16)]", height: "min-h-[10.5rem] sm:min-h-[14rem]", crown: "PODIUM POSITION", motion: "bronze-rise" };
  return (
    <button type="button" onClick={onSelect} className={classNames("motion-card motion-press relative isolate flex min-w-0 flex-col justify-between overflow-hidden border-2 p-2 text-left transition hover:-translate-y-1 min-[380px]:p-3 sm:p-4", styles.border, styles.bg, styles.ring, styles.height, className)} data-podium-rank={rank} data-podium-motion={styles.motion} data-testid="stepped-podium-card">
      <div className={classNames("pointer-events-none absolute inset-x-2 -top-10 h-24 rounded-full blur-3xl sm:inset-x-6 sm:h-28", rank === 1 ? "bg-[#C8A96E]/25" : "bg-white/5")} />
      <div className="relative flex items-start justify-between gap-1.5 sm:gap-3">
        <div className="min-w-0">
          <span className={classNames("block text-3xl font-black uppercase leading-none tracking-[-0.12em] min-[380px]:text-4xl sm:text-6xl", styles.text)}>{styles.label}</span>
          <span className="mt-2 hidden border border-white/10 bg-black/35 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-[#BDBDBD] min-[390px]:inline-flex">{styles.crown}</span>
        </div>
        <ProfilePhoto participant={participant} className={classNames("shrink-0", rank === 1 ? "h-11 w-11 sm:h-16 sm:w-16" : "h-9 w-9 sm:h-14 sm:w-14")} />
      </div>
      <h3 className="relative mt-3 break-words text-xs font-black uppercase leading-tight tracking-[-0.04em] text-white min-[380px]:text-sm sm:mt-5 sm:text-2xl sm:leading-none sm:tracking-[-0.07em]">{participant?.displayName ?? "—"}</h3>
      <div className="relative mt-3 grid gap-2 sm:mt-4 sm:flex sm:items-end sm:justify-between sm:gap-3">
        <div>
          <p className="text-[8px] font-black uppercase tracking-[0.14em] text-[#777] sm:text-[10px] sm:tracking-[0.16em]">Points</p>
          <p className={classNames("mt-1 text-2xl font-black leading-none tabular-nums sm:text-4xl", styles.text)}>{participant?.canonicalTotalPoints ?? participant?.totalPoints ?? 0}</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-[8px] font-black uppercase tracking-[0.14em] text-[#777] sm:text-[10px] sm:tracking-[0.16em]">Lives</p>
          <span className="mt-1 flex justify-start sm:mt-2 sm:justify-end"><LifeDots lives={participant?.livesRemaining ?? 4} compact /></span>
        </div>
      </div>
      <p className="relative mt-3 hidden text-[10px] font-black uppercase leading-5 tracking-[0.14em] text-[#BDBDBD] sm:mt-4 sm:block">{participant?.statusLine ?? participant?.boostReasons?.[0] ?? "Keep banking green days to hold the podium"}</p>
    </button>
  );
}

function Leaderboard({ snapshot }: { snapshot: Snapshot }) {
  const [selected, setSelected] = useState<any>(null);
  const [expandedParticipantId, setExpandedParticipantId] = useState<string | number | null>(null);
  const [boostKeyOpen, setBoostKeyOpen] = useState(false);
  const [expandedBoostSlotId, setExpandedBoostSlotId] = useState<string | number | null>(null);
  const logs = snapshot?.logs ?? [];
  const participants = snapshot?.participants ?? [];
  const currentDay = snapshot?.challenge?.currentDay ?? 1;
  const ranked = useMemo(() => rankForPodium(buildParticipantInsights({ participants, logs, currentDay })), [participants, logs, currentDay]);
  const podium = ranked.slice(0, 3);
  const leaderPoints = Number(ranked[0]?.totalPoints ?? 0);
  const activeBoosts = snapshot?.activeBoosts ?? [];
  const allBoostWins = snapshot?.boostWins ?? [];
  const todayBoostWins = allBoostWins.filter((win: any) => Number(win.day ?? 0) === Number(currentDay));
  const boostSlots = activeBoosts.map((boost: any, index: number) => {
    const win = todayBoostWins.find((item: any) => item.boostId === boost.id);
    const owner = win ? participants.find((participant: any) => String(participant.id) === String(win.userId)) : null;
    const claimantName = owner?.displayName ?? (win ? "Unknown challenger" : "Unclaimed");
    return {
      ...boost,
      win,
      owner,
      claimantName,
      claimed: Boolean(win),
      state: win ? "Claimed" : "Open",
      title: boost.name,
      value: win ? `Won by ${claimantName}` : "+5 bonus available",
      pointsLine: win ? `+${win.pointsAwarded} boost points banked` : "+5 boost still available",
      detail: boost.shortRule ?? boost.antiGaming ?? "A rotating +5 bonus window for the strongest eligible challenger.",
      antiGaming: boost.antiGaming ?? "Only clean, eligible logs count. The boost cannot be gamed after the fact.",
      resultNote: win?.wardenNote ?? null,
      slot: boost.slot ?? index + 1,
    };
  });
  const claimedBoostCount = boostSlots.filter((slot: any) => slot.claimed).length;
  const openBoostCount = Math.max(0, boostSlots.length - claimedBoostCount);
  return (
    <section className="motion-page space-y-4 overflow-hidden border border-[#2A2A2A] bg-[#101010] p-3 sm:p-5" data-testid="bosses-board-section">
      <div className="rounded-[1.4rem] border border-[#2A2A2A] bg-[#0D0D0D] p-4 sm:p-5" data-testid="board-mobile-redesign-shell">
        <MicroLabel tone="gold">Board / Bosses</MicroLabel>
        <h2 className="mt-2 break-words text-3xl font-black uppercase leading-none tracking-[-0.08em] text-white sm:text-5xl">Podium pressure.</h2>
        <p className="mt-3 max-w-xl text-xs font-bold uppercase leading-5 tracking-[0.12em] text-[#8D8D8D]">Claude-inspired mobile board: boost key first, stepped podium next, then every challenger with lives, Warden status, delta gaps, and risk callouts.</p>
      </div>

      <section className="overflow-hidden rounded-[1.4rem] border border-[#2ECC71]/30 bg-[#07150D]" data-testid="boost-key-slots" data-boost-collapsible-state={boostKeyOpen ? "open" : "closed"}>
        <button
          type="button"
          className="motion-press flex w-full items-center justify-between gap-3 p-4 text-left"
          aria-expanded={boostKeyOpen}
          aria-controls="boost-key-collapsible-panel"
          data-testid="boost-key-summary-toggle"
          onClick={() => { pulse(12); setBoostKeyOpen(value => !value); }}
        >
          <span className="min-w-0">
            <MicroLabel tone="green">Boost Key</MicroLabel>
            <span className="mt-2 block text-2xl font-black uppercase leading-none tracking-[-0.07em] text-white">Boost tokens tucked away.</span>
            <span className="mt-2 block text-[10px] font-black uppercase leading-5 tracking-[0.14em] text-[#A9EFC0]">{openBoostCount} open · {claimedBoostCount} claimed · tap to {boostKeyOpen ? "hide" : "reveal"} the slots</span>
          </span>
          <span className="flex shrink-0 flex-col items-end gap-2">
            <span className="rounded-full border border-[#2ECC71]/55 bg-black/45 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-[#2ECC71]">Day {currentDay}</span>
            <ChevronDown className={classNames("h-5 w-5 text-[#2ECC71] transition-transform duration-300", boostKeyOpen ? "rotate-180" : "rotate-0")} aria-hidden="true" />
          </span>
        </button>
        <AnimatePresence initial={false}>
          {boostKeyOpen && (
            <motion.div
              id="boost-key-collapsible-panel"
              key="boost-key-collapsible-panel"
              initial="closed"
              animate="open"
              exit="closed"
              variants={boostCollapseVariants}
              transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden border-t border-[#2ECC71]/25"
              data-testid="boost-key-collapsible-panel"
            >
        <div className="grid gap-2 p-4 sm:grid-cols-3">
          {boostSlots.map((slot: any, index: number) => {
            const toneClass = getBoostToneClass(slot.tone);
            const isBoostExpanded = String(expandedBoostSlotId) === String(slot.id ?? slot.slot ?? index);
            const detailId = `boost-slot-${slot.id ?? slot.slot ?? index}-detail`;
            return (
              <article key={slot.id ?? `${slot.title}-${index}`} className={classNames("min-w-0 overflow-hidden rounded-[1rem] border", toneClass)} data-boost-slot={index + 1} data-testid="boost-slot-card">
                <button
                  type="button"
                  className="motion-press w-full p-3 text-left"
                  aria-expanded={isBoostExpanded}
                  aria-controls={detailId}
                  aria-label={`Show ${slot.title} boost details`}
                  onClick={() => { pulse(12); setExpandedBoostSlotId(isBoostExpanded ? null : (slot.id ?? slot.slot ?? index)); }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-black uppercase tracking-[0.16em]">{slot.icon} · Slot {slot.slot ?? index + 1}</span>
                    <span className="rounded-full border border-current/40 bg-black/40 px-2 py-1 text-[8px] font-black uppercase tracking-[0.14em]">{slot.state}</span>
                  </div>
                  <p className="mt-3 truncate text-sm font-black uppercase tracking-[-0.03em] text-white">{slot.title}</p>
                  {slot.claimed ? (
                    <div className="mt-3 flex min-w-0 items-center gap-2 border border-current/25 bg-black/35 p-2" data-testid="boost-claimant">
                      <ProfilePhoto participant={slot.owner} className="h-9 w-9 shrink-0" />
                      <span className="min-w-0">
                        <span className="block text-[8px] font-black uppercase tracking-[0.16em] opacity-75">Won by</span>
                        <span className="block truncate text-xs font-black uppercase tracking-[0.06em] text-white">{slot.claimantName}</span>
                      </span>
                    </div>
                  ) : (
                    <p className="mt-3 text-[10px] font-black uppercase tracking-[0.13em]">Unclaimed today</p>
                  )}
                  <p className="mt-2 text-[10px] font-black uppercase tracking-[0.13em]">{slot.pointsLine}</p>
                  <p className="mt-3 text-[9px] font-black uppercase tracking-[0.16em] opacity-80" data-testid="boost-tap-hint">Tap to learn what this boost does</p>
                </button>
                {isBoostExpanded && (
                  <div id={detailId} className="border-t border-current/25 bg-black/35 p-3" data-testid="boost-detail-panel">
                    <MicroLabel tone={slot.tone === "green" ? "green" : slot.tone === "red" ? "red" : slot.tone === "purple" ? "purple" : "gold"}>What it does</MicroLabel>
                    <p className="mt-2 text-[11px] font-black uppercase leading-5 tracking-[0.11em] text-white">{slot.detail}</p>
                    <p className="mt-3 text-[10px] font-bold uppercase leading-5 tracking-[0.12em] text-[#BDBDBD]">How it is won: {slot.antiGaming}</p>
                    {slot.resultNote && <p className="mt-3 border-l-2 border-current pl-3 text-[10px] font-bold uppercase leading-5 tracking-[0.12em] text-[#D8D8D8]">Why {slot.claimantName} got it: {slot.resultNote}</p>}
                  </div>
                )}
              </article>
            );
          })}
        </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <div className="grid grid-cols-3 items-end gap-1.5 sm:gap-3 lg:grid-cols-[0.95fr_1.1fr_0.95fr] lg:items-end" data-testid="top-three-podium" data-mobile-podium-layout="horizontal-stepped" aria-label="Top three arranged as a horizontal mobile podium: second, first, third">
        {podium[0] && <PodiumCard participant={podium[0]} index={0} className="order-2" onSelect={() => { pulse([12, 24, 12]); setSelected(podium[0]); }} />}
        {podium[1] && <PodiumCard participant={podium[1]} index={1} className="order-1 translate-y-3 sm:translate-y-5" onSelect={() => { pulse(14); setSelected(podium[1]); }} />}
        {podium[2] && <PodiumCard participant={podium[2]} index={2} className="order-3 translate-y-5 sm:translate-y-9" onSelect={() => { pulse(14); setSelected(podium[2]); }} />}
      </div>

      <div className="space-y-2" data-testid="full-board-compare-list">
        <div className="flex items-end justify-between gap-3 px-1">
          <div>
            <MicroLabel tone="red">Full leaderboard</MicroLabel>
            <h3 className="mt-2 text-2xl font-black uppercase tracking-[-0.07em] text-white">Everyone exposed.</h3>
          </div>
          <span className="text-right text-[9px] font-black uppercase tracking-[0.16em] text-[#777]">Tap rows for metrics</span>
        </div>
        {ranked.map((p: any, index: number) => {
          const isExpanded = String(expandedParticipantId) === String(p.id);
          const detailId = `board-player-${p.id}-metrics`;
          const pointsGap = index === 0 ? "Leader" : `${Math.max(0, leaderPoints - Number(p.totalPoints ?? 0))} behind`;
          const previousGap = index === 0 ? "No gap" : `${Math.max(0, Number(ranked[index - 1]?.totalPoints ?? 0) - Number(p.totalPoints ?? 0))} to catch`;
          const eliminationRisk = Number(p.riskPoints ?? 0) >= 60 || Number(p.livesRemaining ?? 4) <= 1;
          const playerBoostWins = allBoostWins.filter((win: any) => String(win.userId) === String(p.id));
          const todayPlayerBoostWins = todayBoostWins.filter((win: any) => String(win.userId) === String(p.id));
          const totalBoostPoints = playerBoostWins.reduce((sum: number, win: any) => sum + Number(win.pointsAwarded ?? 5), 0);
          return (
            <article key={p.id} className={classNames("motion-row overflow-hidden rounded-[1.15rem] border bg-[#0D0D0D] transition hover:border-[#C8A96E]", eliminationRisk ? "border-[#C0392B]/75 bg-[#190B0A] shadow-[0_0_26px_rgba(192,57,43,0.12)]" : index === 0 ? "border-[#C8A96E]/70 bg-[#16130B]" : "border-[#2A2A2A]")} data-testid="board-player-row" data-elimination-risk={eliminationRisk ? "true" : "false"}>
              <button type="button" onClick={() => { pulse(14); setExpandedParticipantId(isExpanded ? null : p.id); }} className="motion-press grid w-full grid-cols-[42px_minmax(0,1fr)] gap-3 p-3 text-left sm:grid-cols-[56px_56px_minmax(0,1fr)_minmax(155px,0.65fr)_auto_32px] sm:items-center sm:p-4" aria-expanded={isExpanded} aria-controls={detailId} aria-label={`Toggle ${p.displayName} Board metrics`}>
                <span className={classNames("row-span-2 text-2xl font-black sm:row-span-1 sm:text-3xl", eliminationRisk ? "text-[#FFB3A8]" : index === 0 ? "text-[#C8A96E]" : index === 1 ? "text-[#BFC7D5]" : index === 2 ? "text-[#D58A45]" : "text-[#777]")}>#{index + 1}</span>
                <span className="hidden sm:block"><ProfilePhoto participant={p} className="h-12 w-12" /></span>
                <span className="min-w-0">
                  <span className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="block min-w-0 break-words text-lg font-black uppercase tracking-[-0.04em] text-white sm:text-xl">{p.displayName}</span>
                    {eliminationRisk && <span className="rounded-full border border-[#C0392B] bg-[#C0392B]/15 px-2 py-1 text-[8px] font-black uppercase tracking-[0.13em] text-[#FFB3A8]" data-testid="elimination-risk-badge">⚠ ELIMINATION RISK</span>}
                    {todayPlayerBoostWins.map((win: any) => <span key={win.id ?? `${win.boostId}-${win.userId}`} className="rounded-full border border-[#C8A96E] bg-[#16130B] px-2 py-1 text-[8px] font-black uppercase tracking-[0.13em] text-[#C8A96E]" data-testid="boost-won-badge">{win.boostIcon} {win.boostName}</span>)}
                  </span>
                  <span className="mt-1 block break-words text-[11px] font-bold uppercase tracking-[0.1em] text-[#C8A96E] sm:text-xs sm:tracking-[0.14em]" data-testid="board-player-status-line">{p.statusLine}</span>
                  <span className="mt-3 flex items-center gap-3"><LifeDots lives={p.livesRemaining} compact /><span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#777]">{p.livesRemaining}/4 lives</span></span>
                </span>
                <span className="col-span-2 flex flex-wrap gap-2 sm:col-span-1">
                  <InsightPill label="Gap" value={pointsGap} tone={index === 0 ? "gold" : eliminationRisk ? "red" : "white"} />
                  <InsightPill label="Delta" value={previousGap} tone={index <= 2 ? "gold" : "white"} />
                </span>
                <span className="col-span-2 mt-1 min-w-0 text-left sm:col-span-1 sm:mt-0 sm:text-right">
                  <span className="block max-w-full break-words text-2xl font-black leading-none text-[#C8A96E] sm:text-3xl">{p.totalPoints}</span>
                  <span className="poster-label text-[#777]">points · +{totalBoostPoints} boost</span>
                </span>
                <span className="hidden text-[#777] sm:grid sm:place-items-center">{isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}</span>
              </button>
              {isExpanded && (
                <div id={detailId} className="border-t border-[#2A2A2A] bg-black/30 p-3 sm:p-4" data-testid="board-player-expanded-metrics">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#777]">Detail view · {p.comparisonLine}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {p.comparisonStats.map((stat: any) => <InsightPill key={stat.label} label={stat.label} value={stat.value} tone={stat.tone} />)}
                    <InsightPill label="Boost" value={`+${totalBoostPoints} / ${playerBoostWins.length} wins`} tone={totalBoostPoints > 0 ? "gold" : "white"} />
                  </div>
                  <button type="button" onClick={() => { pulse([12, 24, 12]); setSelected(p); }} className="mt-3 min-h-10 border border-[#C8A96E]/60 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#C8A96E] hover:bg-[#C8A96E] hover:text-black" aria-label={`Open ${p.displayName} participant stats`}>Open full profile</button>
                </div>
              )}
            </article>
          );
        })}
      </div>
      <ParticipantSheet participant={selected} onClose={() => setSelected(null)} />
    </section>
  );
}

export function buildProofWardenInsight(owner: any, log: any, ownerLogs: any[]) {
  const recentLogs = ownerLogs
    .filter((entry: any) => entry?.participantId === log?.participantId)
    .sort((a: any, b: any) => Number(b.dayNumber ?? 0) - Number(a.dayNumber ?? 0))
    .slice(0, 5);
  const recentProofCount = recentLogs.filter((entry: any) => parseProofMedia(entry.exerciseProofUrl).length > 0).length;
  const name = String(owner?.displayName ?? "this person").trim();
  const firstName = name.split(/\s+/)[0] || "you";
  const goal = String(owner?.primaryGoal ?? "").trim();
  const obstacle = String(owner?.biggestObstacle ?? "").trim();
  const supportNeeded = String(owner?.supportNeeded ?? "").trim();
  const trainingLevel = String(owner?.trainingLevel ?? "").trim().toLowerCase();
  const teaching = String(log?.readTeachText ?? "").trim();
  const reflectionSignal = String(log?.reflectionText ?? "").trim();
  const cleanEatingNote = String(log?.cleanEatingNote ?? "").trim();
  const exerciseType = String(log?.exerciseType ?? "").trim();
  const exerciseDuration = Number(log?.exerciseDuration ?? 0);
  const proofItems = parseProofMedia(log?.exerciseProofUrl);
  const bundle = [goal, obstacle, supportNeeded, teaching, reflectionSignal, cleanEatingNote, exerciseType].join(" ").toLowerCase();
  const hasAny = (words: string[]) => words.some(word => bundle.includes(word));
  const hasProof = proofItems.length > 0;

  const aim = hasAny(["weight", "fat", "lean", "cut", "shape"])
    ? "body standard"
    : hasAny(["discipline", "routine", "habit", "consistency", "standard"])
      ? "discipline rebuild"
      : hasAny(["fitness", "strength", "run", "gym", "train", "performance", "conditioning"])
        ? "training identity"
        : goal
          ? "bigger goal"
          : "standard";

  const friction = hasAny(["weekend", "social", "drink", "alcohol", "night out"])
    ? "social pressure"
    : hasAny(["time", "busy", "work", "travel", "shift"])
      ? "time pressure"
      : hasAny(["stress", "tired", "energy", "motivation", "mental"])
        ? "low-energy friction"
        : obstacle || supportNeeded
          ? "usual friction"
          : "easy-exit moment";

  const proofWeight = hasProof ? 3 : 0;
  const exerciseWeight = exerciseDuration >= 45 ? 3 : exerciseDuration > 0 ? 2 : exerciseType ? 1 : 0;
  const mindWeight = teaching || reflectionSignal ? 2 : 0;
  const pressureWeight = obstacle || supportNeeded || friction !== "easy-exit moment" ? 1 : 0;
  const seed = Math.abs(Number(log?.dayNumber ?? 0) + Number(log?.participantId ?? 0) + firstName.length + recentProofCount);

  const publicProofText = teaching;
  const normalizedTeaching = publicProofText
    .replace(/[“”]/g, "\"")
    .replace(/\s+/g, " ")
    .trim();
  const proofTextSnippet = normalizedTeaching
    .split(/[.!?;:\n]/)[0]
    .trim()
    .slice(0, 72);
  const hasPublicProofText = normalizedTeaching.length > 0;
  const teachingLower = normalizedTeaching.toLowerCase();
  const hasTeachingAny = (words: string[]) => words.some(word => teachingLower.includes(word));
  const teachingThemeWords = [
    "discipline", "standard", "routine", "habit", "consistency", "non-negotiable",
    "account", "responsib", "excuse", "blame", "honest", "truth", "own",
    "hard", "struggle", "fail", "fall", "quit", "pain", "advers", "resilien", "tough",
    "patient", "process", "small", "step", "repeat", "compound", "daily", "brick",
    "focus", "distract", "noise", "priority", "attention",
    "believe", "identity", "become", "person", "character", "confidence", "self",
  ];
  const teachingMindsetWords = ["mind", "mental", "attitude", "choice", "choose", "decide", "decision", "commit", "purpose", "why", "lesson", "learn", "growth", "courage", "show up", "keep going", "tomorrow", "promise"];
  const isMotivationalTeaching = hasPublicProofText && (hasTeachingAny(teachingThemeWords) || hasTeachingAny(teachingMindsetWords));
  const privateReflectionSignal = reflectionSignal
    ? hasAny(["stress", "tired", "hard", "busy", "tempted", "struggle", "nearly"])
      ? "you named the pressure without letting it own the day"
      : "you noticed the pattern while it was still fresh"
    : "the action gave the day a clean signal";

  const teachingMeaning = isMotivationalTeaching
    ? hasTeachingAny(["discipline", "standard", "routine", "habit", "consistency", "non-negotiable"])
      ? {
          theme: "standards before mood",
          read: "The teaching is really about making the standard decide before feelings get involved.",
          connect: `Today’s proof matters because it turns that idea into ${aim}, not just a nice sentence.`,
        }
      : hasTeachingAny(["account", "responsib", "excuse", "blame", "honest", "truth", "own"])
        ? {
            theme: "accountability",
            read: "The teaching is about refusing the easy escape route of excuses.",
            connect: `That fits today because the ${friction} still had to meet an honest action.`,
          }
        : hasTeachingAny(["hard", "struggle", "fail", "fall", "quit", "pain", "advers", "resilien", "tough"])
          ? {
              theme: "resilience under pressure",
              read: "The teaching is about what a person does when the day pushes back.",
              connect: `That makes the proof stronger because it shows movement while the ${friction} was still real.`,
            }
          : hasTeachingAny(["patient", "process", "small", "step", "repeat", "compound", "daily", "brick"])
            ? {
                theme: "small repeated proof",
                read: "The teaching is about trusting the small repeatable action before the big result appears.",
                connect: "That is why this log matters: it is one brick, not a speech about the wall.",
              }
            : hasTeachingAny(["focus", "distract", "noise", "priority", "time", "attention", "busy"])
              ? {
                  theme: "protected focus",
                  read: "The teaching is about protecting attention from the noise that normally wins by default.",
                  connect: `Today’s proof shows the priority got protected long enough for action.`,
                }
              : hasTeachingAny(["believe", "identity", "become", "person", "character", "confidence", "self"])
                ? {
                    theme: "identity built through evidence",
                    read: "The teaching is about becoming the kind of person who has proof, not just intent.",
                    connect: `That connects to today because the ${aim} needs receipts like this to feel real.`,
                  }
                : {
                    theme: "lesson into action",
                    read: "The teaching only lands if it changes the next decision.",
                    connect: hasProof ? "The proof gives the lesson a body, so it is not just words on the page." : "The value is in carrying that line into one clean action tomorrow.",
                  }
    : null;

  const effortSignal = exerciseDuration >= 45
    ? `${exerciseDuration} minutes was not a tick-box; it was a real block.`
    : exerciseDuration > 0 && exerciseType
      ? `${exerciseDuration} minutes of ${exerciseType.toLowerCase()} made the standard physical, not theoretical.`
      : exerciseType
        ? `${exerciseType.toLowerCase()} gave the day a shape.`
        : hasProof
          ? "You made the standard visible instead of leaving it as an intention."
          : "The honest line is a start; now the action has to match it.";

  const teachingLinkedSignals = teachingMeaning ? [
    `${firstName}, the teaching here is ${teachingMeaning.theme}. ${teachingMeaning.connect} ${effortSignal}`,
    `${firstName}, ${teachingMeaning.read} ${teachingMeaning.connect}`,
    `${firstName}, this does not need the quote repeated back. It needs the meaning lived: ${teachingMeaning.theme}. Carry that into tomorrow’s first choice.`,
    (proofTextSnippet.length > 0
      ? `${firstName}, the line about “${proofTextSnippet}” points to ${teachingMeaning.theme}. Make the next proof match that meaning.`
      : `${firstName}, the teaching points to ${teachingMeaning.theme}. Make the next proof match that meaning.`),
  ] : [];

  const sharpSignals = [
    `${firstName}, the win is not drama; it is evidence. ${effortSignal} Repeat the first move early tomorrow.`,
    `${firstName}, that is the kind of small proof that changes identity. Do not make it bigger; make it harder to skip.`,
    `${firstName}, this matters because the ${friction} did not get the final vote. Protect that same decision tomorrow.`,
    `${firstName}, the standard got a little less negotiable today. Keep it boring, early, and undeniable.`,
    `${firstName}, there is something useful here: the ${aim} is being built in ordinary moments, not speeches. Run it back tomorrow.`,
  ];

  const reflectiveSignals = [
    `${firstName}, ${privateReflectionSignal}. Use that tomorrow before the day gets noisy.`,
    `${firstName}, the lesson only counts if it changes the next decision. Make tomorrow’s first choice easy to win.`,
    `${firstName}, this is not about looking locked in; it is about noticing where you usually fold and choosing earlier.`,
  ];

  if (teachingLinkedSignals.length > 0) {
    return teachingLinkedSignals[seed % teachingLinkedSignals.length];
  }
  if (proofWeight + exerciseWeight + mindWeight + pressureWeight >= 5) {
    return sharpSignals[seed % sharpSignals.length];
  }
  if (reflectionSignal || goal || obstacle || supportNeeded) {
    return reflectiveSignals[seed % reflectiveSignals.length];
  }
  if (recentProofCount >= 2) {
    return `${firstName}, the pattern is starting to show. One good day is nice; repeated proof is harder to argue with.`;
  }
  return `${firstName}, keep it simple tomorrow: one clean action, one honest line, and no negotiation with the standard.`;
}


function ProofV2TopLayer({ publicLogs, snapshot, latestDay, waiting }: { publicLogs: any[]; snapshot: Snapshot; latestDay: number; waiting: any[] }) {
  const participants = snapshot?.participants ?? [];
  const logsWithMedia = sortProofLogsNewestFirst(publicLogs.filter((log: any) => parseProofMedia(log.exerciseProofUrl).length > 0));
  const featuredLog = logsWithMedia[0] ?? sortProofLogsNewestFirst(publicLogs)[0];
  const featuredOwner = featuredLog ? participants.find((p: any) => p.id === featuredLog.participantId) : null;
  const featuredMedia = featuredLog ? parseProofMedia(featuredLog.exerciseProofUrl) : [];
  const latestTiles = logsWithMedia.slice(0, 6);
  const totalProofItems = logsWithMedia.reduce((total: number, log: any) => total + parseProofMedia(log.exerciseProofUrl).length, 0);
  const totalComments = publicLogs.reduce((total: number, log: any) => total + Number((log.proofComments ?? []).length), 0);
  const totalReactions = publicLogs.reduce((total: number, log: any) => total + Number(log.proofReactions?.total ?? 0), 0);
  const dayProofs = publicLogs.filter((log: any) => Number(log.dayNumber ?? 0) === latestDay).length;

  return (
    <div className="grid gap-4" data-testid="proof-v2-top-layer">
      <div className="relative isolate overflow-hidden border border-[#C8A96E]/45 bg-[radial-gradient(circle_at_top_left,rgba(200,169,110,0.22),transparent_34%),linear-gradient(135deg,#120E07_0%,#070707_56%,#120706_100%)] p-4 shadow-[0_0_42px_rgba(200,169,110,0.12)] sm:p-5" data-testid="proof-v2-command-deck">
        <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full border border-[#C8A96E]/20 bg-[#C8A96E]/10 blur-2xl" aria-hidden="true" />
        <div className="relative grid gap-4 lg:grid-cols-[1.08fr_0.92fr] lg:items-stretch">
          <div className="min-w-0">
            <MicroLabel tone="gold">Proof v2</MicroLabel>
            <h2 className="mt-3 max-w-xl break-words text-[2.55rem] font-black uppercase leading-[0.78] tracking-[-0.1em] text-white min-[390px]:text-[3.15rem] sm:text-6xl">Proof wall above. Feed below.</h2>
            <p className="mt-4 max-w-md text-[11px] font-black uppercase leading-5 tracking-[0.14em] text-[#BDB8AC]">A stronger top layer for the best receipts, pressure, and recent movement. The normal Proof feed stays underneath for full comments, reactions, and Deep Thought.</p>
            <div className="mt-5 grid grid-cols-3 gap-2" data-testid="proof-v2-stat-strip">
              <div className="border border-[#2ECC71]/35 bg-[#06140B]/80 p-3"><p className="text-[8px] font-black uppercase tracking-[0.16em] text-[#6FE29B]">Today</p><p className="mt-1 text-2xl font-black text-white">{dayProofs}</p></div>
              <div className="border border-[#C8A96E]/35 bg-[#120E07]/80 p-3"><p className="text-[8px] font-black uppercase tracking-[0.16em] text-[#E0B85A]">Receipts</p><p className="mt-1 text-2xl font-black text-white">{totalProofItems}</p></div>
              <div className="border border-[#C0392B]/35 bg-[#180909]/80 p-3"><p className="text-[8px] font-black uppercase tracking-[0.16em] text-[#F07065]">Talk</p><p className="mt-1 text-2xl font-black text-white">{totalComments + totalReactions}</p></div>
            </div>
          </div>
          <div className="min-w-0 border border-white/10 bg-black/40 p-3" data-testid="proof-v2-featured-receipt">
            <div className="flex items-center justify-between gap-3">
              <MicroLabel tone="green">Featured receipt</MicroLabel>
              <span className="shrink-0 border border-[#2ECC71]/45 bg-[#06140B] px-2 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-[#6FE29B]">Latest</span>
            </div>
            {featuredLog ? (
              <div className="mt-3">
                <div className="flex items-center gap-3">
                  <ProfilePhoto participant={featuredOwner} className="h-10 w-10 border-[#C8A96E]" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black uppercase tracking-[-0.03em] text-white">{featuredOwner?.displayName ?? "Participant"}</p>
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#777]">Day {featuredLog.dayNumber} · {featuredMedia.length || 1} item{(featuredMedia.length || 1) === 1 ? "" : "s"}</p>
                  </div>
                </div>
                <div className="mt-3 overflow-hidden border border-[#262626] bg-[#080808]" data-testid="proof-v2-featured-media">
                  {featuredMedia[0] ? <ProofCarousel items={featuredMedia.slice(0, 3)} dayNumber={featuredLog.dayNumber} ownerName={featuredOwner?.displayName} /> : <p className="p-4 text-xs font-bold italic leading-5 text-[#F0D58A]">{String(featuredLog.readTeachText ?? "Proof context submitted.")}</p>}
                </div>
              </div>
            ) : (
              <p className="mt-3 border border-[#2A2A2A] bg-[#080808] p-4 text-xs font-black uppercase leading-5 tracking-[0.12em] text-[#777]">No receipts yet. This feature card fills as soon as proof lands.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_0.72fr]" data-testid="proof-v2-latest-and-pressure">
        <div className="border border-[#202020] bg-[#0B0B0B] p-3">
          <div className="flex items-center justify-between gap-3">
            <MicroLabel tone="green">Latest receipts</MicroLabel>
            <span className="text-[8px] font-black uppercase tracking-[0.16em] text-[#666]">Stable grid · newest first</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3" data-testid="proof-v2-latest-grid">
            {latestTiles.map((log: any, index: number) => {
              const owner = participants.find((p: any) => p.id === log.participantId);
              const media = parseProofMedia(log.exerciseProofUrl)[0];
              const src = media ? proofMediaSrc(media) : "";
              const imageSrc = media ? proofImageSrc(media.url) : "";
              return (
                <div key={`${log.id}-latest-${index}`} className="relative min-h-[7.5rem] overflow-hidden border border-[#242424] bg-black" data-testid="proof-v2-latest-tile">
                  {media && proofMediaType(media) === "video" ? <video className="h-full min-h-[7.5rem] w-full object-cover opacity-80" muted autoPlay loop playsInline preload="metadata"><source src={src} type={proofVideoMimeType(media.url, media.mimeType)} /></video> : imageSrc ? <img src={src} alt={`Latest proof from ${owner?.displayName ?? "participant"}`} className="h-full min-h-[7.5rem] w-full object-cover" loading="lazy" decoding="async" /> : <div className="grid min-h-[7.5rem] place-items-center p-3 text-center text-[9px] font-black uppercase tracking-[0.12em] text-[#C8A96E]">Teaching logged</div>}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-2">
                    <p className="truncate text-[10px] font-black uppercase tracking-[0.08em] text-white">{owner?.displayName ?? "Participant"}</p>
                    <p className="text-[8px] font-black uppercase tracking-[0.14em] text-[#E0B85A]">Day {log.dayNumber}{index === 0 ? " · New" : ""}</p>
                  </div>
                </div>
              );
            })}
            {latestTiles.length === 0 && <p className="col-span-full border border-[#2A2A2A] bg-[#080808] p-4 text-[10px] font-black uppercase tracking-[0.14em] text-[#666]">No media receipts yet.</p>}
          </div>
        </div>
        <div className="border border-[#3A1815] bg-[#120707] p-3" data-testid="proof-v2-pressure-card">
          <MicroLabel tone="red">Accountability pressure</MicroLabel>
          <p className="mt-3 text-2xl font-black uppercase leading-none tracking-[-0.07em] text-white">Who still owes the room?</p>
          {waiting.length > 0 ? (
            <div className="mt-4 space-y-2">
              {waiting.map((participant: any) => <div key={participant.id} className="flex items-center gap-2 border border-[#3A1815] bg-black/35 p-2"><ProfilePhoto participant={participant} className="h-8 w-8 border-[#4A2A2A]" /><p className="min-w-0 truncate text-xs font-black uppercase text-[#F0D6D1]">{participant.displayName ?? "Participant"}</p></div>)}
            </div>
          ) : (
            <p className="mt-4 border border-[#2ECC71]/35 bg-[#06140B] p-3 text-xs font-black uppercase leading-5 tracking-[0.12em] text-[#6FE29B]">No one is on the visible waiting list for Day {latestDay}.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ProofFeed({ snapshot }: { snapshot: Snapshot }) {
  const utils = trpc.useUtils();
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({});
  const publicLogs = useMemo(() => sortProofLogsNewestFirst((snapshot?.logs ?? []).filter((log: any) => parseProofMedia(log.exerciseProofUrl).length > 0 || String(log.readTeachText ?? "").trim().length > 0)), [snapshot?.logs]);
  const deepThoughtLogIds = useMemo(() => publicLogs.slice(0, 12).map((log: any) => Number(log.id)).filter(Number.isFinite), [publicLogs]);
  const deepThoughtInput = useMemo(() => ({ logIds: deepThoughtLogIds }), [deepThoughtLogIds]);
  const deepThoughtQuery = trpc.challenge.deepThoughts.useQuery(deepThoughtInput, { enabled: deepThoughtLogIds.length > 0, staleTime: 12 * 60 * 60 * 1000, refetchOnWindowFocus: false });
  const latestDay = Math.max(1, ...((snapshot?.logs ?? []).map((log: any) => Number(log.dayNumber ?? 1))));
  const waiting = (snapshot?.participants ?? []).filter((participant: any) => !publicLogs.some((log: any) => log.participantId === participant.id && Number(log.dayNumber ?? 0) === latestDay)).slice(0, 3);
  const reactToProof = trpc.challenge.reactToProof.useMutation({
    onSuccess: () => { pulse(10); utils.challenge.snapshot.invalidate(); },
    onError: error => toast.error(error.message || "Reaction could not be saved."),
  });
  const commentOnProof = trpc.challenge.commentOnProof.useMutation({
    onSuccess: (_data, variables) => {
      setCommentDrafts(previous => ({ ...previous, [variables.dailyLogId]: "" }));
      haptics.success();
      utils.challenge.snapshot.invalidate();
    },
    onError: error => toast.error(error.message || "Comment could not be saved."),
  });
  const reactions = [
    { key: "fire", label: "Fire" },
    { key: "strong", label: "Strong" },
    { key: "inspired", label: "Inspired" },
    { key: "accountable", label: "Accountable" },
  ] as const;
  return (
    <section className="mx-auto flex w-full max-w-[56rem] flex-col gap-4" data-testid="proof-page-v2-with-normal-feed">
      <ProofV2TopLayer publicLogs={publicLogs} snapshot={snapshot} latestDay={latestDay} waiting={waiting} />
      <div className="w-full max-w-[38rem] self-center border border-[#202020] bg-[#070707] p-3 shadow-[0_0_40px_rgba(0,0,0,0.45)] sm:p-5" data-testid="proof-feed-redesign">
        <MicroLabel tone="green">Proof feed</MicroLabel>
        <h2 className="mt-2 break-words text-[2rem] font-black uppercase leading-[0.82] tracking-[-0.08em] text-white sm:text-5xl">Receipts.<br />Insights.<br />Momentum.</h2>
        <p className="mt-3 max-w-sm text-[10px] font-black uppercase leading-4 tracking-[0.12em] text-[#858585]">Proof, insights, comments, and reactions from the group.</p>
        {waiting.length > 0 && (
          <div className="mt-5 border border-[#C0392B]/35 bg-[#19090A]/70 p-3" data-testid="proof-waiting-bar">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#C0392B]">Waiting on {waiting.length} player{waiting.length === 1 ? "" : "s"} · Day {latestDay}</p>
            <div className="mt-2 flex items-center gap-2">
              {waiting.map((participant: any) => <ProfilePhoto key={participant.id} participant={participant} className="h-8 w-8 border-[#4A2A2A]" />)}
              <span className="text-[10px] font-bold italic text-[#777]">No proof submitted yet today</span>
            </div>
          </div>
        )}
        <div className="mt-4 grid gap-3" data-testid="normal-proof-feed-below-v2">
        {publicLogs.map((log: any) => {
          const owner = snapshot?.participants.find((p: any) => p.id === log.participantId);
          const aiDeepThought = deepThoughtQuery.data?.[String(log.id)]?.insight;
          const wardenInsight = aiDeepThought ?? (deepThoughtQuery.isLoading ? "Reading the quote, proof, and recent pattern before speaking…" : buildProofWardenInsight(owner, log, snapshot?.logs ?? []));
          const quote = String(log.readTeachText ?? "").trim();
          return (
            <article key={log.id} className="motion-card min-w-0 overflow-hidden border border-[#1D1D1D] bg-[#101010] p-3 shadow-[0_0_24px_rgba(0,0,0,0.28)]" data-testid="proof-readable-card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <ProfilePhoto participant={owner} className="h-10 w-10 border-[#6A3A24]" />
                  <div className="min-w-0">
                    <p className="truncate text-base font-black uppercase tracking-[-0.03em] text-white">{owner?.displayName ?? "Participant"}</p>
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#777]">Day {log.dayNumber}</p>
                  </div>
                </div>
                <span className="shrink-0 border border-[#2ECC71]/70 bg-[#07160E] px-2 py-1 text-[8px] font-black uppercase tracking-[0.18em] text-[#2ECC71]">Proof</span>
              </div>
              {quote.length > 0 && <p className="mt-3 break-words border-l-2 border-[#C8A96E] py-1 pl-3 pr-1 text-[13px] font-bold italic leading-5 text-[#F1F1F1]" data-testid="proof-readable-teaching">“{quote}”</p>}
              <ProofCarousel items={parseProofMedia(log.exerciseProofUrl)} dayNumber={log.dayNumber} ownerName={owner?.displayName} />
              <div className="mt-3 border border-[#C8A96E]/45 bg-[#140E05] p-3 shadow-[inset_3px_0_0_#C8A96E]" data-testid="proof-deep-thought">
                <div className="flex items-center justify-between gap-3">
                  <MicroLabel tone="gold">Deep thought</MicroLabel>
                  <span className="text-[8px] font-black uppercase tracking-[0.16em] text-[#6F5A2E]">{aiDeepThought ? "Context read" : `Day ${log.dayNumber}`}</span>
                </div>
                <p className="mt-2 break-words text-[12px] font-bold italic leading-5 text-[#F0D58A] sm:text-[13px]">{wardenInsight}</p>

              </div>
              <div className="mt-3 border border-[#242424] bg-black/45 p-3" data-testid="proof-social-panel">
                <div className="flex flex-wrap items-center gap-2">
                  {reactions.map(reaction => {
                    const social = log.proofReactions ?? { counts: {}, viewerReaction: null, total: 0 };
                    const active = social.viewerReaction === reaction.key;
                    const count = Number(social.counts?.[reaction.key] ?? 0);
                    return (
                      <button
                        key={reaction.key}
                        type="button"
                        className={classNames("motion-press border px-3 py-2 text-[9px] font-black uppercase tracking-[0.14em] transition disabled:opacity-60", active ? "border-[#2ECC71] bg-[#07160E] text-[#2ECC71]" : "border-[#333] bg-[#0B0B0B] text-[#BDBDBD] hover:border-[#C8A96E] hover:text-[#C8A96E]")}
                        disabled={reactToProof.isPending}
                        onClick={() => reactToProof.mutate({ dailyLogId: Number(log.id), reaction: reaction.key })}
                        aria-pressed={active}
                        data-testid={`proof-reaction-${reaction.key}`}
                      >
                        {reaction.label} {count > 0 ? count : ""}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 space-y-2" data-testid="proof-comments">
                  {(log.proofComments ?? []).slice(0, 4).map((comment: any) => (
                    <div key={comment.id} className="flex gap-2 border border-[#202020] bg-[#080808] p-2">
                      <div className="grid h-7 w-7 shrink-0 place-items-center border border-[#333] bg-[#111] text-[9px] font-black uppercase text-[#C8A96E]">{comment.participantInitials ?? "6+"}</div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#888]">{comment.participantName ?? "Participant"}</p>
                        <p className="mt-1 break-words text-xs font-bold leading-5 text-[#E8E8E8]">{comment.comment}</p>
                      </div>
                    </div>
                  ))}
                  {(log.proofComments ?? []).length === 0 && <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#666]">No comments yet. Call out the effort or keep someone accountable.</p>}
                </div>
                <form className="mt-3 flex gap-2" onSubmit={event => { event.preventDefault(); const comment = String(commentDrafts[log.id] ?? "").trim(); if (comment.length < 2) { toast.error("Write at least two characters before posting."); return; } commentOnProof.mutate({ dailyLogId: Number(log.id), comment }); }}>
                  <input
                    value={commentDrafts[log.id] ?? ""}
                    onChange={event => setCommentDrafts(previous => ({ ...previous, [log.id]: event.target.value }))}
                    maxLength={500}
                    placeholder="React with words…"
                    className="min-w-0 flex-1 border border-[#2A2A2A] bg-[#080808] px-3 py-2 text-xs font-bold text-white outline-none placeholder:text-[#555] focus:border-[#C8A96E]"
                    data-testid="proof-comment-input"
                  />
                  <button type="submit" disabled={commentOnProof.isPending} className="motion-press border border-[#C8A96E] bg-[#17120A] px-3 py-2 text-[9px] font-black uppercase tracking-[0.14em] text-[#F4D58D] disabled:opacity-60">Post</button>
                </form>
              </div>
            </article>
          );
        })}
        {publicLogs.length === 0 && <p className="border border-[#2A2A2A] bg-[#0D0D0D] p-6 text-sm font-bold uppercase tracking-[0.12em] text-[#777]">No proof yet. The feed wakes up when people submit exercise receipts or teachings.</p>}
        </div>
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
        {(snapshot?.rewards ?? []).map((reward: any) => {
          const canRedeem = participantPoints >= reward.pointsCost;
          return (
            <button key={reward.id} className={classNames("motion-card motion-press border bg-[#101010] p-5 text-left transition hover:border-[#C8A96E] disabled:cursor-not-allowed disabled:opacity-60", canRedeem ? "border-[#2A2A2A]" : "border-[#2A2A2A]/70")} disabled={!canRedeem || redeem.isPending} onClick={() => { pulse(12); redeem.mutate({ rewardId: reward.id }); }}>
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
          <h1 className="mt-3 text-5xl font-black uppercase leading-none tracking-[-0.08em] text-white">Enter the board.</h1>
          <p className="mt-4 text-sm font-bold leading-6 text-[#999]">{user?.email ?? "This account"} is signed in, but not yet on the 6+1 board. Complete the intake and the app will open with your profile, goal, and photo. The Warden adapts from your work, private reflections, and group-chat signals rather than a chosen style.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-[160px_1fr]">
            <label className="grid min-h-40 cursor-pointer place-items-center border border-dashed border-[#C8A96E]/70 bg-black/40 p-4 text-center text-[#C8A96E] transition hover:bg-[#17120A]">
              {profilePhotoDataUrl ? <img src={profilePhotoDataUrl} alt="Profile preview" className="h-28 w-28 object-cover" /> : <span className="flex flex-col items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em]"><Camera className="h-6 w-6" />Upload photo</span>}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={event => handlePhoto(event.target.files?.[0])} />
            </label>
            <div className="space-y-3">
              <Field label="Display name"><TextInput value={displayName} onChange={event => setDisplayName(event.target.value)} placeholder="Name shown on the board" /></Field>
              <Field label="Main goal"><TextInput value={primaryGoal} onChange={event => setPrimaryGoal(event.target.value)} placeholder="Drop weight, rebuild discipline, raise standards…" /></Field>
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
  const [releaseNoteForm, setReleaseNoteForm] = useState({ title: "", versionLabel: "", summary: "", body: "", category: "edit" as "edit" | "community_care" | "rules" | "rewards" | "technical" });
  const confirmPayment = trpc.admin.confirmPayment.useMutation({ onSuccess: () => { haptics.success(); toast("Payment marked received."); refetch(); } });
  const fulfill = trpc.admin.fulfillRedemption.useMutation({ onSuccess: () => { haptics.success(); toast("Redemption marked fulfilled."); refetch(); } });
  const approveSignup = trpc.admin.approveSignup.useMutation({ onSuccess: () => { haptics.success(); toast("Access request approved."); refetch(); } });
  const rejectSignup = trpc.admin.rejectSignup.useMutation({ onSuccess: () => { haptics.warning(); toast("Access request rejected."); refetch(); } });
  const createReleaseNote = trpc.admin.createReleaseNote.useMutation({
    onSuccess: () => {
      haptics.success();
      toast("Edit update published.");
      setReleaseNoteForm({ title: "", versionLabel: "", summary: "", body: "", category: "edit" });
      refetch();
    },
    onError: error => toast(error.message || "Could not publish the update."),
  });
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="border border-[#2A2A2A] bg-[#101010] p-5 xl:col-span-2" data-testid="release-note-admin-panel">
        <MicroLabel tone="green">Edit updates</MicroLabel>
        <h2 className="mt-2 text-3xl font-black uppercase tracking-[-0.06em] text-white">Patch notes in the game.</h2>
        <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-[#999]">Publish a short update after edits. Each participant sees it once as an in-game update pop-up and can acknowledge it.</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <Field label="Update title"><TextInput value={releaseNoteForm.title} onChange={event => setReleaseNoteForm(current => ({ ...current, title: event.target.value }))} placeholder="What changed?" /></Field>
          <Field label="Version label"><TextInput value={releaseNoteForm.versionLabel} onChange={event => setReleaseNoteForm(current => ({ ...current, versionLabel: event.target.value }))} placeholder="May 10 edit note" /></Field>
          <Field label="Summary"><TextInput value={releaseNoteForm.summary} onChange={event => setReleaseNoteForm(current => ({ ...current, summary: event.target.value }))} placeholder="One-line player-facing summary" /></Field>
          <Field label="Category"><select value={releaseNoteForm.category} onChange={event => setReleaseNoteForm(current => ({ ...current, category: event.target.value as any }))} className="min-h-12 w-full border border-[#2A2A2A] bg-black px-3 py-3 text-sm font-bold text-white outline-none focus:border-[#C8A96E]"><option value="edit">Edit</option><option value="community_care">Community care</option><option value="rules">Rules</option><option value="rewards">Rewards</option><option value="technical">Technical</option></select></Field>
          <div className="md:col-span-2"><Field label="Update body"><textarea value={releaseNoteForm.body} onChange={event => setReleaseNoteForm(current => ({ ...current, body: event.target.value }))} placeholder="Explain the update in clear, kind, in-game language." className="min-h-28 w-full border border-[#2A2A2A] bg-black px-3 py-3 text-sm font-bold leading-6 text-white outline-none focus:border-[#C8A96E]" /></Field></div>
        </div>
        <SharpButton className="mt-4 min-h-11 px-5 py-3" disabled={createReleaseNote.isPending || !releaseNoteForm.title.trim() || !releaseNoteForm.versionLabel.trim() || !releaseNoteForm.summary.trim() || !releaseNoteForm.body.trim()} onClick={() => createReleaseNote.mutate({ ...releaseNoteForm, active: true })}>{createReleaseNote.isPending ? "Publishing..." : "Publish update pop-up"}</SharpButton>
      </section>
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

function CommunityCareReleaseNotePopup({ note, isPending, onAcknowledge }: { note: any; isPending: boolean; onAcknowledge: (id: number) => void }) {
  if (!note) return null;
  const categoryLabel = note.category === "community_care" ? "Community care" : note.category === "rules" ? "Rules" : note.category === "rewards" ? "Rewards" : note.category === "technical" ? "Technical" : "Edit";
  const popup = (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/55 p-3 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={`${categoryLabel} update`} data-testid="community-care-release-note-popup">
      <div className="motion-sheet-panel max-h-[58vh] w-full max-w-sm overflow-y-auto border border-[#2ECC71] bg-[#0D0D0D] p-3 shadow-[0_18px_48px_rgba(0,0,0,0.72)] sm:p-4">
        <MicroLabel tone="green">{categoryLabel} · {note.versionLabel}</MicroLabel>
        <h2 className="mt-2 text-xl font-black uppercase leading-none tracking-[-0.06em] text-white sm:text-2xl">{note.title}</h2>
        <p className="mt-2 border-l-4 border-[#2ECC71] bg-[#07150D] p-2.5 text-[11px] font-black leading-4 text-[#CFF6DA] sm:text-xs sm:leading-5">{note.summary}</p>
        <p className="mt-2 whitespace-pre-wrap text-[11px] font-bold leading-4 text-[#D8D8D8] sm:text-xs sm:leading-5">{note.body}</p>
        <button type="button" disabled={isPending} onClick={() => onAcknowledge(Number(note.id))} className="motion-press mt-3 min-h-10 w-full bg-[#2ECC71] px-4 py-2.5 text-[9px] font-black uppercase tracking-[0.16em] text-black transition hover:bg-[#79F0A0] disabled:opacity-50">{isPending ? "Saving..." : "Got it"}</button>
      </div>
    </div>
  );
  return typeof document === "undefined" ? popup : createPortal(popup, document.body);
}

function PullToRefreshIndicator({ distance, refreshing }: { distance: number; refreshing: boolean }) {
  if (!refreshing && distance < 12) return null;
  return (
    <div className="fixed inset-x-0 top-3 z-[92] pointer-events-none flex justify-center px-4" data-testid="pull-to-refresh-indicator">
      <div className="border border-[#C8A96E]/70 bg-black/90 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#F4D58D] shadow-[0_12px_38px_rgba(0,0,0,0.55)]">
        {refreshing ? "Refreshing challenge..." : distance > 72 ? "Release to refresh" : "Pull down to refresh"}
      </div>
    </div>
  );
}

const tabs: Array<{ key: TabKey; label: string; icon: any }> = [
  { key: "myday", label: "My Day", icon: Flame },
  { key: "overview", label: "Overview", icon: Activity },
  { key: "leaderboard", label: "Board", icon: Trophy },
  { key: "proof", label: "Proof", icon: Camera },
  { key: "rewards", label: "Rewards", icon: Gift },
  { key: "calendar", label: "Journey", icon: Calendar },
  { key: "admin", label: "Founder", icon: Crown },
];

function MobileBottomNav({ mobileTabs, activeTab, activeMobileIndex, onSelect }: { mobileTabs: Array<{ key: TabKey; label: string; icon: any }>; activeTab: TabKey; activeMobileIndex: number; onSelect: (tab: TabKey) => void }) {
  const nav = (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] px-3 pb-[calc(0.7rem+env(safe-area-inset-bottom))] md:hidden" aria-label="Mobile primary navigation" data-testid="mobile-floating-nav" data-fixed-viewport-nav="true">
      <div className="pointer-events-auto relative mx-auto flex max-w-[26rem] items-center justify-between overflow-hidden rounded-[1.35rem] border border-[#C8A96E]/45 bg-[#070707]/96 px-1.5 py-2 shadow-[0_18px_44px_rgba(0,0,0,0.78)] backdrop-blur-xl">
        <div
          className="motion-tab-indicator absolute top-0 z-0 h-[3px] rounded-full bg-[#C8A96E] shadow-[0_24px_28px_rgba(200,169,110,0.48)] transition-transform duration-300 ease-out"
          style={{ width: `${100 / Math.max(1, mobileTabs.length)}%`, transform: `translateX(${activeMobileIndex * 100}%)` }}
          aria-hidden="true"
        />
        {mobileTabs.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => { pulse(10); onSelect(tab.key); }}
              className={classNames(
                "motion-tab motion-press relative z-10 flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-[1rem] px-1 py-2 text-[7px] font-black uppercase leading-none tracking-[0.08em] transition-colors duration-200 min-[380px]:text-[8px]",
                active ? "motion-tab-active bg-[#151108] text-[#C8A96E]" : "text-[#777] hover:text-white"
              )}
              aria-current={active ? "page" : undefined}
            >
              <span className={classNames("grid h-7 w-7 place-items-center rounded-full transition", active ? "bg-[#C8A96E] text-black shadow-[0_0_24px_rgba(200,169,110,0.35)]" : "bg-white/[0.03] text-[#777]")}>
                <Icon className="h-4 w-4 shrink-0" />
              </span>
              <span className="block max-w-full truncate whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
  return typeof document === "undefined" ? nav : createPortal(nav, document.body);
}

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const reduceMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<TabKey>("myday");
  const [transitionDirection, setTransitionDirection] = useState<SwipeDirection>(1);
  const [entryVisible, setEntryVisible] = useState(() => typeof window !== "undefined" && window.sessionStorage.getItem("sixone-entry-seen") !== "true");
  const [loginEntryVisible, setLoginEntryVisible] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const pullStartYRef = useRef<number | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchDeltaXRef = useRef(0);
  const touchDeltaYRef = useRef(0);
  const touchStartedInExcludedContentRef = useRef(false);
  const previousAuthRef = useRef(isAuthenticated);
  const utils = trpc.useUtils();
  const snapshotQuery = trpc.challenge.snapshot.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
  const snapshot = snapshotQuery.data;
  const visibleTabs = tabs.filter(tab => tab.key !== "admin" || user?.role === "admin");
  const mobileTabs = visibleTabs.filter(tab => tab.key !== "admin");
  const swipeTabs = mobileTabs.length > 0 ? mobileTabs : visibleTabs;
  const activeSwipeIndex = Math.max(0, swipeTabs.findIndex(tab => tab.key === activeTab));
  const activeMobileIndex = Math.max(0, mobileTabs.findIndex(tab => tab.key === activeTab));
  const releaseNoteQuery = trpc.challenge.latestReleaseNote.useQuery(undefined, { enabled: isAuthenticated });
  const acknowledgeReleaseNote = trpc.challenge.acknowledgeReleaseNote.useMutation({
    onSuccess: () => {
      haptics.success();
      toast("Update noted.");
      void releaseNoteQuery.refetch();
    },
    onError: error => toast(error.message || "Could not acknowledge the update."),
  });

  useEffect(() => {
    if (!isAuthenticated || typeof window === "undefined") return;
    let disposed = false;
    let timer: number | undefined;
    const scheduleNextLondonRollover = () => {
      timer = window.setTimeout(() => {
        if (disposed) return;
        void snapshotQuery.refetch();
        void utils.challenge.snapshot.invalidate();
        scheduleNextLondonRollover();
      }, getMillisecondsUntilNextLondonDay(new Date()) + 1500);
    };
    scheduleNextLondonRollover();
    return () => {
      disposed = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [isAuthenticated, snapshotQuery.refetch, utils.challenge.snapshot]);

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

  const changeActiveTab = (nextTab: TabKey, direction?: SwipeDirection) => {
    if (nextTab === activeTab) return;
    const currentIndex = Math.max(0, swipeTabs.findIndex(tab => tab.key === activeTab));
    const nextIndex = Math.max(0, swipeTabs.findIndex(tab => tab.key === nextTab));
    setTransitionDirection(direction ?? (nextIndex >= currentIndex ? 1 : -1));
    setActiveTab(nextTab);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    const touch = event.touches[0];
    touchStartXRef.current = touch?.clientX ?? null;
    touchStartYRef.current = touch?.clientY ?? null;
    touchDeltaXRef.current = 0;
    touchDeltaYRef.current = 0;
    touchStartedInExcludedContentRef.current = isPageSwipeExcludedTarget(event.target);
    if (typeof window === "undefined" || window.scrollY > 0 || snapshotQuery.isFetching || pullRefreshing) {
      pullStartYRef.current = null;
      return;
    }
    pullStartYRef.current = touch?.clientY ?? null;
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLElement>) => {
    const touch = event.touches[0];
    if (touchStartXRef.current !== null && touchStartYRef.current !== null && touch) {
      touchDeltaXRef.current = touch.clientX - touchStartXRef.current;
      touchDeltaYRef.current = touch.clientY - touchStartYRef.current;
    }
    if (pullStartYRef.current === null) return;
    const currentY = touch?.clientY ?? pullStartYRef.current;
    const delta = Math.max(0, currentY - pullStartYRef.current);
    const horizontalIntent = Math.abs(touchDeltaXRef.current) > Math.abs(touchDeltaYRef.current) * 1.15;
    if (!horizontalIntent && delta > 8) setPullDistance(Math.min(112, delta));
  };

  const handleTouchEnd = () => {
    const deltaX = touchDeltaXRef.current;
    const deltaY = touchDeltaYRef.current;
    const startedInExcludedContent = touchStartedInExcludedContentRef.current;
    const isHorizontalSwipe = isIntentionalPageSwipe(deltaX, deltaY, startedInExcludedContent);
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    touchDeltaXRef.current = 0;
    touchDeltaYRef.current = 0;
    touchStartedInExcludedContentRef.current = false;
    if (isHorizontalSwipe && swipeTabs.length > 1) {
      setPullDistance(0);
      pullStartYRef.current = null;
      const direction: SwipeDirection = deltaX < 0 ? 1 : -1;
      const nextIndex = Math.min(Math.max(activeSwipeIndex + direction, 0), swipeTabs.length - 1);
      if (nextIndex !== activeSwipeIndex) {
        pulse(10);
        changeActiveTab(swipeTabs[nextIndex].key, direction);
      }
      return;
    }
    const shouldRefresh = pullDistance > 72;
    pullStartYRef.current = null;
    setPullDistance(0);
    if (!shouldRefresh || pullRefreshing) return;
    setPullRefreshing(true);
    Promise.all([snapshotQuery.refetch(), releaseNoteQuery.refetch()]).finally(() => {
      setPullRefreshing(false);
      toast("Challenge data refreshed.");
    });
  };

  if (loading || entryVisible || loginEntryVisible) return <AnimatedLoadPage label={loading ? "Authenticating" : loginEntryVisible ? "Opening your challenge" : "Entering the log"} />;
  if (!isAuthenticated) return <Landing />;
  if (snapshot?.accessState?.status === "questionnaire_required") return <OnboardingGate user={user} refetch={snapshotQuery.refetch} />;

  return (
    <main className="poster-grid motion-page min-h-screen bg-[#0D0D0D] pb-32 text-white md:pb-0" data-motion-system="site-wide-v1" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <header className="sticky top-0 z-40 border-b border-[#2A2A2A] bg-[#0D0D0D]/95 backdrop-blur">
        <div className="container flex items-center justify-between gap-3 py-3 sm:gap-4 sm:py-4">
          <button onClick={() => changeActiveTab("myday", -1)} className="flex min-w-0 items-center gap-3 text-left">
            <LogoMark compact />
            <div className="min-w-0">
              <MicroLabel tone="gold">Four Lives Challenge</MicroLabel>
              <p className="mt-1 hidden text-xs font-black uppercase tracking-[0.18em] text-white sm:block">Today’s log first. Everything else second.</p>
            </div>
          </button>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span className="hidden border border-[#2A2A2A] px-3 py-2 text-[9px] font-black uppercase tracking-[0.22em] text-[#777] sm:inline-block">{user?.role === "admin" ? "Founder" : "Participant"}</span>
            <button className="border border-[#2A2A2A] px-3 py-2.5 text-[9px] font-black uppercase tracking-[0.16em] text-white hover:border-[#C8A96E] hover:text-[#C8A96E] sm:px-4 sm:py-3 sm:text-[10px] sm:tracking-[0.18em]" onClick={() => setNotificationsOpen(true)} aria-label="Open PWA notification settings"><Bell className="h-4 w-4 sm:hidden" /><span className="hidden sm:inline">Notify</span></button>
            <button className="border border-[#2A2A2A] px-3 py-2.5 text-[9px] font-black uppercase tracking-[0.16em] text-white hover:border-[#C8A96E] hover:text-[#C8A96E] sm:px-4 sm:py-3 sm:text-[10px] sm:tracking-[0.18em]" onClick={() => logout()}>Logout</button>
          </div>
        </div>
      </header>

      <section className="container py-6 md:py-8">
        {snapshotQuery.isLoading ? (
          <div className="border border-[#2A2A2A] bg-[#101010] p-10 text-center text-sm font-black uppercase tracking-[0.22em] text-[#777]">Loading challenge data...</div>
        ) : (
          <>
            <div className="mb-5 hidden gap-[2px] bg-[#2A2A2A] p-[2px] md:grid" style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0, 1fr))` }}>
              {visibleTabs.map(tab => {
                const Icon = tab.icon;
                const active = activeTab === tab.key;
                return (
                  <button key={tab.key} onClick={() => { pulse(10); changeActiveTab(tab.key); }} className={classNames("motion-tab motion-press flex items-center justify-center gap-2 bg-[#101010] px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition", active ? "motion-tab-active text-[#C8A96E]" : "text-[#777] hover:text-white")}>
                    <Icon className="h-4 w-4" /> {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="tab-stage tab-stage-stable overflow-hidden" data-testid="swipe-page-stage" data-swipe-transition="spring-slide-blur" data-swipe-direction={transitionDirection}>
              <AnimatePresence mode="wait" initial={false} custom={transitionDirection}>
                <motion.div
                  key={activeTab}
                  custom={transitionDirection}
                  variants={pageSwipeVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={reduceMotion ? { duration: 0.01 } : { type: "spring", stiffness: 260, damping: 28, mass: 0.86 }}
                  className="min-w-0"
                  data-testid={`swipe-page-${activeTab}`}
                >
                  {activeTab === "myday" && <MyDay snapshot={snapshot} refetch={snapshotQuery.refetch} />}
                  {activeTab === "overview" && <Overview snapshot={snapshot} />}
                  {activeTab === "leaderboard" && <Leaderboard snapshot={snapshot} />}
                  {activeTab === "proof" && <div className="flex w-full justify-center" data-testid="proof-page-centered-shell"><ProofFeed snapshot={snapshot} /></div>}
                  {activeTab === "rewards" && <Rewards snapshot={snapshot} refetch={snapshotQuery.refetch} />}
                  {activeTab === "calendar" && <CalendarView />}
                  {activeTab === "admin" && (user?.role === "admin" ? <AdminPanel snapshot={snapshot} refetch={snapshotQuery.refetch} /> : <div className="border border-[#2A2A2A] bg-[#101010] p-8"><MicroLabel tone="red">Restricted</MicroLabel><p className="mt-3 text-xl font-black uppercase text-white">Founder dashboard is restricted to admin users.</p></div>)}
                </motion.div>
              </AnimatePresence>
            </div>
          </>
        )}
      </section>

      {notificationsOpen && <PwaNotificationPanel open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />}
      <PullToRefreshIndicator distance={pullDistance} refreshing={pullRefreshing} />
      <LifeLossAlert snapshot={snapshot} />
      <CommunityCareReleaseNotePopup note={releaseNoteQuery.data} isPending={acknowledgeReleaseNote.isPending} onAcknowledge={releaseNoteId => acknowledgeReleaseNote.mutate({ releaseNoteId })} />
      <MobileBottomNav mobileTabs={mobileTabs} activeTab={activeTab} activeMobileIndex={activeMobileIndex} onSelect={changeActiveTab} />
    </main>
  );
}
