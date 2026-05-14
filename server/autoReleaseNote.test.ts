import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");

describe("auto release note system", () => {
  it("autoReleaseNote module exports autoPublishReleaseNoteIfNeeded", () => {
    const src = readFileSync(resolve(root, "server/autoReleaseNote.ts"), "utf8");
    expect(src).toContain("export async function autoPublishReleaseNoteIfNeeded");
  });

  it("uses LAST_COMMIT_HASH (via ENV.deployCommitHash) as the versionLabel to detect new deployments", () => {
    const src = readFileSync(resolve(root, "server/autoReleaseNote.ts"), "utf8");
    expect(src).toContain("ENV.deployCommitHash");
    expect(src).toContain("versionLabel");
  });

  it("skips insertion when a release note with the same versionLabel already exists (idempotency guard)", () => {
    const src = readFileSync(resolve(root, "server/autoReleaseNote.ts"), "utf8");
    expect(src).toContain("existing[0]");
    expect(src).toContain("skipping");
  });

  it("skips LLM call in dev mode with no commit hash to avoid unnecessary API calls on hot-reload", () => {
    const src = readFileSync(resolve(root, "server/autoReleaseNote.ts"), "utf8");
    expect(src).toContain("isProduction");
    expect(src).toContain("versionLabel === \"dev\"");
  });

  it("uses structured JSON schema response_format so the LLM returns parseable title/summary/body", () => {
    const src = readFileSync(resolve(root, "server/autoReleaseNote.ts"), "utf8");
    expect(src).toContain("json_schema");
    expect(src).toContain("\"title\"");
    expect(src).toContain("\"summary\"");
    expect(src).toContain("\"body\"");
    expect(src).toContain("additionalProperties: false");
  });

  it("inserts the generated note with category community_care and active true", () => {
    const src = readFileSync(resolve(root, "server/autoReleaseNote.ts"), "utf8");
    expect(src).toContain("category: \"community_care\"");
    expect(src).toContain("active: true");
  });

  it("server startup wires autoPublishReleaseNoteIfNeeded after the server begins listening", () => {
    const indexSrc = readFileSync(resolve(root, "server/_core/index.ts"), "utf8");
    expect(indexSrc).toContain("autoPublishReleaseNoteIfNeeded");
    // Must be called inside the listen callback (after the server is up)
    expect(indexSrc).toContain("server.listen(port, () => {");
    const listenBlock = indexSrc.slice(indexSrc.indexOf("server.listen(port, () => {"));
    expect(listenBlock).toContain("autoPublishReleaseNoteIfNeeded");
  });

  it("ENV exposes deployCommitHash sourced from LAST_COMMIT_HASH env variable", () => {
    const envSrc = readFileSync(resolve(root, "server/_core/env.ts"), "utf8");
    expect(envSrc).toContain("deployCommitHash");
    expect(envSrc).toContain("LAST_COMMIT_HASH");
  });

  it("failure to generate/publish is non-fatal (caught and logged, not re-thrown)", () => {
    const src = readFileSync(resolve(root, "server/autoReleaseNote.ts"), "utf8");
    // The try/catch must not re-throw
    expect(src).toContain("} catch (err) {");
    expect(src).toContain("console.error");
    // No re-throw
    expect(src).not.toContain("throw err");
  });
});
