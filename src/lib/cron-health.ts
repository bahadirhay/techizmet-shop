import "server-only";

import { mergeSiteSettings } from "@/lib/merge-site-settings";
import { parseSiteSettings, type SiteSettings } from "@/lib/site-settings";
import { prisma } from "@/lib/prisma";

export type CronJobId =
  | "cartAbandonmentRemind"
  | "marketplaceOrders"
  | "blogAutomation"
  | "gscSync"
  | "seoDistribution";

export type CronRunRecord = {
  jobId: CronJobId;
  lastRunAt: string;
  ok: boolean;
  durationMs?: number;
  summary?: Record<string, unknown>;
  error?: string;
};

export type CronHealthSnapshot = {
  secretConfigured: boolean;
  jobs: Partial<Record<CronJobId, CronRunRecord>>;
  schedules: Record<CronJobId, string>;
};

const SCHEDULES: Record<CronJobId, string> = {
  cartAbandonmentRemind:
    "Harici zamanlayıcı (Hobby: günde 1×) — GET /api/cron/cart-abandonment/remind?secret=CRON_SECRET",
  marketplaceOrders: "Harici zamanlayıcı / manuel — GET /api/cron/marketplace/orders?secret=CRON_SECRET",
  blogAutomation:
    "Harici zamanlayıcı — GET /api/cron/blog-automation/run?secret=CRON_SECRET (öneri: Pazartesi/Perşembe 09:00)",
  gscSync:
    "Harici zamanlayıcı — GET /api/cron/gsc/sync?secret=CRON_SECRET&days=7 (öneri: her gün 06:00)",
  seoDistribution:
    "Harici zamanlayıcı — GET /api/cron/seo/distribution?secret=CRON_SECRET (öneri: her gün 05:30)",
};

function getOps(settings: SiteSettings) {
  return settings.ops ?? {};
}

export async function recordCronRun(
  siteId: string,
  jobId: CronJobId,
  result: Omit<CronRunRecord, "jobId" | "lastRunAt"> & { lastRunAt?: string },
): Promise<void> {
  const site = await prisma.storeSite.findUnique({
    where: { id: siteId },
    select: { settingsJson: true },
  });
  if (!site) return;

  const current = parseSiteSettings(site.settingsJson);
  const record: CronRunRecord = {
    jobId,
    lastRunAt: result.lastRunAt ?? new Date().toISOString(),
    ok: result.ok,
    durationMs: result.durationMs,
    summary: result.summary,
    error: result.error,
  };

  const next = mergeSiteSettings(current, {
    ops: {
      ...getOps(current),
      cron: {
        ...getOps(current).cron,
        [jobId]: record,
      },
    },
  });

  await prisma.storeSite.update({
    where: { id: siteId },
    data: { settingsJson: JSON.stringify(next) },
  });
}

export async function loadCronHealth(siteId: string): Promise<CronHealthSnapshot> {
  const site = await prisma.storeSite.findUnique({
    where: { id: siteId },
    select: { settingsJson: true },
  });
  const settings = parseSiteSettings(site?.settingsJson ?? null);
  return {
    secretConfigured: Boolean(process.env.CRON_SECRET?.trim()),
    jobs: getOps(settings).cron ?? {},
    schedules: SCHEDULES,
  };
}

export function cronJobStale(record: CronRunRecord | undefined, maxAgeHours: number): boolean {
  if (!record?.lastRunAt) return true;
  const age = Date.now() - new Date(record.lastRunAt).getTime();
  return age > maxAgeHours * 60 * 60 * 1000;
}
