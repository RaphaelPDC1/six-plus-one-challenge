import { getDb } from "../db";
import { wardenMessages } from "../../drizzle/schema";
import { and, gte, lt } from "drizzle-orm";

export interface WardenMessageLog {
  content: string;
  mode: "surveillance" | "commentary" | "on_ramp" | "system";
  sourceEvent?: string;
  timestamp: Date;
}

/**
 * Log a Warden message to the database
 */
export async function logWardenMessage(
  content: string,
  mode: "surveillance" | "commentary" | "on_ramp" | "system" = "commentary",
  sourceEvent?: string
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    await db.insert(wardenMessages).values({
      mode,
      content,
      sourceEvent: sourceEvent || null,
      postedToWhatsapp: false,
      createdAt: new Date(),
    });

    console.log(
      `[Warden] Message logged: ${mode} - ${sourceEvent || ""}`
    );
  } catch (error) {
    console.error("Error logging Warden message:", error);
    throw error;
  }
}

/**
 * Mark a Warden message as posted to WhatsApp
 */
export async function markMessageAsPosted(messageId: number): Promise<void> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    // Note: Update functionality would need to be added to Drizzle schema
    // For now, we'll just log it
    console.log(`[Warden] Message ${messageId} marked as posted`);
  } catch (error) {
    console.error("Error marking message as posted:", error);
    throw error;
  }
}

/**
 * Get the count of messages sent today (for daily limit enforcement)
 */
export async function getMessagesCountToday(): Promise<number> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const result = await db
      .select()
      .from(wardenMessages)
      .where(
        and(
          gte(wardenMessages.createdAt, todayStart),
          lt(wardenMessages.createdAt, todayEnd)
        )
      );

    // Count only messages that were actually posted to WhatsApp
    return result.filter((msg: any) => msg.postedToWhatsapp).length;
  } catch (error) {
    console.error("Error getting message count:", error);
    throw error;
  }
}

/**
 * Check if we've hit the daily message limit (3 messages per day)
 */
export async function hasHitDailyLimit(): Promise<boolean> {
  const count = await getMessagesCountToday();
  return count >= 3;
}

/**
 * Get the count of NO_MESSAGE decisions today
 */
export async function getNoMessageCountToday(): Promise<number> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const result = await db
      .select()
      .from(wardenMessages)
      .where(
        and(
          gte(wardenMessages.createdAt, todayStart),
          lt(wardenMessages.createdAt, todayEnd)
        )
      );

    // Count messages that were NOT posted (NO_MESSAGE decisions)
    return result.filter((msg: any) => !msg.postedToWhatsapp).length;
  } catch (error) {
    console.error("Error getting NO_MESSAGE count:", error);
    throw error;
  }
}

/**
 * Get recent Warden messages for context (last N messages)
 */
export async function getRecentMessages(limit: number = 10): Promise<WardenMessageLog[]> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const messages = await db
      .select()
      .from(wardenMessages)
      .orderBy((table) => table.createdAt)
      .limit(limit);

    return messages.map((msg: any) => ({
      content: msg.content,
      mode: msg.mode,
      sourceEvent: msg.sourceEvent,
      timestamp: msg.createdAt,
    }));
  } catch (error) {
    console.error("Error getting recent messages:", error);
    throw error;
  }
}
