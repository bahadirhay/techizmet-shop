import { createHmac, timingSafeEqual } from "node:crypto";
import { resolveSessionSecret } from "@/lib/session-secret";

const TOKEN_TTL_MS = 30 * 60 * 1000;

function sign(payload: string): string {
  return createHmac("sha256", resolveSessionSecret()).update(payload).digest("base64url");
}

/** Checkout sonrası PayTR init — sipariş numarası tahminini engeller */
export function issuePaytrInitToken(orderId: string, orderNumber: string): string {
  const exp = Date.now() + TOKEN_TTL_MS;
  const body = `${orderId}:${orderNumber}:${exp}`;
  return `${body}.${sign(body)}`;
}

export function verifyPaytrInitToken(
  token: string,
  orderId: string,
  orderNumber: string,
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
  const [id, num, expRaw] = parts;
  if (id !== orderId || num !== orderNumber) return false;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  return true;
}
