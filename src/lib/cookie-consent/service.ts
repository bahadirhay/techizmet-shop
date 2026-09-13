import "server-only";

import { prisma } from "@/lib/prisma";
import {
  DEFAULT_COOKIE_POLICY_VERSION,
  DEFAULT_COOKIE_RECONSENT_DAYS,
  DEFAULT_COOKIE_RETENTION_DAYS,
  parseCookieConsentConfig,
} from "@/lib/cookie-consent/config";
import type { CookieConsentStats } from "@/lib/cookie-consent/types";

function parsePrefs(raw: string | null): Record<string, boolean> {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(parsed)) out[k] = v === true;
    return out;
  } catch {
    return {};
  }
}

export async function buildCookieConsentStats(
  siteId: string,
  cookieConsentJson: string | null | undefined,
): Promise<CookieConsentStats> {
  const cfg = parseCookieConsentConfig(cookieConsentJson);
  const now = Date.now();
  const d7 = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const d30 = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const [grouped, uniqueAgg, last7, last30, recentPrefs] = await Promise.all([
    prisma.cookieConsentLog.groupBy({
      by: ["decision"],
      where: { siteId },
      _count: { _all: true },
    }),
    prisma.cookieConsentLog.findMany({
      where: { siteId },
      distinct: ["consentKey"],
      select: { consentKey: true },
    }),
    prisma.cookieConsentLog.count({ where: { siteId, createdAt: { gte: d7 } } }),
    prisma.cookieConsentLog.count({ where: { siteId, createdAt: { gte: d30 } } }),
    prisma.cookieConsentLog.findMany({
      where: { siteId },
      orderBy: { createdAt: "desc" },
      take: 2000,
      select: { decision: true, preferencesJson: true, consentKey: true, createdAt: true },
    }),
  ]);

  let accepted = 0;
  let rejected = 0;
  let custom = 0;
  let withdrawn = 0;
  for (const row of grouped) {
    const n = row._count._all;
    if (row.decision === "accepted") accepted = n;
    else if (row.decision === "rejected") rejected = n;
    else if (row.decision === "custom") custom = n;
    else if (row.decision === "withdrawn") withdrawn = n;
  }
  const total = accepted + rejected + custom + withdrawn;

  // Son karara göre cihaz başına opt-in (aynı cihazın en güncel kaydı)
  const latestByDevice = new Map<string, { decision: string; preferencesJson: string | null }>();
  for (const row of recentPrefs) {
    if (!latestByDevice.has(row.consentKey)) {
      latestByDevice.set(row.consentKey, {
        decision: row.decision,
        preferencesJson: row.preferencesJson,
      });
    }
  }

  let analyticsOptIn = 0;
  let marketingOptIn = 0;
  for (const row of latestByDevice.values()) {
    if (row.decision === "rejected" || row.decision === "withdrawn") continue;
    if (row.decision === "accepted") {
      analyticsOptIn += 1;
      marketingOptIn += 1;
      continue;
    }
    const prefs = parsePrefs(row.preferencesJson);
    if (prefs.analytics === true) analyticsOptIn += 1;
    if (prefs.marketing === true) marketingOptIn += 1;
  }

  const devices = latestByDevice.size || uniqueAgg.length;
  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);

  return {
    total,
    accepted,
    rejected,
    custom,
    withdrawn,
    acceptRate: pct(accepted, total),
    rejectRate: pct(rejected, total),
    analyticsOptIn,
    marketingOptIn,
    analyticsOptInRate: pct(analyticsOptIn, devices),
    marketingOptInRate: pct(marketingOptIn, devices),
    uniqueDevices: devices,
    last7Days: last7,
    last30Days: last30,
    currentPolicyVersion: cfg.policyVersion || DEFAULT_COOKIE_POLICY_VERSION,
    retentionDays: cfg.retentionDays ?? DEFAULT_COOKIE_RETENTION_DAYS,
    reconsentDays: cfg.reconsentDays ?? DEFAULT_COOKIE_RECONSENT_DAYS,
  };
}

export async function purgeExpiredCookieConsentLogs(
  siteId: string,
  retentionDays: number,
): Promise<number> {
  const days = Math.max(30, Math.min(retentionDays || DEFAULT_COOKIE_RETENTION_DAYS, 3650));
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const result = await prisma.cookieConsentLog.deleteMany({
    where: { siteId, createdAt: { lt: cutoff } },
  });
  return result.count;
}

export function cookieConsentLogsToCsv(
  rows: {
    createdAt: Date | string;
    decision: string;
    consentKey: string;
    policyVersion: string | null;
    source: string | null;
    locale: string | null;
    ipAddress: string | null;
    preferencesJson: string | null;
    userAgent: string | null;
  }[],
): string {
  const header = [
    "createdAt",
    "decision",
    "consentKey",
    "policyVersion",
    "source",
    "locale",
    "ipAddress",
    "preferencesJson",
    "userAgent",
  ];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [header.join(",")];
  for (const r of rows) {
    const created =
      typeof r.createdAt === "string" ? r.createdAt : r.createdAt.toISOString();
    lines.push(
      [
        created,
        r.decision,
        r.consentKey,
        r.policyVersion ?? "",
        r.source ?? "",
        r.locale ?? "",
        r.ipAddress ?? "",
        r.preferencesJson ?? "",
        r.userAgent ?? "",
      ]
        .map((cell) => escape(String(cell)))
        .join(","),
    );
  }
  return lines.join("\n");
}
