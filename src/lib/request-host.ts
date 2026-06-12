import "server-only";

import { headers } from "next/headers";

/** İstek host adı — Vercel x-forwarded-host öncelikli */
export async function getRequestHost(): Promise<string> {
  const h = await headers();
  const raw = h.get("x-forwarded-host") || h.get("host") || "";
  return raw.split(",")[0]?.trim().toLowerCase().split(":")[0] ?? "";
}
