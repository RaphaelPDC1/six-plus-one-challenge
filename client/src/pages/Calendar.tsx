import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { X, ChevronDown, ChevronUp } from "lucide-react";

const CHALLENGE_DAYS = 50;
const MILESTONE_DAYS = [10, 25, 40, 50];

function classNames(...items: Array<string | false | null | undefined>) {
  return items.filter(Boolean).join(" ");
}

function getDayStatus(dayNumber: number, dailyLogs: any[]) {
  const log = dailyLogs.find((l: any) => l.dayNumber === dayNumber);
  if (!log) return { status: "future", label: "Not opened", log: null };
  if (log.dayComplete) return { status: "completed", label: "Banked", log };
  const allRulesMet = log.noAlcohol && log.cleanEating && log.exerciseBanked &&
    log.reflectionBanked && log.readTeachBanked && log.trackedEverything;
  if (!allRulesMet) return { status: "missed", label: "Standards lost", log };
  return { status: "incomplete", label: "Live now", log };
}

function getStatusClasses(status: string) {
  switch (status) {
    case "completed": return "border-[#2ECC71] bg-[#092012] text-[#2ECC71]";
    case "missed":    return "border-[#C0392B] bg-[#240E0B] text-[#FFB3A8]";
    case "incomplete": return "border-[#C8A96E] bg-[#1E190D] text-[#C8A96E]";
    default:          return "border-[#2A2A2A] bg-[#0B0B0B] text-[#555]";
  }
}

function getStatusDot(status: string) {
  switch (status) {
    case "completed":  return "bg-[#2ECC71]";
    case "missed":     return "bg-[#C0392B]";
    case "incomplete": return "bg-[#C8A96E]";
    default:           return "bg-[#2A2A2A]";
  }
}

function proofImageUrl(url: string) {
  const trimmed = url?.trim() ?? "";
  if (!trimmed) return "";
  if (trimmed.startsWith("/manus-storage/"))
    return `/api/storage-image/${encodeURIComponent(trimmed.slice("/manus-storage/".length))}`;
  if (trimmed.startsWith("/api/storage-image/")) return encodeURI(trimmed);
  try {
    const items = JSON.parse(trimmed);
    if (Array.isArray(items) && items[0]?.url) return proofImageUrl(items[0].url);
  } catch {}
  return trimmed;
}

function parseProofItems(raw: string | null | undefined): Array<{ url: string; type: string }> {
  const str = String(raw ?? "").trim();
  if (!str) return [];
  try {
    const parsed = JSON.parse(str);
    if (Array.isArray(parsed)) return parsed.filter((item: any) => item?.url);
  } catch {}
  return [{ url: str, type: "image" }];
}

