import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

const CHALLENGE_DAYS = 50;
const MILESTONE_DAYS = [10, 25, 40, 50];

function classNames(...items: Array<string | false | null | undefined>) {
  return items.filter(Boolean).join(" ");
}

function getDayStatus(dayNumber: number, dailyLogs: any[]) {
  const log = dailyLogs.find((l) => l.dayNumber === dayNumber);

  if (!log) {
    return { status: "future", label: "Not opened" };
  }

  if (log.dayComplete) {
    return { status: "completed", label: "Banked" };
  }

  const allRulesMet =
    log.noAlcohol &&
    log.cleanEating &&
    log.exerciseBanked &&
    log.reflectionBanked &&
    log.readTeachBanked &&
    log.trackedEverything;

  if (!allRulesMet) {
    return { status: "missed", label: "Standards lost" };
  }

  return { status: "incomplete", label: "Live now" };
}

function getStatusClasses(status: string) {
  switch (status) {
    case "completed":
      return "border-[#2ECC71] bg-[#092012] text-[#2ECC71]";
    case "missed":
      return "border-[#C0392B] bg-[#240E0B] text-[#FFB3A8]";
    case "incomplete":
      return "border-[#C8A96E] bg-[#1E190D] text-[#C8A96E]";
    case "future":
      return "border-[#333] bg-[#0B0B0B] text-[#777]";
    default:
      return "border-[#333] bg-[#0B0B0B] text-[#777]";
  }
}

function getStatusDot(status: string) {
  switch (status) {
    case "completed":
      return "bg-[#2ECC71]";
    case "missed":
      return "bg-[#C0392B]";
    case "incomplete":
      return "bg-[#C8A96E]";
    default:
      return "bg-[#444]";
  }
}

function isMilestoneDay(dayNumber: number) {
  return MILESTONE_DAYS.includes(dayNumber);
}

export function CalendarView() {
  const { isAuthenticated } = useAuth();
  const { data: snapshot } = trpc.challenge.snapshot.useQuery(undefined, { enabled: isAuthenticated });
  const [expanded, setExpanded] = useState(false);

  const participant = snapshot?.participant;
  const dailyLogs = useMemo(() => {
    if (!participant) return [];
    return snapshot?.logs?.filter((log: any) => log.participantId === participant.id) ?? [];
  }, [snapshot?.logs, participant]);

  const calendarDays = useMemo(() => {
    return Array.from({ length: CHALLENGE_DAYS }, (_, i) => {
      const dayNumber = i + 1;
      const status = getDayStatus(dayNumber, dailyLogs);
      const isMilestone = isMilestoneDay(dayNumber);
      return { dayNumber, status, isMilestone };
    });
  }, [dailyLogs]);

  const completedDays = participant?.daysComplete ?? 0;
  const currentDay = Math.min(snapshot?.challenge?.currentDay ?? completedDays + 1, CHALLENGE_DAYS);
  const currentStatus = getDayStatus(currentDay, dailyLogs);
  const today = new Date();

  if (!participant) {
    return (
      <div className="border border-[#2A2A2A] bg-[#101010] p-5 text-center">
        <p className="text-sm font-bold text-[#999]">Loading the 50-day campaign map…</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="motion-card relative overflow-hidden border border-[#C8A96E]/40 bg-[#070707] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:p-6">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#C8A96E] to-transparent" aria-hidden="true" />
        <div className="grid gap-4 md:grid-cols-[1fr_240px] md:items-stretch">
          <div className="motion-card border border-[#2A2A2A] bg-[#101010] p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C8A96E]">Day marker</p>
            <div className="mt-4 border border-[#343434] bg-black p-4 text-center shadow-inner">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#777]">{today.toLocaleDateString(undefined, { weekday: "long" })}</p>
              <p className="mt-2 text-7xl font-black uppercase leading-none tracking-[-0.1em] text-white sm:text-8xl">{currentDay}</p>
              <p className="mt-2 text-xs font-black uppercase tracking-[0.22em] text-[#C8A96E]">of 50</p>
              <div className="mx-auto mt-4 h-px w-24 bg-[#2A2A2A]" aria-hidden="true" />
              <p className="mt-4 text-sm font-black uppercase tracking-[0.12em] text-white">{today.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
          </div>

          <div className="motion-card flex flex-col justify-between border border-[#2A2A2A] bg-[#101010] p-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#777]">Current position</p>
              <div className={classNames("mt-3 border px-3 py-2 text-xs font-black uppercase tracking-[0.16em]", getStatusClasses(currentStatus.status))}>{currentStatus.label}</div>
              <p className="mt-4 text-sm font-bold leading-6 text-[#A7A7A7]">Your current position first. Open the full campaign map only when you need the wider read.</p>
            </div>
            <button
              type="button"
              onClick={() => setExpanded(value => !value)}
              className="motion-press mt-5 border border-[#C8A96E] bg-[#171207] px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-[#C8A96E] transition hover:bg-[#C8A96E] hover:text-black"
            >
              {expanded ? "Hide full map" : "Open full map"}
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="motion-card border border-[#2A2A2A] bg-[#101010] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#777]">Days banked</p>
          <p className="mt-2 text-3xl font-black text-[#2ECC71]">{participant.daysComplete}</p>
        </div>
        <div className="motion-card border border-[#2A2A2A] bg-[#101010] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#777]">Streak held</p>
          <p className="mt-2 text-3xl font-black text-[#C8A96E]">{participant.currentStreak}</p>
        </div>
        <div className="motion-card border border-[#2A2A2A] bg-[#101010] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#777]">Lives remaining</p>
          <p className="mt-2 text-3xl font-black text-white">{participant.livesRemaining}</p>
        </div>
      </div>

      {expanded && (
        <section className="motion-card border border-[#2A2A2A] bg-[#101010] p-4 sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#C8A96E]">Full campaign</p>
              <h1 className="mt-2 text-2xl font-black uppercase tracking-[-0.06em] text-white">50-day campaign map</h1>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#999] sm:grid-cols-4">
              <span><i className="mr-1 inline-block h-2 w-2 bg-[#2ECC71]" />Banked</span>
              <span><i className="mr-1 inline-block h-2 w-2 bg-[#C0392B]" />Lost</span>
              <span><i className="mr-1 inline-block h-2 w-2 bg-[#C8A96E]" />Live</span>
              <span><i className="mr-1 inline-block h-2 w-2 bg-[#444]" />Locked</span>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-1 sm:grid-cols-10">
            {calendarDays.map(({ dayNumber, status, isMilestone }) => (
              <div
                key={dayNumber}
                className={classNames(
                  "motion-press relative aspect-square border p-1 transition hover:-translate-y-0.5",
                  getStatusClasses(status.status),
                  dayNumber === currentDay && "ring-2 ring-[#C8A96E]",
                  isMilestone && "shadow-[inset_0_0_0_1px_rgba(200,169,110,0.45)]",
                )}
                title={`Day ${dayNumber}: ${status.label}`}
              >
                <span className="absolute left-1 top-1 text-[10px] font-black leading-none">{dayNumber}</span>
                <span className={classNames("absolute bottom-1 right-1 h-2 w-2", getStatusDot(status.status))} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
