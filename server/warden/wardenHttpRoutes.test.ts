import express from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getChallengeState } from "./challengeState";
import { getMessagesCountToday, getNoMessageCountToday, hasHitDailyLimit } from "./messageLogger";
import { runWardenCycle, triggerImmediateMessage } from "./runner";
import { registerWardenHttpRoutes } from "./wardenHttpRoutes";

vi.mock("./runner", () => ({
  runWardenCycle: vi.fn(),
  triggerImmediateMessage: vi.fn(),
}));

vi.mock("./messageLogger", () => ({
  getMessagesCountToday: vi.fn(),
  getNoMessageCountToday: vi.fn(),
  hasHitDailyLimit: vi.fn(),
}));

vi.mock("./challengeState", () => ({
  getChallengeState: vi.fn(),
}));

async function requestApp(path: string, options: RequestInit = {}) {
  const app = express();
  app.use(express.json());
  registerWardenHttpRoutes(app);

  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();

  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Could not start test server");
  }

  try {
    return await fetch(`http://127.0.0.1:${address.port}${path}`, options);
  } finally {
    server.close();
  }
}

describe("Warden HTTP routes for Make.com", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-07T08:45:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("exposes a flat scheduled run response for Make.com", async () => {
    vi.mocked(runWardenCycle).mockResolvedValue({
      messageGenerated: false,
      messageSent: false,
      message: undefined,
      reason: "outside_organic_window_slot",
    });

    const response = await requestApp("/api/warden/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "make-http-test" }),
    });

    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      success: true,
      messageGenerated: false,
      messageSent: false,
      reason: "outside_organic_window_slot",
      source: "make-http-test",
      timestamp: "2026-05-07T08:45:00.000Z",
    });
    expect(runWardenCycle).toHaveBeenCalledTimes(1);
  });

  it("validates immediate trigger types before calling the runner", async () => {
    const response = await requestApp("/api/warden/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ triggerType: "bad_trigger" }),
    });

    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toContain("Invalid triggerType");
    expect(triggerImmediateMessage).not.toHaveBeenCalled();
  });

  it("exposes flat daily Warden stats for Make.com monitoring", async () => {
    vi.mocked(getMessagesCountToday).mockResolvedValue(1);
    vi.mocked(getNoMessageCountToday).mockResolvedValue(2);
    vi.mocked(getChallengeState).mockResolvedValue({
      daily_drama_score: 6,
      max_warden_messages_today: 4,
    } as Awaited<ReturnType<typeof getChallengeState>>);
    vi.mocked(hasHitDailyLimit).mockResolvedValue(false);

    const response = await requestApp("/api/warden/stats");
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      success: true,
      messagesSentToday: 1,
      noMessageDecisions: 2,
      dailyLimitHit: false,
      dailyDramaScore: 6,
      dailyMessageLimit: 4,
      remainingMessages: 3,
      timestamp: "2026-05-07T08:45:00.000Z",
    });
    expect(hasHitDailyLimit).toHaveBeenCalledWith(4);
  });
});
