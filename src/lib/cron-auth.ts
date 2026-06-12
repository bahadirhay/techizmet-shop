/** Cron endpoint yetkilendirme — query secret veya Authorization: Bearer */

export function verifyCronRequest(req: Request): { ok: true } | { ok: false; status: number; error: string } {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return { ok: false, status: 503, error: "CRON_SECRET tanımlı değil" };
  }

  const isProd = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  const url = new URL(req.url);
  const querySecret = url.searchParams.get("secret")?.trim();
  const headerSecret = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (isProd && querySecret) {
    return { ok: false, status: 401, error: "Query secret disabled in production; use Authorization: Bearer" };
  }
  const provided = headerSecret || (!isProd ? querySecret : undefined);

  if (provided !== secret) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  return { ok: true };
}
