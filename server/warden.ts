import { invokeLLM } from "./_core/llm";
import { getAppSnapshot, logWardenMessage } from "./db";
import type { participants, dailyLogs, paymentEvents, whatsappChatHistory, redemptionRequests } from "../drizzle/schema";
import type { InferSelectModel } from "drizzle-orm";

type Participant = InferSelectModel<typeof participants>;
type DailyLog = InferSelectModel<typeof dailyLogs>;
type PaymentEvent = InferSelectModel<typeof paymentEvents>;
type ChatMessage = InferSelectModel<typeof whatsappChatHistory>;
type Redemption = InferSelectModel<typeof redemptionRequests>;

export type WardenMode = "surveillance" | "commentary" | "on_ramp";

const WARDEN_SYSTEM_PROMPT = `You are The Warden for the 6+1 Four Lives Challenge.
You are not a policeman. You are a live commentator: observant, sharp, direct, and useful.
You operate in three modes:
1. Surveillance: identify who is at risk, overdue, trending down, or carrying payment obligations.
2. Commentary: connect patterns across participant behaviour, insights, and WhatsApp tone.
3. On-ramp: give the easiest next step to someone struggling without humiliating them publicly.
Rules:
- Never shame. Be direct but not cruel.
- Keep the message short enough for WhatsApp.
- Mention specific people only when the data supports it.
- Assume every message is public to the group.
- Do not exceed the organic Warden ceiling of four unprompted messages per day, and expect most days to use fewer.
- Read the room from participant writing, exercise effort, silence, returns, streaks, payments, and WhatsApp tone instead of sounding like a scheduled bot.`;

export async function generateWardenCommentary(userIdForContext: number, mode: WardenMode) {
  const snapshot = await getAppSnapshot(userIdForContext);
  const context = {
    challenge: snapshot.challenge,
    participants: (snapshot.participants as Participant[]).map(p => ({
      name: p.displayName,
      livesRemaining: p.livesRemaining,
      points: p.totalPoints,
      streak: p.currentStreak,
      daysComplete: p.daysComplete,
      ghostLifeUsed: p.ghostLifeUsed,
    })),
    recentLogs: (snapshot.logs as DailyLog[]).slice(0, 25).map(l => ({
      participantId: l.participantId,
      day: l.dayNumber,
      complete: l.dayComplete,
      readTeach: l.readTeachText,
      reflection: l.reflectionText,
      reflectionShared: l.reflectionShared,
      exerciseType: l.exerciseType,
      exerciseDuration: l.exerciseDuration,
      proofUploaded: Boolean(l.exerciseProofUrl),
      submittedAt: l.submittedAt,
    })),
    pendingPayments: (snapshot.payments as PaymentEvent[]).filter(p => p.status === "pending").map(p => ({ participantId: p.participantId, amountPence: p.amountPence, reason: p.reason })),
    recentChatMessages: (snapshot.chatHistory as ChatMessage[]).slice(0, 20).map(m => ({ sender: m.senderName || m.senderId, message: m.messageText, timestamp: m.messageTimestamp })),
    pendingRewards: (snapshot.redemptions as Redemption[]).filter(r => r.status === "pending").length,
  };

  const response = await invokeLLM({
    messages: [
      { role: "system", content: WARDEN_SYSTEM_PROMPT },
      { role: "user", content: `Mode: ${mode}\nGenerate one WhatsApp-ready Warden message from this context:\n${JSON.stringify(context, null, 2)}` },
    ],
  });

  const rawContent = response.choices?.[0]?.message?.content;
  const content = typeof rawContent === "string" ? rawContent.trim() : "The Warden has nothing useful to add right now.";
  return logWardenMessage({ mode, content, sourceEvent: "scheduled_warden", postedToWhatsapp: false });
}
