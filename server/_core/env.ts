export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",

  // The single blog owner's credentials. ADMIN_PASSWORD_HASH is a
  // scrypt "salt:hash" string — generate one with `pnpm run create-admin`.
  adminEmail: process.env.ADMIN_EMAIL ?? "",
  adminPasswordHash: process.env.ADMIN_PASSWORD_HASH ?? "",
  ownerOpenId: "owner",

  // Any S3-compatible bucket: AWS S3, Cloudflare R2, Backblaze B2, MinIO...
  s3: {
    bucket: process.env.S3_BUCKET ?? "",
    region: process.env.S3_REGION ?? "auto",
    endpoint: process.env.S3_ENDPOINT ?? "", // leave unset for real AWS S3
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
    // Optional: if the bucket is public or sits behind a CDN, set this to the
    // public base URL and photo links will point straight at it instead of
    // going through the server's /storage proxy.
    publicUrl: process.env.S3_PUBLIC_URL ?? "",
  },
};
