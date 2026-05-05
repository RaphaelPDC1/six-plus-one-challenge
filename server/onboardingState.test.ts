import { beforeEach, describe, expect, it, vi } from "vitest";

const { fakeDb, selectResults, drizzleMock } = vi.hoisted(() => {
  const selectResults: unknown[][] = [];
  const fakeDb = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => selectResults.shift() ?? []),
        })),
      })),
    })),
  };
  return {
    fakeDb,
    selectResults,
    drizzleMock: vi.fn(() => fakeDb),
  };
});

vi.mock("drizzle-orm/mysql2", () => ({
  drizzle: drizzleMock,
}));

describe("onboarding access state", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = "mysql://test";
    selectResults.length = 0;
    vi.clearAllMocks();
  });

  it("lets existing participants bypass the onboarding questionnaire", async () => {
    const { getOnboardingState } = await import("./db");
    const participant = { id: 7, userId: 42, displayName: "Existing Challenger" };
    selectResults.push([participant]);

    const state = await getOnboardingState({ id: 42, email: "known@example.com", role: "user" });

    expect(state).toEqual({ status: "ready", reason: "participant_exists", participant });
    expect(fakeDb.select).toHaveBeenCalledTimes(1);
  });

  it("lets approved signup emails bypass the onboarding gate", async () => {
    const { getOnboardingState } = await import("./db");
    selectResults.push([], [{ id: 3, email: "approved@example.com", status: "approved" }]);

    const state = await getOnboardingState({ id: 43, email: " APPROVED@example.com ", role: "user" });

    expect(state).toEqual({ status: "ready", reason: "approved_email", participant: null });
    expect(fakeDb.select).toHaveBeenCalledTimes(2);
  });

  it("requires the questionnaire when a user email is not recognized", async () => {
    const { getOnboardingState } = await import("./db");
    selectResults.push([], []);

    const state = await getOnboardingState({ id: 44, email: "new@example.com", role: "user" });

    expect(state).toEqual({ status: "questionnaire_required", reason: "email_not_recognized", participant: null });
    expect(fakeDb.select).toHaveBeenCalledTimes(2);
  });
});
