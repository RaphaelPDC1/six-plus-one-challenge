import {
  boolean,
  date,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
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

export const participants = mysqlTable("participants", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  displayName: varchar("displayName", { length: 140 }).notNull(),
  avatarInitials: varchar("avatarInitials", { length: 4 }).notNull(),
  whatsappName: varchar("whatsappName", { length: 140 }),
  monzoPaymentLink: text("monzoPaymentLink"),
  currentStreak: int("currentStreak").default(0).notNull(),
  longestStreak: int("longestStreak").default(0).notNull(),
  totalPoints: int("totalPoints").default(0).notNull(),
  daysComplete: int("daysComplete").default(0).notNull(),
  livesRemaining: int("livesRemaining").default(4).notNull(),
  ghostLifeUsed: boolean("ghostLifeUsed").default(false).notNull(),
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
});

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

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Participant = typeof participants.$inferSelect;
export type DailyLog = typeof dailyLogs.$inferSelect;
export type PaymentEvent = typeof paymentEvents.$inferSelect;
export type RewardCatalogueItem = typeof rewardCatalogue.$inferSelect;
export type RedemptionRequest = typeof redemptionRequests.$inferSelect;
export type WhatsappChatMessage = typeof whatsappChatHistory.$inferSelect;
export type WardenMessage = typeof wardenMessages.$inferSelect;
