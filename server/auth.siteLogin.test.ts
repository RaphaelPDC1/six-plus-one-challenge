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

  it("registers a site-native participant without requiring Manus OAuth or an access code", async () => {
    const { appRouter } = await import("./routers");
    const { ctx, cookies } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.siteLogin({ email: " Challenger@Example.com ", displayName: "Challenger One", mode: "register" });

    expect(createSiteNativeUserMock).toHaveBeenCalledWith({
      email: "challenger@example.com",
      displayName: "Challenger One",
      mode: "register",
    });
    expect(result).toEqual({ success: true, mode: "register", user: siteUser });
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

  it("lets returning challengers log in through the site without a private access code", async () => {
    const { appRouter } = await import("./routers");
    const { ctx, cookies } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.siteLogin({ email: "challenger@example.com", mode: "login" });

    expect(createSiteNativeUserMock).toHaveBeenCalledWith({
      email: "challenger@example.com",
      displayName: "challenger@example.com",
      mode: "login",
    });
    expect(result.mode).toBe("login");
    expect(cookies).toHaveLength(1);
  });

  it("does not mint a cookie when returning login rejects an unknown challenger email", async () => {
    createSiteNativeUserMock.mockRejectedValueOnce(new Error("No challenger account exists for that email yet. Choose Register first to create one."));
    const { appRouter } = await import("./routers");
    const { ctx, cookies } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.auth.siteLogin({ email: "new@example.com", mode: "login" })).rejects.toThrow("Choose Register first");
    expect(createSiteNativeUserMock).toHaveBeenCalledWith({
      email: "new@example.com",
      displayName: "new@example.com",
      mode: "login",
    });
    expect(cookies).toHaveLength(0);
  });

  it("does not mint a cookie when the backend rejects a protected-account impersonation attempt", async () => {
    createSiteNativeUserMock.mockRejectedValueOnce(new Error("That email is already attached to a protected founder/admin account."));
    const { appRouter } = await import("./routers");
    const { ctx, cookies } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.auth.siteLogin({ email: "founder@example.com", displayName: "Imposter", mode: "register" })).rejects.toThrow("protected founder/admin account");
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
