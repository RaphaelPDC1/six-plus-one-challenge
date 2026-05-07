import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const routerSource = readFileSync(new URL("./warden/wardenRouters.ts", import.meta.url), "utf8");

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
});
