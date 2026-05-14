import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");

describe("life-loss sync and alert wiring", () => {
  it("finalizes overdue days for every participant before returning challenge snapshots", () => {
    const dbSource = readFileSync(resolve(root, "server/db.ts"), "utf8");

    expect(dbSource).toContain("export async function finalizeAllParticipantsPreviousDayIfNeeded");
    expect(dbSource).toContain("await finalizeAllParticipantsPreviousDayIfNeeded().catch");
    expect(dbSource).toContain("for (const participant of allParticipants)");
  });

  it("keeps Board and Overview snapshots fresh and shows a participant-facing life-loss overlay", () => {
    const homeSource = readFileSync(resolve(root, "client/src/pages/Home.tsx"), "utf8");

    expect(homeSource).toContain("refetchInterval: 60000");
    expect(homeSource).toContain("refetchOnReconnect: true");
    expect(homeSource).toContain("function LifeLossAlert");
    expect(homeSource).toContain('data-testid="life-loss-alert-overlay"');
    expect(homeSource).toContain('toast.error(`${participant?.displayName ?? "Someone"} lost a life`');
  });
});
