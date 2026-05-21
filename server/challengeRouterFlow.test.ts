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
  getParticipantHistory: vi.fn(),
  getLatestUnacknowledgedReleaseNote: vi.fn(),
  acknowledgeReleaseNoteForUser: vi.fn(),
  createCommunityCareReleaseNote: vi.fn(),
  logWardenMessage: vi.fn(),
  markPaymentReceived: vi.fn(),
  markRedemptionFulfilled: vi.fn(),
  rejectSignupRequest: vi.fn(),
  logAdminAction: vi.fn(),
  getAdminAuditLog: vi.fn(() => Promise.resolve([])),
  submitDailyLog: vi.fn(),
  triggerLifeLoss: vi.fn(),
  tryApplyGhostLife: vi.fn(),
  updateParticipantProfile: vi.fn(),
}));

vi.mock("./db", () => dbMocks);
vi.mock("./warden", () => ({
  generateWardenCommentary: vi.fn(),
}));
vi.mock("./releaseNoteGenerator", () => ({
  generateReleaseNoteInsight: vi.fn().mockResolvedValue({
    personalLayer: "You are building real momentum.",
    groupLayer: "The group is thriving together.",
    gameLayer: "Complete all 6 rules to unlock rotating bonuses.",
    redHighlights: ["All 6 rules = 50 pts + bonuses", "Streaks multiply your power"],
  }),
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

  it("saves an incomplete same-day log as a draft without manually creating a life-loss obligation", async () => {
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
    expect(dbMocks.triggerLifeLoss).not.toHaveBeenCalled();
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

  it("routes participant history through the viewer-aware helper", async () => {
    dbMocks.getParticipantByUserId.mockResolvedValue({ id: 7, displayName: "Marcus" });
    dbMocks.getParticipantHistory.mockResolvedValue([{ dayNumber: 3, noAlcohol: true, dayComplete: true }]);

    const caller = appRouter.createCaller(createParticipantContext());
    const result = await caller.challenge.participantHistory({ participantId: 12 });

    expect(result).toEqual([{ dayNumber: 3, noAlcohol: true, dayComplete: true }]);
    expect(dbMocks.getParticipantHistory).toHaveBeenCalledWith(12, 7);
  });

  it("routes release-note queries and acknowledgements through user-scoped helpers", async () => {
    dbMocks.getLatestUnacknowledgedReleaseNote.mockResolvedValue({ id: 5, title: "Edit Update", category: "edit" });
    dbMocks.acknowledgeReleaseNoteForUser.mockResolvedValue({ success: true });

    const caller = appRouter.createCaller(createParticipantContext());
    await expect(caller.challenge.latestReleaseNote()).resolves.toEqual({ id: 5, title: "Edit Update", category: "edit" });
    await expect(caller.challenge.acknowledgeReleaseNote({ releaseNoteId: 5 })).resolves.toEqual({ success: true });

    expect(dbMocks.getLatestUnacknowledgedReleaseNote).toHaveBeenCalledWith(42);
    expect(dbMocks.acknowledgeReleaseNoteForUser).toHaveBeenCalledWith(5, 42);
  });

  it("allows only founder admins to publish edit release notes", async () => {
    dbMocks.createCommunityCareReleaseNote.mockResolvedValue({ id: 9, title: "New Edit Note", active: true, category: "edit" });

    const adminCaller = appRouter.createCaller(createAdminContext());
    const result = await adminCaller.admin.createReleaseNote({
      title: "New Edit Note",
      versionLabel: "Edit 2",
      summary: "A clear summary for players.",
      body: "A longer body explaining the change kindly.",
      category: "edit",
      active: true,
    });

    expect(result).toEqual({ id: 9, title: "New Edit Note", active: true, category: "edit" });
    expect(dbMocks.createCommunityCareReleaseNote).toHaveBeenCalledWith(expect.objectContaining({ title: "New Edit Note", category: "edit", active: true }), 42);

    const participantCaller = appRouter.createCaller(createParticipantContext());
    await expect(participantCaller.admin.createReleaseNote({
      title: "Blocked Note",
      versionLabel: "Edit 3",
      summary: "Should not publish.",
      body: "Participants cannot publish update notes.",
      category: "edit",
      active: true,
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
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

  it("passes newBoostWins through from submitDailyLog when a day is locked in", async () => {
    dbMocks.getOrCreateParticipant.mockResolvedValue({ id: 7, displayName: "Marcus" });
    const boostWins = [
      { boostId: "clean_sweep", boostName: "CLEAN SWEEP", pointsAwarded: 6, wardenNote: "CLEAN SWEEP: completed all 6 rules today." },
    ];
    dbMocks.submitDailyLog.mockResolvedValue({
      complete: true,
      pointsAwarded: 50,
      missedRules: [],
      draftSaved: false,
      log: { id: 101, dayComplete: true },
      participant: { id: 7, totalPoints: 56 },
      newBoostWins: boostWins,
    });

    const caller = appRouter.createCaller(createParticipantContext());
    const result = await caller.challenge.submitMyDay({
      dayNumber: 1,
      noAlcohol: true,
      cleanEating: true,
      cleanEatingNote: "Clean day.",
      exerciseDuration: 35,
      exerciseType: "Run",
      exerciseProofUrl: "https://example.com/proof.jpg",
      reflectionText: "Stayed disciplined.",
      reflectionShared: false,
      readTeachText: "A useful insight on discipline and compounding behaviour.",
      trackedEverything: true,
    });

    expect(result.complete).toBe(true);
    expect(result.newBoostWins).toEqual(boostWins);
    expect(result.newBoostWins[0].boostId).toBe("clean_sweep");
    expect(result.newBoostWins[0].pointsAwarded).toBe(6);
  });

  it("allows only admins to generate AI community insight and blocks participants", async () => {
    dbMocks.getAppSnapshot.mockResolvedValue({
      logs: [],
      participants: [{ totalPoints: 200, currentStreak: 3 }, { totalPoints: 300, currentStreak: 5 }],
    });

    const adminCaller = appRouter.createCaller(createAdminContext());
    const result = await adminCaller.admin.generateCommunityInsight();
    expect(result).toMatchObject({
      personalLayer: expect.any(String),
      groupLayer: expect.any(String),
      gameLayer: expect.any(String),
      redHighlights: expect.any(Array),
    });

    const participantCaller = appRouter.createCaller(createParticipantContext());
    await expect((participantCaller.admin as any).generateCommunityInsight()).rejects.toThrow();
  });

  it("returns an empty newBoostWins array when a log is saved as a draft (not locked in)", async () => {
    dbMocks.getOrCreateParticipant.mockResolvedValue({ id: 7, displayName: "Marcus" });
    dbMocks.submitDailyLog.mockResolvedValue({
      complete: false,
      pointsAwarded: 0,
      missedRules: ["Track Everything"],
      draftSaved: true,
      log: { id: 102 },
      participant: { id: 7, totalPoints: 0 },
      newBoostWins: [],
    });

    const caller = appRouter.createCaller(createParticipantContext());
    const result = await caller.challenge.submitMyDay({
      dayNumber: 1,
      noAlcohol: true,
      cleanEating: true,
      cleanEatingNote: "Clean day.",
      exerciseDuration: 35,
      exerciseType: "Run",
      exerciseProofUrl: "",
      reflectionText: "Stayed disciplined.",
      reflectionShared: false,
      readTeachText: "A useful insight.",
      trackedEverything: false,
    });

    expect(result.complete).toBe(false);
    expect(result.newBoostWins).toEqual([]);
  });
});
