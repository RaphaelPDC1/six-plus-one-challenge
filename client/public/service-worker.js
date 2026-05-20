const CACHE_VERSION = "6plus1-v3";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Static shell assets to pre-cache for instant loads
const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/app-icon-192.png",
  "/app-icon-512.png",
  "/site.webmanifest",
];

// ─── Install: pre-cache shell ─────────────────────────────────────────────────
self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache => {
      return cache.addAll(SHELL_ASSETS).catch(() => {
        // Non-fatal: shell caching best-effort
      });
    })
  );
});

// ─── Activate: clean old caches ──────────────────────────────────────────────
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k.startsWith("6plus1-") && k !== SHELL_CACHE && k !== API_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch: stale-while-revalidate for shell, network-first for API ───────────
self.addEventListener("fetch", event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, cross-origin, and API/tRPC requests (always fresh)
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/manus-storage/")
  ) {
    return;
  }

  // HTML navigation: network-first with shell fallback
  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(SHELL_CACHE).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match("/index.html").then(cached => cached || caches.match("/"))
        )
    );
    return;
  }

  // JS/CSS/fonts/images: stale-while-revalidate (instant from cache, update in bg)
  if (
    url.pathname.match(/\.(js|css|woff2?|ttf|otf|png|jpg|jpeg|svg|ico|webp|gif)$/) ||
    url.pathname.startsWith("/assets/")
  ) {
    event.respondWith(
      caches.open(SHELL_CACHE).then(async cache => {
        const cached = await cache.match(request);
        const networkFetch = fetch(request).then(response => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        }).catch(() => null);

        return cached || networkFetch;
      })
    );
    return;
  }
});

// ─── Push notifications ───────────────────────────────────────────────────────
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

// ─── Notification click ───────────────────────────────────────────────────────
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
