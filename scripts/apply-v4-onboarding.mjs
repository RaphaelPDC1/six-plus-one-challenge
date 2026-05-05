import fs from 'node:fs';
import path from 'node:path';

const root = '/home/ubuntu/six-plus-one-challenge';
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const write = (rel, text) => fs.writeFileSync(path.join(root, rel), text);

let schema = read('drizzle/schema.ts');
schema = schema.replace(
`  source: varchar("source", { length: 120 }).default("landing").notNull(),
  approvedByUserId: int("approvedByUserId"),`,
`  source: varchar("source", { length: 120 }).default("landing").notNull(),
  displayName: varchar("displayName", { length: 140 }),
  primaryGoal: varchar("primaryGoal", { length: 220 }),
  biggestObstacle: text("biggestObstacle"),
  trainingLevel: varchar("trainingLevel", { length: 80 }),
  motivationStyle: varchar("motivationStyle", { length: 80 }),
  profilePhotoUrl: text("profilePhotoUrl"),
  profilePhotoKey: text("profilePhotoKey"),
  approvedByUserId: int("approvedByUserId"),`
);
schema = schema.replace(
`  monzoPaymentLink: text("monzoPaymentLink"),
  currentStreak: int("currentStreak").default(0).notNull(),`,
`  monzoPaymentLink: text("monzoPaymentLink"),
  profilePhotoUrl: text("profilePhotoUrl"),
  profilePhotoKey: text("profilePhotoKey"),
  primaryGoal: varchar("primaryGoal", { length: 220 }),
  biggestObstacle: text("biggestObstacle"),
  trainingLevel: varchar("trainingLevel", { length: 80 }),
  motivationStyle: varchar("motivationStyle", { length: 80 }),
  onboardingCompleted: boolean("onboardingCompleted").default(false).notNull(),
  currentStreak: int("currentStreak").default(0).notNull(),`
);
write('drizzle/schema.ts', schema);

