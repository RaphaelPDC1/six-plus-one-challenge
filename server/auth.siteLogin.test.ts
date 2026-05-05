import { beforeEach, describe, expect, it, vi } from "vitest";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

const siteUser = {
  id: 42,
  openId: "site-native:challenger@example.com",
  email: "challenger@example.com",
  name: "Challenger One",
  loginMethod: "site-native",
  role: "user" as const,
  createdAt: new Date("2026-05-05T00:00:00Z"),
  updatedAt: new Date("2026-05-05T00:00:00Z"),
  lastSignedIn: new Date("2026-05-05T00:00:00Z"),
};

const { createSiteNativeUserMock } = vi.hoisted(() => ({
  createSiteNativeUserMock: vi.fn(),
}));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    createSiteNativeUser: createSiteNativeUserMock,
    normalizeSignupEmail: vi.fn((email: string) => email.trim().toLowerCase()),
  };
});

vi.mock("./_core/sdk", () => ({
  sdk: {
    createSessionToken: vi.fn(async () => "signed-site-session"),
  },
}));

function createPublicContext(): { ctx: TrpcContext; cookies: Array<{ name: string; value: string; options: Record<string, unknown> }> } {
  const cookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
  return {
    cookies,
    ctx: {
      user: null,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {
        cookie: (name: string, value: string, options: Record<string, unknown>) => {
          cookies.push({ name, value, options });
        },
      } as unknown as TrpcContext["res"],
    },
  };
}

describe("auth.siteLogin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createSiteNativeUserMock.mockImplementation(async () => siteUser);
  });

  it("creates a site-native participant session without requiring Manus OAuth", async () => {
    const { appRouter } = await import("./routers");
    const { ctx, cookies } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.siteLogin({ email: " Challenger@Example.com ", displayName: "Challenger One", accessCode: "neverquit" });

    expect(createSiteNativeUserMock).toHaveBeenCalledWith({
      email: "challenger@example.com",
      displayName: "Challenger One",
      accessCode: "neverquit",
    });
    expect(result).toEqual({ success: true, user: siteUser });
    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toMatchObject({
      name: COOKIE_NAME,
      value: "signed-site-session",
      options: {
        secure: true,
        sameSite: "none",
        httpOnly: true,
        path: "/",
      },
    });
  });

  it("rejects weak or missing private access codes before issuing a session", async () => {
    const { appRouter } = await import("./routers");
    const { ctx, cookies } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.auth.siteLogin({ email: "challenger@example.com", displayName: "Challenger One", accessCode: "123" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(cookies).toHaveLength(0);
    expect(createSiteNativeUserMock).not.toHaveBeenCalled();
  });

  it("does not mint a cookie when the backend rejects an impersonation attempt", async () => {
    createSiteNativeUserMock.mockRejectedValueOnce(new Error("That email is already attached to a protected account."));
    const { appRouter } = await import("./routers");
    const { ctx, cookies } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.auth.siteLogin({ email: "founder@example.com", displayName: "Imposter", accessCode: "neverquit" })).rejects.toThrow("protected account");
    expect(cookies).toHaveLength(0);
  });

  it("keeps site-native users out of founder/admin controls", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller({
      ...createPublicContext().ctx,
      user: siteUser,
    });

    await expect(caller.admin.confirmPayment({ paymentId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
