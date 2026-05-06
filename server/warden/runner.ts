import { getChallengeState } from "./challengeState";
import { generateWardenMessage, shouldSendMessage } from "./messageGenerator";
import { logWardenMessage, hasHitDailyLimit } from "./messageLogger";
import { sendWardenMessage } from "./whatsappClient";
import { notifyMakeWebhook } from "./makeNotifier";

/**
 * Main Warden runner: orchestrates message generation, logging, and posting
 * Called every 2 hours (06:00–22:00 GMT)
 */
export async function runWardenCycle(): Promise<{
  messageGenerated: boolean;
  messageSent: boolean;
  message?: string;
  reason?: string;
}> {
  try {
    console.log("[Warden] Starting cycle...");

    // Check if we've hit the daily limit
    const hitLimit = await hasHitDailyLimit();
    if (hitLimit) {
      console.log("[Warden] Daily message limit reached (3 messages). Skipping cycle.");
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

    // Get the current challenge state
    const challengeState = await getChallengeState();
    console.log(`[Warden] Challenge state assembled for day ${challengeState.challenge_day}`);

    // Generate a message from Claude
    const generatedMessage = await generateWardenMessage(challengeState);
    console.log(`[Warden] Message generated: "${generatedMessage}"`);

    // Check if the message should be sent
    if (!shouldSendMessage(generatedMessage)) {
      console.log("[Warden] Message filtered out (NO_MESSAGE or invalid)");
      await logWardenMessage(
        generatedMessage,
        "surveillance",
        "no_message_decision"
      );
      return {
        messageGenerated: true,
        messageSent: false,
        message: generatedMessage,
        reason: "NO_MESSAGE decision",
      };
    }

    // Log the message (before posting)
    await logWardenMessage(
      generatedMessage,
      "commentary",
      "scheduled_runner"
    );

    console.log("[Warden] Message ready to post to WhatsApp");

    // Post to WhatsApp via Whapi
    try {
      await sendWardenMessage(generatedMessage);
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

    // Check if we've hit the daily limit
    const hitLimit = await hasHitDailyLimit();
    if (hitLimit) {
      console.log("[Warden] Daily limit reached, skipping immediate trigger");
      return { messageSent: false };
    }

    // Get the current challenge state
    const challengeState = await getChallengeState();

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

    // Log and prepare to send
    await logWardenMessage(
      generatedMessage,
      "commentary",
      `immediate_${triggerType}`
    );

    console.log(`[Warden] Immediate message ready: "${generatedMessage}"`);

    // Post to WhatsApp via Whapi
    try {
      await sendWardenMessage(generatedMessage);
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
