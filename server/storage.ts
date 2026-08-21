// Direct S3-compatible storage (AWS S3, Cloudflare R2, Backblaze B2, MinIO...).
// No third-party proxy involved: we hold the credentials and talk to the
// bucket ourselves via the AWS SDK.

import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import { ENV } from "./_core/env";

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (_client) return _client;
  const { region, endpoint, accessKeyId, secretAccessKey } = ENV.s3;
  if (!ENV.s3.bucket || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Storage config missing: set S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY",
    );
  }
  _client = new S3Client({
    region,
    endpoint: endpoint || undefined,
    // Path-style addressing is required by most S3-compatible providers
    // (R2, MinIO, B2) that aren't AWS itself.
    forcePathStyle: Boolean(endpoint),
    credentials: { accessKeyId, secretAccessKey },
  });
  return _client;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

function buildUrl(key: string): string {
  if (ENV.s3.publicUrl) {
    return `${ENV.s3.publicUrl.replace(/\/+$/, "")}/${key}`;
  }
  // Falls back to the server's own signed-redirect proxy at /storage/*.
  return `/storage/${key}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  await getClient().send(
    new PutObjectCommand({
      Bucket: ENV.s3.bucket,
      Key: key,
      Body: data,
      ContentType: contentType,
    }),
  );
  return { key, url: buildUrl(key) };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: buildUrl(key) };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({ Bucket: ENV.s3.bucket, Key: key }),
    { expiresIn: 3600 },
  );
}
