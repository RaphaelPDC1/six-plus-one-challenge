/**
 * Make.com webhook notifier for immediate trigger events
 * Sends event notifications to Make.com automation scenarios
 */

export type TriggerReason =
  | "life_lost"
  | "milestone"
  | "streak"
  | "one_life_remaining"
  | "ghost_life";

export interface TriggerPayload {
  reason: TriggerReason;
  participant?: string;
  details?: Record<string, any>;
}

export async function notifyMakeWebhook(payload: TriggerPayload): Promise<void> {
  const webhookUrl = process.env.MAKE_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn("[Make Notifier] MAKE_WEBHOOK_URL not configured, skipping webhook");
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[Make Notifier] Webhook failed: ${response.status} - ${error}`);
      throw new Error(`Make webhook failed: ${error}`);
    }

    console.log(`[Make Notifier] Webhook sent for reason: ${payload.reason}`);
  } catch (error) {
    console.error("[Make Notifier] Error sending webhook:", error);
    throw error;
  }
}
