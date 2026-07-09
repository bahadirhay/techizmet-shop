import { createHmac, timingSafeEqual } from "node:crypto";
import { resolveSessionSecret } from "@/lib/session-secret";

const TOKEN_TTL_MS = 30 * 60 * 1000;

function sign(payload: string): string {
  return createHmac("sha256", resolveSessionSecret()).update(payload).digest("base64url");
}

/** Kart ödeme intent — sipariş oluşturulmadan önce güvenli erişim */
export function issueCardIntentToken(intentId: string, reference: string): string {
  const exp = Date.now() + TOKEN_TTL_MS;
  const body = `${intentId}:${reference}:${exp}`;
  return `${body}.${sign(body)}`;
}

export function verifyCardIntentToken(
  token: string,
  intentId: string,
  reference: string,
): boolean {
  const trimmed = token.trim();
  const dot = trimmed.lastIndexOf(".");
  if (dot <= 0) return false;
  const body = trimmed.slice(0, dot);
  const sig = trimmed.slice(dot + 1);
  const expected = sign(body);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  } catch {
    return false;
  }

  const parts = body.split(":");
  if (parts.length !== 3) return false;
  const [id, ref, expRaw] = parts;
  if (id !== intentId || ref !== reference) return false;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  return true;
}
