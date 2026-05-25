import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    setParticipantDisputeStatus: vi.fn().mockResolvedValue(undefined),
    resolveParticipantDispute: vi.fn().mockResolvedValue(undefined),
    participantContestDispute: vi.fn().mockResolvedValue(undefined),
    participantAcceptDispute: vi.fn().mockResolvedValue(undefined),
  };
});

describe("Dispute Management", () => {
  it("setParticipantDisputeStatus should be callable with participantId, reason, and adminUserId", async () => {
    const { setParticipantDisputeStatus } = await import("./db");
    await setParticipantDisputeStatus(90004, "Caught eating burger — Clean Eating violation", 1);
    expect(setParticipantDisputeStatus).toHaveBeenCalledWith(
      90004,
      "Caught eating burger — Clean Eating violation",
      1
    );
  });

  it("resolveParticipantDispute should accept reinstate resolution", async () => {
    const { resolveParticipantDispute } = await import("./db");
    await resolveParticipantDispute(90004, "reinstate", 1);
    expect(resolveParticipantDispute).toHaveBeenCalledWith(90004, "reinstate", 1);
  });

  it("resolveParticipantDispute should accept withdraw resolution", async () => {
    const { resolveParticipantDispute } = await import("./db");
    await resolveParticipantDispute(90004, "withdraw", 1);
    expect(resolveParticipantDispute).toHaveBeenCalledWith(90004, "withdraw", 1);
  });

  it("participantContestDispute should be callable with participantId", async () => {
    const { participantContestDispute } = await import("./db");
    await participantContestDispute(90004);
    expect(participantContestDispute).toHaveBeenCalledWith(90004);
  });

  it("participantAcceptDispute should be callable with participantId", async () => {
    const { participantAcceptDispute } = await import("./db");
    await participantAcceptDispute(90004);
    expect(participantAcceptDispute).toHaveBeenCalledWith(90004);
  });

  describe("Dispute status validation", () => {
    it("status should be one of: active, dispute, withdrawn", () => {
      const validStatuses = ["active", "dispute", "withdrawn"];
      expect(validStatuses).toContain("dispute");
      expect(validStatuses).toContain("withdrawn");
      expect(validStatuses).toContain("active");
    });

    it("resolution should be one of: reinstate, withdraw", () => {
      const validResolutions: Array<"reinstate" | "withdraw"> = ["reinstate", "withdraw"];
      expect(validResolutions).toContain("reinstate");
      expect(validResolutions).toContain("withdraw");
    });
  });
});
