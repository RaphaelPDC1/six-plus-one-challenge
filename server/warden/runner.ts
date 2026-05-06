import { getChallengeState } from "./challengeState";
import { generateWardenMessage, shouldSendMessage } from "./messageGenerator";
import { logWardenMessage, hasHitDailyLimit, hasDecisionForWindowToday } from "./messageLogger";
import { sendWardenMessage } from "./whatsappClient";
import { notifyMakeWebhook } from "./makeNotifier";
import { shouldRunOrganicWardenCycle } from "./organicScheduler";

/**
 * Main Warden runner: orchestrates message generation, logging, and posting
 * Called by Make/scheduled automation during organic randomized Warden windows
 */
export async function runWardenCycle(): Promise<{
  messageGenerated: boolean;
  messageSent: boolean;
  message?: string;
  reason?: string;
}> {
  try {
    console.log("[Warden] Starting cycle...");

    // Get the current challenge state first because the daily cap is drama-driven.
    const challengeState = await getChallengeState();
    console.log(
      `[Warden] Challenge state assembled for day ${challengeState.challenge_day}; drama score ${challengeState.daily_drama_score}; max ${challengeState.max_warden_messages_today}`
    );

    const organicDecision = shouldRunOrganicWardenCycle(challengeState);
    if (!organicDecision.shouldRun) {
      console.log(`[Warden] Organic schedule skipped: ${organicDecision.reason}`);
      return {
        messageGenerated: false,
        messageSent: false,
        reason: organicDecision.reason,
      };
    }

    const windowId = organicDecision.windowId || "unknown";
    const sourceEvent = `scheduled_runner_${windowId}`;

    if (await hasDecisionForWindowToday(windowId)) {
      console.log(`[Warden] Organic ${windowId} window already had a decision today.`);
      return {
        messageGenerated: false,
        messageSent: false,
        reason: "Organic window already used today",
      };
    }

    // Check if we've hit the drama-driven daily limit
    const hitLimit = await hasHitDailyLimit(challengeState.max_warden_messages_today);
    if (hitLimit) {
      console.log(
        `[Warden] Daily message limit reached (${challengeState.max_warden_messages_today} messages). Skipping cycle.`
      );
      await logWardenMessage(
        "NO_MESSAGE",
        "system",
        "daily_limit_reached"
      );
      return {
        messageGenerated: false,
        messageSent: false,
        reason: "Daily limit reached",
      };
    }

    // Generate a message from Claude
    const generatedMessage = await generateWardenMessage(challengeState);
    console.log(`[Warden] Message generated: "${generatedMessage}"`);

    // Check if the message should be sent
    if (!shouldSendMessage(generatedMessage)) {
      console.log("[Warden] Message filtered out (NO_MESSAGE or invalid)");
      await logWardenMessage(
        generatedMessage,
        "surveillance",
        sourceEvent
      );
      return {
        messageGenerated: true,
        messageSent: false,
        message: generatedMessage,
        reason: "NO_MESSAGE decision",
      };
    }

    console.log("[Warden] Message ready to post to WhatsApp");

    // Post to WhatsApp via Whapi
    try {
      await sendWardenMessage(generatedMessage);
      await logWardenMessage(
        generatedMessage,
        "commentary",
        sourceEvent,
        true
      );
      console.log("[Warden] Message posted to WhatsApp successfully");
    } catch (whatsappError) {
      console.error("[Warden] Failed to post to WhatsApp:", whatsappError);
      throw whatsappError;
    }

    return {
      messageGenerated: true,
      messageSent: true,
      message: generatedMessage,
    };
  } catch (error) {
    console.error("[Warden] Cycle failed:", error);
    throw error;
  }
}

/**
 * Trigger an immediate Warden message for specific events
 * (life loss, milestone, etc.)
 */
export async function triggerImmediateMessage(
  triggerType: "life_loss" | "milestone" | "streak" | "emergency",
  context: Record<string, any>
): Promise<{
  messageSent: boolean;
  message?: string;
}> {
  try {
    console.log(`[Warden] Immediate trigger: ${triggerType}`);

    // Get the current challenge state first because immediate triggers also respect the drama-driven cap.
    const challengeState = await getChallengeState();

    // Check if we've hit the daily limit
    const hitLimit = await hasHitDailyLimit(challengeState.max_warden_messages_today);
    if (hitLimit) {
      console.log("[Warden] Daily limit reached, skipping immediate trigger");
      return { messageSent: false };
    }

    // Generate a message
    const generatedMessage = await generateWardenMessage(challengeState);

    if (!shouldSendMessage(generatedMessage)) {
      console.log("[Warden] Immediate trigger message filtered out");
      await logWardenMessage(
        generatedMessage,
        "surveillance",
        `immediate_${triggerType}_no_message`
      );
      return { messageSent: false };
    }

    console.log(`[Warden] Immediate message ready: "${generatedMessage}"`);

    // Post to WhatsApp via Whapi
    try {
      await sendWardenMessage(generatedMessage);
      await logWardenMessage(
        generatedMessage,
        "commentary",
        `immediate_${triggerType}`,
        true
      );
      console.log(`[Warden] Immediate message (${triggerType}) posted to WhatsApp successfully`);
    } catch (whatsappError) {
      console.error(`[Warden] Failed to post immediate message (${triggerType}) to WhatsApp:`, whatsappError);
      throw whatsappError;
    }

    return {
      messageSent: true,
      message: generatedMessage,
    };
  } catch (error) {
    console.error(`[Warden] Immediate trigger failed (${triggerType}):`, error);
    throw error;
  }
}