let db = read('server/db.ts');
db = db.replace(`import { ENV } from "./_core/env";`, `import { ENV } from "./_core/env";\nimport { storagePut } from "./storage";`);
db = db.replace(
`export async function createSignupRequest(email: string, source = "landing") {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const normalizedEmail = normalizeSignupEmail(email);
  const existing = await db.select().from(signupRequests).where(eq(signupRequests.email, normalizedEmail)).limit(1);
  if (existing[0]) return existing[0];
  await db.insert(signupRequests).values({ email: normalizedEmail, source, status: "pending" });
  const created = await db.select().from(signupRequests).where(eq(signupRequests.email, normalizedEmail)).limit(1);
  return created[0];
}
`,
`export async function createSignupRequest(email: string, source = "landing") {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const normalizedEmail = normalizeSignupEmail(email);
  const existing = await db.select().from(signupRequests).where(eq(signupRequests.email, normalizedEmail)).limit(1);
  if (existing[0]) return existing[0];
  await db.insert(signupRequests).values({ email: normalizedEmail, source, status: "pending" });
  const created = await db.select().from(signupRequests).where(eq(signupRequests.email, normalizedEmail)).limit(1);
  return created[0];
}

export type OnboardingInput = {
  displayName: string;
  primaryGoal: string;
  biggestObstacle: string;
  trainingLevel: string;
  motivationStyle: string;
  profilePhotoDataUrl?: string;
};

export function parseProfilePhotoDataUrl(dataUrl?: string) {
  if (!dataUrl) return null;
  const match = dataUrl.match(/^data:(image\\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error("Profile photo must be a PNG, JPG, or WEBP image.");
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.byteLength > 2_000_000) throw new Error("Profile photo must be smaller than 2MB.");
  const extension = match[1] === "image/png" ? "png" : match[1] === "image/webp" ? "webp" : "jpg";
  return { mimeType: match[1], buffer, extension };
}

export async function getOnboardingState(user: { id: number; email: string | null; role: "admin" | "user" }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const participant = await getParticipantByUserId(user.id);
  if (participant) return { status: "ready" as const, reason: "participant_exists" as const, participant };
  if (user.role === "admin") return { status: "ready" as const, reason: "admin" as const, participant: null };
  const normalizedEmail = user.email ? normalizeSignupEmail(user.email) : "";
  if (!normalizedEmail) return { status: "questionnaire_required" as const, reason: "missing_email" as const, participant: null };
  const request = (await db.select().from(signupRequests).where(eq(signupRequests.email, normalizedEmail)).limit(1))[0];
  if (request?.status === "approved") return { status: "ready" as const, reason: "approved_email" as const, participant: null };
  return { status: "questionnaire_required" as const, reason: request?.status === "rejected" ? "email_rejected" as const : "email_not_recognized" as const, participant: null };
}

export async function completeOnboarding(user: { id: number; name: string | null; email: string | null }, input: OnboardingInput) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const displayName = input.displayName.trim();
  const normalizedEmail = user.email ? normalizeSignupEmail(user.email) : null;
  const photo = parseProfilePhotoDataUrl(input.profilePhotoDataUrl);
  const uploaded = photo
    ? await storagePut(
        \\`profile-photos/user-\\${user.id}-\\${Date.now()}.\\${photo.extension}\\`,
        photo.buffer,
        photo.mimeType,
      )
    : null;
  const values = {
    displayName,
    avatarInitials: initials(displayName),
    primaryGoal: input.primaryGoal.trim(),
    biggestObstacle: input.biggestObstacle.trim(),
    trainingLevel: input.trainingLevel,
    motivationStyle: input.motivationStyle,
    profilePhotoUrl: uploaded?.url ?? null,
    profilePhotoKey: uploaded?.key ?? null,
    onboardingCompleted: true,
    monzoPaymentLink: DEFAULT_MONZO_PAYMENT_LINK,
  };
  const existingParticipant = await getParticipantByUserId(user.id);
  if (existingParticipant) {
    await db.update(participants).set(values).where(eq(participants.id, existingParticipant.id));
  } else {
    await db.insert(participants).values({ userId: user.id, ...values });
  }
  if (normalizedEmail) {
    const existingRequest = await db.select().from(signupRequests).where(eq(signupRequests.email, normalizedEmail)).limit(1);
    const requestValues = {
      source: "onboarding-questionnaire",
      displayName,
      primaryGoal: input.primaryGoal.trim(),
      biggestObstacle: input.biggestObstacle.trim(),
      trainingLevel: input.trainingLevel,
      motivationStyle: input.motivationStyle,
      profilePhotoUrl: uploaded?.url ?? null,
      profilePhotoKey: uploaded?.key ?? null,
    };
    if (existingRequest[0]) {
      await db.update(signupRequests).set(requestValues).where(eq(signupRequests.email, normalizedEmail));
    } else {
      await db.insert(signupRequests).values({ email: normalizedEmail, status: "pending", ...requestValues });
    }
  }
  return getParticipantByUserId(user.id);
}
`
);
db = db.replace(
`  await db.insert(participants).values({
    userId: user.id,
    displayName: user.name || user.email || \`Participant \${user.id}\`,
    avatarInitials: initials(user.name || user.email),
    monzoPaymentLink: DEFAULT_MONZO_PAYMENT_LINK,
  });`,
`  await db.insert(participants).values({
    userId: user.id,
    displayName: user.name || user.email || \`Participant \${user.id}\`,
    avatarInitials: initials(user.name || user.email),
    monzoPaymentLink: DEFAULT_MONZO_PAYMENT_LINK,
    onboardingCompleted: true,
  });`
);
db = db.replace(
`export async function updateParticipantProfile(userId: number, input: { displayName: string; whatsappName?: string; monzoPaymentLink?: string }) {`,
`export async function updateParticipantProfile(userId: number, input: { displayName: string; whatsappName?: string; monzoPaymentLink?: string; primaryGoal?: string; biggestObstacle?: string; trainingLevel?: string; motivationStyle?: string }) {`
);
db = db.replace(
`    monzoPaymentLink: input.monzoPaymentLink || DEFAULT_MONZO_PAYMENT_LINK,
  }).where(eq(participants.id, participant.id));`,
`    monzoPaymentLink: input.monzoPaymentLink || DEFAULT_MONZO_PAYMENT_LINK,
    primaryGoal: input.primaryGoal || participant.primaryGoal || null,
    biggestObstacle: input.biggestObstacle || participant.biggestObstacle || null,
    trainingLevel: input.trainingLevel || participant.trainingLevel || null,
    motivationStyle: input.motivationStyle || participant.motivationStyle || null,
    onboardingCompleted: true,
  }).where(eq(participants.id, participant.id));`
);
db = db.replace(
`  const participant = await getOrCreateParticipant({ id: userId, name: null, email: null });
  await seedRewardsIfEmpty();`,
`  const onboarding = await getOnboardingState({ id: userId, email: null, role });
  if (onboarding.status !== "ready") {
    return {
      accessState: onboarding,
      challenge: { currentDay: getCurrentChallengeDay(), totalDays: 50, monzoPaymentLink: DEFAULT_MONZO_PAYMENT_LINK },
      participant: null,
      myLog: null,
      participants: [],
      logs: [],
      rewards: [],
      payments: [],
      redemptions: [],
      wardenMessages: [],
      chatHistory: [],
      signupRequests: [],
    };
  }
  const participant = await getOrCreateParticipant({ id: userId, name: null, email: null });
  await seedRewardsIfEmpty();`
);
db = db.replace(`    challenge: { currentDay: getCurrentChallengeDay(), totalDays: 50, monzoPaymentLink: DEFAULT_MONZO_PAYMENT_LINK },`, `    accessState: { status: "ready" as const, reason: onboarding.reason },\n    challenge: { currentDay: getCurrentChallengeDay(), totalDays: 50, monzoPaymentLink: DEFAULT_MONZO_PAYMENT_LINK },`);
write('server/db.ts', db);

