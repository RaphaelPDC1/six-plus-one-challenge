import { readFileSync, writeFileSync } from "node:fs";

const dbPath = "/home/ubuntu/six-plus-one-challenge/server/db.ts";
let db = readFileSync(dbPath, "utf8");

const oldDateHelper = 'export function getCurrentChallengeDay(now = new Date()) {\n  const start = new Date(`${CHALLENGE_START_DATE}T00:00:00Z`);\n  const diff = Math.floor((now.getTime() - start.getTime()) / 86_400_000) + 1;\n  return Math.min(50, Math.max(1, diff));\n}\n';
const newDateHelper = 'const DAY_MS = 86_400_000;\n\nexport function getChallengeDateForDay(dayNumber: number) {\n  const safeDay = Math.min(50, Math.max(1, Math.trunc(dayNumber)));\n  const start = new Date(`${CHALLENGE_START_DATE}T00:00:00Z`);\n  return new Date(start.getTime() + (safeDay - 1) * DAY_MS);\n}\n\nexport function getChallengeDateIsoForDay(dayNumber: number) {\n  return getChallengeDateForDay(dayNumber).toISOString().slice(0, 10);\n}\n\nexport function getChallengeDeadlineForDay(dayNumber: number) {\n  const date = getChallengeDateForDay(dayNumber);\n  return new Date(date.getTime() + DAY_MS - 1);\n}\n\nexport function getCurrentChallengeDay(now = new Date()) {\n  const start = new Date(`${CHALLENGE_START_DATE}T00:00:00Z`);\n  const diff = Math.floor((now.getTime() - start.getTime()) / DAY_MS) + 1;\n  return Math.min(50, Math.max(1, diff));\n}\n\nexport function getChallengeCalendar(now = new Date()) {\n  const currentDay = getCurrentChallengeDay(now);\n  return Array.from({ length: currentDay }, (_, index) => {\n    const dayNumber = index + 1;\n    const date = getChallengeDateForDay(dayNumber);\n    return {\n      dayNumber,\n      dateIso: date.toISOString().slice(0, 10),\n      label: date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }),\n      isToday: dayNumber === currentDay,\n    };\n  });\n}\n';
if (!db.includes(oldDateHelper) && !db.includes('export function getChallengeDateForDay(dayNumber: number)')) {
  throw new Error("Could not find getCurrentChallengeDay helper block");
}
if (db.includes(oldDateHelper)) db = db.replace(oldDateHelper, newDateHelper);

db = db.replace(
'  const submittedAt = new Date();\n  const logDate = new Date(`${submittedAt.toISOString().slice(0, 10)}T00:00:00Z`);\n',
'  const submittedAt = new Date();\n  const currentChallengeDay = getCurrentChallengeDay(submittedAt);\n  if (input.dayNumber > currentChallengeDay) {\n    throw new Error(`Day ${input.dayNumber} is not open yet. The challenge is currently on day ${currentChallengeDay}.`);\n  }\n  const logDate = getChallengeDateForDay(input.dayNumber);\n  const deadline = getChallengeDeadlineForDay(input.dayNumber);\n'
);

db = db.replace(
'    submittedAt,\n  });\n',
'    submittedAt,\n    deadline,\n  });\n'
);

db = db.replaceAll(
'challenge: { currentDay: getCurrentChallengeDay(), totalDays: 50, monzoPaymentLink: DEFAULT_MONZO_PAYMENT_LINK }',
'challenge: { currentDay: getCurrentChallengeDay(), totalDays: 50, startDate: CHALLENGE_START_DATE, calendar: getChallengeCalendar(), monzoPaymentLink: DEFAULT_MONZO_PAYMENT_LINK }'
);

writeFileSync(dbPath, db);

const homePath = "/home/ubuntu/six-plus-one-challenge/client/src/pages/Home.tsx";
let home = readFileSync(homePath, "utf8");

home = home.replace(
'              <div>\n                <MicroLabel tone="gold">Day {snapshot?.challenge.currentDay ?? "—"} / 50</MicroLabel>\n                <h1 className="mt-3 text-5xl font-black uppercase leading-[0.86] tracking-[-0.08em] text-white md:text-7xl">Log today.</h1>\n                <p className="mt-4 max-w-xl text-sm font-bold leading-6 text-[#A7A7A7]">Six checks. One submission. No hiding.</p>\n              </div>',
'              <div>\n                <MicroLabel tone="gold">Day {snapshot?.challenge.currentDay ?? "—"} / 50 · Started 6 May</MicroLabel>\n                <h1 className="mt-3 text-5xl font-black uppercase leading-[0.86] tracking-[-0.08em] text-white md:text-7xl">Log the day.</h1>\n                <p className="mt-4 max-w-xl text-sm font-bold leading-6 text-[#A7A7A7]">Every calendar day from 6 May is tracked. Today’s form is tied to the correct challenge day, so no day disappears.</p>\n              </div>'
);

