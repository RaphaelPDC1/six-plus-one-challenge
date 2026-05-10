export type BrowserPushSupport = {
  supported: boolean;
  reason?: string;
};

export type SerializedPushSubscription = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export function getBrowserPushSupport(): BrowserPushSupport {
  if (typeof window === "undefined" || typeof navigator === "undefined") return { supported: false, reason: "Push notifications are only available in the browser." };
  if (!("serviceWorker" in navigator)) return { supported: false, reason: "This browser does not support service workers." };
  if (!("PushManager" in window)) return { supported: false, reason: "This browser does not support web push notifications." };
  if (!("Notification" in window)) return { supported: false, reason: "This browser does not support notification permissions." };
  if (!window.isSecureContext) return { supported: false, reason: "Push notifications require a secure HTTPS context." };
  return { supported: true };
}

export async function registerChallengeServiceWorker() {
  const support = getBrowserPushSupport();
  if (!support.supported) throw new Error(support.reason);
  const registration = await navigator.serviceWorker.register("/service-worker.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  return registration;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer | null) {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return window.btoa(binary);
}

export function serializePushSubscription(subscription: PushSubscription): SerializedPushSubscription {
  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: arrayBufferToBase64(subscription.getKey("p256dh")),
      auth: arrayBufferToBase64(subscription.getKey("auth")),
    },
  };
}

export async function subscribeToChallengePush(publicKey: string) {
  if (!publicKey) throw new Error("Push notifications are not configured yet.");
  const registration = await registerChallengeServiceWorker();
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission was not granted.");
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
}

export async function getExistingChallengePushSubscription() {
  const support = getBrowserPushSupport();
  if (!support.supported) return null;
  const registration = await navigator.serviceWorker.getRegistration("/") ?? await navigator.serviceWorker.ready.catch(() => null);
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}
