import "server-only";

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { ADMIN_PASSWORD, ADMIN_USERNAME, SESSION_SECRET } from "@/lib/env";

/**
 * Session handling for the single admin account.
 *
 * There is one fixed credential, so there is no user table — instead the login
 * hands out a cookie containing an expiry stamped with an HMAC. Nothing in the
 * cookie is secret; what matters is that it cannot be forged or extended
 * without SESSION_SECRET.
 */

const COOKIE = "penta_admin";
const MAX_AGE_SECONDS = 60 * 60 * 8; // one working day

function sign(payload: string): string {
  return crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
}

/** Constant-time compare that tolerates mismatched lengths. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Checks a submitted username/password against the configured pair.
 * Both comparisons run every time so a wrong username and a wrong password
 * take the same amount of work.
 */
export function credentialsValid(username: string, password: string): boolean {
  const userOk = safeEqual(username, ADMIN_USERNAME);
  const passOk = safeEqual(password, ADMIN_PASSWORD);
  return userOk && passOk;
}

export async function startSession(): Promise<void> {
  const expires = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = String(expires);
  const store = await cookies();

  store.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

/** True when the request carries a cookie we issued that has not expired. */
export function isValidToken(token: string | undefined): boolean {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  if (!safeEqual(signature, sign(payload))) return false;

  const expires = Number(payload);
  return Number.isFinite(expires) && expires > Date.now();
}

export async function isSignedIn(): Promise<boolean> {
  const store = await cookies();
  return isValidToken(store.get(COOKIE)?.value);
}

export const SESSION_COOKIE = COOKIE;
