import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  approveSignupRequest: vi.fn(),
  captureWhatsAppMessage: vi.fn(),
  createRedemption: vi.fn(),
  completeOnboarding: vi.fn(),
  createSignupRequest: vi.fn(),
  getAppSnapshot: vi.fn(),
  getCurrentChallengeDay: vi.fn(() => 1),
  getOrCreateParticipant: vi.fn(),
  getParticipantByUserId: vi.fn(),
  logWardenMessage: vi.fn(),
  markPaymentReceived: vi.fn(),
  markRedemptionFulfilled: vi.fn(),
  rejectSignupRequest: vi.fn(),
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

function createUserContext(role: "admin" | "user" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 42,
    openId: "participant-open-id",
    email: "participant@example.com",
    name: "Marcus",
    loginMethod: "manus",
    role,
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

function createParticipantContext(): TrpcContext {
  return createUserContext("user");
}

function createAdminContext(): TrpcContext {
  return createUserContext("admin");
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

  it("accepts email-only signup requests from the landing page", async () => {
    dbMocks.createSignupRequest.mockResolvedValue({
      id: 12,
      email: "newmember@example.com",
      status: "pending",
      source: "landing",
    });

    const caller = appRouter.createCaller(createParticipantContext());
    const result = await caller.signup.requestAccess({ email: " newmember@example.com ", source: "landing" });

    expect(result.success).toBe(true);
    expect(dbMocks.createSignupRequest).toHaveBeenCalledWith("newmember@example.com", "landing");
  });

  it("rejects invalid email-only signup requests before persistence", async () => {
    const caller = appRouter.createCaller(createParticipantContext());

    await expect(caller.signup.requestAccess({ email: "not-an-email", source: "landing" })).rejects.toThrow();
    expect(dbMocks.createSignupRequest).not.toHaveBeenCalled();
  });

  it("routes personalized onboarding through the completion helper", async () => {
    dbMocks.completeOnboarding.mockResolvedValue({ id: 9, displayName: "New Person", profilePhotoUrl: "/manus-storage/profile.jpg" });
    dbMocks.logWardenMessage.mockResolvedValue({ created: true });

    const caller = appRouter.createCaller(createParticipantContext());
    const result = await caller.challenge.completeOnboarding({
      displayName: "New Person",
      primaryGoal: "Build discipline",
      biggestObstacle: "Weekend drift",
      trainingLevel: "building",
      motivationStyle: "direct",
      profilePhotoDataUrl: "data:image/png;base64,aGVsbG8=",
    });

    expect(result.success).toBe(true);
    expect(dbMocks.completeOnboarding).toHaveBeenCalledWith(expect.objectContaining({ email: "participant@example.com" }), expect.objectContaining({ primaryGoal: "Build discipline" }));
    expect(dbMocks.logWardenMessage).toHaveBeenCalledWith(expect.objectContaining({ sourceEvent: "onboarding_complete" }));
  });

  it("rejects onboarding profile photos that are not supported data URLs before persistence", async () => {
    const caller = appRouter.createCaller(createParticipantContext());

    await expect(caller.challenge.completeOnboarding({
      displayName: "New Person",
      primaryGoal: "Build discipline",
      biggestObstacle: "Weekend drift",
      trainingLevel: "building",
      motivationStyle: "direct",
      profilePhotoDataUrl: "data:text/plain;base64,aGVsbG8=",
    })).rejects.toThrow();
    expect(dbMocks.completeOnboarding).not.toHaveBeenCalled();
  });

  it("routes founder signup approval and rejection through admin helpers", async () => {
    dbMocks.approveSignupRequest.mockResolvedValue(undefined);
    dbMocks.rejectSignupRequest.mockResolvedValue(undefined);

    const caller = appRouter.createCaller(createAdminContext());

    await expect(caller.admin.approveSignup({ requestId: 44 })).resolves.toEqual({ success: true });
    await expect(caller.admin.rejectSignup({ requestId: 45 })).resolves.toEqual({ success: true });
    expect(dbMocks.approveSignupRequest).toHaveBeenCalledWith(44, 42);
    expect(dbMocks.rejectSignupRequest).toHaveBeenCalledWith(45, 42);
  });
});
