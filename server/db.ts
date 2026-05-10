import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  boostWins,
  dailyLogs,
  type DailyLog,
  type Participant,
  type BoostWin,
  InsertUser,
  type InsertBoostWin,
  participants,
  paymentEvents,
  proofComments,
  participantNotifications,
  proofReactions,
  pushSubscriptions,
  notificationPreferences,
  redemptionRequests,
  releaseNoteAcknowledgements,
  releaseNotes,
  rewardCatalogue,
  signupRequests,
  users,
  wardenMessages,
  whatsappChatHistory,
} from "../drizzle/schema";
import { applyLifeLoss, calculateDailyPoints, canEarnGhostLife, canSendWardenMessage, getMissedRules, isDayComplete } from "./challengeLogic";
import { ENV } from "./_core/env";
import { storagePut } from "./storage";
import { BOOST_CHALLENGE_ID, evaluateBoostWinners, getActiveBoostsForDay } from "../shared/boostSystem";

let _db: ReturnType<typeof drizzle> | null = null;

export const CHALLENGE_START_DATE = "2026-05-06";
export const CHALLENGE_TIME_ZONE = "Europe/London";
export const DEFAULT_MONZO_PAYMENT_LINK = "https://monzo.me/6plus1challenge/25";

const REQUESTED_REWARD_CATALOGUE = [
  { name: "Puresport Mystery Item", description: "A founder-approved Puresport mystery reward for reaching the first redemption tier.", pointsCost: 150, category: "Puresport" },
  { name: "6plus1 T-Shirt", description: "A 6plus1 challenge T-shirt unlocked through consistent completed days.", pointsCost: 300, category: "6plus1" },
  { name: "Group Meal Unlocked", description: "A group meal reward unlocked for the highest consistency tier.", pointsCost: 500, category: "6plus1" },
] as const;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  (["name", "email", "loginMethod"] as const).forEach(field => {
    if (user[field] !== undefined) {
      const normalized = user[field] ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    }
  });

  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, normalizeSignupEmail(email))).limit(1);
  return result[0];
}

export type RegistrationPersonalizationInput = {
  primaryGoal: string;
  biggestObstacle: string;
  trainingLevel: string;
  motivationStyle?: string;
  supportNeeded: string;
};

export async function createSiteNativeUser(input: { email: string; displayName: string; mode?: "register" | "login"; profilePhotoDataUrl?: string; personalization?: RegistrationPersonalizationInput }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const email = normalizeSignupEmail(input.email);
  const displayName = input.displayName.trim() || email;
  const mode = input.mode ?? "register";
  const openId = `site-native:${email}`;
  const existingSiteUser = await getUserByOpenId(openId);

  if (existingSiteUser) {
    await upsertUser({
      openId,
      name: existingSiteUser.name || displayName,
      email,
      loginMethod: "site-native",
      role: "user",
      lastSignedIn: new Date(),
    });
    const refreshed = await getUserByOpenId(openId);
    return { ...(refreshed ?? existingSiteUser), loginMethod: "site-native" };
  }

  const existingEmailUser = await getUserByEmail(email);
  if (existingEmailUser) {
    throw new Error("That email is already attached to a protected founder/admin account. Use Founder Login or register with a different email.");
  }

  if (mode === "login") {
    throw new Error("No challenger account exists for that email yet. Choose Register first to create one.");
  }

  await upsertUser({
    openId,
    name: displayName,
    email,
    loginMethod: "site-native",
    role: "user",
    lastSignedIn: new Date(),
  });
  const user = await getUserByOpenId(openId);
  if (!user) throw new Error("Could not create participant session");
  if (input.personalization) {
    const photo = parseProfilePhotoDataUrl(input.profilePhotoDataUrl);
    const uploaded = photo
      ? await storagePut(
          `profile-photos/user-${user.id}-${Date.now()}.${photo.extension}`,
          photo.buffer,
          photo.mimeType,
        )
      : null;
    const personalization = {
      primaryGoal: input.personalization.primaryGoal.trim(),
      biggestObstacle: input.personalization.biggestObstacle.trim(),
      trainingLevel: input.personalization.trainingLevel,
      motivationStyle: input.personalization.motivationStyle || "adaptive",
      supportNeeded: input.personalization.supportNeeded.trim(),
    };
    await db.insert(participants).values({
      userId: user.id,
      displayName,
      avatarInitials: initials(displayName),
      monzoPaymentLink: DEFAULT_MONZO_PAYMENT_LINK,
      onboardingCompleted: true,
      profilePhotoUrl: uploaded?.url ?? null,
      profilePhotoKey: uploaded?.key ?? null,
      ...personalization,
    });
    const existingRequest = await db.select().from(signupRequests).where(eq(signupRequests.email, email)).limit(1);
    const requestValues = {
      status: "approved" as const,
      source: "site-registration",
      displayName,
      profilePhotoUrl: uploaded?.url ?? null,
      profilePhotoKey: uploaded?.key ?? null,
      ...personalization,
    };
    if (existingRequest[0]) {
      await db.update(signupRequests).set(requestValues).where(eq(signupRequests.email, email));
    } else {
      await db.insert(signupRequests).values({ email, ...requestValues });
    }
  }
  return { ...user, loginMethod: "site-native" };
}

export function normalizeSignupEmail(email: string) {
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

export type OnboardingInput = {
  displayName: string;
  primaryGoal: string;
  biggestObstacle: string;
  trainingLevel: string;
  motivationStyle?: string;
  supportNeeded?: string;
  profilePhotoDataUrl?: string;
};

export function parseProfilePhotoDataUrl(dataUrl?: string) {
  if (!dataUrl) return null;
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error("Profile photo must be a PNG, JPG, or WEBP image.");
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.byteLength > 2_000_000) throw new Error("Profile photo must be smaller than 2MB.");
  const extension = match[1] === "image/png" ? "png" : match[1] === "image/webp" ? "webp" : "jpg";
  return { mimeType: match[1], buffer, extension };
}

export async function getOnboardingState(user: { id: number; email: string | null; role: "admin" | "user" }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (user.role === "admin") return { status: "ready" as const, reason: "admin" as const, participant: null };
  const participant = await getParticipantByUserId(user.id);
  if (participant) return { status: "ready" as const, reason: "participant_exists" as const, participant };
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
        `profile-photos/user-${user.id}-${Date.now()}.${photo.extension}`,
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
    motivationStyle: input.motivationStyle || "adaptive",
    supportNeeded: input.supportNeeded?.trim() || null,
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
      motivationStyle: input.motivationStyle || "adaptive",
      supportNeeded: input.supportNeeded?.trim() || null,
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


function initials(name?: string | null) {
  const safe = name?.trim() || "Mover";
  return safe
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? "")
    .join("") || "M";
}

