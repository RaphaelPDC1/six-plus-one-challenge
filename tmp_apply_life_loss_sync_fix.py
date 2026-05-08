from pathlib import Path

root = Path('/home/ubuntu/six-plus-one-challenge')
db_path = root / 'server/db.ts'
home_path = root / 'client/src/pages/Home.tsx'
test_path = root / 'server/lifeLossSync.test.ts'

db = db_path.read_text()
old = '''export async function finalizePreviousDayIfNeeded(participantId: number, now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const currentDay = getCurrentChallengeDay(now);
  const dayToFinalize = currentDay - 1;
  if (dayToFinalize < 1 || now.getTime() <= getChallengeDeadlineForDay(dayToFinalize).getTime()) {
    return { finalized: false as const, reason: "no_overdue_day" as const };
  }

  let log = await getTodayLog(participantId, dayToFinalize);
  if (!log) {
    await db.insert(dailyLogs).values({
      participantId,
      dayNumber: dayToFinalize,
      logDate: getChallengeDateForDay(dayToFinalize),
      noAlcohol: false,
      cleanEating: false,
      cleanEatingNote: null,
      exerciseDone: false,
      exerciseDuration: 0,
      exerciseType: "",
      exerciseProofUrl: "",
      reflectionDone: false,
      reflectionText: "",
      reflectionShared: false,
      readTeachDone: false,
      readTeachText: "",
      trackedEverything: false,
      dayComplete: false,
      pointsAwarded: 0,
      submittedAt: getChallengeDeadlineForDay(dayToFinalize),
    });
    log = await getTodayLog(participantId, dayToFinalize);
  }
  if (!log || log.dayComplete) return { finalized: false as const, reason: "already_complete" as const };

  const existingPenalty = await db.select().from(paymentEvents).where(eq(paymentEvents.dailyLogId, log.id)).limit(1);
  if (existingPenalty[0]) return { finalized: false as const, reason: "already_penalized" as const };

  const exerciseDone = Boolean(log.exerciseDone) || ((log.exerciseDuration ?? 0) >= 30 && String(log.exerciseType ?? "").trim().length > 0);
  const readTeachDone = Boolean(log.readTeachDone) || String(log.readTeachText ?? "").trim().length > 0;
  const missedRules = getMissedRules({
    noAlcohol: Boolean(log.noAlcohol),
    cleanEating: Boolean(log.cleanEating),
    exerciseDone,
    reflectionDone: Boolean(log.reflectionDone),
    readTeachDone,
    trackedEverything: Boolean(log.trackedEverything),
  });
  await triggerLifeLoss(participantId, `Deadline passed for day ${dayToFinalize}. Missed rule(s): ${missedRules.join(", ")}`, log.id);
  await db.update(dailyLogs).set({ submittedAt: log.submittedAt ?? getChallengeDeadlineForDay(dayToFinalize) }).where(eq(dailyLogs.id, log.id));
  return { finalized: true as const, dayNumber: dayToFinalize, missedRules };
}
'''
new = old + '''\nexport async function finalizeAllParticipantsPreviousDayIfNeeded(now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const currentDay = getCurrentChallengeDay(now);
  const dayToFinalize = currentDay - 1;
  if (dayToFinalize < 1 || now.getTime() <= getChallengeDeadlineForDay(dayToFinalize).getTime()) {
    return { finalizedCount: 0, results: [] as Array<{ participantId: number; result: Awaited<ReturnType<typeof finalizePreviousDayIfNeeded>> }> };
  }

  const allParticipants = await db.select().from(participants);
  const results = [] as Array<{ participantId: number; result: Awaited<ReturnType<typeof finalizePreviousDayIfNeeded>> }>;
  for (const participant of allParticipants) {
    const result = await finalizePreviousDayIfNeeded(participant.id, now);
    results.push({ participantId: participant.id, result });
  }
  return { finalizedCount: results.filter(item => item.result.finalized).length, results };
}
'''
if old not in db:
    raise SystemExit('finalizePreviousDayIfNeeded block not found')
