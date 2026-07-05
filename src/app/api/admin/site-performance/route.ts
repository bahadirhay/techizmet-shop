import { NextResponse } from "next/server";
import { optimizeSiteSeo } from "@/lib/admin/site-seo/optimizer";
import { runSeoDashboardFix } from "@/lib/admin/seo-dashboard/fix";
import { scanSitePerformance } from "@/lib/admin/site-performance/scan";
import { revalidateStorePublicCache } from "@/lib/cache/revalidate-store-public";
import { requireStaffApi } from "@/lib/staff-auth";

export async function GET() {
  const auth = await requireStaffApi("site.settings");
  if (auth instanceof NextResponse) return auth;
  const report = await scanSitePerformance(auth.siteId);
  return NextResponse.json(report);
}

export async function POST(req: Request) {
  const auth = await requireStaffApi("site.settings");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as {
    action?: "revalidate-cache" | "seo-optimize" | "seo-dashboard-fix" | "perf-apply-fixes";
  };

  if (body.action === "revalidate-cache" || body.action === "perf-apply-fixes") {
    revalidateStorePublicCache(auth.siteId);
    return NextResponse.json({ ok: true, scan: await scanSitePerformance(auth.siteId) });
  }

  if (body.action === "seo-optimize") {
    const result = await optimizeSiteSeo(auth.siteId);
    revalidateStorePublicCache(auth.siteId);
    return NextResponse.json({
      ok: true,
      optimize: { updated: result.updated },
      scan: await scanSitePerformance(auth.siteId),
    });
  }

  if (body.action === "seo-dashboard-fix") {
    let processed = 0;
    let succeeded = 0;
    const errors: string[] = [];
    for (let i = 0; i < 12; i++) {
      const batch = await runSeoDashboardFix(auth.siteId, { target: "products", limit: 5 });
      processed += batch.processed;
      succeeded += batch.succeeded;
      errors.push(...batch.errors);
      if (batch.processed === 0) break;
    }
    revalidateStorePublicCache(auth.siteId);
    return NextResponse.json({
      ok: errors.length === 0,
      fix: { processed, succeeded, errors },
      scan: await scanSitePerformance(auth.siteId),
    });
  }

  return NextResponse.json({ error: "Geçersiz action" }, { status: 400 });
}
