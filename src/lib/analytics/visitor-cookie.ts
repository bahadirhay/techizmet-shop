import { randomUUID } from "node:crypto";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

export const VISITOR_COOKIE = "kn_vid";
export const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function newVisitorKey(): string {
  return randomUUID().replace(/-/g, "");
}

export function visitorCookieOptions(): Partial<ResponseCookie> {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: VISITOR_COOKIE_MAX_AGE,
    path: "/",
  };
}
