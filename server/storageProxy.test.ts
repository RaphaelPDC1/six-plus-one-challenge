import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("storage proxy video playback support", () => {
  const source = readFileSync(new URL("./_core/storageProxy.ts", import.meta.url), "utf8");

  it("infers video MIME types instead of serving uploaded videos as octet-stream", () => {
    expect(source).toContain('if (lower.endsWith(".mp4") || lower.endsWith(".m4v")) return "video/mp4";');
    expect(source).toContain('if (lower.endsWith(".webm")) return "video/webm";');
    expect(source).toContain('if (lower.endsWith(".mov")) return "video/quicktime";');
  });

  it("forwards byte-range requests and exposes range headers for HTML video playback", () => {
    expect(source).toContain("const range = req.headers.range;");
    expect(source).toContain("headers: range ? { Range: range } : undefined");
    expect(source).toContain('res.status(assetResp.status === 206 ? 206 : 200);');
    expect(source).toContain('res.set("Accept-Ranges", assetResp.headers.get("accept-ranges") || "bytes");');
    expect(source).toContain('setPassthroughHeader(res, assetResp, "content-range");');
  });

  it("streams storage assets instead of buffering full videos before responding", () => {
    expect(source).toContain("Readable.fromWeb(assetResp.body as any)");
    expect(source).toContain(".pipe(res)");
    expect(source).toContain('app.head("/manus-storage/*"');
  });
});
