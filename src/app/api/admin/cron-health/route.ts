import { NextResponse } from "next/server";
import { cronJobStale, loadCronHealth, type CronJobId } from "@/lib/cron-health";
import { requireStaffApi } from "@/lib/staff-auth";

export async function GET() {
  const auth = await requireStaffApi("store.dashboard");
  if (auth instanceof NextResponse) return auth;

  const health = await loadCronHealth(auth.siteId);
  const stale: Partial<Record<CronJobId, boolean>> = {
    cartAbandonmentRemind: cronJobStale(health.jobs.cartAbandonmentRemind, 26),
    marketplaceOrders: cronJobStale(health.jobs.marketplaceOrders, 48),
    blogAutomation: cronJobStale(health.jobs.blogAutomation, 96),
    gscSync: cronJobStale(health.jobs.gscSync, 30),
    seoDistribution: cronJobStale(health.jobs.seoDistribution, 26),
  };

  return NextResponse.json({ ...health, stale });
}
