import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { notifyMakeWebhook } from "./makeNotifier";

describe("Make.com Webhook Notifier", () => {
  beforeEach(() => {
    process.env.MAKE_WEBHOOK_URL = "https://hook.eu1.make.com/test-webhook-url";
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.MAKE_WEBHOOK_URL;
  });

  it("should send a webhook notification for life loss", async () => {
    const mockFetch = global.fetch as any;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: vi.fn().mockResolvedValueOnce(""),
    });

    await notifyMakeWebhook({
      reason: "life_lost",
      participant: "Alice",
      details: { lives_remaining: 3 },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://hook.eu1.make.com/test-webhook-url",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: "life_lost",
          participant: "Alice",
          details: { lives_remaining: 3 },
        }),
      }
    );
  });

  it("should send a webhook notification for milestone", async () => {
    const mockFetch = global.fetch as any;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: vi.fn().mockResolvedValueOnce(""),
    });

    await notifyMakeWebhook({
      reason: "milestone",
      details: { milestone: "day_7_complete" },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://hook.eu1.make.com/test-webhook-url",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: "milestone",
          details: { milestone: "day_7_complete" },
        }),
      }
    );
  });

  it("should handle webhook failures gracefully", async () => {
    const mockFetch = global.fetch as any;
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: vi.fn().mockResolvedValueOnce("Bad request"),
    });

    // Should throw when webhook fails
    await expect(
      notifyMakeWebhook({ reason: "life_lost" })
    ).rejects.toThrow();
  });

  it("should skip webhook if MAKE_WEBHOOK_URL is not configured", async () => {
    delete process.env.MAKE_WEBHOOK_URL;
    const mockFetch = global.fetch as any;

    await notifyMakeWebhook({ reason: "life_lost" });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should send webhook for all trigger reasons", async () => {
    const mockFetch = global.fetch as any;
    mockFetch.mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValueOnce(""),
    });

    const reasons = ["life_lost", "milestone", "streak", "one_life_remaining", "ghost_life"] as const;

    for (const reason of reasons) {
      await notifyMakeWebhook({ reason });
    }

    expect(mockFetch).toHaveBeenCalledTimes(5);
  });
});
