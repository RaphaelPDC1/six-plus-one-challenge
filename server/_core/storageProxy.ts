import type { Express, Request, Response } from "express";
import { Readable } from "node:stream";
import { ENV } from "./env";

function inferContentType(key: string, upstreamContentType: string | null) {
  if (upstreamContentType && !upstreamContentType.includes("application/octet-stream")) {
    return upstreamContentType;
  }

  const lower = key.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".mp4") || lower.endsWith(".m4v")) return "video/mp4";
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".mov")) return "video/quicktime";
  return upstreamContentType || "application/octet-stream";
}

function cachePolicyForKey(key: string) {
  const lower = key.toLowerCase();
  const isVisualMedia = /\.(png|jpe?g|webp|svg|gif|mp4|m4v|webm|mov)$/i.test(lower);

  if (!isVisualMedia) {
    return "private, max-age=300";
  }

  return "public, max-age=86400, stale-while-revalidate=604800";
}

function decodeStorageKey(rawKey: string | undefined) {
  if (!rawKey) return "";
  try {
    return decodeURIComponent(rawKey);
  } catch {
    return rawKey;
  }
}

function setPassthroughHeader(res: Response, assetResp: globalThis.Response, headerName: string) {
  const value = assetResp.headers.get(headerName);
  if (value) res.set(headerName, value);
}

async function streamStorageAsset(req: Request, res: Response, rawKey: string | undefined) {
  const key = decodeStorageKey(rawKey);
  if (!key) {
    res.status(400).send("Missing storage key");
    return;
  }

  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
    res.status(500).send("Storage proxy not configured");
    return;
  }

  try {
    const forgeUrl = new URL(
      "v1/storage/presign/get",
      ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
    );
    forgeUrl.searchParams.set("path", key);

    const forgeResp = await fetch(forgeUrl, {
      headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
    });

    if (!forgeResp.ok) {
      const body = await forgeResp.text().catch(() => "");
      console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
      res.status(502).send("Storage backend error");
      return;
    }

    const { url } = (await forgeResp.json()) as { url: string };
    if (!url) {
      res.status(502).send("Empty signed URL from backend");
      return;
    }

    const range = req.headers.range;
    const assetResp = await fetch(url, {
      headers: range ? { Range: range } : undefined,
    });
    if (!assetResp.ok) {
      const body = await assetResp.text().catch(() => "");
      console.error(`[StorageProxy] asset fetch error: ${assetResp.status} ${body}`);
      res.status(502).send("Storage asset fetch error");
      return;
    }

    const contentType = inferContentType(key, assetResp.headers.get("content-type"));

    res.status(assetResp.status === 206 ? 206 : 200);
    res.set("Accept-Ranges", assetResp.headers.get("accept-ranges") || "bytes");
    res.set("Cache-Control", cachePolicyForKey(key));
    res.set("Content-Type", contentType);
    res.set("X-Content-Type-Options", "nosniff");
    res.set("Vary", "Accept-Encoding, Range");
    setPassthroughHeader(res, assetResp, "content-length");
    setPassthroughHeader(res, assetResp, "content-range");
    setPassthroughHeader(res, assetResp, "etag");
    setPassthroughHeader(res, assetResp, "last-modified");

    if (req.method === "HEAD") {
      res.end();
      return;
    }

    if (!assetResp.body) {
      res.end();
      return;
    }

    Readable.fromWeb(assetResp.body as any)
      .on("error", error => {
        console.error("[StorageProxy] stream failed:", error);
        if (!res.headersSent) res.status(502);
        res.end();
      })
      .pipe(res);
  } catch (err) {
    console.error("[StorageProxy] failed:", err);
    res.status(502).send("Storage proxy error");
  }
}

export function registerStorageProxy(app: Express) {
  app.get("/api/storage-image/*", async (req, res) => {
    await streamStorageAsset(req, res, (req.params as Record<string, string | undefined>)[0]);
  });
  app.head("/api/storage-image/*", async (req, res) => {
    await streamStorageAsset(req, res, (req.params as Record<string, string | undefined>)[0]);
  });

  app.get("/manus-storage/*", async (req, res) => {
    await streamStorageAsset(req, res, (req.params as Record<string, string | undefined>)[0]);
  });
  app.head("/manus-storage/*", async (req, res) => {
    await streamStorageAsset(req, res, (req.params as Record<string, string | undefined>)[0]);
  });
}
