import type { Express } from "express";
import { ENV } from "./env";
import { storageGetSignedUrl } from "../storage";

// Only needed when S3_PUBLIC_URL isn't set (private bucket): mint a
// short-lived signed GET URL and redirect to it, so raw S3 credentials
// never reach the browser.
export function registerStorageProxy(app: Express) {
  app.get("/storage/*", async (req, res) => {
    if (ENV.s3.publicUrl) {
      res.status(404).send("Storage proxy disabled: S3_PUBLIC_URL is set");
      return;
    }

    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    try {
      const url = await storageGetSignedUrl(key);
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
