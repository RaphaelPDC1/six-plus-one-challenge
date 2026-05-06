# Warden Make.com Integration Guide

This document describes how to integrate the Warden with Make.com and Whapi.Cloud so challenge messages feel like a **presence** rather than a fixed notification cycle. The Warden should not speak every time Make calls the endpoint. Make creates the opportunities; the backend decides whether the moment is worth using.

## Architecture

```text
Make.com scheduled probes during organic windows
  ↓
tRPC webhook: /api/trpc/warden.runCycle
  ↓
CHALLENGE_STATE assembly with daily_drama_score
  ↓
Organic window gate + data-driven daily limit
  ↓
Warden message generation
  ↓
Whapi.Cloud posting to WhatsApp group
```

The system is intentionally split this way. Make.com should run light scheduled probes inside the approved time windows, while the application enforces randomized timing, late-window restraint, message deduplication, and the drama-driven cap.

## Organic Warden Timing Model

The old fixed two-hour cadence has been replaced. The Warden now works from four daily windows, each with a deterministic randomized target minute for that calendar day. This means Make.com can probe at a simple cadence, but the actual Warden decision happens at a different moment each day.

| Window | UTC Time Range | Behaviour |
|---|---:|---|
| Morning | 07:00–09:00 | May speak if the morning data or carry-over story warrants it. |
| Midday | 12:00–14:00 | May speak if the group has produced useful mid-day evidence. |
| Evening | 18:00–20:00 | May speak as the day’s accountability picture becomes clearer. |
| Late | 21:00–22:00 | Only fires when there is enough drama or insight to justify a late intervention. |

The endpoint returns a normal success response even when no message is sent. Reasons such as `outside_organic_window_slot`, `late_window_without_enough_drama`, `Organic window already used today`, `Daily limit reached`, or `NO_MESSAGE decision` should be treated as healthy outcomes, not failures.

## Drama-Driven Frequency

`CHALLENGE_STATE` now includes a daily drama calculation. The Warden’s daily ceiling is no longer a flat value. Quiet days should stay quiet; dramatic days get more oxygen.

| Drama Signal | Score Contribution |
|---|---:|
| Each life lost today | +3 |
| Each non-streak milestone hit today | +2 |
| Each streak milestone hit today | +2 |
| Each sharp insight shared today | +1 |
| Each participant who logged after 20:00 UTC | +1 |

The total score determines the maximum number of Warden messages for the day.

| `daily_drama_score` | Maximum Warden Messages Today |
|---:|---:|
| 0–2 | 2 |
| 3–5 | 3 |
| 6+ | 4 |

The absolute daily hard cap is **4 messages**. The Warden may still send fewer. A day with no life losses, no milestones, and no sharp group insight may only produce one message or none at all.

## tRPC Webhook Endpoints

All Warden endpoints are public and callable by Make.com without authentication.

### Run Scheduled Cycle

**Endpoint:** `POST /api/trpc/warden.runCycle`

**Purpose:** Give the Warden a chance to speak during an organic window. The backend checks the randomized slot, the daily drama score, the dynamic cap, and whether that window has already had a decision today.

**Request body:**

```json
{
  "source": "make-organic-window"
}
```

**Message sent response:**

```json
{
  "success": true,
  "messageGenerated": true,
  "messageSent": true,
  "message": "Day 12. Marcus lost a life before lunch. The scoreboard has started naming names.",
  "timestamp": "2026-05-06T12:30:00.000Z"
}
```

**Healthy skip response:**

```json
{
  "success": true,
  "messageGenerated": false,
  "messageSent": false,
  "reason": "outside_organic_window_slot",
  "timestamp": "2026-05-06T10:30:00.000Z"
}
```

**Example curl:**

```bash
curl -X POST https://sixplusone-hpubf4au.manus.space/api/trpc/warden.runCycle \
  -H "Content-Type: application/json" \
  -d '{"source":"make-organic-window"}'
```

### Trigger Immediate Message

**Endpoint:** `POST /api/trpc/warden.triggerImmediate`

**Purpose:** Trigger an immediate Warden response for high-signal events such as a life loss, milestone, streak, or emergency manual call. Immediate triggers still respect the drama-driven daily limit.

**Request body:**

```json
{
  "triggerType": "life_loss",
  "context": {
    "participantName": "Marcus",
    "livesRemaining": 3,
    "timestamp": "2026-05-06T12:25:00.000Z"
  },
  "source": "make-event"
}
```

