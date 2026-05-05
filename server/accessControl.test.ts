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
});
