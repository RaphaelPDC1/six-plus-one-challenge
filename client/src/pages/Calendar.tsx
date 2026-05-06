import { useMemo } from "react";
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
    return { status: "future", label: "Not started" };
  }

  if (log.dayComplete) {
    return { status: "completed", label: "Completed" };
  }

  const allRulesMet =
    log.noAlcohol &&
    log.cleanEating &&
    log.exerciseDone &&
    log.reflectionDone &&
    log.readTeachDone &&
    log.trackedEverything;

  if (!allRulesMet) {
    return { status: "missed", label: "Missed rules" };
  }

  return { status: "incomplete", label: "In progress" };
}

function getStatusColor(status: string) {
  switch (status) {
    case "completed":
      return "bg-[#2ECC71] border-[#2ECC71]";
    case "missed":
      return "bg-[#E74C3C] border-[#E74C3C]";
    case "incomplete":
      return "bg-[#F39C12] border-[#F39C12]";
    case "future":
      return "bg-[#444] border-[#444]";
    default:
      return "bg-[#444] border-[#444]";
  }
}

function isMilestoneDay(dayNumber: number) {
  return MILESTONE_DAYS.includes(dayNumber);
}

export function CalendarView() {
  const { isAuthenticated } = useAuth();
  const { data: snapshot } = trpc.challenge.snapshot.useQuery(undefined, { enabled: isAuthenticated });

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

  if (!participant) {
    return (
      <div className="border border-[#2A2A2A] bg-[#101010] p-5 text-center">
        <p className="text-sm font-bold text-[#999]">Loading calendar...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border border-[#2A2A2A] bg-[#101010] p-5">
        <h1 className="text-3xl font-black uppercase tracking-[-0.06em] text-white">50-Day Journey</h1>
        <p className="mt-2 text-sm font-bold text-[#999]">
          Track your progress through the challenge. Each day represents a commitment to the 6 rules.
        </p>
      </div>

      {/* Legend */}
      <div className="border border-[#2A2A2A] bg-[#101010] p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#777] mb-3">Status Legend</p>
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 border border-[#2ECC71] bg-[#2ECC71]"></div>
            <span className="text-xs font-bold text-white">Completed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 border border-[#E74C3C] bg-[#E74C3C]"></div>
            <span className="text-xs font-bold text-white">Missed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 border border-[#F39C12] bg-[#F39C12]"></div>
            <span className="text-xs font-bold text-white">In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 border border-[#444] bg-[#444]"></div>
            <span className="text-xs font-bold text-white">Future</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid — Month-style layout */}
      <div className="border border-[#2A2A2A] bg-[#101010] p-5">
        <div className="grid gap-1 grid-cols-5 sm:grid-cols-7 md:grid-cols-10">
          {calendarDays.map(({ dayNumber, status, isMilestone }) => (
            <div
              key={dayNumber}
              className={classNames(
                "relative flex flex-col items-center justify-center aspect-square border p-1 text-center transition",
                getStatusColor(status.status),
                isMilestone && "ring-2 ring-[#C8A96E]"
              )}
              title={`Day ${dayNumber}: ${status.label}`}
            >
              <span className="text-[11px] font-black text-white leading-none">{dayNumber}</span>
              {isMilestone && (
                <span className="text-[7px] font-black uppercase tracking-[0.05em] text-[#C8A96E] mt-0.5">
                  {dayNumber === 10 && "10%"}
                  {dayNumber === 25 && "50%"}
                  {dayNumber === 40 && "80%"}
                  {dayNumber === 50 && "100%"}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Progress Summary */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="border border-[#2A2A2A] bg-[#101010] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#777]">Days Completed</p>
          <p className="mt-2 text-3xl font-black text-[#2ECC71]">{participant.daysComplete}</p>
        </div>
        <div className="border border-[#2A2A2A] bg-[#101010] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#777]">Current Streak</p>
          <p className="mt-2 text-3xl font-black text-[#F39C12]">{participant.currentStreak}</p>
        </div>
        <div className="border border-[#2A2A2A] bg-[#101010] p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#777]">Lives Remaining</p>
          <p className="mt-2 text-3xl font-black text-[#C8A96E]">{participant.livesRemaining}</p>
        </div>
      </div>
    </div>
  );
}
