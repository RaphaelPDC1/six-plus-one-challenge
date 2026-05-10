self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", event => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "6+1 Challenge", body: event.data ? event.data.text() : "Open the challenge for your next action." };
  }

  const title = payload.title || "6+1 Challenge";
  const options = {
    body: payload.body || "Open the challenge for your next action.",
    icon: "/app-icon-192.png",
    badge: "/app-icon-192.png",
    tag: payload.tag || "6plus1-reminder",
    data: { actionUrl: payload.actionUrl || "/", type: payload.type || "system" },
    vibrate: [80, 40, 80],
    requireInteraction: payload.type === "evening_deadline" || payload.type === "life_risk",
    actions: [{ action: "open", title: "Open 6+1" }],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.actionUrl || "/", self.location.origin).href;
  event.waitUntil((async () => {
    const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clientList) {
      if (client.url.startsWith(self.location.origin) && "focus" in client) {
        await client.focus();
        if ("navigate" in client) return client.navigate(targetUrl);
        return;
      }
    }
    return self.clients.openWindow(targetUrl);
  })());
});
