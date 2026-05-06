import type { Express, Request, Response } from "express";
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
  return upstreamContentType || "application/octet-stream";
}

function cachePolicyForKey(key: string) {
  const lower = key.toLowerCase();
  const isImage = /\.(png|jpe?g|webp|svg|gif)$/i.test(lower);

  if (!isImage) {
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

    const assetResp = await fetch(url);
    if (!assetResp.ok) {
      const body = await assetResp.text().catch(() => "");
      console.error(`[StorageProxy] asset fetch error: ${assetResp.status} ${body}`);
      res.status(502).send("Storage asset fetch error");
      return;
    }

    const contentType = inferContentType(key, assetResp.headers.get("content-type"));
    const contentLength = assetResp.headers.get("content-length");
    const etag = assetResp.headers.get("etag");
    const lastModified = assetResp.headers.get("last-modified");

    res.status(200);
    res.set("Cache-Control", cachePolicyForKey(key));
    res.set("Content-Type", contentType);
    res.set("X-Content-Type-Options", "nosniff");
    res.set("Vary", "Accept-Encoding");
    if (contentLength) res.set("Content-Length", contentLength);
    if (etag) res.set("ETag", etag);
    if (lastModified) res.set("Last-Modified", lastModified);

    const arrayBuffer = await assetResp.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error("[StorageProxy] failed:", err);
    res.status(502).send("Storage proxy error");
  }
}

export function registerStorageProxy(app: Express) {
  app.get("/api/storage-image/*", async (req, res) => {
    await streamStorageAsset(req, res, (req.params as Record<string, string | undefined>)[0]);
  });

  app.get("/manus-storage/*", async (req, res) => {
    await streamStorageAsset(req, res, (req.params as Record<string, string | undefined>)[0]);
  });
}
