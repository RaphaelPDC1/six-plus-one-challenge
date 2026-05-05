from pathlib import Path

root = Path('/home/ubuntu/six-plus-one-challenge')

# --- Schema: signup_requests table ---
schema_path = root / 'drizzle/schema.ts'
schema = schema_path.read_text()
if 'export const signupRequests' not in schema:
    schema = schema.replace('export const participants = mysqlTable("participants", {', '''export const signupRequests = mysqlTable("signup_requests", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  source: varchar("source", { length: 120 }).default("landing").notNull(),
  approvedByUserId: int("approvedByUserId"),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const participants = mysqlTable("participants", {''')
    schema = schema.replace('export type Participant = typeof participants.$inferSelect;', 'export type SignupRequest = typeof signupRequests.$inferSelect;\nexport type Participant = typeof participants.$inferSelect;')
schema_path.write_text(schema)

# --- DB helpers ---
db_path = root / 'server/db.ts'
db = db_path.read_text()
if 'signupRequests,' not in db:
    db = db.replace('rewardCatalogue,\n  users,', 'rewardCatalogue,\n  signupRequests,\n  users,')
if 'normalizeSignupEmail' not in db:
    insert_after = '''export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}
'''
    addition = '''export function normalizeSignupEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function createSignupRequest(email: string, source = "landing") {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const normalizedEmail = normalizeSignupEmail(email);
  const existing = await db.select().from(signupRequests).where(eq(signupRequests.email, normalizedEmail)).limit(1);
  if (existing[0]) return existing[0];
  await db.insert(signupRequests).values({ email: normalizedEmail, source, status: "pending" });
  const created = await db.select().from(signupRequests).where(eq(signupRequests.email, normalizedEmail)).limit(1);
  return created[0];
}

export async function listSignupRequests() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select().from(signupRequests).orderBy(desc(signupRequests.createdAt)).limit(200);
}

export async function approveSignupRequest(requestId: number, founderUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(signupRequests).set({ status: "approved", approvedByUserId: founderUserId, approvedAt: new Date() }).where(eq(signupRequests.id, requestId));
  return true;
}

export async function rejectSignupRequest(requestId: number, founderUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(signupRequests).set({ status: "rejected", approvedByUserId: founderUserId, approvedAt: new Date() }).where(eq(signupRequests.id, requestId));
  return true;
}

'''
    db = db.replace(insert_after, insert_after + '\n' + addition)
if 'export async function getAppSnapshot(userId: number, role: "admin" | "user" = "user")' not in db:
    db = db.replace('export async function getAppSnapshot(userId: number) {', 'export async function getAppSnapshot(userId: number, role: "admin" | "user" = "user") {')
    db = db.replace('const [allParticipants, allLogs, rewards, payments, redemptions, warden, chat] = await Promise.all([', 'const [allParticipants, allLogs, rewards, payments, redemptions, warden, chat, accessRequests] = await Promise.all([')
    db = db.replace('    db.select().from(whatsappChatHistory).orderBy(desc(whatsappChatHistory.createdAt)).limit(50),\n  ]);', '    db.select().from(whatsappChatHistory).orderBy(desc(whatsappChatHistory.createdAt)).limit(50),\n    role === "admin" ? listSignupRequests() : Promise.resolve([]),\n  ]);')
    db = db.replace('    chatHistory: chat,\n  };', '    chatHistory: chat,\n    signupRequests: accessRequests,\n  };')
db_path.write_text(db)

# --- Router procedures ---
router_path = root / 'server/routers.ts'
router = router_path.read_text()
if 'approveSignupRequest,' not in router:
    router = router.replace('import {\n  captureWhatsAppMessage,', 'import {\n  approveSignupRequest,\n  captureWhatsAppMessage,')
    router = router.replace('  createRedemption,', '  createRedemption,\n  createSignupRequest,')
    router = router.replace('  markRedemptionFulfilled,', '  markRedemptionFulfilled,\n  rejectSignupRequest,')
if 'const signupRequestInput' not in router:
    router = router.replace('const dayLogInput = z.object({', 'const signupRequestInput = z.object({\n  email: z.string().trim().email().max(320),\n  source: z.string().max(120).optional().default("landing"),\n});\n\nconst dayLogInput = z.object({')
if 'signup: router({' not in router:
    router = router.replace('  auth: router({\n    me: publicProcedure.query(opts => opts.ctx.user),\n    logout: publicProcedure.mutation(({ ctx }) => {', '  auth: router({\n    me: publicProcedure.query(opts => opts.ctx.user),\n    logout: publicProcedure.mutation(({ ctx }) => {')
    marker = '''  }),

  challenge: router({'''
    signup_router = '''  }),

  signup: router({
    requestAccess: publicProcedure.input(signupRequestInput).mutation(async ({ input }) => {
      const request = await createSignupRequest(input.email, input.source);
      return { success: true, request } as const;
    }),
  }),

  challenge: router({'''
    router = router.replace(marker, signup_router, 1)
if 'getAppSnapshot(ctx.user.id, ctx.user.role)' not in router:
    router = router.replace('return getAppSnapshot(ctx.user.id);', 'return getAppSnapshot(ctx.user.id, ctx.user.role);')