const DAY_MS = 86_400_000;

function parseIsoDateParts(dateIso: string) {
  const [year, month, day] = dateIso.split("-").map(Number);
  return { year, month, day };
}

function getIsoDateOffset(dateIso: string, days: number) {
  const { year, month, day } = parseIsoDateParts(dateIso);
  return new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0, 0)).toISOString().slice(0, 10);
}

function localDateOrdinal(dateIso: string) {
  const { year, month, day } = parseIsoDateParts(dateIso);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
}

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

function getZonedDateIso(date: Date, timeZone = CHALLENGE_TIME_ZONE) {
  const parts = getZonedParts(date, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function getTimeZoneOffsetMs(date: Date, timeZone = CHALLENGE_TIME_ZONE) {
  const parts = getZonedParts(date, timeZone);
  const zonedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, date.getUTCMilliseconds());
  return zonedAsUtc - date.getTime();
}

function zonedLocalTimeToUtc(input: { year: number; month: number; day: number; hour?: number; minute?: number; second?: number; millisecond?: number }, timeZone = CHALLENGE_TIME_ZONE) {
  const localAsUtc = Date.UTC(input.year, input.month - 1, input.day, input.hour ?? 0, input.minute ?? 0, input.second ?? 0, input.millisecond ?? 0);
  const firstPass = new Date(localAsUtc - getTimeZoneOffsetMs(new Date(localAsUtc), timeZone));
  const corrected = new Date(localAsUtc - getTimeZoneOffsetMs(firstPass, timeZone));
  return corrected;
}

function getChallengeDateIsoOffset(dayNumber: number) {
  const safeDay = Math.min(50, Math.max(1, Math.trunc(dayNumber)));
  return getIsoDateOffset(CHALLENGE_START_DATE, safeDay - 1);
}

export function getChallengeDateForDay(dayNumber: number) {
  const dateIso = getChallengeDateIsoOffset(dayNumber);
  const { year, month, day } = parseIsoDateParts(dateIso);
  return zonedLocalTimeToUtc({ year, month, day });
}

export function getChallengeDateIsoForDay(dayNumber: number) {
  return getChallengeDateIsoOffset(dayNumber);
}

export function getChallengeDeadlineForDay(dayNumber: number) {
  const nextDateIso = getChallengeDateIsoOffset(dayNumber + 1);
  const { year, month, day } = parseIsoDateParts(nextDateIso);
  return new Date(zonedLocalTimeToUtc({ year, month, day }).getTime() - 1);
}

export function getCurrentChallengeDay(now = new Date()) {
  const localTodayIso = getZonedDateIso(now);
  const diff = localDateOrdinal(localTodayIso) - localDateOrdinal(CHALLENGE_START_DATE) + 1;
  return Math.min(50, Math.max(1, diff));
}

export function getChallengeCalendar(now = new Date()) {
  const currentDay = getCurrentChallengeDay(now);
  return Array.from({ length: currentDay }, (_, index) => {
    const dayNumber = index + 1;
    const dateIso = getChallengeDateIsoForDay(dayNumber);
    const date = getChallengeDateForDay(dayNumber);
    return {
      dayNumber,
      dateIso,
      label: date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: CHALLENGE_TIME_ZONE }),
      isToday: dayNumber === currentDay,
    };
  });
}

