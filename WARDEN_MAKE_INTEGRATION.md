# Warden + Make.com Integration Guide

This document describes how to integrate the Warden bot with Make.com for scheduled message generation and WhatsApp posting via Whapi.Cloud.

## Architecture

```
Make.com (Scheduler) 
  ↓ (every 2 hours, 06:00–22:00 GMT)
tRPC Webhook: /api/trpc/warden.runCycle
  ↓
Claude API (Warden message generation)
  ↓
Whapi.Cloud (WhatsApp Business API)
  ↓
WhatsApp Group Chat
```

## tRPC Webhook Endpoints

All Warden endpoints are **public** and callable by Make.com without authentication.

### 1. Run Scheduled Cycle

**Endpoint:** `POST /api/trpc/warden.runCycle`

**Purpose:** Generate a Warden message based on the current challenge state and post it to WhatsApp (if warranted).

**Request Body (JSON):**
```json
{
  "source": "make-scheduler"
}
```

**Response:**
```json
{
  "success": true,
  "messageGenerated": true,
  "messageSent": true,
  "message": "Day 12. Marcus — life 3 gone. The group has now lost 4 lives total.",
  "timestamp": "2026-05-06T12:30:00.000Z"
}
```

**Example curl:**
```bash
curl -X POST https://sixplusone-hpubf4au.manus.space/api/trpc/warden.runCycle \
  -H "Content-Type: application/json" \
  -d '{"source":"make-scheduler"}'
```

**Response Codes:**
- `200 OK` — Message generated (may or may not have been sent)
- `400 Bad Request` — Invalid input
- `500 Internal Server Error` — Database or LLM error

### 2. Trigger Immediate Message

**Endpoint:** `POST /api/trpc/warden.triggerImmediate`

**Purpose:** Trigger an immediate Warden message for a specific event (life loss, milestone, etc.).

**Request Body (JSON):**
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

**Supported Trigger Types:**
- `life_loss` — A participant lost a life
- `milestone` — A milestone was hit (Day 10, 25, 40, 50)
- `streak` — A participant hit a streak milestone (7, 14, 21 days)
- `emergency` — Manual emergency trigger

**Response:**
```json
{
  "success": true,
  "messageSent": true,
  "message": "Day 12. Marcus — life 3 gone. The group has now lost 4 lives total.",
  "triggerType": "life_loss",
  "timestamp": "2026-05-06T12:25:00.000Z"
}
```

**Example curl:**
```bash
curl -X POST https://sixplusone-hpubf4au.manus.space/api/trpc/warden.triggerImmediate \
  -H "Content-Type: application/json" \
  -d '{
    "triggerType": "life_loss",
    "context": {
      "participantName": "Marcus",
      "livesRemaining": 3
    },
    "source": "make-event"
  }'
```

### 3. Get Challenge State

**Endpoint:** `GET /api/trpc/warden.getState`

**Purpose:** Retrieve the current challenge state for debugging/monitoring.

**Response:**
```json
{
  "success": true,
  "state": {
    "challenge_day": 12,
    "participants": [...],
    "group_average_completion": 0.85,
    "recent_chat_messages": [...],
    "lives_lost_today": [...],
    "milestones_hit_today": [...]
  },
  "timestamp": "2026-05-06T12:30:00.000Z"
}
```

**Example curl:**
```bash
curl https://sixplusone-hpubf4au.manus.space/api/trpc/warden.getState
```

### 4. Get Daily Stats

**Endpoint:** `GET /api/trpc/warden.getDailyStats`

**Purpose:** Get today's message count and daily limit status.

**Response:**
```json
{
  "success": true,
  "messagesSentToday": 2,
  "noMessageDecisions": 5,
  "dailyLimitHit": false,
  "remainingMessages": 1,
  "timestamp": "2026-05-06T12:30:00.000Z"
}
```

**Example curl:**
```bash
curl https://sixplusone-hpubf4au.manus.space/api/trpc/warden.getDailyStats
```

