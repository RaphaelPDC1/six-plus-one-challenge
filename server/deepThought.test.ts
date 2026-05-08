import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

import { invokeLLM } from "./_core/llm";
import { buildDeepThoughtContext, clearDeepThoughtCacheForTests, fallbackDeepThought, generateDeepThoughtsForSnapshot } from "./deepThought";

const snapshot = {
  participants: [
    {
      id: 1,
      displayName: "CTM",
      primaryGoal: "Build disciplined consistency",
      biggestObstacle: "Busy work schedule and awkward practical details",
      supportNeeded: "Direct challenge when I drift",
      trainingLevel: "returning",
      livesRemaining: 4,
      currentStreak: 3,
      daysComplete: 5,
    },
    {
      id: 2,
      displayName: "Marcus Lane",
      primaryGoal: "Get fit for race day",
      biggestObstacle: "Weekend social pressure",
      supportNeeded: "Accountability around alcohol",
      trainingLevel: "advanced",
      livesRemaining: 2,
      currentStreak: 1,
      daysComplete: 3,
    },
  ],
  logs: [
    {
      id: 101,
      participantId: 1,
      dayNumber: 8,
      noAlcohol: true,
      cleanEating: true,
      exerciseDone: true,
      exerciseType: "run",
      exerciseDuration: 35,
      reflectionDone: true,
      reflectionText: "I was embarrassed about sorting chafe cream, but it kept the run honest.",
      readTeachDone: true,
      readTeachText: "Chafe cream prevented the small friction from becoming the reason I stopped.",
      trackedEverything: true,
      dayComplete: true,
      exerciseProofUrl: JSON.stringify([{ type: "image", url: "/proof/ctm.jpg" }]),
    },
    {
      id: 202,
      participantId: 2,
      dayNumber: 8,
      noAlcohol: true,
      cleanEating: false,
      exerciseDone: true,
      exerciseType: "gym",
      exerciseDuration: 45,
      reflectionDone: true,
      reflectionText: "Nearly bailed after work, but I showed up.",
      readTeachDone: true,
      readTeachText: "The rep I wanted to skip is the rep that tells the truth.",
      trackedEverything: true,
      dayComplete: false,
      exerciseProofUrl: JSON.stringify([{ type: "video", url: "/proof/marcus.mp4" }]),
    },
  ],
};

describe("Deep Thought contextual engine", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearDeepThoughtCacheForTests();
  });

  it("builds a safe context sequence from proof, quote, public profile signals, and private reflection signals", () => {
    const context = buildDeepThoughtContext(snapshot.participants[0], snapshot.logs[0], snapshot.logs);

    expect(context.proof.readTeachText).toContain("Chafe cream");
    expect(context.proof.proofMediaCount).toBe(1);
    expect(context.participantSignals.obstacleSignal).toBe("time pressure");
    expect(context.recentPattern.privateReflectionSignal).toContain("pressure");
    expect(context.requestedSequence).toHaveLength(4);
  });

  it("generates unique AI insights for each person using their own proof context", async () => {
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              items: [
                { logId: 101, insight: "CTM, the chafe-cream detail is the whole point: you removed the tiny friction before it could become a story about quitting, and that is discipline made practical." },
                { logId: 202, insight: "Marcus, this proof is not about one gym clip; it shows the rep after work beating the weekend pressure that normally tries to negotiate with your standards." },
              ],
            }),
          },
        },
      ],
    } as any);

    const thoughts = await generateDeepThoughtsForSnapshot(snapshot, [101, 202]);

    expect(thoughts["101"].insight).toContain("chafe-cream");
    expect(thoughts["202"].insight).toContain("gym");
    expect(thoughts["101"].insight).not.toEqual(thoughts["202"].insight);
    expect(thoughts["101"].source).toBe("ai");
    const llmPayload = vi.mocked(invokeLLM).mock.calls[0]?.[0]?.messages?.[1]?.content as string;
    expect(llmPayload).toContain("requestedSequence");
    expect(llmPayload).toContain("privateReflectionSignal");
  });

  it("caches stable insights for the same post and context fingerprint", async () => {
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              items: [
                { logId: 101, insight: "CTM, this is a stable contextual read that connects chafe cream, proof, and the choice to remove friction before the run started." },
              ],
            }),
          },
        },
      ],
    } as any);

    const first = await generateDeepThoughtsForSnapshot(snapshot, [101]);
    const second = await generateDeepThoughtsForSnapshot(snapshot, [101]);

    expect(first["101"].insight).toBe(second["101"].insight);
    expect(invokeLLM).toHaveBeenCalledTimes(1);
  });

  it("falls back to contextual copy without exposing raw private reflections when AI fails", async () => {
    vi.mocked(invokeLLM).mockRejectedValueOnce(new Error("LLM unavailable"));

    const thoughts = await generateDeepThoughtsForSnapshot({ ...snapshot, logs: [{ ...snapshot.logs[0], id: 303 }] }, [303]);

    expect(thoughts["303"].source).toBe("fallback");
    expect(thoughts["303"].insight).toContain("CTM");
    expect(thoughts["303"].insight).toContain("Chafe cream");
    expect(thoughts["303"].insight).not.toContain("embarrassed");
  });

  it("fallback copy still links the quote to the proof instead of generic motivation", () => {
    const context = buildDeepThoughtContext(snapshot.participants[0], snapshot.logs[0], snapshot.logs);
    const fallback = fallbackDeepThought(context);

    expect(fallback).toContain("Chafe cream");
    expect(fallback).toContain("35 minutes of run");
    expect(fallback).toContain("evidence");
  });
});
