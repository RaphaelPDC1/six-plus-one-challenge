import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const routerSource = readFileSync(new URL("./warden/wardenRouters.ts", import.meta.url), "utf8");
const homeSource = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");

describe("Warden Mood private reflection context", () => {
  it("passes private reflection logs into the mood context for the selected participant", () => {
    expect(routerSource).toContain("privateReflectionText");
    expect(routerSource).toContain("privateReflectionChars");
    expect(routerSource).toContain("String(log.reflectionText ?? \"\").trim()");
    expect(routerSource).toContain("logs.slice(-8)");
  });

  it("tells the Warden to use private reflections as context without exposing raw sensitive lines", () => {
    expect(routerSource).toContain("private reflection log");
    expect(routerSource).toContain("Private reflections are personal context for that participant only");
    expect(routerSource).toContain("do not quote sensitive raw reflection lines");
    expect(routerSource).toContain("write as if the text is public");
  });

  it("keeps Warden Mood locked to the owner participant unless the caller is admin", () => {
    expect(routerSource).toContain("ctx.user.role !== \"admin\"");
    expect(routerSource).toContain("String(ownParticipant?.id) !== String(targetParticipantId)");
    expect(routerSource).toContain("Warden Mood only reads your own logs unless you are the challenge admin");
  });

  it("reuses a stable recent mood when the participant context has not changed", () => {
    expect(routerSource).toContain("const wardenMoodCache = new Map");
    expect(routerSource).toContain("WARDEN_MOOD_CACHE_TTL_MS = 6 * 60 * 60 * 1000");
    expect(routerSource).toContain("stableMoodFingerprint(moodContext)");
    expect(routerSource).toContain("if (stableMood) return stableMood");
    expect(routerSource).toContain("rememberStableMood(cacheKey, fingerprint");
  });

  it("keeps the previous frontend mood visible instead of flashing a fallback during harmless refetches", () => {
    expect(homeSource).toContain("staleTime: 6 * 60 * 60 * 1000");
    expect(homeSource).toContain("refetchOnWindowFocus: false");
    expect(homeSource).toContain("refetchOnReconnect: false");
    expect(homeSource).toContain("placeholderData: previousMood => previousMood");
  });
});