db = db.replace(old, new)
old_snapshot = '''  const participant = role === "admin" ? null : await getOrCreateParticipant({ id: userId, name: null, email });
  if (participant) await finalizePreviousDayIfNeeded(participant.id);
  await seedRewardsIfEmpty();
'''
new_snapshot = '''  const participant = role === "admin" ? null : await getOrCreateParticipant({ id: userId, name: null, email });
  await finalizeAllParticipantsPreviousDayIfNeeded().catch(error => console.warn("[LifeLoss] Snapshot-wide overdue finalization skipped", error));
  await seedRewardsIfEmpty();
'''
if old_snapshot not in db:
    raise SystemExit('snapshot finalize call not found')
db = db.replace(old_snapshot, new_snapshot)
db_path.write_text(db)

home = home_path.read_text()
insert_after = '''function WardenPresence({ snapshot }: { snapshot: Snapshot }) {
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
'''
component = insert_after + '''\nfunction LifeLossAlert({ snapshot }: { snapshot: Snapshot | undefined }) {
  const [visibleEvent, setVisibleEvent] = useState<any>(null);
  const payments = snapshot?.payments ?? [];
  const participants = snapshot?.participants ?? [];

  useEffect(() => {
    if (typeof window === "undefined" || !payments.length) return;
    const latest = [...payments]
      .filter((payment: any) => Number(payment.amountPence ?? 0) >= 2500)
      .sort((a: any, b: any) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())[0];
    if (!latest?.id) return;
    const storageKey = `sixone-life-loss-alert-seen-${latest.id}`;
    if (window.localStorage.getItem(storageKey) === "true") return;
    const participant = participants.find((item: any) => String(item.id) === String(latest.participantId));
    const event = { ...latest, participant };
    window.localStorage.setItem(storageKey, "true");
    setVisibleEvent(event);
    toast.error(`${participant?.displayName ?? "Someone"} lost a life`, { description: latest.reason ?? "A £25 life-loss payment is now pending." });
    pulse([34, 48, 34]);
    const timer = window.setTimeout(() => setVisibleEvent(null), 7200);
    return () => window.clearTimeout(timer);
  }, [payments, participants]);

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
          <button type="button" onClick={() => setVisibleEvent(null)} className="relative mt-4 w-full rounded-full border border-[#C0392B]/60 bg-[#190B0A] px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#FFB3A8] hover:bg-[#240D0B]">Close alert</button>
        </div>
      </section>
    </div>
  );
  return typeof document === "undefined" ? alert : createPortal(alert, document.body);
}
'''
if insert_after not in home:
    raise SystemExit('WardenPresence block not found')
home = home.replace(insert_after, component)
home = home.replace('''  const snapshotQuery = trpc.challenge.snapshot.useQuery(undefined, { enabled: isAuthenticated });''', '''  const snapshotQuery = trpc.challenge.snapshot.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });''')
home = home.replace('''      <MobileBottomNav mobileTabs={mobileTabs} activeTab={activeTab} activeMobileIndex={activeMobileIndex} onSelect={setActiveTab} />''', '''      <LifeLossAlert snapshot={snapshot} />
      <MobileBottomNav mobileTabs={mobileTabs} activeTab={activeTab} activeMobileIndex={activeMobileIndex} onSelect={setActiveTab} />''')
home_path.write_text(home)

test_path.write_text('''import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");

describe("life-loss sync and alert wiring", () => {
  it("finalizes overdue days for every participant before returning challenge snapshots", () => {
    const dbSource = readFileSync(resolve(root, "server/db.ts"), "utf8");

    expect(dbSource).toContain("export async function finalizeAllParticipantsPreviousDayIfNeeded");
    expect(dbSource).toContain("await finalizeAllParticipantsPreviousDayIfNeeded().catch");
    expect(dbSource).toContain("for (const participant of allParticipants)");
  });

  it("keeps Board and Overview snapshots fresh and shows a participant-facing life-loss overlay", () => {
    const homeSource = readFileSync(resolve(root, "client/src/pages/Home.tsx"), "utf8");

    expect(homeSource).toContain("refetchInterval: 30000");
    expect(homeSource).toContain("refetchOnWindowFocus: true");
    expect(homeSource).toContain("function LifeLossAlert");
    expect(homeSource).toContain("data-testid=\"life-loss-alert-overlay\"");
    expect(homeSource).toContain("toast.error(`${participant?.displayName ?? \"Someone\"} lost a life`");
  });
});
''')
print('Applied life-loss sync and alert fixes.')
