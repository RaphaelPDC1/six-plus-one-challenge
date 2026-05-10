import crypto from "node:crypto";
import webpush from "web-push";
import { ENV } from "./_core/env";
import {
  createParticipantNotification,
  disablePushSubscriptionById,
  getEnabledPushSubscriptionsForUser,
  updateNotificationPushResult,
} from "./db";

export type PushPayload = {
  title: string;
  body: string;
  actionUrl?: string;
  tag?: string;
  type?: string;
};

export function getPushConfig() {
  const enabled = Boolean(ENV.vapidPublicKey && ENV.vapidPrivateKey);
  return {
    enabled,
    publicKey: ENV.vapidPublicKey,
    subject: ENV.vapidSubject,
  };
}

export function configureWebPush() {
  const config = getPushConfig();
  if (!config.enabled) return false;
  webpush.setVapidDetails(ENV.vapidSubject, ENV.vapidPublicKey, ENV.vapidPrivateKey);
  return true;
}

export function hashPushEndpoint(endpoint: string) {
  return crypto.createHash("sha256").update(endpoint).digest("hex");
}

export async function notifyUserWithPush(input: {
  userId: number;
  participantId?: number | null;
  type: "morning_intent" | "afternoon_proof" | "evening_deadline" | "life_risk" | "streak_reward" | "warden_update" | "system";
  title: string;
  body: string;
  actionUrl?: string;
}) {
  const notification = await createParticipantNotification({
    userId: input.userId,
    participantId: input.participantId ?? null,
    type: input.type,
    title: input.title,
    body: input.body,
    actionUrl: input.actionUrl ?? "/",
  });

  if (!notification) return { notification: null, push: { status: "skipped" as const, reason: "notification_not_created" } };
  if (!configureWebPush()) {
    await updateNotificationPushResult(notification.id, { status: "skipped", error: "VAPID keys are not configured." });
    return { notification, push: { status: "skipped" as const, reason: "vapid_not_configured" } };
  }

  const subscriptions = await getEnabledPushSubscriptionsForUser(input.userId);
  if (!subscriptions.length) {
    await updateNotificationPushResult(notification.id, { status: "skipped", error: "No active push subscription." });
    return { notification, push: { status: "skipped" as const, reason: "no_subscription" } };
  }

  const payload: PushPayload = {
    title: input.title,
    body: input.body,
    actionUrl: input.actionUrl ?? "/",
    tag: `6plus1-${input.type}-${notification.id}`,
    type: input.type,
  };

  const outcomes = await Promise.all(subscriptions.map(async subscription => {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      }, JSON.stringify(payload));
      return { ok: true as const, subscriptionId: subscription.id };
    } catch (error) {
      const statusCode = typeof error === "object" && error && "statusCode" in error ? Number((error as { statusCode?: number }).statusCode) : 0;
      if (statusCode === 404 || statusCode === 410) {
        await disablePushSubscriptionById(subscription.id);
      }
      const message = error instanceof Error ? error.message : "Unknown push delivery error";
      return { ok: false as const, subscriptionId: subscription.id, statusCode, message };
    }
  }));

  const sentCount = outcomes.filter(outcome => outcome.ok).length;
  if (sentCount > 0) {
    await updateNotificationPushResult(notification.id, { status: "sent", error: null });
  } else {
    const errorSummary = outcomes.find(outcome => !outcome.ok && "message" in outcome)?.message ?? "Push delivery failed.";
    await updateNotificationPushResult(notification.id, { status: "failed", error: errorSummary });
  }

  return { notification, push: { status: sentCount > 0 ? "sent" as const : "failed" as const, sentCount, attemptedCount: subscriptions.length, outcomes } };
}
