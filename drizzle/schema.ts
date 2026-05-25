import {
  boolean,
  date,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const signupRequests = mysqlTable("signup_requests", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  source: varchar("source", { length: 120 }).default("landing").notNull(),
  displayName: varchar("displayName", { length: 140 }),
  primaryGoal: varchar("primaryGoal", { length: 220 }),
  biggestObstacle: text("biggestObstacle"),
  trainingLevel: varchar("trainingLevel", { length: 80 }),
  motivationStyle: varchar("motivationStyle", { length: 80 }),
  supportNeeded: text("supportNeeded"),
  profilePhotoUrl: text("profilePhotoUrl"),
  profilePhotoKey: text("profilePhotoKey"),
  approvedByUserId: int("approvedByUserId"),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const participants = mysqlTable("participants", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  displayName: varchar("displayName", { length: 140 }).notNull(),
  avatarInitials: varchar("avatarInitials", { length: 4 }).notNull(),
  whatsappName: varchar("whatsappName", { length: 140 }),
  monzoPaymentLink: text("monzoPaymentLink"),
  profilePhotoUrl: text("profilePhotoUrl"),
  profilePhotoKey: text("profilePhotoKey"),
  primaryGoal: varchar("primaryGoal", { length: 220 }),
  biggestObstacle: text("biggestObstacle"),
  trainingLevel: varchar("trainingLevel", { length: 80 }),
  motivationStyle: varchar("motivationStyle", { length: 80 }),
  supportNeeded: text("supportNeeded"),
  onboardingCompleted: boolean("onboardingCompleted").default(false).notNull(),
  currentStreak: int("currentStreak").default(0).notNull(),
  longestStreak: int("longestStreak").default(0).notNull(),
  totalPoints: int("totalPoints").default(0).notNull(),
  daysComplete: int("daysComplete").default(0).notNull(),
  livesRemaining: int("livesRemaining").default(4).notNull(),
  ghostLifeUsed: boolean("ghostLifeUsed").default(false).notNull(),
  status: mysqlEnum("status", ["active", "dispute", "withdrawn"]).default("active").notNull(),
  disputeReason: text("disputeReason"),
  disputeStartedAt: timestamp("disputeStartedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const dailyLogs = mysqlTable("daily_logs", {
  id: int("id").autoincrement().primaryKey(),
  participantId: int("participantId").notNull(),
  dayNumber: int("dayNumber").notNull(),
  logDate: date("logDate").notNull(),
  noAlcohol: boolean("noAlcohol").default(false).notNull(),
  cleanEating: boolean("cleanEating").default(false).notNull(),
  cleanEatingNote: text("cleanEatingNote"),
  exerciseDone: boolean("exerciseDone").default(false).notNull(),
  exerciseDuration: int("exerciseDuration").default(0).notNull(),
  exerciseType: varchar("exerciseType", { length: 140 }),
  exerciseProofUrl: text("exerciseProofUrl"),
  reflectionDone: boolean("reflectionDone").default(false).notNull(),
  reflectionText: text("reflectionText"),
  reflectionShared: boolean("reflectionShared").default(false).notNull(),
  readTeachDone: boolean("readTeachDone").default(false).notNull(),
  readTeachText: text("readTeachText"),
  trackedEverything: boolean("trackedEverything").default(false).notNull(),
  dayComplete: boolean("dayComplete").default(false).notNull(),
  pointsAwarded: int("pointsAwarded").default(0).notNull(),
  submittedAt: timestamp("submittedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const proofReactions = mysqlTable("proof_reactions", {
  id: int("id").autoincrement().primaryKey(),
  dailyLogId: int("dailyLogId").notNull(),
  participantId: int("participantId").notNull(),
  reaction: mysqlEnum("reaction", ["fire", "strong", "inspired", "accountable"]).default("fire").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const proofComments = mysqlTable("proof_comments", {
  id: int("id").autoincrement().primaryKey(),
  dailyLogId: int("dailyLogId").notNull(),
  participantId: int("participantId").notNull(),
  comment: text("comment").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const paymentEvents = mysqlTable("payment_events", {
  id: int("id").autoincrement().primaryKey(),
  participantId: int("participantId").notNull(),
  dailyLogId: int("dailyLogId"),
  amountPence: int("amountPence").default(2500).notNull(),
  paymentLink: text("paymentLink"),
  reason: text("reason").notNull(),
  status: mysqlEnum("status", ["pending", "received", "waived"]).default("pending").notNull(),
  confirmedByUserId: int("confirmedByUserId"),
  confirmedAt: timestamp("confirmedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  // Prevent duplicate life-loss penalties for the same daily log
  uniquePenaltyPerLog: uniqueIndex("payment_events_unique_penalty_idx").on(table.participantId, table.dailyLogId),
}));

export const rewardCatalogue = mysqlTable("reward_catalogue", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 180 }).notNull(),
  description: text("description"),
  pointsCost: int("pointsCost").notNull(),
  category: varchar("category", { length: 120 }).default("Pure Sport").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const redemptionRequests = mysqlTable("redemption_requests", {
  id: int("id").autoincrement().primaryKey(),
  participantId: int("participantId").notNull(),
  rewardId: int("rewardId").notNull(),
  deliveryName: varchar("deliveryName", { length: 180 }).notNull(),
  deliveryAddress: text("deliveryAddress").notNull(),
  checkpointEarned: varchar("checkpointEarned", { length: 80 }).notNull(),
  status: mysqlEnum("status", ["pending", "fulfilled", "cancelled"]).default("pending").notNull(),
  fulfilledByUserId: int("fulfilledByUserId"),
  fulfilledAt: timestamp("fulfilledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const whatsappChatHistory = mysqlTable("whatsapp_chat_history", {
  id: int("id").autoincrement().primaryKey(),
  senderId: varchar("senderId", { length: 180 }).notNull(),
  senderName: varchar("senderName", { length: 180 }),
  groupId: varchar("groupId", { length: 180 }).notNull(),
  messageText: text("messageText").notNull(),
  messageTimestamp: timestamp("messageTimestamp").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const wardenMessages = mysqlTable("warden_messages", {
  id: int("id").autoincrement().primaryKey(),
  mode: mysqlEnum("mode", ["surveillance", "commentary", "on_ramp", "system"]).notNull(),
  content: text("content").notNull(),
  sourceEvent: varchar("sourceEvent", { length: 140 }),
  postedToWhatsapp: boolean("postedToWhatsapp").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const boostWins = mysqlTable("boost_wins", {
  id: int("id").autoincrement().primaryKey(),
  challengeId: int("challenge_id").notNull(),
  userId: int("user_id").notNull(),
  day: int("day").notNull(),
  boostId: varchar("boost_id", { length: 64 }).notNull(),
  boostName: varchar("boost_name", { length: 140 }).notNull(),
  boostIcon: varchar("boost_icon", { length: 10 }).notNull(),
  pointsAwarded: int("points_awarded").notNull().default(5),
  awardedAt: timestamp("awarded_at").defaultNow().notNull(),
  wardenNote: text("warden_note"),
}, table => ({
  uniqueBoostWin: uniqueIndex("boost_wins_unique_award_idx").on(table.challengeId, table.userId, table.day, table.boostId),
}));

export const releaseNotes = mysqlTable("release_notes", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 180 }).notNull(),
  summary: text("summary").notNull(),
  body: text("body").notNull(),
  versionLabel: varchar("versionLabel", { length: 80 }).notNull(),
  category: mysqlEnum("category", ["edit", "community_care", "rules", "rewards", "technical"]).default("edit").notNull(),
  active: boolean("active").default(true).notNull(),
  publishedAt: timestamp("publishedAt").defaultNow().notNull(),
  createdByUserId: int("createdByUserId"),
  targetUserId: int("targetUserId"), // null = broadcast to all; set = personalised for one participant
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const releaseNoteAcknowledgements = mysqlTable("release_note_acknowledgements", {
  id: int("id").autoincrement().primaryKey(),
  releaseNoteId: int("releaseNoteId").notNull(),
  userId: int("userId").notNull(),
  acknowledgedAt: timestamp("acknowledgedAt").defaultNow().notNull(),
}, table => ({
  uniqueReleaseNoteAcknowledgement: uniqueIndex("release_note_ack_unique_idx").on(table.releaseNoteId, table.userId),
}));

export const pushSubscriptions = mysqlTable("push_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  participantId: int("participantId"),
  endpoint: text("endpoint").notNull(),
  endpointHash: varchar("endpointHash", { length: 64 }).notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("userAgent"),
  enabled: boolean("enabled").default(true).notNull(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  uniquePushEndpointHash: uniqueIndex("push_subscriptions_endpoint_hash_idx").on(table.endpointHash),
}));

export const notificationPreferences = mysqlTable("notification_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  participantId: int("participantId"),
  pushEnabled: boolean("pushEnabled").default(false).notNull(),
  inAppEnabled: boolean("inAppEnabled").default(true).notNull(),
  morningIntent: boolean("morningIntent").default(true).notNull(),
  afternoonProof: boolean("afternoonProof").default(true).notNull(),
  eveningDeadline: boolean("eveningDeadline").default(true).notNull(),
  lifeRisk: boolean("lifeRisk").default(true).notNull(),
  streakRewards: boolean("streakRewards").default(true).notNull(),
  wardenUpdates: boolean("wardenUpdates").default(true).notNull(),
  quietHoursEnabled: boolean("quietHoursEnabled").default(true).notNull(),
  quietHoursStart: varchar("quietHoursStart", { length: 5 }).default("22:00").notNull(),
  quietHoursEnd: varchar("quietHoursEnd", { length: 5 }).default("07:00").notNull(),
  timezone: varchar("timezone", { length: 80 }).default("Europe/London").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  uniqueNotificationPreferenceUser: uniqueIndex("notification_preferences_user_idx").on(table.userId),
}));

export const errorLogs = mysqlTable("error_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  participantId: int("participantId"),
  eventType: varchar("eventType", { length: 80 }).notNull(), // 'api_call', 'calculation', 'sync', 'submission', 'refresh'
  action: varchar("action", { length: 140 }).notNull(), // 'submitDailyLog', 'getSnapshot', 'updatePoints', etc.
  severity: mysqlEnum("severity", ["info", "warning", "error", "critical"]).default("info").notNull(),
  message: text("message").notNull(),
  context: text("context"), // JSON string with additional data
  stackTrace: text("stackTrace"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const bugReports = mysqlTable("bug_reports", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  participantId: int("participantId"),
  title: varchar("title", { length: 180 }).notNull(),
  description: text("description").notNull(),
  screenshotUrl: text("screenshotUrl"),
  screenshotKey: text("screenshotKey"),
  affectedPage: varchar("affectedPage", { length: 80 }), // 'my_day', 'proof', 'board', etc.
  status: mysqlEnum("status", ["open", "acknowledged", "investigating", "resolved", "wontfix"]).default("open").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  assignedToUserId: int("assignedToUserId"),
  resolution: text("resolution"),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const participantNotifications = mysqlTable("participant_notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  participantId: int("participantId"),
  type: mysqlEnum("type", ["morning_intent", "afternoon_proof", "evening_deadline", "life_risk", "streak_reward", "warden_update", "system"]).default("system").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  body: text("body").notNull(),
  actionUrl: text("actionUrl"),
  readAt: timestamp("readAt"),
  pushStatus: mysqlEnum("pushStatus", ["not_attempted", "sent", "failed", "skipped"]).default("not_attempted").notNull(),
  pushAttempts: int("pushAttempts").default(0).notNull(),
  lastPushError: text("lastPushError"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const adminAuditLog = mysqlTable("admin_audit_log", {
  id: int("id").autoincrement().primaryKey(),
  adminUserId: int("adminUserId").notNull(),
  adminName: varchar("adminName", { length: 140 }).notNull(),
  action: mysqlEnum("action", [
    "restore_life",
    "deduct_life",
    "mark_payment_received",
    "mark_payment_pending",
    "adjust_points",
    "approve_signup",
    "reject_signup",
    "fulfill_reward",
    "cancel_reward",
    "set_dispute",
    "resolve_dispute",
    "other",
  ]).notNull(),
  targetParticipantId: int("targetParticipantId"),
  targetParticipantName: varchar("targetParticipantName", { length: 140 }),
  previousValue: text("previousValue"),
  newValue: text("newValue"),
  reason: text("reason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type SignupRequest = typeof signupRequests.$inferSelect;
export type Participant = typeof participants.$inferSelect;
export type DailyLog = typeof dailyLogs.$inferSelect;
export type ProofReaction = typeof proofReactions.$inferSelect;
export type ProofComment = typeof proofComments.$inferSelect;
export type PaymentEvent = typeof paymentEvents.$inferSelect;
export type RewardCatalogueItem = typeof rewardCatalogue.$inferSelect;
export type RedemptionRequest = typeof redemptionRequests.$inferSelect;
export type WhatsappChatMessage = typeof whatsappChatHistory.$inferSelect;
export type WardenMessage = typeof wardenMessages.$inferSelect;
export type BoostWin = typeof boostWins.$inferSelect;
export type InsertBoostWin = typeof boostWins.$inferInsert;
export type ReleaseNote = typeof releaseNotes.$inferSelect;
export type ReleaseNoteAcknowledgement = typeof releaseNoteAcknowledgements.$inferSelect;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type ParticipantNotification = typeof participantNotifications.$inferSelect;
export type AdminAuditEntry = typeof adminAuditLog.$inferSelect;
export type InsertAdminAuditEntry = typeof adminAuditLog.$inferInsert;
