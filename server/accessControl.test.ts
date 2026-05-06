import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(role: "user" | "admin" | null): TrpcContext {
  const user: AuthenticatedUser | null = role
    ? {
        id: role === "admin" ? 1 : 2,
        openId: `${role}-open-id`,
        email: `${role}@example.com`,
        name: role === "admin" ? "Founder" : "Participant",
        loginMethod: "manus",
        role,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      }
    : null;

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => undefined,
    } as unknown as TrpcContext["res"],
  };
}

describe("access control", () => {
  it("blocks unauthenticated users from participant challenge data", async () => {
    const caller = appRouter.createCaller(createContext(null));

    await expect(caller.challenge.snapshot()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("blocks normal participants from founder/admin payment controls", async () => {
    const caller = appRouter.createCaller(createContext("user"));

    await expect(caller.admin.confirmPayment({ paymentId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("filters admin-tagged users out of competitor snapshot collections", () => {
    const dbSource = readFileSync(new URL("./db.ts", import.meta.url), "utf8");

    expect(dbSource).toContain('role === "admin" ? null : await getOrCreateParticipant');
    expect(dbSource).toContain('const adminUserIds = new Set(allUsers.filter(user => user.role === "admin").map(user => user.id));');
    expect(dbSource).toContain('const allParticipants = rawParticipants.filter(participantRow => !adminUserIds.has(participantRow.userId));');
    expect(dbSource).toContain('const payments = rawPayments.filter(payment => participantIds.has(payment.participantId));');
    expect(dbSource).toContain('const redemptions = rawRedemptions.filter(redemption => participantIds.has(redemption.participantId));');
  });
});
