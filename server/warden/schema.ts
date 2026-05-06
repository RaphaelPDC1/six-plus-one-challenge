import {
  int,
  mysqlEnum,
  mysqlTable,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Tracks when immediate trigger events fire to prevent duplicate messages
 * Used by the Warden bot to avoid posting the same event multiple times
 */
export const wardenTriggers = mysqlTable("warden_triggers", {
  id: int("id").autoincrement().primaryKey(),
  triggerType: varchar("trigger_type", { length: 140 }).notNull(),
  participantId: int("participant_id"),
  dayNumber: int("day_number"),
  lastFiredAt: timestamp("last_fired_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type WardenTrigger = typeof wardenTriggers.$inferSelect;
export type InsertWardenTrigger = typeof wardenTriggers.$inferInsert;

/**
 * Trigger type enum for type safety
 */
export enum TriggerType {
  LIFE_LOST = "life_lost",
  MILESTONE_DAY_10 = "milestone_day_10",
  MILESTONE_DAY_25 = "milestone_day_25",
  MILESTONE_DAY_40 = "milestone_day_40",
  MILESTONE_DAY_50 = "milestone_day_50",
  GHOST_LIFE_DOUBLE_DOWN = "ghost_life_double_down",
  STREAK_7_DAYS = "streak_7_days",
  STREAK_14_DAYS = "streak_14_days",
  STREAK_21_DAYS = "streak_21_days",
  PARTICIPANT_TO_1_LIFE = "participant_to_1_life",
  NO_LOG_3_DAYS = "no_log_3_days",
}
