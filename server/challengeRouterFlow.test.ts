import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  captureWhatsAppMessage: vi.fn(),
  createRedemption: vi.fn(),
  getAppSnapshot: vi.fn(),
  getCurrentChallengeDay: vi.fn(() => 1),
  getOrCreateParticipant: vi.fn(),
  getParticipantByUserId: vi.fn(),
  logWardenMessage: vi.fn(),
  markPaymentReceived: vi.fn(),
  markRedemptionFulfilled: vi.fn(),
  submitDailyLog: vi.fn(),
  triggerLifeLoss: vi.fn(),
  tryApplyGhostLife: vi.fn(),
  updateParticipantProfile: vi.fn(),
}));

vi.mock("./db", () => dbMocks);
vi.mock("./warden", () => ({
  generateWardenCommentary: vi.fn(),
}));

import { appRouter } from "./routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createParticipantContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 42,
    openId: "participant-open-id",
    email: "participant@example.com",
    name: "Marcus",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as unknown as TrpcContext["res"],
  };
}

describe("challenge router flow", () => {
  beforeEach(() => {
    Object.values(dbMocks).forEach(mock => mock.mockReset());
    dbMocks.getCurrentChallengeDay.mockReturnValue(1);
  });

  it("creates a life-loss payment obligation when Track Everything is missed", async () => {
    dbMocks.getOrCreateParticipant.mockResolvedValue({ id: 7, displayName: "Marcus" });
    dbMocks.submitDailyLog.mockResolvedValue({
      complete: false,
      pointsAwarded: 0,
      missedRules: ["Track Everything"],
      log: { id: 99 },
    });
    dbMocks.triggerLifeLoss.mockResolvedValue({ livesRemaining: 3 });

    const caller = appRouter.createCaller(createParticipantContext());
    const result = await caller.challenge.submitMyDay({
      dayNumber: 12,
      noAlcohol: true,
      cleanEating: true,
      cleanEatingNote: "Clean day.",
      exerciseDuration: 30,
      exerciseType: "Run",
      exerciseProofUrl: "https://example.com/proof.jpg",
      reflectionText: "Stayed disciplined.",
      reflectionShared: true,
      readTeachText: "A useful insight on discipline and compounding behaviour.",
      trackedEverything: false,
    });

    expect(result.complete).toBe(false);
    expect(dbMocks.submitDailyLog).toHaveBeenCalledWith(7, expect.objectContaining({ trackedEverything: false }));
    expect(dbMocks.triggerLifeLoss).toHaveBeenCalledWith(7, "Missed rule(s): Track Everything", 99);
  });

  it("routes Ghost Life redemption through the one-time persistence helper", async () => {
    dbMocks.getParticipantByUserId.mockResolvedValue({
      id: 7,
      displayName: "Marcus",
      livesRemaining: 2,
      ghostLifeUsed: false,
    });
    dbMocks.tryApplyGhostLife.mockResolvedValue({ applied: true, livesRemaining: 3 });

    const caller = appRouter.createCaller(createParticipantContext());
    const result = await caller.challenge.applyGhostLife({ exerciseDuration: 60, insightCount: 2 });

    expect(result).toEqual({ applied: true, livesRemaining: 3 });
    expect(dbMocks.tryApplyGhostLife).toHaveBeenCalledWith(7, 60, 2);
  });
});