export async function getOrCreateParticipant(user: { id: number; name: string | null; email: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existing = await db.select().from(participants).where(eq(participants.userId, user.id)).limit(1);
  if (existing[0]) return existing[0];

  await db.insert(participants).values({
    userId: user.id,
    displayName: user.name || user.email || `Participant ${user.id}`,
    avatarInitials: initials(user.name || user.email),
    monzoPaymentLink: DEFAULT_MONZO_PAYMENT_LINK,
    onboardingCompleted: true,
  });

  const created = await db.select().from(participants).where(eq(participants.userId, user.id)).limit(1);
  return created[0];
}

export async function getParticipantByUserId(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const participant = await db.select().from(participants).where(eq(participants.userId, userId)).limit(1);
  return participant[0];
}

export async function updateParticipantProfile(userId: number, input: { displayName: string; whatsappName?: string; monzoPaymentLink?: string; primaryGoal?: string; biggestObstacle?: string; trainingLevel?: string; motivationStyle?: string; supportNeeded?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const participant = await getOrCreateParticipant({ id: userId, name: input.displayName, email: null });
  await db.update(participants).set({
    displayName: input.displayName,
    avatarInitials: initials(input.displayName),
    whatsappName: input.whatsappName || null,
    monzoPaymentLink: input.monzoPaymentLink || DEFAULT_MONZO_PAYMENT_LINK,
    primaryGoal: input.primaryGoal || participant.primaryGoal || null,
    biggestObstacle: input.biggestObstacle || participant.biggestObstacle || null,
    trainingLevel: input.trainingLevel || participant.trainingLevel || null,
    motivationStyle: input.motivationStyle || participant.motivationStyle || "adaptive",
    supportNeeded: input.supportNeeded || participant.supportNeeded || null,
    onboardingCompleted: true,
  }).where(eq(participants.id, participant.id));
  return getParticipantByUserId(userId);
}

export async function getTodayLog(participantId: number, dayNumber = getCurrentChallengeDay()) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select().from(dailyLogs).where(and(eq(dailyLogs.participantId, participantId), eq(dailyLogs.dayNumber, dayNumber))).limit(1);
  return rows[0];
}

const PROOF_REACTION_TYPES = ["fire", "strong", "inspired", "accountable"] as const;
type ProofReactionType = (typeof PROOF_REACTION_TYPES)[number];

async function assertVisibleProofLog(dailyLogId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const log = (await db.select().from(dailyLogs).where(eq(dailyLogs.id, dailyLogId)).limit(1))[0];
  if (!log) throw new Error("Proof post not found");
  if (!String(log.exerciseProofUrl ?? "").trim() && !String(log.readTeachText ?? "").trim()) {
    throw new Error("This log is not visible on the proof page yet.");
  }
  return log;
}

export async function getProofSocialForLogs(logIds: number[], viewerParticipantId?: number | null) {
  const db = await getDb();
  if (!db || logIds.length === 0) return { reactionsByLog: {}, commentsByLog: {} };
  const uniqueIds = Array.from(new Set(logIds.filter(id => Number.isFinite(id))));
  if (uniqueIds.length === 0) return { reactionsByLog: {}, commentsByLog: {} };
  const [reactionRows, commentRows, participantRows] = await Promise.all([
    db.select().from(proofReactions).where(inArray(proofReactions.dailyLogId, uniqueIds)),
    db.select().from(proofComments).where(inArray(proofComments.dailyLogId, uniqueIds)).orderBy(desc(proofComments.createdAt)),
    db.select().from(participants),
  ]);
  const participantById = new Map(participantRows.map(row => [row.id, row]));
  const reactionsByLog: Record<number, { counts: Record<ProofReactionType, number>; viewerReaction: ProofReactionType | null; total: number }> = {};
  const commentsByLog: Record<number, Array<{ id: number; dailyLogId: number; participantId: number; participantName: string; participantInitials: string; comment: string; createdAt: Date }>> = {};
  for (const id of uniqueIds) {
    reactionsByLog[id] = { counts: { fire: 0, strong: 0, inspired: 0, accountable: 0 }, viewerReaction: null, total: 0 };
    commentsByLog[id] = [];
  }
  for (const reaction of reactionRows) {
    const type = PROOF_REACTION_TYPES.includes(reaction.reaction as ProofReactionType) ? reaction.reaction as ProofReactionType : "fire";
    const bucket = reactionsByLog[reaction.dailyLogId] ?? { counts: { fire: 0, strong: 0, inspired: 0, accountable: 0 }, viewerReaction: null, total: 0 };
    bucket.counts[type] += 1;
    bucket.total += 1;
    if (viewerParticipantId && reaction.participantId === viewerParticipantId) bucket.viewerReaction = type;
    reactionsByLog[reaction.dailyLogId] = bucket;
  }
  for (const comment of commentRows) {
    const author = participantById.get(comment.participantId);
    commentsByLog[comment.dailyLogId] = commentsByLog[comment.dailyLogId] ?? [];
    commentsByLog[comment.dailyLogId].push({
      id: comment.id,
      dailyLogId: comment.dailyLogId,
      participantId: comment.participantId,
      participantName: author?.displayName ?? author?.whatsappName ?? "Participant",
      participantInitials: author?.avatarInitials ?? "6+",
      comment: comment.comment,
      createdAt: comment.createdAt,
    });
  }
  return { reactionsByLog, commentsByLog };
}

export async function toggleProofReaction(participantId: number, input: { dailyLogId: number; reaction: ProofReactionType }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (!PROOF_REACTION_TYPES.includes(input.reaction)) throw new Error("Unsupported reaction type");
  await assertVisibleProofLog(input.dailyLogId);
  const existing = (await db.select().from(proofReactions).where(and(eq(proofReactions.dailyLogId, input.dailyLogId), eq(proofReactions.participantId, participantId))).limit(1))[0];
  if (existing?.reaction === input.reaction) {
    await db.delete(proofReactions).where(eq(proofReactions.id, existing.id));
    return { active: false as const, reaction: null };
  }
  if (existing) {
    await db.update(proofReactions).set({ reaction: input.reaction }).where(eq(proofReactions.id, existing.id));
  } else {
    await db.insert(proofReactions).values({ dailyLogId: input.dailyLogId, participantId, reaction: input.reaction });
  }
  return { active: true as const, reaction: input.reaction };
}

export async function addProofComment(participantId: number, input: { dailyLogId: number; comment: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await assertVisibleProofLog(input.dailyLogId);
  const comment = input.comment.trim().replace(/\s+/g, " ");
  if (comment.length < 2) throw new Error("Comment must include at least two characters.");
  if (comment.length > 500) throw new Error("Comment must be 500 characters or fewer.");
  await db.insert(proofComments).values({ dailyLogId: input.dailyLogId, participantId, comment });
  const rows = await db.select().from(proofComments).where(and(eq(proofComments.dailyLogId, input.dailyLogId), eq(proofComments.participantId, participantId))).orderBy(desc(proofComments.createdAt)).limit(1);
  return rows[0];
}

export function resolveDailyCompletionAward(existing: Pick<DailyLog, "dayComplete" | "pointsAwarded" | "submittedAt"> | undefined, input: {
  complete: boolean;
  dayNumber: number;
  submittedAt: Date;
  deadlinePassed: boolean;
  completedRules?: number;
  ghostLifeUsed?: boolean;
  currentStreak?: number;
}) {
  const alreadyComplete = Boolean(existing?.dayComplete);
  const dayComplete = alreadyComplete || input.complete;
  const newlyComplete = input.complete && !alreadyComplete;
  const pointsAwarded = alreadyComplete ? (existing?.pointsAwarded ?? 0) : input.complete ? calculateDailyPoints(input.dayNumber, true, { completedRules: input.completedRules, submittedAt: input.submittedAt, ghostLifeUsed: input.ghostLifeUsed, currentStreak: input.currentStreak }) : 0;
  const submittedAt = alreadyComplete ? (existing?.submittedAt ?? input.submittedAt) : input.deadlinePassed || input.complete ? input.submittedAt : null;

  return {
    alreadyComplete,
    dayComplete,
    newlyComplete,
    pointsAwarded,
    submittedAt,
    draftSaved: !dayComplete && !input.deadlinePassed,
  } as const;
}

export type SubmitDailyLogInput = {
  dayNumber: number;
  noAlcohol: boolean;
  cleanEating: boolean;
  cleanEatingNote?: string;
  exerciseDuration: number;
  exerciseType: string;
  exerciseProofUrl: string;
  reflectionText: string;
  reflectionShared: boolean;
  readTeachText: string;
  trackedEverything: boolean;
};

function preferExistingWhenInputIsBlank(inputValue: string | undefined | null, existingValue: string | undefined | null) {
  const inputText = String(inputValue ?? "").trim();
  const existingText = String(existingValue ?? "").trim();
  return inputText.length > 0 ? String(inputValue ?? "") : existingText;
}

function resolveProofInputValue(inputValue: string | undefined | null, existingValue: string | undefined | null) {
  const inputText = String(inputValue ?? "").trim();
  if (inputText === "[]") return "";
  return preferExistingWhenInputIsBlank(inputValue, existingValue);
}

export function mergeDailyLogInputWithoutWipingExistingWork(existing: DailyLog | undefined, input: SubmitDailyLogInput): SubmitDailyLogInput {
  if (!existing) return input;
  const existingExerciseComplete = Boolean(existing.exerciseDone) || ((existing.exerciseDuration ?? 0) >= 30 && String(existing.exerciseType ?? "").trim().length > 0);
  const inputExerciseComplete = input.exerciseDuration >= 30 && input.exerciseType.trim().length > 0;

  return {
    ...input,
    noAlcohol: Boolean(existing.noAlcohol) || input.noAlcohol,
    cleanEating: Boolean(existing.cleanEating) || input.cleanEating,
    cleanEatingNote: preferExistingWhenInputIsBlank(input.cleanEatingNote, existing.cleanEatingNote),
    exerciseDuration: existingExerciseComplete && !inputExerciseComplete ? Math.max(existing.exerciseDuration ?? 0, input.exerciseDuration) : input.exerciseDuration,
    exerciseType: existingExerciseComplete && !inputExerciseComplete ? String(existing.exerciseType ?? "") : preferExistingWhenInputIsBlank(input.exerciseType, existing.exerciseType),
    exerciseProofUrl: resolveProofInputValue(input.exerciseProofUrl, existing.exerciseProofUrl),
    reflectionText: Boolean(existing.reflectionDone) && input.reflectionText.trim().length === 0 ? String(existing.reflectionText ?? "") : preferExistingWhenInputIsBlank(input.reflectionText, existing.reflectionText),
    reflectionShared: Boolean(existing.reflectionShared) || input.reflectionShared,
    readTeachText: Boolean(existing.readTeachDone) && input.readTeachText.trim().length === 0 ? String(existing.readTeachText ?? "") : preferExistingWhenInputIsBlank(input.readTeachText, existing.readTeachText),
    trackedEverything: Boolean(existing.trackedEverything) || input.trackedEverything,
  };
}

export async function submitDailyLog(participantId: number, input: SubmitDailyLogInput) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const submittedAt = new Date();
  const currentChallengeDay = getCurrentChallengeDay(submittedAt);
  if (input.dayNumber > currentChallengeDay) {
    throw new Error(`Day ${input.dayNumber} is not open yet. The challenge is currently on day ${currentChallengeDay}.`);
  }
  const existing = await getTodayLog(participantId, input.dayNumber);
  const protectedInput = mergeDailyLogInputWithoutWipingExistingWork(existing, input);
  const logDate = getChallengeDateForDay(protectedInput.dayNumber);
  const deadline = getChallengeDeadlineForDay(protectedInput.dayNumber);
  const deadlinePassed = submittedAt.getTime() > deadline.getTime();
  const exerciseDone = protectedInput.exerciseDuration >= 30 && protectedInput.exerciseType.trim().length > 0;
  const reflectionDone = protectedInput.reflectionText.trim().length > 0;
  const readTeachDone = protectedInput.readTeachText.trim().length > 0;
  const cleanEatingDone = protectedInput.cleanEating && String(protectedInput.cleanEatingNote ?? "").trim().length >= 10;
  const complete = isDayComplete({
    noAlcohol: protectedInput.noAlcohol,
    cleanEating: cleanEatingDone,
    exerciseDone,
    reflectionDone,
    readTeachDone,
    trackedEverything: protectedInput.trackedEverything,
    submittedAt: deadlinePassed ? submittedAt : undefined,
    deadline,
  });
  const participantRows = await db.select().from(participants).where(eq(participants.id, participantId)).limit(1);
  const currentParticipant = participantRows[0];
  const completedRules = [protectedInput.noAlcohol, cleanEatingDone, exerciseDone, reflectionDone, readTeachDone, protectedInput.trackedEverything].filter(Boolean).length;
  const awardState = resolveDailyCompletionAward(existing, { complete, dayNumber: protectedInput.dayNumber, submittedAt, deadlinePassed, completedRules, ghostLifeUsed: Boolean(currentParticipant?.ghostLifeUsed), currentStreak: currentParticipant?.currentStreak ?? 0 });
  const values = {
    participantId,
    dayNumber: protectedInput.dayNumber,
    logDate,
    noAlcohol: protectedInput.noAlcohol,
    cleanEating: cleanEatingDone,
    cleanEatingNote: protectedInput.cleanEatingNote || null,
    exerciseDone,
    exerciseDuration: protectedInput.exerciseDuration,
    exerciseType: protectedInput.exerciseType,
    exerciseProofUrl: protectedInput.exerciseProofUrl,
    reflectionDone,
    reflectionText: protectedInput.reflectionText,
    reflectionShared: protectedInput.reflectionShared,
    readTeachDone,
    readTeachText: protectedInput.readTeachText,
    trackedEverything: protectedInput.trackedEverything,
    dayComplete: awardState.dayComplete,
    pointsAwarded: awardState.pointsAwarded,
    submittedAt: awardState.submittedAt,
  };

  if (existing) {
    await db.update(dailyLogs).set(values).where(eq(dailyLogs.id, existing.id));
  } else {
    await db.insert(dailyLogs).values(values);
  }

  if (awardState.newlyComplete) {
    const current = currentParticipant;
    const newStreak = (current?.currentStreak ?? 0) + 1;
    await db.update(participants).set({
      currentStreak: newStreak,
      longestStreak: Math.max(current?.longestStreak ?? 0, newStreak),
      totalPoints: (current?.totalPoints ?? 0) + awardState.pointsAwarded,
      daysComplete: (current?.daysComplete ?? 0) + 1,
    }).where(eq(participants.id, participantId));
  }

  const missedRules = getMissedRules({
    noAlcohol: protectedInput.noAlcohol,
    cleanEating: cleanEatingDone,
    exerciseDone,
    reflectionDone,
    readTeachDone,
    trackedEverything: protectedInput.trackedEverything,
  });

  return { complete: awardState.dayComplete, pointsAwarded: awardState.pointsAwarded, missedRules, deadlinePassed, draftSaved: awardState.draftSaved, log: await getTodayLog(participantId, protectedInput.dayNumber) };
}

export async function recordNayBackdatedTechnicalProof(participantId: number, input: { dayNumber?: number; proofMedia: string; note?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const participant = (await db.select().from(participants).where(eq(participants.id, participantId)).limit(1))[0];
  if (!participant) throw new Error("Participant not found");
  const participantName = `${participant.displayName ?? ""} ${participant.whatsappName ?? ""}`.toLowerCase();
  if (!participantName.includes("nay")) {
    throw new Error("This backdated technical upload is only available for Nay.");
  }

  const dayNumber = input.dayNumber ?? 2;
  const existing = await getTodayLog(participantId, dayNumber);
  const deadline = getChallengeDeadlineForDay(dayNumber);
  const completedRules = 6;
  const pointsAwarded = existing?.pointsAwarded && existing.pointsAwarded > 0
    ? existing.pointsAwarded
    : calculateDailyPoints(dayNumber, true, { completedRules, submittedAt: deadline, ghostLifeUsed: Boolean(participant.ghostLifeUsed), currentStreak: Math.max(0, (participant.currentStreak ?? 0) - 1) });
  const proofMedia = String(input.proofMedia ?? "").trim();
  const technicalNote = String(input.note ?? "Backdated proof accepted after the Day 2 upload technical issue.").trim();
  const values = {
    participantId,
    dayNumber,
    logDate: getChallengeDateForDay(dayNumber),
    noAlcohol: true,
    cleanEating: true,
    cleanEatingNote: existing?.cleanEatingNote || "Backdated technical correction: clean eating confirmed for the day.",
    exerciseDone: true,
    exerciseDuration: Math.max(30, existing?.exerciseDuration ?? 0),
    exerciseType: existing?.exerciseType || "Backdated technical proof upload",
    exerciseProofUrl: proofMedia || existing?.exerciseProofUrl || "Backdated technical proof accepted by exception.",
    reflectionDone: true,
    reflectionText: existing?.reflectionText || technicalNote,
    reflectionShared: Boolean(existing?.reflectionShared),
    readTeachDone: true,
    readTeachText: existing?.readTeachText || technicalNote,
    trackedEverything: true,
    dayComplete: true,
    pointsAwarded,
    submittedAt: deadline,
  };

  if (existing) {
    await db.update(dailyLogs).set(values).where(eq(dailyLogs.id, existing.id));
  } else {
    await db.insert(dailyLogs).values(values);
  }

  const lifeRows = await db.select().from(paymentEvents).where(and(eq(paymentEvents.participantId, participantId), eq(paymentEvents.status, "pending"))).limit(8);
  for (const payment of lifeRows) {
    const reason = String(payment.reason ?? "").toLowerCase();
    if (reason.includes("day 2") || reason.includes("technical") || reason.includes("proof")) {
      await db.update(paymentEvents).set({ status: "waived", confirmedAt: new Date() }).where(eq(paymentEvents.id, payment.id));
    }
  }

  if (!existing?.dayComplete) {
    await db.update(participants).set({
      livesRemaining: Math.min(4, Math.max(0, participant.livesRemaining ?? 0) + 1),
      totalPoints: (participant.totalPoints ?? 0) + pointsAwarded,
      daysComplete: (participant.daysComplete ?? 0) + 1,
    }).where(eq(participants.id, participantId));
  }

  await logWardenMessage({
    mode: "system",
    sourceEvent: "nay_life_restored_technical_issue",
    content: "Nay has had one life restored because her Day 2 proof upload was affected by a technical issue. Her backdated proof window is now available and the related payment request is waived.",
  });

  return { success: true as const, dayNumber, log: await getTodayLog(participantId, dayNumber) };
}

export async function triggerLifeLoss(participantId: number, reason: string, dailyLogId?: number | null) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const row = (await db.select().from(participants).where(eq(participants.id, participantId)).limit(1))[0];
  if (!row) throw new Error("Participant not found");
  const newLives = applyLifeLoss(row.livesRemaining);
  await db.update(participants).set({ livesRemaining: newLives, currentStreak: 0 }).where(eq(participants.id, participantId));
  await db.insert(paymentEvents).values({
    participantId,
    dailyLogId: dailyLogId ?? null,
    amountPence: 2500,
    paymentLink: row.monzoPaymentLink || DEFAULT_MONZO_PAYMENT_LINK,
    reason,
    status: "pending",
  });
  await db.insert(wardenMessages).values({
    mode: "surveillance",
    sourceEvent: "life_lost",
    postedToWhatsapp: false,
    content: `${row.displayName} has lost a life. £25 Monzo payment request: ${row.monzoPaymentLink || DEFAULT_MONZO_PAYMENT_LINK}`,
  });
  return { livesRemaining: newLives };
}

export async function finalizePreviousDayIfNeeded(participantId: number, now = new Date()) {
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
  const cleanEatingDone = Boolean(log.cleanEating) && String(log.cleanEatingNote ?? "").trim().length >= 10;
  const missedRules = getMissedRules({
    noAlcohol: Boolean(log.noAlcohol),
    cleanEating: cleanEatingDone,
    exerciseDone,
    reflectionDone: Boolean(log.reflectionDone),
    readTeachDone,
    trackedEverything: Boolean(log.trackedEverything),
  });
  await triggerLifeLoss(participantId, `Deadline passed for day ${dayToFinalize}. Missed rule(s): ${missedRules.join(", ")}`, log.id);
  await db.update(dailyLogs).set({ submittedAt: log.submittedAt ?? getChallengeDeadlineForDay(dayToFinalize) }).where(eq(dailyLogs.id, log.id));
  return { finalized: true as const, dayNumber: dayToFinalize, missedRules };
}

export async function finalizeAllParticipantsPreviousDayIfNeeded(now = new Date()) {
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

export async function tryApplyGhostLife(participantId: number, exerciseDuration: number, insightCount: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const participant = (await db.select().from(participants).where(eq(participants.id, participantId)).limit(1))[0];
  if (!participant) throw new Error("Participant not found");
  if (participant.ghostLifeUsed || participant.livesRemaining >= 4) {
    return { applied: false, livesRemaining: participant.livesRemaining };
  }
  const livesRemaining = Math.min(4, participant.livesRemaining + 1);
  await db.update(participants).set({ ghostLifeUsed: true, livesRemaining }).where(eq(participants.id, participantId));
  return { applied: true, livesRemaining };
}

export async function getBoostWinsForChallenge(challengeId = BOOST_CHALLENGE_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select().from(boostWins).where(eq(boostWins.challengeId, challengeId)).orderBy(desc(boostWins.awardedAt));
}

export async function getBoostWinsForParticipant(challengeId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select().from(boostWins).where(and(eq(boostWins.challengeId, challengeId), eq(boostWins.userId, userId))).orderBy(desc(boostWins.awardedAt));
}

type BoostWinScoreRow = Pick<BoostWin, "challengeId" | "userId" | "day" | "boostId" | "pointsAwarded">;
type ParticipantScoreRow = Participant & { baseTotalPoints?: number; boostPoints?: number; canonicalTotalPoints?: number };

export function buildBoostPointTotals(boostRows: BoostWinScoreRow[], challengeId = BOOST_CHALLENGE_ID) {
  const totals = new Map<number, number>();
  const seen = new Set<string>();
  for (const win of boostRows ?? []) {
    if (Number(win.challengeId ?? challengeId) !== Number(challengeId)) continue;
    const participantId = Number(win.userId);
    if (!Number.isFinite(participantId)) continue;
    const key = `${Number(win.challengeId ?? challengeId)}:${participantId}:${Number(win.day ?? 0)}:${String(win.boostId ?? "")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    totals.set(participantId, (totals.get(participantId) ?? 0) + Number(win.pointsAwarded ?? 0));
  }
  return totals;
}

export function applyCanonicalParticipantScores<T extends Participant>(participantRows: T[], boostRows: BoostWinScoreRow[], challengeId = BOOST_CHALLENGE_ID): Array<T & ParticipantScoreRow> {
  const boostTotals = buildBoostPointTotals(boostRows, challengeId);
  return participantRows.map(participantRow => {
    const baseTotalPoints = Number(participantRow.totalPoints ?? 0);
    const boostPoints = boostTotals.get(Number(participantRow.id)) ?? 0;
    return {
      ...participantRow,
      baseTotalPoints,
      boostPoints,
      canonicalTotalPoints: baseTotalPoints + boostPoints,
      totalPoints: baseTotalPoints + boostPoints,
    };
  });
}

function isDuplicateBoostInsertError(error: unknown) {
  const candidate = error as { code?: string; errno?: number; message?: string };
  return candidate?.code === "ER_DUP_ENTRY" || candidate?.errno === 1062 || String(candidate?.message ?? "").toLowerCase().includes("duplicate");
}

export async function awardBoostWin(input: InsertBoostWin) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const challengeId = Number(input.challengeId ?? BOOST_CHALLENGE_ID);
  const day = Number(input.day ?? getCurrentChallengeDay());
  const pointsAwarded = Number(input.pointsAwarded ?? 5);
  const existing = await db.select().from(boostWins).where(and(
    eq(boostWins.challengeId, challengeId),
    eq(boostWins.userId, Number(input.userId)),
    eq(boostWins.day, day),
    eq(boostWins.boostId, String(input.boostId)),
  )).limit(1);
  if (existing[0]) return { created: false as const, boostWin: existing[0] };
  try {
    await db.insert(boostWins).values({ ...input, challengeId, day, pointsAwarded });
  } catch (error) {
    if (!isDuplicateBoostInsertError(error)) throw error;
  }
  const created = await db.select().from(boostWins).where(and(
    eq(boostWins.challengeId, challengeId),
    eq(boostWins.userId, Number(input.userId)),
    eq(boostWins.day, day),
    eq(boostWins.boostId, String(input.boostId)),
  )).orderBy(desc(boostWins.awardedAt)).limit(1);
  return { created: !existing[0] && Boolean(created[0]), boostWin: created[0] };
}

export async function calculateAndAwardBoostsForDay(day: number, challengeId = BOOST_CHALLENGE_ID) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [rawParticipants, rawLogs, existingWins] = await Promise.all([
    db.select().from(participants),
    db.select().from(dailyLogs),
    db.select().from(boostWins).where(eq(boostWins.challengeId, challengeId)),
  ]);
  const activeBoosts = getActiveBoostsForDay(day);
  const awards = evaluateBoostWinners({ day, participants: rawParticipants, logs: rawLogs, boostWins: existingWins, activeBoosts });
  const results = [];
  for (const award of awards) {
    const result = await awardBoostWin({
      challengeId,
      userId: Number(award.participant.id),
      day,
      boostId: award.boost.id,
      boostName: award.boost.name,
      boostIcon: award.boost.icon,
      pointsAwarded: award.pointsAwarded,
      wardenNote: award.wardenNote,
    });
    results.push(result);
  }
  return { day, activeBoosts, awards: results, createdCount: results.filter(result => result.created).length };
}

const DEFAULT_COMMUNITY_CARE_RELEASE_NOTE = {
  title: "Community care update",
  summary: "Boost scoring, participant history, refresh behaviour, and update notes are now easier to understand.",
  body: "We have separated base daily points from named boosts, added a safer path for viewing participant history, prepared pull-to-refresh for the PWA, and introduced this community-care update space so future changes are explained in-game.",
  versionLabel: "Community Care 1",
  category: "community_care" as const,
};

export async function seedReleaseNotesIfEmpty() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existing = await db.select().from(releaseNotes).limit(1);
  if (existing[0]) return existing[0];
  await db.insert(releaseNotes).values(DEFAULT_COMMUNITY_CARE_RELEASE_NOTE);
  const created = await db.select().from(releaseNotes).orderBy(desc(releaseNotes.publishedAt)).limit(1);
  return created[0] ?? null;
}

export async function getLatestUnacknowledgedReleaseNote(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await seedReleaseNotesIfEmpty();
  const [notes, acknowledgements] = await Promise.all([
    db.select().from(releaseNotes).where(eq(releaseNotes.active, true)).orderBy(desc(releaseNotes.publishedAt)).limit(10),
    db.select().from(releaseNoteAcknowledgements).where(eq(releaseNoteAcknowledgements.userId, userId)),
  ]);
  const acknowledgedIds = new Set(acknowledgements.map(row => row.releaseNoteId));
  return notes.find(note => !acknowledgedIds.has(note.id)) ?? null;
}

export async function acknowledgeReleaseNoteForUser(releaseNoteId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const note = (await db.select().from(releaseNotes).where(eq(releaseNotes.id, releaseNoteId)).limit(1))[0];
  if (!note) throw new Error("Release note not found");
  const existing = await db.select().from(releaseNoteAcknowledgements).where(and(
    eq(releaseNoteAcknowledgements.releaseNoteId, releaseNoteId),
    eq(releaseNoteAcknowledgements.userId, userId),
  )).limit(1);
  if (!existing[0]) {
    await db.insert(releaseNoteAcknowledgements).values({ releaseNoteId, userId });
  }
  return { success: true as const };
}

export async function createCommunityCareReleaseNote(input: { title: string; summary: string; body: string; versionLabel: string; category?: "community_care" | "rules" | "rewards" | "technical"; active?: boolean }, createdByUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const values = {
    title: input.title.trim(),
    summary: input.summary.trim(),
    body: input.body.trim(),
    versionLabel: input.versionLabel.trim(),
    category: input.category ?? "community_care",
    active: input.active ?? true,
    createdByUserId,
  };
  await db.insert(releaseNotes).values(values);
  const created = await db.select().from(releaseNotes).orderBy(desc(releaseNotes.createdAt)).limit(1);
  return created[0];
}

export async function getParticipantHistory(participantId: number, viewerParticipantId: number | null = null) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const participant = (await db.select().from(participants).where(eq(participants.id, participantId)).limit(1))[0];
  if (!participant) throw new Error("Participant not found");
  const logs = await db.select().from(dailyLogs).where(eq(dailyLogs.participantId, participantId)).orderBy(desc(dailyLogs.dayNumber)).limit(80);
  const proofSocial = await getProofSocialForLogs(logs.filter(log => String(log.exerciseProofUrl ?? "").trim() || String(log.readTeachText ?? "").trim()).map(log => log.id), viewerParticipantId);
  return {
    participant,
    logs: logs.map(log => ({
      ...log,
      proofReactions: proofSocial.reactionsByLog[log.id] ?? { counts: { fire: 0, strong: 0, inspired: 0, accountable: 0 }, viewerReaction: null, total: 0 },
      proofComments: proofSocial.commentsByLog[log.id] ?? [],
      reflectionPreview: String(log.reflectionText ?? "").slice(0, 240),
      readTeachPreview: String(log.readTeachText ?? "").slice(0, 240),
    })),
  };
}

export async function getAppSnapshot(userId: number, role: "admin" | "user" = "user", email: string | null = null) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const onboarding = await getOnboardingState({ id: userId, email, role });
  if (onboarding.status !== "ready") {
    return {
      accessState: onboarding,
      challenge: { currentDay: getCurrentChallengeDay(), totalDays: 50, startDate: CHALLENGE_START_DATE, calendar: getChallengeCalendar(), monzoPaymentLink: DEFAULT_MONZO_PAYMENT_LINK },
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
      boostWins: [],
      activeBoosts: getActiveBoostsForDay(getCurrentChallengeDay()),
    };
  }
  const participant = role === "admin" ? null : await getOrCreateParticipant({ id: userId, name: null, email });
  await finalizeAllParticipantsPreviousDayIfNeeded().catch(error => console.warn("[LifeLoss] Snapshot-wide overdue finalization skipped", error));
  await seedRewardsIfEmpty();
  const currentDay = getCurrentChallengeDay();
  if (currentDay > 1) {
    await calculateAndAwardBoostsForDay(currentDay - 1).catch(error => console.warn("[Boosts] Previous-day award calculation skipped", error));
  }
  const [allUsers, rawParticipants, rawLogs, rewards, rawPayments, rawRedemptions, warden, chat, accessRequests, rawBoostWins] = await Promise.all([
    db.select().from(users),
    db.select().from(participants),
    db.select().from(dailyLogs).orderBy(desc(dailyLogs.createdAt)).limit(250),
    db.select().from(rewardCatalogue).where(eq(rewardCatalogue.active, true)),
    db.select().from(paymentEvents).orderBy(desc(paymentEvents.createdAt)).limit(100),
    db.select().from(redemptionRequests).orderBy(desc(redemptionRequests.createdAt)).limit(100),
    db.select().from(wardenMessages).orderBy(desc(wardenMessages.createdAt)).limit(50),
    db.select().from(whatsappChatHistory).orderBy(desc(whatsappChatHistory.createdAt)).limit(50),
    role === "admin" ? listSignupRequests() : Promise.resolve([]),
    db.select().from(boostWins).where(eq(boostWins.challengeId, BOOST_CHALLENGE_ID)).orderBy(desc(boostWins.awardedAt)).limit(250),
  ]);
  const adminUserIds = new Set(allUsers.filter(user => user.role === "admin").map(user => user.id));
  const baseParticipants = rawParticipants.filter(participantRow => !adminUserIds.has(participantRow.userId));
  const allParticipants = applyCanonicalParticipantScores(baseParticipants, rawBoostWins, BOOST_CHALLENGE_ID);
  const participantIds = new Set(allParticipants.map(participantRow => participantRow.id));
  const allLogs = rawLogs.filter(log => participantIds.has(log.participantId));
  const payments = rawPayments.filter(payment => participantIds.has(payment.participantId));
  const redemptions = rawRedemptions.filter(redemption => participantIds.has(redemption.participantId));
  const myLog = participant ? await getTodayLog(participant.id) : null;
  const proofSocial = await getProofSocialForLogs(allLogs.filter(log => String(log.exerciseProofUrl ?? "").trim() || String(log.readTeachText ?? "").trim()).map(log => log.id), participant?.id ?? null);
  const logsWithProofSocial = allLogs.map(log => ({
    ...log,
    proofReactions: proofSocial.reactionsByLog[log.id] ?? { counts: { fire: 0, strong: 0, inspired: 0, accountable: 0 }, viewerReaction: null, total: 0 },
    proofComments: proofSocial.commentsByLog[log.id] ?? [],
  }));
  return {
    accessState: { status: "ready" as const, reason: onboarding.reason },
    challenge: { currentDay, totalDays: 50, startDate: CHALLENGE_START_DATE, calendar: getChallengeCalendar(), monzoPaymentLink: DEFAULT_MONZO_PAYMENT_LINK },
    participant,
    myLog,
    participants: allParticipants,
    logs: logsWithProofSocial,
    rewards,
    payments,
    redemptions,
    wardenMessages: warden,
    chatHistory: chat,
    signupRequests: accessRequests,
    boostWins: rawBoostWins,
    activeBoosts: getActiveBoostsForDay(currentDay),
  };
}

export async function seedRewardsIfEmpty() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existing = await db.select().from(rewardCatalogue);
  const requestedNames = new Set<string>(REQUESTED_REWARD_CATALOGUE.map(reward => reward.name));

  for (const reward of REQUESTED_REWARD_CATALOGUE) {
    const existingReward = existing.find(item => item.name === reward.name);
    if (existingReward) {
      await db.update(rewardCatalogue).set({ ...reward, active: true }).where(eq(rewardCatalogue.id, existingReward.id));
    } else {
      await db.insert(rewardCatalogue).values({ ...reward, active: true });
    }
  }

  for (const reward of existing) {
    if (!requestedNames.has(reward.name) && reward.active) {
      await db.update(rewardCatalogue).set({ active: false }).where(eq(rewardCatalogue.id, reward.id));
    }
  }
}

export async function createRedemption(participantId: number, input: { rewardId: number; deliveryName: string; deliveryAddress: string; checkpointEarned: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const participant = (await db.select().from(participants).where(eq(participants.id, participantId)).limit(1))[0];
  if (!participant) throw new Error("Participant not found");
  const reward = (await db.select().from(rewardCatalogue).where(and(eq(rewardCatalogue.id, input.rewardId), eq(rewardCatalogue.active, true))).limit(1))[0];
  if (!reward) throw new Error("Reward not found");
  const participantBoostWins = await db.select().from(boostWins).where(and(eq(boostWins.challengeId, BOOST_CHALLENGE_ID), eq(boostWins.userId, participantId)));
  const canonicalParticipant = applyCanonicalParticipantScores([participant], participantBoostWins, BOOST_CHALLENGE_ID)[0];
  if ((canonicalParticipant.totalPoints ?? 0) < reward.pointsCost) throw new Error(`You need ${reward.pointsCost} points to redeem ${reward.name}.`);
  await db.insert(redemptionRequests).values({ participantId, ...input, status: "pending" });
  return { success: true as const, reward, participant: canonicalParticipant };
}

export async function markPaymentReceived(paymentId: number, founderUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(paymentEvents).set({ status: "received", confirmedByUserId: founderUserId, confirmedAt: new Date() }).where(eq(paymentEvents.id, paymentId));
  return true;
}

export async function markRedemptionFulfilled(redemptionId: number, founderUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(redemptionRequests).set({ status: "fulfilled", fulfilledByUserId: founderUserId, fulfilledAt: new Date() }).where(eq(redemptionRequests.id, redemptionId));
  return true;
}

export async function captureWhatsAppMessage(input: { senderId: string; senderName?: string; groupId: string; messageText: string; messageTimestamp?: Date }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(whatsappChatHistory).values({
    senderId: input.senderId,
    senderName: input.senderName || null,
    groupId: input.groupId,
    messageText: input.messageText,
    messageTimestamp: input.messageTimestamp || new Date(),
  });
  return true;
}

export async function logWardenMessage(input: { mode: "surveillance" | "commentary" | "on_ramp" | "system"; content: string; sourceEvent?: string; postedToWhatsapp?: boolean }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sentToday = await db.select().from(wardenMessages).where(gte(wardenMessages.createdAt, today));
  if (!canSendWardenMessage(sentToday.length)) {
    return { created: false, reason: "warden_daily_cap_reached" as const };
  }
  await db.insert(wardenMessages).values({ ...input, sourceEvent: input.sourceEvent || null, postedToWhatsapp: input.postedToWhatsapp ?? false });
  return { created: true as const };
}

export type NotificationPreferencePatch = Partial<{
  pushEnabled: boolean;
  inAppEnabled: boolean;
  morningIntent: boolean;
  afternoonProof: boolean;
  eveningDeadline: boolean;
  lifeRisk: boolean;
  streakRewards: boolean;
  wardenUpdates: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  timezone: string;
}>;

export async function getNotificationPreferences(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const existing = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId)).limit(1);
  if (existing[0]) return existing[0];
  const participant = await getParticipantByUserId(userId);
  await db.insert(notificationPreferences).values({ userId, participantId: participant?.id ?? null });
  const created = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId)).limit(1);
  return created[0];
}

export async function updateNotificationPreferences(userId: number, patch: NotificationPreferencePatch) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await getNotificationPreferences(userId);
  await db.update(notificationPreferences).set(patch).where(eq(notificationPreferences.userId, userId));
  return getNotificationPreferences(userId);
}

export async function upsertPushSubscription(input: { userId: number; participantId?: number | null; endpoint: string; endpointHash: string; p256dh: string; auth: string; userAgent?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(pushSubscriptions).values({
    userId: input.userId,
    participantId: input.participantId ?? null,
    endpoint: input.endpoint,
    endpointHash: input.endpointHash,
    p256dh: input.p256dh,
    auth: input.auth,
    userAgent: input.userAgent ?? null,
    enabled: true,
    lastSeenAt: new Date(),
  }).onDuplicateKeyUpdate({ set: {
    userId: input.userId,
    participantId: input.participantId ?? null,
    endpoint: input.endpoint,
    p256dh: input.p256dh,
    auth: input.auth,
    userAgent: input.userAgent ?? null,
    enabled: true,
    lastSeenAt: new Date(),
  } });
  await updateNotificationPreferences(input.userId, { pushEnabled: true });
  const rows = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpointHash, input.endpointHash)).limit(1);
  return rows[0];
}

export async function disablePushSubscription(userId: number, endpointHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(pushSubscriptions).set({ enabled: false }).where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpointHash, endpointHash)));
  const active = await db.select().from(pushSubscriptions).where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.enabled, true))).limit(1);
  if (!active[0]) await updateNotificationPreferences(userId, { pushEnabled: false });
  return { success: true as const };
}

export async function listUserNotifications(userId: number, limit = 30) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select().from(participantNotifications).where(eq(participantNotifications.userId, userId)).orderBy(desc(participantNotifications.createdAt)).limit(limit);
}

export async function markUserNotificationsRead(userId: number, notificationIds?: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const where = notificationIds?.length
    ? and(eq(participantNotifications.userId, userId), inArray(participantNotifications.id, notificationIds))
    : eq(participantNotifications.userId, userId);
  await db.update(participantNotifications).set({ readAt: new Date() }).where(where);
  return { success: true as const };
}

export async function createParticipantNotification(input: { userId: number; participantId?: number | null; type: "morning_intent" | "afternoon_proof" | "evening_deadline" | "life_risk" | "streak_reward" | "warden_update" | "system"; title: string; body: string; actionUrl?: string | null; pushStatus?: "not_attempted" | "sent" | "failed" | "skipped"; lastPushError?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const values = {
    userId: input.userId,
    participantId: input.participantId ?? null,
    type: input.type,
    title: input.title,
    body: input.body,
    actionUrl: input.actionUrl ?? "/",
    pushStatus: input.pushStatus ?? "not_attempted",
    lastPushError: input.lastPushError ?? null,
  } as const;
  await db.insert(participantNotifications).values(values);
  const rows = await db.select().from(participantNotifications).where(eq(participantNotifications.userId, input.userId)).orderBy(desc(participantNotifications.createdAt)).limit(1);
  return rows[0];
}

export async function updateNotificationPushResult(notificationId: number, result: { status: "sent" | "failed" | "skipped"; error?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(participantNotifications).set({
    pushStatus: result.status,
    lastPushError: result.error ?? null,
    pushAttempts: sql`${participantNotifications.pushAttempts} + 1`,
  }).where(eq(participantNotifications.id, notificationId));
}

export async function getEnabledPushSubscriptionsForUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  return db.select().from(pushSubscriptions).where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.enabled, true)));
}

export async function disablePushSubscriptionById(subscriptionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(pushSubscriptions).set({ enabled: false }).where(eq(pushSubscriptions.id, subscriptionId));
}