/** Slide-up panel showing a specific day's log detail. */
function DayDetailPanel({ day, log, status, onClose }: {
  day: number;
  log: any;
  status: string;
  onClose: () => void;
}) {
  const proofItems = parseProofItems(log?.exerciseProofUrl);
  const statusLabel = status === "completed" ? "Banked" : status === "missed" ? "Standards lost" : status === "incomplete" ? "Live now" : "Not logged";
  const statusColor = status === "completed" ? "#2ECC71" : status === "missed" ? "#C0392B" : "#C8A96E";

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-lg overflow-y-auto border border-[#2A2A2A] bg-[#0D0D0D] shadow-[0_-24px_80px_rgba(0,0,0,0.7)] sm:border sm:shadow-[0_24px_80px_rgba(0,0,0,0.7)]"
        style={{ maxHeight: "82svh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#2A2A2A] bg-[#0D0D0D] px-4 py-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.28em] text-[#777]">Day {day} / 50</p>
            <p className="mt-0.5 text-lg font-black uppercase leading-none tracking-[-0.04em] text-white">
              {statusLabel}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="border px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em]"
              style={{ borderColor: statusColor, color: statusColor }}
            >{statusLabel}</span>
            <button
              type="button"
              onClick={onClose}
              className="grid h-8 w-8 place-items-center border border-[#2A2A2A] text-[#777] hover:border-[#C8A96E] hover:text-[#C8A96E]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {!log ? (
          <div className="p-6 text-center">
            <p className="text-sm font-bold text-[#777]">No log for day {day} yet.</p>
          </div>
        ) : (
          <div className="space-y-0 divide-y divide-[#1A1A1A]">
            {/* Exercise */}
            <div className="p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.24em] text-[#C8A96E]">Exercise</p>
              {log.exerciseDuration > 0 || log.exerciseType ? (
                <p className="mt-2 text-sm font-black uppercase tracking-[-0.02em] text-white">
                  {log.exerciseType || "—"}{log.exerciseDuration > 0 ? ` · ${log.exerciseDuration} min` : ""}
                </p>
              ) : (
                <p className="mt-2 text-sm font-bold text-[#555]">Not logged</p>
              )}
              {/* Proof media */}
              {proofItems.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {proofItems.map((item, i) => {
                    const src = proofImageUrl(item.url);
                    const isVideo = item.type === "video" || /\.(mp4|mov|webm)(\?|#|$)/i.test(item.url);
                    return (
                      <div key={i} className="relative aspect-square overflow-hidden border border-[#2A2A2A] bg-[#111]">
                        {isVideo ? (
                          <video
                            src={src}
                            className="h-full w-full object-cover"
                            controls
                            playsInline
                            preload="metadata"
                          />
                        ) : src ? (
                          <img
                            src={src}
                            alt={`Day ${day} proof ${i + 1}`}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center">
                            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#555]">Proof</p>
                          </div>
                        )}
                        <div className="absolute left-1 top-1">
                          <span className="border border-[#2ECC71]/70 bg-[#07150D] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-[#2ECC71]">
                            {isVideo ? "Video" : "Photo"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Reflection */}
            {log.reflectionText && (
              <div className="p-4">
                <p className="text-[9px] font-black uppercase tracking-[0.24em] text-[#C8A96E]">Reflection</p>
                <p className="mt-2 text-sm font-bold leading-6 text-[#D5D5D5]">{log.reflectionText}</p>
              </div>
            )}

            {/* Read & Teach */}
            {log.readTeachText && (
              <div className="p-4">
                <p className="text-[9px] font-black uppercase tracking-[0.24em] text-[#C8A96E]">Read & Teach</p>
                <p className="mt-2 text-sm font-bold leading-6 text-[#D5D5D5]">{log.readTeachText}</p>
              </div>
            )}

            {/* Eating note */}
            {log.cleanEatingNote && (
              <div className="p-4">
                <p className="text-[9px] font-black uppercase tracking-[0.24em] text-[#C8A96E]">Clean eating</p>
                <p className="mt-2 text-sm font-bold leading-6 text-[#D5D5D5]">{log.cleanEatingNote}</p>
              </div>
            )}

            {/* Rules summary */}
            <div className="p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.24em] text-[#777]">Rules ticked</p>
              <div className="mt-2 grid grid-cols-3 gap-1.5 sm:grid-cols-6">
                {[
                  { key: "noAlcohol", label: "No alcohol", done: log.noAlcohol },
                  { key: "cleanEating", label: "Clean eating", done: log.cleanEating },
                  { key: "exercise", label: "Exercise", done: log.exerciseBanked ?? (log.exerciseDuration >= 30) },
                  { key: "reflection", label: "Reflection", done: log.reflectionBanked ?? !!log.reflectionText },
                  { key: "readTeach", label: "Read & teach", done: log.readTeachBanked ?? !!log.readTeachText },
                  { key: "tracked", label: "Tracked", done: log.trackedEverything },
                ].map(rule => (
                  <div
                    key={rule.key}
                    className={classNames(
                      "border p-2 text-center",
                      rule.done ? "border-[#2ECC71]/60 bg-[#07150D] text-[#2ECC71]" : "border-[#2A2A2A] bg-[#111] text-[#555]"
                    )}
                  >
                    <p className="text-[8px] font-black uppercase leading-4 tracking-[0.1em]">{rule.label}</p>
                    <p className="mt-1 text-base font-black">{rule.done ? "✓" : "–"}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function CalendarView() {
  const { isAuthenticated } = useAuth();
  const { data: snapshot } = trpc.challenge.snapshot.useQuery(undefined, { enabled: isAuthenticated });
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);

  const participant = snapshot?.participant;
  const dailyLogs = useMemo(() => {
    if (!participant) return [];
    return snapshot?.logs?.filter((log: any) => log.participantId === participant.id) ?? [];
  }, [snapshot?.logs, participant]);

  const calendarDays = useMemo(() => {
    return Array.from({ length: CHALLENGE_DAYS }, (_, i) => {
      const dayNumber = i + 1;
      const { status, label, log } = getDayStatus(dayNumber, dailyLogs);
      return { dayNumber, status, label, log, isMilestone: MILESTONE_DAYS.includes(dayNumber) };
    });
  }, [dailyLogs]);

  const currentDay = Math.min(
    snapshot?.challenge?.currentDay ?? (participant?.daysComplete ?? 0) + 1,
    CHALLENGE_DAYS
  );
  const today = new Date();
  const currentStatus = getDayStatus(currentDay, dailyLogs);
  const selectedEntry = selectedDay !== null ? calendarDays.find(d => d.dayNumber === selectedDay) : null;

  if (!participant) {
    return (
      <div className="border border-[#2A2A2A] bg-[#101010] p-8 text-center">
        <p className="text-sm font-bold text-[#777]">Loading the 50-day campaign map…</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ── Hero card: day + status + stats all in one ── */}
      <section className="relative overflow-hidden border border-[#C8A96E]/40 bg-[#070707] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C8A96E] to-transparent" aria-hidden />

        <div className="grid grid-cols-[auto_1fr] divide-x divide-[#1A1A1A]">
          {/* Big day number */}
          <div className="flex flex-col items-center justify-center p-5 sm:p-7">
            <p className="text-[9px] font-black uppercase tracking-[0.28em] text-[#777]">
              {today.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase()}
            </p>
            <p className="mt-1 text-7xl font-black leading-none tracking-[-0.1em] text-white sm:text-8xl">
              {currentDay}
            </p>
            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#C8A96E]">of 50</p>
          </div>

          {/* Status + stats */}
          <div className="flex flex-col justify-between p-4 sm:p-5">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#777]">Today's position</p>
              <div
                className={classNames(
                  "mt-2 inline-flex border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em]",
                  getStatusClasses(currentStatus.status)
                )}
              >
                {currentStatus.label}
              </div>
            </div>

            {/* Inline stats — replaces the 3 separate cards */}
            <div className="mt-4 grid grid-cols-3 divide-x divide-[#1A1A1A] border border-[#1A1A1A]">
              <div className="p-3 text-center">
                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#777]">Banked</p>
                <p className="mt-1 text-2xl font-black leading-none text-[#2ECC71]">{participant.daysComplete}</p>
              </div>
              <div className="p-3 text-center">
                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#777]">Streak</p>
                <p className="mt-1 text-2xl font-black leading-none text-[#C8A96E]">{participant.currentStreak}</p>
              </div>
              <div className="p-3 text-center">
                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#777]">Lives</p>
                <p className="mt-1 text-2xl font-black leading-none text-white">{participant.livesRemaining}<span className="text-xs text-[#555]">/4</span></p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMapExpanded(v => !v)}
              className="mt-3 flex items-center justify-between border border-[#C8A96E]/50 bg-[#171207] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#C8A96E] transition hover:bg-[#C8A96E] hover:text-black"
            >
              {mapExpanded ? "Hide full map" : "Open full map"}
              {mapExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </section>

      {/* ── Campaign map (always compact grid, expanded on toggle) ── */}
      <section className="border border-[#2A2A2A] bg-[#101010]">
        <div className="flex items-center justify-between border-b border-[#1A1A1A] px-4 py-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#C8A96E]">50-day campaign</p>
            <p className="mt-0.5 text-xs font-black uppercase tracking-[0.06em] text-[#777]">Tap any day to see your log</p>
          </div>
          <div className="flex gap-3 text-[8px] font-black uppercase tracking-[0.12em] text-[#777]">
            <span className="flex items-center gap-1"><i className="inline-block h-2 w-2 bg-[#2ECC71]" />Banked</span>
            <span className="flex items-center gap-1"><i className="inline-block h-2 w-2 bg-[#C0392B]" />Lost</span>
            <span className="flex items-center gap-1"><i className="inline-block h-2 w-2 bg-[#C8A96E]" />Live</span>
          </div>
        </div>

        <div className={classNames(
          "grid p-3 transition-all duration-500",
          mapExpanded ? "grid-cols-5 gap-1.5 sm:grid-cols-10" : "grid-cols-10 gap-1"
        )}>
          {calendarDays.map(({ dayNumber, status, label, log, isMilestone }) => {
            const hasPastLog = log !== null;
            const isToday = dayNumber === currentDay;
            const isSelected = selectedDay === dayNumber;

            return (
              <button
                key={dayNumber}
                type="button"
                disabled={!hasPastLog && dayNumber > currentDay}
                onClick={() => {
                  if (hasPastLog || dayNumber <= currentDay) {
                    setSelectedDay(selectedDay === dayNumber ? null : dayNumber);
                  }
                }}
                className={classNames(
                  "relative transition hover:-translate-y-0.5",
                  mapExpanded ? "aspect-square border p-1.5" : "aspect-square border",
                  getStatusClasses(status),
                  isToday && "ring-2 ring-[#C8A96E] ring-offset-1 ring-offset-[#0D0D0D]",
                  isMilestone && "shadow-[inset_0_0_0_1px_rgba(200,169,110,0.4)]",
                  isSelected && "ring-2 ring-white/60 ring-offset-1 ring-offset-[#0D0D0D]",
                  (!hasPastLog && dayNumber > currentDay) && "cursor-default opacity-40",
                  (hasPastLog || dayNumber <= currentDay) && "cursor-pointer"
                )}
                title={`Day ${dayNumber}: ${label}`}
                aria-label={`Day ${dayNumber}: ${label}`}
              >
                {mapExpanded ? (
                  <>
                    <span className="absolute left-1 top-1 text-[9px] font-black leading-none">{dayNumber}</span>
                    {isMilestone && (
                      <span className="absolute right-1 top-1 text-[7px] font-black text-[#C8A96E]">★</span>
                    )}
                    <span className={classNames("absolute bottom-1 right-1 h-2 w-2", getStatusDot(status))} />
                  </>
                ) : (
                  <span className={classNames("absolute inset-0 m-auto h-1.5 w-1.5", getStatusDot(status))} style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />
                )}
              </button>
            );
          })}
        </div>

        {!mapExpanded && (
          <p className="border-t border-[#1A1A1A] px-4 py-2 text-center text-[9px] font-black uppercase tracking-[0.18em] text-[#555]">
            Tap any banked day · Open full map for details
          </p>
        )}
      </section>

      {/* ── Day detail panel (slide-up) ── */}
      {selectedEntry && (
        <DayDetailPanel
          day={selectedEntry.dayNumber}
          log={selectedEntry.log}
          status={selectedEntry.status}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  );
}
