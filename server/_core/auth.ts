// Self-contained auth: one admin account (the blog owner), no external
// identity provider. Passwords are hashed with Node's built-in scrypt
// (no extra dependency). Sessions are a signed JWT cookie, same as before.

import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export type SessionPayload = { openId: string; name: string };

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, salt, 64);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function getSessionSecret() {
  if (!ENV.cookieSecret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return new TextEncoder().encode(ENV.cookieSecret);
}

export async function signSession(
  payload: SessionPayload,
  options: { expiresInMs?: number } = {},
): Promise<string> {
  const issuedAt = Date.now();
  const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
  const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
  return new SignJWT({ openId: payload.openId, name: payload.name })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(getSessionSecret());
}

export async function verifySession(
  cookieValue: string | undefined | null,
): Promise<SessionPayload | null> {
  if (!cookieValue) return null;
  try {
    const { payload } = await jwtVerify(cookieValue, getSessionSecret(), {
      algorithms: ["HS256"],
    });
    const { openId, name } = payload as Record<string, unknown>;
    if (!isNonEmptyString(openId)) return null;
    return { openId, name: isNonEmptyString(name) ? name : "" };
  } catch (error) {
    console.warn("[Auth] Session verification failed", String(error));
    return null;
  }
}

/**
 * Verify the login form's email + password against the single configured
 * admin account. Returns the session payload to sign on success.
 */
export function checkAdminCredentials(
  email: string,
  password: string,
): SessionPayload | null {
  if (!ENV.adminEmail || !ENV.adminPasswordHash) {
    console.error(
      "[Auth] ADMIN_EMAIL / ADMIN_PASSWORD_HASH are not configured.",
    );
    return null;
  }
  if (email.trim().toLowerCase() !== ENV.adminEmail.trim().toLowerCase()) {
    return null;
  }
  if (!verifyPassword(password, ENV.adminPasswordHash)) {
    return null;
  }
  return { openId: ENV.ownerOpenId, name: "Owner" };
}

function parseCookies(cookieHeader: string | undefined) {
  if (!cookieHeader) return new Map<string, string>();
  return new Map(Object.entries(parseCookieHeader(cookieHeader)));
}

export async function authenticateRequest(req: Request): Promise<User> {
  const cookies = parseCookies(req.headers.cookie);
  const sessionToken = cookies.get(COOKIE_NAME);
  const session = await verifySession(sessionToken);

  if (!session) {
    throw ForbiddenError("Invalid session cookie");
  }

  let user = await db.getUserByOpenId(session.openId);
  if (!user) {
    await db.upsertUser({
      openId: session.openId,
      name: session.name || "Owner",
      email: ENV.adminEmail || null,
      loginMethod: "password",
      role: "admin",
      lastSignedIn: new Date(),
    });
    user = await db.getUserByOpenId(session.openId);
  } else {
    await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
  }

  if (!user) {
    throw ForbiddenError("User not found");
  }

  return user;
}
