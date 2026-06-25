import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { runSeoDashboardFix } from "@/lib/admin/seo-dashboard/fix";
import { scanSearchIntents } from "@/lib/admin/search-intent/scan";
import { revalidateStorePublicCache } from "@/lib/cache/revalidate-store-public";
import { mergeSiteSettings } from "@/lib/merge-site-settings";
import { revalidateSearchDiscoveryPaths, runDistributionIndexPass } from "@/lib/seo/distribution-runner";
import { getSearchIntents } from "@/lib/seo/search-intent";
import { notifySearchEnginesForPath } from "@/lib/seo/notify-search-engines";
import { parseSiteSettings } from "@/lib/site-settings";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireStaffApi("site.settings");
  if (auth instanceof NextResponse) return auth;
  const scan = await scanSearchIntents(auth.siteId);
  return NextResponse.json(scan);
}

export async function POST(req: Request) {
  const auth = await requireStaffApi("site.settings");
  if (auth instanceof NextResponse) return auth;

  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  if (!site) return NextResponse.json({ error: "Site yok" }, { status: 404 });

  const body = (await req.json()) as { action?: "apply-meta" | "fix-products" | "run-indexing"; intentId?: string };
  const settings = parseSiteSettings(site.settingsJson);
  const intent = getSearchIntents(settings).find((i) => i.id === body.intentId) ?? getSearchIntents(settings)[0];
  if (!intent) return NextResponse.json({ error: "Hedef arama tanımı yok" }, { status: 400 });

  if (body.action === "apply-meta") {
    const staticPages = { ...(settings.seo?.staticPages ?? {}) };
    if (intent.staticPageKey) {
      staticPages[intent.staticPageKey] = {
        ...staticPages[intent.staticPageKey],
        seoTitle: intent.title,
        seoDescription: intent.description,
      };
    }
    const searchIntentMeta = { ...(settings.seo?.searchIntentMeta ?? {}) };
    searchIntentMeta[intent.id] = {
      seoTitle: intent.title,
      seoDescription: intent.description,
      appliedAt: new Date().toISOString(),
    };
    const next = mergeSiteSettings(settings, {
      seo: { ...settings.seo, staticPages, searchIntentMeta },
    });
    await prisma.storeSite.update({
      where: { id: auth.siteId },
      data: { settingsJson: JSON.stringify(next) },
    });
    try {
      revalidateStorePublicCache(auth.siteId);
    } catch {
      // revalidateTag yalnızca Next istek bağlamında çalışır
    }
    revalidatePath("/collections/all");
    revalidatePath("/collections/[slug]", "page");
    notifySearchEnginesForPath(intent.landingPath);
    return NextResponse.json({ ok: true, scan: await scanSearchIntents(auth.siteId) });
  }

  if (body.action === "fix-products") {
    let processed = 0;
    let succeeded = 0;
    const errors: string[] = [];
    for (let i = 0; i < 15; i++) {
      const batch = await runSeoDashboardFix(auth.siteId, { target: "products", limit: 5 });
      processed += batch.processed;
      succeeded += batch.succeeded;
      errors.push(...batch.errors);
      if (batch.processed === 0) break;
    }
    revalidateSearchDiscoveryPaths();
    notifySearchEnginesForPath(intent.landingPath);
    return NextResponse.json({
      ok: errors.length === 0,
      fix: { processed, succeeded, errors },
      scan: await scanSearchIntents(auth.siteId),
    });
  }

  if (body.action === "run-indexing") {
    const result = await runDistributionIndexPass(auth.siteId, settings);
    const next = mergeSiteSettings(settings, {
      seo: { ...settings.seo, distribution: result.distribution },
    });
    await prisma.storeSite.update({
      where: { id: auth.siteId },
      data: { settingsJson: JSON.stringify(next) },
    });
    revalidateSearchDiscoveryPaths();
    return NextResponse.json({ ok: result.ok, indexing: result, scan: await scanSearchIntents(auth.siteId) });
  }

  return NextResponse.json({ error: "Geçersiz action" }, { status: 400 });
}
