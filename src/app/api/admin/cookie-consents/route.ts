import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import { parseSiteSettings } from "@/lib/site-settings";
import { parseCookieConsentConfig } from "@/lib/cookie-consent/config";
import {
  buildCookieConsentStats,
  purgeExpiredCookieConsentLogs,
} from "@/lib/cookie-consent/service";

export async function GET(req: Request) {
  const auth = await requireStaffApi("site.settings");
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const decision = url.searchParams.get("decision")?.trim() || "";
  const q = url.searchParams.get("q")?.trim() || "";
  const take = Math.min(Math.max(parseInt(url.searchParams.get("take") || "200", 10) || 200, 1), 500);

  const site = await prisma.storeSite.findUnique({
    where: { id: auth.siteId },
    select: { settingsJson: true },
  });
  const settings = parseSiteSettings(site?.settingsJson ?? null);
  const cfg = parseCookieConsentConfig(settings.cookieConsentJson);

  const purged = await purgeExpiredCookieConsentLogs(auth.siteId, cfg.retentionDays ?? 730);

  const where = {
    siteId: auth.siteId,
    ...(decision ? { decision } : {}),
    ...(q
      ? {
          OR: [
            { consentKey: { contains: q, mode: "insensitive" as const } },
            { ipAddress: { contains: q } },
            { policyVersion: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [rows, stats] = await Promise.all([
    prisma.cookieConsentLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
    }),
    buildCookieConsentStats(auth.siteId, settings.cookieConsentJson),
  ]);

  return NextResponse.json({
    purpose:
      "Bu kayıtlar KVKK ispat yükümlülüğü içindir. İletişim / pazarlama listesi değildir; IP veya cihaz anahtarıyla müşteriye ulaşılmaz.",
    purged,
    config: {
      policyVersion: cfg.policyVersion,
      retentionDays: cfg.retentionDays,
      reconsentDays: cfg.reconsentDays,
      enabled: cfg.enabled !== false,
    },
    stats,
    rows: rows.map((r) => ({
      id: r.id,
      consentKey: r.consentKey,
      decision: r.decision,
      preferences: r.preferencesJson,
      policyVersion: r.policyVersion,
      source: r.source,
      locale: r.locale,
      ipAddress: r.ipAddress,
      userAgent: r.userAgent,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