| Trigger Type | Use Case |
|---|---|
| `life_loss` | A participant has lost a life. |
| `milestone` | The group has hit Day 10, 25, 40, or 50. |
| `streak` | A participant has hit a 7, 14, or 21-day streak. |
| `emergency` | Manual intervention by the operator. |

### Get Challenge State

**Endpoint:** `GET /api/trpc/warden.getState`

**Purpose:** Inspect the Warden’s live data, including the drama score and supporting signals.

```bash
curl https://sixplusone-hpubf4au.manus.space/api/trpc/warden.getState | jq .
```

The returned `state` includes `daily_drama_score`, `max_warden_messages_today`, `drama_score_breakdown`, `sharp_insights_shared_today`, and `late_logs_today` alongside the existing participant, life-loss, milestone, and chat context.

### Get Daily Stats

**Endpoint:** `GET /api/trpc/warden.getDailyStats`

**Purpose:** Monitor current Warden usage against the data-driven daily limit.

```json
{
  "success": true,
  "messagesSentToday": 2,
  "noMessageDecisions": 3,
  "dailyLimitHit": false,
  "dailyDramaScore": 6,
  "dailyMessageLimit": 4,
  "remainingMessages": 2,
  "timestamp": "2026-05-06T18:30:00.000Z"
}
```

## Make.com Workflow Setup

### Recommended Scheduler Pattern

Create one Make.com scenario that probes every 15 minutes inside the Warden windows. The backend’s randomized slot logic ensures that only one decision is used per window, even if Make probes several times.

| Window | Make Probe Times |
|---|---|
| Morning | Every 15 minutes from 07:00 to 08:45 UTC |
| Midday | Every 15 minutes from 12:00 to 13:45 UTC |
| Evening | Every 15 minutes from 18:00 to 19:45 UTC |
| Late | Every 15 minutes from 21:00 to 21:45 UTC |

If Make.com cannot express those windows in one scheduler module, create four scheduler routes or four scenarios using the same HTTP call. Do not return to a fixed every-two-hours cycle.

### HTTP Module

Add an HTTP `POST` module with this URL:

```text
https://sixplusone-hpubf4au.manus.space/api/trpc/warden.runCycle
```

Use this JSON body:

```json
{
  "source": "make-organic-window"
}
```

Make.com should not post to WhatsApp itself after this call. The backend posts through Whapi when `messageSent` is true and logs the result in `warden_messages` with `postedToWhatsapp: true`.

## Error Handling in Make

If the webhook returns `success: false`, Make should log the error, retry after five minutes, and alert the admin if the same failure happens repeatedly. If the webhook returns `success: true` with `messageSent: false`, Make should normally do nothing. That is usually the Warden choosing silence.

```json
{
  "success": false,
  "error": "Database unavailable",
  "timestamp": "2026-05-06T12:30:00.000Z"
}
```

## Testing

Use the scheduled runner test only when you are inside one of the randomized active slots. Outside the slot, a skip response is expected.

```bash
curl -X POST https://sixplusone-hpubf4au.manus.space/api/trpc/warden.runCycle \
  -H "Content-Type: application/json" \
  -d '{"source":"test-organic-window"}'
```

For event-specific tests, use the immediate trigger endpoint.

```bash
curl -X POST https://sixplusone-hpubf4au.manus.space/api/trpc/warden.triggerImmediate \
  -H "Content-Type: application/json" \
  -d '{
    "triggerType": "life_loss",
    "context": {"participantName": "Test User"},
    "source": "test-manual"
  }'
```

Inspect the current drama score and cap with:

```bash
curl https://sixplusone-hpubf4au.manus.space/api/trpc/warden.getDailyStats | jq .
```

## Monitoring and Logging

All Warden decisions are logged in the `warden_messages` table. Commentary messages posted to WhatsApp are saved with `postedToWhatsapp: true`. `NO_MESSAGE` decisions and scheduler skips are saved as surveillance or system decisions where appropriate.

| Field | Meaning |
|---|---|
| `mode` | `commentary`, `surveillance`, `on_ramp`, or `system`. |
| `content` | The Warden text or `NO_MESSAGE`. |
| `sourceEvent` | The trigger source, such as `scheduled_runner_morning` or `immediate_life_loss`. |
| `postedToWhatsapp` | Whether the message was actually sent to WhatsApp. |
| `createdAt` | Timestamp of the decision. |

## Operating Principle

The Warden should feel like someone who has been watching all day and chooses the right moment. Make.com is only the clock. The backend is the judgment layer. If the day is quiet, the Warden stays mostly quiet. If the day breaks open, the Warden has permission to speak up to four times.
