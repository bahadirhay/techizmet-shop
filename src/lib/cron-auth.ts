/** Cron endpoint yetkilendirme — query secret veya Authorization: Bearer */

export function verifyCronRequest(req: Request): { ok: true } | { ok: false; status: number; error: string } {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return { ok: false, status: 503, error: "CRON_SECRET tanımlı değil" };
  }

  const url = new URL(req.url);
  const provided =
    url.searchParams.get("secret")?.trim() ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();

  if (provided !== secret) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  return { ok: true };
}