if 'approveSignup' not in router:
    router = router.replace('  admin: router({\n    confirmPayment:', '  admin: router({\n    approveSignup: adminProcedure.input(z.object({ requestId: z.number().int() })).mutation(async ({ ctx, input }) => {\n      await approveSignupRequest(input.requestId, ctx.user.id);\n      return { success: true } as const;\n    }),\n\n    rejectSignup: adminProcedure.input(z.object({ requestId: z.number().int() })).mutation(async ({ ctx, input }) => {\n      await rejectSignupRequest(input.requestId, ctx.user.id);\n      return { success: true } as const;\n    }),\n\n    confirmPayment:')
router_path.write_text(router)

# --- Home imports and haptic upgrade scaffold ---
home_path = root / 'client/src/pages/Home.tsx'
home = home_path.read_text()
if 'import { haptics } from "@/lib/haptics";' not in home:
    home = home.replace('import { clampLives, getDailyLogProgress } from "@/lib/challengeUi";', 'import { clampLives, getDailyLogProgress } from "@/lib/challengeUi";\nimport { haptics } from "@/lib/haptics";')
if 'function AnimatedLoadPage' not in home:
    home = home.replace('function pulse(pattern: number | number[] = 18) {\n  if (typeof navigator !== "undefined" && "vibrate" in navigator) {\n    navigator.vibrate(pattern);\n  }\n}\n', 'function pulse(pattern: number | number[] = 18) {\n  haptics.tap();\n  if (Array.isArray(pattern) || pattern !== 18) {\n    hapticFallback(pattern);\n  }\n}\n\nfunction hapticFallback(pattern: number | number[] = 18) {\n  if (typeof navigator !== "undefined" && "vibrate" in navigator) {\n    navigator.vibrate(pattern);\n  }\n}\n\nfunction AnimatedLoadPage({ label = "Loading the challenge" }: { label?: string }) {\n  return (\n    <div className="poster-grid animated-load-page grid min-h-screen place-items-center overflow-hidden bg-black text-white">\n      <div className="load-mark" aria-hidden="true">6+1</div>\n      <div className="load-lines" aria-hidden="true" />\n      <div className="relative z-10 border border-[#191919] bg-black/62 px-6 py-5 text-center backdrop-blur-sm">\n        <p className="poster-label text-[#211832]">Four Lives Challenge</p>\n        <p className="mt-3 text-xs font-black uppercase tracking-[0.28em] text-[#C8A96E]">{label}</p>\n      </div>\n    </div>\n  );\n}\n')
# Replace loading screen
home = home.replace('if (loading) return <div className="poster-grid grid min-h-screen place-items-center bg-[#0D0D0D] text-sm font-black uppercase tracking-[0.24em] text-[#C8A96E]">Loading the challenge...</div>;', 'if (loading) return <AnimatedLoadPage label="Loading the challenge" />;')
home_path.write_text(home)

# --- CSS animation primitives ---
css_path = root / 'client/src/index.css'
css = css_path.read_text()
if '.animated-load-page' not in css:
    css += '''

.animated-load-page {
  position: relative;
  isolation: isolate;
}

.animated-load-page::before {
  content: "";
  position: absolute;
  inset: -15%;
  background: radial-gradient(circle at 42% 44%, rgba(33, 24, 50, 0.42), transparent 34%), #000;
  animation: load-breathe 2400ms ease-in-out infinite;
  z-index: -2;
}

.load-mark {
  position: absolute;
  left: 24%;
  top: 18%;
  font-size: clamp(9rem, 27vw, 24rem);
  line-height: 0.8;
  font-weight: 950;
  letter-spacing: -0.18em;
  color: rgba(28, 20, 44, 0.66);
  text-shadow: 0 0 46px rgba(70, 36, 115, 0.18);
  animation: load-mark-drift 2800ms cubic-bezier(0.16, 1, 0.3, 1) infinite alternate;
  user-select: none;
}

.load-lines {
  position: absolute;
  left: 56%;
  right: 0;
  top: 21%;
  bottom: 26%;
  opacity: 0.25;
  background: repeating-linear-gradient(0deg, rgba(14, 16, 20, 0.95) 0 9px, rgba(42, 34, 62, 0.9) 10px 14px, transparent 15px 26px);
  mask-image: linear-gradient(90deg, transparent, #000 16%, #000 88%, transparent);
  animation: scan-lines 1600ms linear infinite;
}

@keyframes load-breathe {
  0%, 100% { transform: scale(1); opacity: 0.82; }
  50% { transform: scale(1.04); opacity: 1; }
}

@keyframes load-mark-drift {
  from { transform: translate3d(-1.5%, 1%, 0) scale(0.99); opacity: 0.52; }
  to { transform: translate3d(1%, -1%, 0) scale(1.015); opacity: 0.8; }
}

@keyframes scan-lines {
  from { transform: translateY(-18px); }
  to { transform: translateY(18px); }
}

@media (prefers-reduced-motion: reduce) {
  .animated-load-page::before,
  .load-mark,
  .load-lines,
  .animate-gold-pop,
  .animate-danger-drain,
  .type-caret {
    animation: none !important;
  }
}
'''
css_path.write_text(css)
