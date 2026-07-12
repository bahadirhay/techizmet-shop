import { createHmac, timingSafeEqual } from "node:crypto";
import { resolveSessionSecret } from "@/lib/session-secret";

function sign(payload: string): string {
  return createHmac("sha256", resolveSessionSecret()).update(payload).digest("base64url");
}

/** Otomatik pazarlama e-postalarındaki "abonelikten çık" linki — süresiz geçerli */
export function issueUnsubscribeToken(siteId: string, email: string): string {
  const body = `${siteId}:${email.trim().toLowerCase()}`;
  const encoded = Buffer.from(body, "utf8").toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifyUnsubscribeToken(
  token: string,
): { siteId: string; email: string } | null {
  const trimmed = token.trim();
  const dot = trimmed.lastIndexOf(".");
  if (dot <= 0) return null;
  const encoded = trimmed.slice(0, dot);
  const sig = trimmed.slice(dot + 1);
  const expected = sign(encoded);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  let body: string;
  try {
    body = Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const idx = body.indexOf(":");
  if (idx <= 0) return null;
  const siteId = body.slice(0, idx);
  const email = body.slice(idx + 1);
  if (!siteId || !email) return null;
  return { siteId, email };
}
