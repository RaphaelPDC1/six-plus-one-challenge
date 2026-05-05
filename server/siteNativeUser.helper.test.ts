import { beforeEach, describe, expect, it, vi } from "vitest";

const drizzleMock = vi.hoisted(() => vi.fn());

vi.mock("drizzle-orm/mysql2", () => ({
  drizzle: drizzleMock,
}));

type InsertedUser = {
  openId: string;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  role?: "admin" | "user";
  lastSignedIn?: Date;
};

function createFakeDb(selectQueue: Array<InsertedUser[]>) {
  const insertedUsers: InsertedUser[] = [];
  const fakeDb = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => selectQueue.shift() ?? []),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn((values: InsertedUser) => {
        insertedUsers.push(values);
        return {
          onDuplicateKeyUpdate: vi.fn(async () => undefined),
        };
      }),
    })),
  };

  return { fakeDb, insertedUsers };
}

describe("createSiteNativeUser helper", () => {
  beforeEach(() => {
    vi.resetModules();
    drizzleMock.mockReset();
    process.env.DATABASE_URL = "mysql://unit-test";
  });

  it("creates a new site-native challenger when mode is register", async () => {
    const createdUser = {
      id: 101,
      openId: "site-native:new@example.com",
      name: "New Challenger",
      email: "new@example.com",
      loginMethod: "site-native",
      role: "user" as const,
      createdAt: new Date("2026-05-05T00:00:00.000Z"),
      lastSignedIn: new Date("2026-05-05T00:00:00.000Z"),
    };
    const { fakeDb, insertedUsers } = createFakeDb([[], [], [createdUser]]);
    drizzleMock.mockReturnValue(fakeDb);

    const { createSiteNativeUser } = await import("./db");
    const result = await createSiteNativeUser({
      email: " New@Example.com ",
      displayName: "New Challenger",
      mode: "register",
    });

    expect(result).toMatchObject({
      openId: "site-native:new@example.com",
      email: "new@example.com",
      loginMethod: "site-native",
      role: "user",
    });
    expect(insertedUsers).toHaveLength(1);
    expect(insertedUsers[0]).toMatchObject({
      openId: "site-native:new@example.com",
      email: "new@example.com",
      name: "New Challenger",
      loginMethod: "site-native",
      role: "user",
    });
  });

  it("rejects returning login for an unknown challenger email without creating a user", async () => {
    const { fakeDb, insertedUsers } = createFakeDb([[], []]);
    drizzleMock.mockReturnValue(fakeDb);

    const { createSiteNativeUser } = await import("./db");
    await expect(createSiteNativeUser({
      email: "unknown@example.com",
      displayName: "unknown@example.com",
      mode: "login",
    })).rejects.toThrow("Choose Register first");

    expect(insertedUsers).toHaveLength(0);
  });
});