let routers = read('server/routers.ts');
routers = routers.replace(`  createSignupRequest,`, `  completeOnboarding,\n  createSignupRequest,`);
routers = routers.replace(
`        monzoPaymentLink: z.string().max(2000).optional().default(""),
      }))`,
`        monzoPaymentLink: z.string().max(2000).optional().default(""),
        primaryGoal: z.string().max(220).optional().default(""),
        biggestObstacle: z.string().max(2000).optional().default(""),
        trainingLevel: z.string().max(80).optional().default(""),
        motivationStyle: z.string().max(80).optional().default(""),
      }))`
);
routers = routers.replace(
`      .mutation(async ({ ctx, input }) => {
        return updateParticipantProfile(ctx.user.id, input);
      }),

    submitMyDay: protectedProcedure.input(dayLogInput).mutation(async ({ ctx, input }) => {`,
`      .mutation(async ({ ctx, input }) => {
        return updateParticipantProfile(ctx.user.id, input);
      }),

    completeOnboarding: protectedProcedure
      .input(z.object({
        displayName: z.string().trim().min(2).max(140),
        primaryGoal: z.string().trim().min(3).max(220),
        biggestObstacle: z.string().trim().min(3).max(2000),
        trainingLevel: z.enum(["starting", "building", "consistent", "advanced"]),
        motivationStyle: z.enum(["direct", "supportive", "competitive", "quiet"]),
        profilePhotoDataUrl: z.string().max(3_000_000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const participant = await completeOnboarding(ctx.user, input);
        await logWardenMessage({ mode: "on_ramp", sourceEvent: "onboarding_complete", content: \\`\\${participant?.displayName ?? ctx.user.email ?? "A new participant"} completed the entry questionnaire and joined the 6+1 gate.\\` });
        return { success: true, participant } as const;
      }),

    submitMyDay: protectedProcedure.input(dayLogInput).mutation(async ({ ctx, input }) => {`
);
write('server/routers.ts', routers);