home = home.replace(
'          <SharpButton className={classNames("w-full py-5 text-sm transition-all duration-300", submit.isPending && "submit-button-pending")} disabled={!allAddressed || submit.isPending} onClick={() => submit.mutate({ ...form, dayNumber: snapshot?.challenge.currentDay ?? 1 })}>\n            {submit.isPending ? "Submitting the log" : allAddressed ? "Submit today" : `Address ${6 - completedRules} more`}\n          </SharpButton>',
'          <SharpButton className={classNames("w-full py-5 text-sm transition-all duration-300", submit.isPending && "submit-button-pending")} disabled={!allAddressed || submit.isPending} onClick={() => submit.mutate({ ...form, dayNumber: snapshot?.challenge.currentDay ?? 1 })}>\n            {submit.isPending ? "Submitting the log" : allAddressed ? `Submit day ${snapshot?.challenge.currentDay ?? 1}` : `Address ${6 - completedRules} more`}\n          </SharpButton>'
);

const oldOverviewStart = 'function Overview({ snapshot }: { snapshot: Snapshot }) {\n  const participants = snapshot?.participants ?? [];\n  const logs = snapshot?.logs ?? [];\n  const chartData = useMemo(() => {\n    const dayCount = Math.max(snapshot?.challenge?.currentDay ?? 1, 10);\n    return Array.from({ length: dayCount }, (_, index) => {\n      const day = index + 1;\n      const row: Record<string, number> = { day };\n      participants.forEach((participant: any) => {\n        row[participant.displayName] = logs.filter((log: any) => log.participantId === participant.id && log.dayNumber <= day && log.dayComplete).length;\n      });\n      return row;\n    });\n  }, [participants, logs, snapshot?.challenge?.currentDay]);\n\n  return (';
const newOverviewStart = 'function Overview({ snapshot }: { snapshot: Snapshot }) {\n  const participants = snapshot?.participants ?? [];\n  const logs = snapshot?.logs ?? [];\n  const calendar = snapshot?.challenge?.calendar ?? [];\n  const trackedDays = calendar.map((day: any) => {\n    const dayLogs = logs.filter((log: any) => log.dayNumber === day.dayNumber);\n    const completed = dayLogs.filter((log: any) => log.dayComplete).length;\n    return { ...day, logged: dayLogs.length, completed, missing: Math.max(participants.length - dayLogs.length, 0) };\n  });\n  const chartData = useMemo(() => {\n    const dayCount = Math.max(snapshot?.challenge?.currentDay ?? 1, 10);\n    return Array.from({ length: dayCount }, (_, index) => {\n      const day = index + 1;\n      const row: Record<string, number> = { day };\n      participants.forEach((participant: any) => {\n        row[participant.displayName] = logs.filter((log: any) => log.participantId === participant.id && log.dayNumber <= day && log.dayComplete).length;\n      });\n      return row;\n    });\n  }, [participants, logs, snapshot?.challenge?.currentDay]);\n\n  return (';
if (home.includes(oldOverviewStart)) home = home.replace(oldOverviewStart, newOverviewStart);

home = home.replace(
'        <PosterStat label="Challenge day" value={snapshot?.challenge?.currentDay ?? 1} tone="gold" />\n        <PosterStat label="Participants" value={participants.length} tone="white" />\n        <PosterStat label="Pending payments" value={(snapshot?.payments ?? []).filter((p: any) => p.status === "pending").length} tone="red" />\n        <PosterStat label="Warden posts" value={(snapshot?.wardenMessages ?? []).length} tone="green" />\n      </div>',
'        <PosterStat label="Challenge day" value={snapshot?.challenge?.currentDay ?? 1} tone="gold" />\n        <PosterStat label="Participants" value={participants.length} tone="white" />\n        <PosterStat label="Pending payments" value={(snapshot?.payments ?? []).filter((p: any) => p.status === "pending").length} tone="red" />\n        <PosterStat label="Unlogged days" value={trackedDays.reduce((sum: number, day: any) => sum + day.missing, 0)} tone="red" />\n      </div>\n\n      <section className="border border-[#2A2A2A] bg-[#101010] p-5">\n        <div className="flex items-end justify-between gap-4">\n          <div>\n            <MicroLabel tone="gold">Calendar trace</MicroLabel>\n            <h2 className="mt-2 text-2xl font-black uppercase tracking-[-0.06em] text-white">Every day from 6 May.</h2>\n          </div>\n          <p className="max-w-sm text-right text-xs font-bold uppercase tracking-[0.14em] text-[#8A8A8A]">A day is missing until every active participant has a log for that challenge date.</p>\n        </div>\n        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">\n          {trackedDays.map((day: any) => (\n            <div key={day.dayNumber} className={classNames("border p-3", day.missing > 0 ? "border-[#5C1F1A] bg-[#180F0F]" : "border-[#2A2A2A] bg-black")}>\n              <MicroLabel tone={day.missing > 0 ? "red" : "green"}>Day {day.dayNumber} · {day.label}</MicroLabel>\n              <p className="mt-2 text-xl font-black uppercase text-white">{day.completed}/{participants.length || 1}</p>\n              <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#999]">{day.missing > 0 ? `${day.missing} unlogged` : "tracked"}</p>\n            </div>\n          ))}\n        </div>\n      </section>'
);

writeFileSync(homePath, home);
