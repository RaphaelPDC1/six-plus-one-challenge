import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as envModule from "../_core/env";
import { sendWardenMessage } from "./whatsappClient";

describe("Whapi WhatsApp Client", () => {
  beforeEach(() => {
    // Mock the ENV object
    vi.spyOn(envModule, "ENV", "get").mockReturnValue({
      appId: "",
      cookieSecret: "",
      databaseUrl: "",
      oAuthServerUrl: "",
      ownerOpenId: "",
      isProduction: false,
      forgeApiUrl: "",
      forgeApiKey: "",
      whapiToken: "test-token-12345",
      whapiGroupId: "120363406264492414@g.us",
      makeWebhookUrl: "",
    } as any);

    // Mock fetch globally
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should send a message to Whapi with correct headers and body", async () => {
    const mockFetch = global.fetch as any;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: vi.fn().mockResolvedValueOnce(""),
    });

    const testMessage = "Day 12. The group has lost 3 lives.";
    await sendWardenMessage(testMessage);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://gate.whapi.cloud/messages/text",
      {
        method: "POST",
        headers: {
          "Authorization": "Bearer test-token-12345",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: "120363406264492414@g.us",
          body: testMessage,
        }),
      }
    );
  });

  it("should throw an error if Whapi returns a non-ok response", async () => {
    const mockFetch = global.fetch as any;
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: vi.fn().mockResolvedValueOnce("Unauthorized"),
    });

    const testMessage = "Test message";

    await expect(sendWardenMessage(testMessage)).rejects.toThrow(
      "Whapi send failed: Unauthorized"
    );
  });

  it("should handle network errors gracefully", async () => {
    const mockFetch = global.fetch as any;
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const testMessage = "Test message";

    await expect(sendWardenMessage(testMessage)).rejects.toThrow(
      "Network error"
    );
  });

  it("should use environment variables for token and group ID", async () => {
    const mockFetch = global.fetch as any;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: vi.fn().mockResolvedValueOnce(""),
    });

    vi.spyOn(envModule, "ENV", "get").mockReturnValue({
      appId: "",
      cookieSecret: "",
      databaseUrl: "",
      oAuthServerUrl: "",
      ownerOpenId: "",
      isProduction: false,
      forgeApiUrl: "",
      forgeApiKey: "",
      whapiToken: "custom-token-xyz",
      whapiGroupId: "999999999999999999@g.us",
      makeWebhookUrl: "",
    } as any);

    const testMessage = "Custom group test";
    await sendWardenMessage(testMessage);

    const callArgs = mockFetch.mock.calls[0][1];
    expect(callArgs.headers.Authorization).toBe("Bearer custom-token-xyz");
    expect(JSON.parse(callArgs.body).to).toBe("999999999999999999@g.us");
  });
});