let home = read('client/src/pages/Home.tsx');
home = home.replace(`  Crown,`, `  Camera,\n  Crown,`);
home = home.replace(
`function SignupAccessForm() {`,
`function LogoMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={classNames("grid shrink-0 place-items-center border-2 border-[#C8A96E] bg-black font-black leading-none text-[#C8A96E] shadow-[0_0_28px_rgba(200,169,110,0.22)]", compact ? "h-11 w-11 text-sm" : "h-14 w-14 text-lg")}>6+1</div>
  );
}

function ProfilePhoto({ participant, className = "h-11 w-11" }: { participant: any; className?: string }) {
  if (participant?.profilePhotoUrl) {
    return <img src={participant.profilePhotoUrl} alt={\\`\\${participant.displayName ?? "Participant"} profile\\`} className={classNames(className, "border border-[#C8A96E] object-cover")} />;
  }
  return <span className={classNames("grid place-items-center border border-[#C8A96E] text-xs font-black text-[#C8A96E]", className)}>{participant?.avatarInitials ?? "?"}</span>;
}

function SignupAccessForm() {`
);
home = home.replace(
`        <nav className="flex items-center justify-between border-b border-[#2A2A2A] pb-5">
          <div>
            <MicroLabel tone="gold">6+1 Four Lives</MicroLabel>
            <p className="mt-2 text-sm font-black uppercase tracking-[0.22em] text-white">50 days. 4 lives. No hiding.</p>
          </div>`,
`        <nav className="flex items-center justify-between gap-4 border-b border-[#2A2A2A] pb-5">
          <div className="flex items-center gap-3">
            <LogoMark />
            <div>
              <MicroLabel tone="gold">6+1 Four Lives</MicroLabel>
              <p className="mt-2 text-sm font-black uppercase tracking-[0.22em] text-white">50 days. 4 lives. No hiding.</p>
            </div>
          </div>`
);
home = home.replace(
`                <span className="grid h-12 w-12 place-items-center border border-[#C8A96E] text-sm font-black text-[#C8A96E]">{p.avatarInitials}</span>`,
`                <ProfilePhoto participant={p} className="h-12 w-12" />`
);
home = home.replace(
`                  <span className="grid h-11 w-11 place-items-center border border-[#C8A96E] text-xs font-black text-[#C8A96E]">{owner?.avatarInitials ?? "?"}</span>`,
`                  <ProfilePhoto participant={owner} className="h-11 w-11" />`
);
home = home.replace(
`function AdminPanel({ snapshot, refetch }: { snapshot: Snapshot; refetch: () => void }) {`,
`function OnboardingGate({ user, refetch }: { user: any; refetch: () => void }) {
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
    if (!file.type.match(/^image\\/(png|jpeg|webp)$/)) { toast.error("Use a PNG, JPG, or WEBP profile photo."); return; }
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

function AdminPanel({ snapshot, refetch }: { snapshot: Snapshot; refetch: () => void }) {`
);
home = home.replace(
`                  <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#777]">{request.source} · {new Date(request.createdAt).toLocaleString()}</p>`,
`                  <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#777]">{request.source} · {new Date(request.createdAt).toLocaleString()}</p>
                  {request.displayName && <p className="mt-3 text-sm font-black uppercase text-[#C8A96E]">{request.displayName}</p>}
                  {request.primaryGoal && <p className="mt-2 text-sm font-bold text-[#D8D8D8]">Goal: {request.primaryGoal}</p>}
                  {request.biggestObstacle && <p className="mt-2 text-xs font-bold leading-5 text-[#999]">Obstacle: {request.biggestObstacle}</p>}
                  {(request.trainingLevel || request.motivationStyle) && <p className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#777]">{request.trainingLevel} · {request.motivationStyle}</p>}`
);
home = home.replace(
`  if (!isAuthenticated) return <Landing />;

  const visibleTabs = tabs.filter(tab => tab.key !== "admin" || user?.role === "admin");`,
`  if (!isAuthenticated) return <Landing />;
  if (snapshot?.accessState?.status === "questionnaire_required") return <OnboardingGate user={user} refetch={snapshotQuery.refetch} />;

  const visibleTabs = tabs.filter(tab => tab.key !== "admin" || user?.role === "admin");`
);
home = home.replace(
`            <div className="grid h-11 w-11 place-items-center border border-[#C8A96E] font-black text-[#C8A96E]">6+1</div>`,
`            <LogoMark compact />`
);
write('client/src/pages/Home.tsx', home);

let test = read('server/challengeRouterFlow.test.ts');
test = test.replace(`  createSignupRequest: vi.fn(),`, `  completeOnboarding: vi.fn(),\n  createSignupRequest: vi.fn(),`);
test = test.replace(
`  it("routes founder signup approval and rejection through admin helpers", async () => {`,
`  it("routes personalized onboarding through the completion helper", async () => {
    dbMocks.completeOnboarding.mockResolvedValue({ id: 9, displayName: "New Person", profilePhotoUrl: "/manus-storage/profile.jpg" });
    dbMocks.logWardenMessage.mockResolvedValue({ created: true });

    const caller = appRouter.createCaller(createParticipantContext());
    const result = await caller.challenge.completeOnboarding({
      displayName: "New Person",
      primaryGoal: "Build discipline",
      biggestObstacle: "Weekend drift",
      trainingLevel: "building",
      motivationStyle: "direct",
      profilePhotoDataUrl: "data:image/png;base64,aGVsbG8=",
    });

    expect(result.success).toBe(true);
    expect(dbMocks.completeOnboarding).toHaveBeenCalledWith(expect.objectContaining({ email: "participant@example.com" }), expect.objectContaining({ primaryGoal: "Build discipline" }));
    expect(dbMocks.logWardenMessage).toHaveBeenCalledWith(expect.objectContaining({ sourceEvent: "onboarding_complete" }));
  });

  it("rejects onboarding profile photos that are not supported data URLs before persistence", async () => {
    const caller = appRouter.createCaller(createParticipantContext());

    await expect(caller.challenge.completeOnboarding({
      displayName: "New Person",
      primaryGoal: "Build discipline",
      biggestObstacle: "Weekend drift",
      trainingLevel: "building",
      motivationStyle: "direct",
      profilePhotoDataUrl: "data:text/plain;base64,aGVsbG8=",
    })).rejects.toThrow();
    expect(dbMocks.completeOnboarding).not.toHaveBeenCalled();
  });

  it("routes founder signup approval and rejection through admin helpers", async () => {`
);
write('server/challengeRouterFlow.test.ts', test);
