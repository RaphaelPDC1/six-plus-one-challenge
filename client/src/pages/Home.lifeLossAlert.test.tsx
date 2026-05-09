import { describe, expect, it } from "vitest";
import { isLifeLossPaymentEvent, selectNewLifeLossAlertEvent } from "./Home";

describe("life-loss alert event selection", () => {
  const participants = [
    { id: 1, displayName: "Nae", livesRemaining: 3 },
    { id: 2, displayName: "Lando", livesRemaining: 4 },
    { id: 3, displayName: "Lord", livesRemaining: 4 },
  ];

  it("keeps new-player join/onboarding records out of the life-loss alert scheme", () => {
    expect(isLifeLossPaymentEvent({
      id: 100,
      participantId: 2,
      amountPence: 2500,
      status: "pending",
      reason: "New player joined the challenge",
      createdAt: "2026-05-09T09:00:00.000Z",
    }, participants)).toBe(false);

    expect(isLifeLossPaymentEvent({
      id: 101,
      participantId: 3,
      amountPence: 2500,
      status: "pending",
      reason: "Registration/onboarding completed",
      createdAt: "2026-05-09T09:01:00.000Z",
    }, participants)).toBe(false);
  });

  it("selects only a genuine unseen life-loss payment event", () => {
    const selected = selectNewLifeLossAlertEvent([
      {
        id: 201,
        participantId: 2,
        amountPence: 2500,
        status: "pending",
        reason: "Lando joined the platform",
        createdAt: "2026-05-09T11:05:00.000Z",
      },
      {
        id: 202,
        participantId: 1,
        amountPence: 2500,
        status: "pending",
        reason: "Deadline passed for day 2. Missed rule(s): Exercise",
        createdAt: "2026-05-09T11:04:00.000Z",
      },
    ], participants, []);

    expect(selected?.id).toBe(202);
  });

  it("does not reselect Nae's alert after its event id has already been seen", () => {
    const selected = selectNewLifeLossAlertEvent([
      {
        id: 301,
        participantId: 1,
        amountPence: 2500,
        status: "pending",
        reason: "Deadline passed for day 2. Missed rule(s): Track Everything",
        createdAt: "2026-05-09T11:04:00.000Z",
      },
    ], participants, ["301"]);

    expect(selected).toBeNull();
  });
});
