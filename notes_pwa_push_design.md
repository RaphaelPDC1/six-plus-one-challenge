# PWA Push Notification Design

The first notification build will target participants who already install the 6+1 Challenge as a PWA. The system will use browser Push API subscriptions where supported, preserve an in-app notification fallback, and keep reminder logic deterministic rather than AI-scheduled.

## Delivery Model

The browser client registers a service worker from `/sw.js`, requests notification permission only after an explicit participant action, subscribes with the configured VAPID public key, and stores the resulting PushSubscription through a protected tRPC mutation. The backend stores subscriptions by user and participant where available, records preference flags, and writes an in-app notification record whenever a reminder is generated. If VAPID configuration is missing or a push delivery fails, the in-app record still remains visible to the user.

## Data Model

The initial tables are `push_subscriptions`, `notification_preferences`, and `participant_notifications`. Push subscriptions are unique by endpoint and include user ID, optional participant ID, endpoint, serialized browser keys, user agent, enabled flag, and last-used timestamps. Preferences are unique by user ID and cover daily reminders, morning intent, afternoon proof, evening deadline, life risk, streak/reward, Warden updates, push enabled, quiet hours, timezone, and local reminder time strings. Participant notifications store title, body, type, action URL, read flag, push status, delivery attempts, and timestamps.

## Reminder Rules

The first deterministic reminder engine exposes an admin-only dispatch procedure that accepts a reminder type and current time. It selects eligible participants based on challenge state and daily logs, creates notification records, and attempts push for subscribers who opted in. The initial rule set should include morning intent, afternoon proof prompt, evening deadline warning, life-risk alert, streak/reward update, and Warden update. A later scheduled heartbeat can call the same deterministic dispatch procedure without changing business rules.

## Client UX

The Home screen should show a small notification control card or banner for participants, including permission status, enable/disable action, and preference toggles. A notification bell/center can list unread in-app notifications and mark them read. Push enrollment must not block the challenge experience; users who deny browser permission still keep in-app notifications.

## Validation

Coverage should assert service-worker registration, manifest/PWA push assets, schema/table contract, tRPC preference/subscription contracts, and deterministic reminder behavior. Full validation remains Vitest, TypeScript check, production build, project health check, and checkpoint.