## Make.com Workflow Setup

### Step 1: Create a Scheduled Trigger

1. In Make.com, create a new scenario
2. Add a **Scheduler** module set to trigger every 2 hours (06:00–22:00 GMT)
3. Configure the schedule:
   - Repeat: Every 2 hours
   - Start time: 06:00 GMT
   - End time: 22:00 GMT

### Step 2: Call runCycle Webhook

1. Add an **HTTP** module (POST request)
2. Set URL to: `https://sixplusone-hpubf4au.manus.space/api/trpc/warden.runCycle`
3. Set body to:
   ```json
   {
     "source": "make-scheduler"
   }
   ```
4. Map the response to extract `message` and `messageSent` fields

### Step 3: Post to WhatsApp via Whapi

1. Add a **Whapi.Cloud** module (or HTTP POST to Whapi API)
2. If message was sent (`messageSent === true`):
   - Post the message to the WhatsApp group
   - Use the Whapi API token (provided separately)
   - Target the group chat ID

### Step 4: Log Results (Optional)

1. Add a **Google Sheets** or database module to log:
   - Timestamp
   - Message content
   - Whether it was sent
   - Any errors

## Daily Limit Enforcement

The Warden has a hard limit of **3 unprompted messages per day**. This is enforced at the backend level:

- Each call to `runCycle` or `triggerImmediate` checks the daily limit
- If 3 messages have already been posted today, the endpoint returns `messageSent: false`
- The daily count resets at midnight GMT

**To monitor the daily limit:**
```bash
curl https://sixplusone-hpubf4au.manus.space/api/trpc/warden.getDailyStats
```

## Error Handling in Make

If the webhook returns `success: false`, Make should:
1. Log the error to a monitoring channel
2. Retry after 5 minutes (configurable)
3. Alert the admin if it fails 3 times in a row

Example error response:
```json
{
  "success": false,
  "error": "Database unavailable",
  "timestamp": "2026-05-06T12:30:00.000Z"
}
```

## Testing

### Test the scheduled runner:
```bash
curl -X POST https://sixplusone-hpubf4au.manus.space/api/trpc/warden.runCycle \
  -H "Content-Type: application/json" \
  -d '{"source":"test-manual"}'
```

### Test an immediate trigger:
```bash
curl -X POST https://sixplusone-hpubf4au.manus.space/api/trpc/warden.triggerImmediate \
  -H "Content-Type: application/json" \
  -d '{
    "triggerType": "life_loss",
    "context": {"participantName": "Test User"},
    "source": "test-manual"
  }'
```

### Check current state:
```bash
curl https://sixplusone-hpubf4au.manus.space/api/trpc/warden.getState | jq .
```

## Whapi.Cloud Integration

Once you have the Whapi API token, integrate it with Make.com:

1. In Make, add a **Whapi.Cloud** module or use HTTP POST
2. Endpoint: `https://api.whapi.cloud/messages/text`
3. Headers:
   - `Authorization: Bearer {WHAPI_API_TOKEN}`
   - `Content-Type: application/json`
4. Body:
   ```json
   {
     "to": "{WHATSAPP_GROUP_ID}",
     "body": "{MESSAGE_CONTENT}"
   }
   ```

The `MESSAGE_CONTENT` should come from the `message` field returned by `warden.runCycle`.

## Monitoring & Logging

All Warden messages are logged to the `warden_messages` table in Supabase:
- `mode`: "commentary" or "surveillance"
- `content`: The message text
- `sourceEvent`: Where the message came from (e.g., "make-scheduler", "make-event")
- `postedToWhatsapp`: Whether it was actually posted
- `createdAt`: Timestamp

You can query this table to audit all Warden activity.

## Next Steps

1. Set up Whapi.Cloud account and get API token
2. Create Make.com scenario with scheduler + webhook calls
3. Test with manual triggers
4. Deploy and monitor for 24 hours
5. Adjust trigger thresholds based on message frequency
