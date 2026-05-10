import { describe, expect, it } from "vitest";
import { sanitizeSharedDailyLog } from "./db";

describe("private reflection visibility", () => {
  it("redacts private reflection text from shared participant-card log data", () => {
    const sharedLog = sanitizeSharedDailyLog({
      id: 44,
      participantId: 7,
      dayNumber: 9,
      reflectionText: "This is a private personal reflection that must not appear on cards.",
      reflectionShared: true,
      readTeachText: "A public learning note",
    });

    expect(sharedLog.privateReflectionLogged).toBe(true);
    expect(sharedLog.reflectionText).toBe("");
    expect(sharedLog.reflectionPreview).toBe("");
    expect(JSON.stringify(sharedLog)).not.toContain("private personal reflection");
  });

  it("does not mark an empty reflection as privately logged", () => {
    const sharedLog = sanitizeSharedDailyLog({
      id: 45,
      participantId: 7,
      dayNumber: 10,
      reflectionText: " ",
    });

    expect(sharedLog.privateReflectionLogged).toBe(false);
    expect(sharedLog.reflectionText).toBe("");
  });
});
