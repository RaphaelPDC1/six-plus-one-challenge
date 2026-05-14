# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This App Is

**6+1 Four Lives Challenge** — a group accountability challenge tracker. Participants log 6 daily rules for 50 days. Missing a rule risks losing a life (1 of 4). The app is deployed on Manus and uses GitHub as the code source. Payments (£25 per life lost via Monzo) are not yet implemented in code — ignore payment-related TODOs for now.

## Commands

```bash
pnpm dev          # Start full-stack dev server (client + server together on port 3000)
pnpm build        # Build client (Vite) + bundle server (esbuild) → dist/
pnpm start        # Run production build
pnpm test         # Run all Vitest tests
pnpm check        # TypeScript type check only
pnpm format       # Prettier format
pnpm db:push      # Generate + run Drizzle migrations
```

Run a single test file:
```bash
pnpm vitest run server/challengeLogic.test.ts
```

**Package manager: pnpm only.** Do not use npm or yarn — the lockfile is pnpm-lock.yaml.

## Environment Variables (required at runtime)

Set in Manus deployment. For local dev, create a `.env` file:

```
VITE_APP_ID=
VITE_OAUTH_PORTAL_URL=
DATABASE_URL=
JWT_SECRET=
OAUTH_SERVER_URL=
OWNER_OPEN_ID=
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=
WHAPI_TOKEN=
WHAPI_GROUP_ID=
MAKE_WEBHOOK_URL=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
```

`VITE_*` variables are client-side (Vite). All others are server-side only.

## Architecture

### Stack
- **Frontend:** React 19 + TypeScript + Tailwind CSS v4 + Framer Motion + Radix UI (shadcn/ui components)
- **Backend:** Express + tRPC v11 + Drizzle ORM + MySQL
- **Auth:** OAuth via Manus platform (`/api/oauth/callback`)
- **Storage:** AWS S3 (via `/api/storage-image/` proxy)
- **Routing:** Wouter (client-side), Express (server-side)
- **Push notifications:** Web Push / VAPID
- **WhatsApp integration:** Whapi webhook → `server/whatsappWebhook.ts`
- **AI Warden:** LLM-generated accountability messages via `server/warden/`

### Key Data Flow

```
Client (React) → tRPC → Express routers → Drizzle ORM → MySQL
```

All API calls go through tRPC. The single tRPC router is assembled in `server/routers.ts`. The client connects via `client/src/lib/trpc.ts`.

### App Pages / Routes

| Route | Component | Notes |
|-------|-----------|-------|
| `/` | `Home.tsx` | Landing (unauthenticated) + full dashboard (authenticated) — single large file (~3500 lines) |
| `/register` | `Register.tsx` | New participant onboarding questionnaire |
| `/404` | `NotFound.tsx` | Fallback |

`Calendar.tsx` exports `CalendarView` used as a tab inside `Home.tsx` — it is not a standalone route.

### Dashboard Tabs (inside Home.tsx)

`TabKey` type: `myday | overview | leaderboard | proof | rewards | calendar | admin`

- **My Day** — daily rule logging for the logged-in participant
- **Overview** — group stats, lives grid, progress chart
- **Leaderboard** — ranked by `canonicalTotalPoints` (base + boost points)
- **Proof** — public exercise proof feed
- **Rewards** — Pure Sport reward catalogue + redemption
- **Calendar/Journey** — 50-day campaign map
- **Admin/Founder** — admin-only dashboard (role check: `user.role === "admin"`)

Mobile nav excludes the admin tab. Desktop tab bar renders dynamically — do not hardcode column count.

### Design System

The app uses a strict **"poster" aesthetic**: sharp edges, heavy uppercase typography, near-black base (`#0D0D0D`), warm gold accents (`#C8A96E`), deep red danger (`#C0392B`), green completion (`#2ECC71`), purple Ghost Life (`#9B59B6`).

- `--radius: 0.375rem` in `index.css` for shadcn components; poster-specific elements (`.poster-card`, `.poster-button`) explicitly set `border-radius: 0`
- Custom CSS classes: `.poster-grid`, `.poster-label`, `.poster-card`, `.poster-button`, `.motion-*`, `.warden-pulse`
- Do not add rounded corners to rule cards, stat blocks, or the tab bar — these are intentionally sharp
- Haptics via `client/src/lib/haptics.ts` — always call on interactive actions

### Challenge Logic

Core rules in `client/src/lib/challengeUi.ts` and `server/challengeLogic.ts`:
- 6 daily rules; pass threshold = 5 of 6
- Lives: 4 max, clamped via `clampLives()`
- Exercise rule requires ≥30 min + activity type
- Clean eating requires a note (≥10 chars)
- Points: base rule ticks + pass bonus + proof/insight bonus
- `canonicalTotalPoints = baseTotalPoints + boostPoints` — always use this for leaderboard display

### Server Structure

```
server/
  _core/           # Express app, tRPC context, env, auth, OAuth, storage proxy
  warden/          # AI Warden message generation and mood context
  challengeLogic.ts  # Core scoring, life-loss, streak logic
  routers.ts       # All tRPC routers assembled here
  db.ts            # Drizzle client
  storage.ts       # S3 helpers
  pushNotifications.ts
  whatsappWebhook.ts
```

### Snapshot Pattern

The client fetches a single `challenge.snapshot` tRPC query that returns all participant data, logs, payments, warden messages, and challenge state. Optimistic updates use `patchDailyLogIntoSnapshot()` to avoid full refetches after form submissions.

### Draft Persistence

My Day form auto-saves to localStorage under key `draft_6plus1_{userId}_day{dayNumber}`. Draft is merged with saved server state on load via `mergeTodayFormWithoutWipingSavedWork()`.

## Testing

Tests live alongside the server files they test (e.g. `challengeLogic.test.ts` next to `challengeLogic.ts`). Client-side tests are in `client/src/pages/` (Home page tests). Config: `vitest.config.ts`.

## Pushing Changes

The project is deployed on Manus via GitHub. After making changes:
```bash
git add -A
git commit -m "description"
git push
```
Manus auto-deploys on push to `main`.
