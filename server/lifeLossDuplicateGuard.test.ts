import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");

describe("duplicate life-loss guard", () => {
  it("uses both participantId and dailyLogId in the existing-penalty check to close the TOCTOU race", () => {
    const dbSource = readFileSync(resolve(root, "server/db.ts"), "utf8");
    // The guard must filter on both columns so a concurrent request that already
    // inserted a row is visible before we attempt a second insert.
    expect(dbSource).toContain("eq(paymentEvents.participantId, participantId)");
    expect(dbSource).toContain("eq(paymentEvents.dailyLogId, log.id)");
    expect(dbSource).toContain("already_penalized");
  });

  it("schema defines a unique index on payment_events(participantId, dailyLogId) for DB-level protection", () => {
    const schemaSource = readFileSync(resolve(root, "drizzle/schema.ts"), "utf8");
    expect(schemaSource).toContain("payment_events_unique_penalty_idx");
    expect(schemaSource).toContain("uniqueIndex");
  });
});

describe("proof upload size limits", () => {
  it("server allows videos up to 50 MiB and images up to 10 MiB", () => {
    const routersSource = readFileSync(resolve(root, "server/routers.ts"), "utf8");
    // Limits expressed as MiB multiplications so they are unambiguous
    expect(routersSource).toContain("50 * 1024 * 1024");
    expect(routersSource).toContain("10 * 1024 * 1024");
    expect(routersSource).toContain("Proof video must be under 50MB.");
    expect(routersSource).toContain("Proof image must be under 10MB.");
  });

  it("frontend enforces the same 50 MiB / 10 MiB limits before sending to the server", () => {
    const homeSource = readFileSync(resolve(root, "client/src/pages/Home.tsx"), "utf8");
    expect(homeSource).toContain("50 * 1024 * 1024");
    expect(homeSource).toContain("10 * 1024 * 1024");
    expect(homeSource).toContain("Proof video must be under 50MB.");
    expect(homeSource).toContain("Proof image must be under 10MB.");
  });

  it("server dataUrl zod max accommodates 50 MiB video base64 overhead (~67M chars)", () => {
    const routersSource = readFileSync(resolve(root, "server/routers.ts"), "utf8");
    // 50 MiB × 4/3 ≈ 67M chars; the zod max must be at least 67_000_000
    // The pattern is z.string().max(70_000_000).regex(...)
    // Numeric separators (e.g. 70_000_000) mean we must allow underscores in the capture group
    const match = routersSource.match(/dataUrl: z\.string\(\)\.max\(([\d_]+)\)\.regex/);
    expect(match).not.toBeNull();
    const maxChars = parseInt(match![1].replace(/_/g, ""), 10);
    expect(maxChars).toBeGreaterThanOrEqual(67_000_000);
  });
});
