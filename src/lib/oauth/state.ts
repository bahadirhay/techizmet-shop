import "server-only";

import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import type { OAuthProvider } from "@/lib/oauth/config";

const COOKIE_PREFIX = "kn_oauth_";

export async function issueOAuthState(provider: OAuthProvider, returnTo: string) {
  const token = randomBytes(24).toString("hex");
  const jar = await cookies();
  jar.set(`${COOKIE_PREFIX}${provider}`, `${token}:${returnTo}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return token;
}

export async function consumeOAuthState(provider: OAuthProvider, token: string) {
  const jar = await cookies();
  const name = `${COOKIE_PREFIX}${provider}`;
  const raw = jar.get(name)?.value;
  jar.delete(name);
  if (!raw) return null;
  const idx = raw.indexOf(":");
  if (idx < 0) return null;
  const stored = raw.slice(0, idx);
  const returnTo = raw.slice(idx + 1);
  if (stored !== token) return null;
  return returnTo || "/account";
}
