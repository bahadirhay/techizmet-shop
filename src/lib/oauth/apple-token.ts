import "server-only";

/** Apple token endpoint için client secret — .env APPLE_CLIENT_SECRET (Apple Developer JWT) */
export function resolveAppleClientSecret(): string {
  return process.env.APPLE_CLIENT_SECRET?.trim() || "";
}

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    return JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}
