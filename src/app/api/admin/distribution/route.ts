import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { DISTRIBUTION_PLATFORMS, DISTRIBUTION_CATEGORY_LABELS } from "@/lib/seo/distribution-catalog";
import { runDistributionIndexPass } from "@/lib/seo/distribution-runner";
import { getSiteDistribution, patchDistributionChecklistItem } from "@/lib/seo/distribution-settings";
import { indexNowKeyFileUrl, ensureIndexNowKey } from "@/lib/seo/indexnow";
import { aiProductsFeedUrl } from "@/lib/seo/ai-products-feed";
import { llmsTxtUrl } from "@/lib/seo/llms-builder";
import { blogFeedUrl } from "@/lib/seo/rss-feed";
import { getPublicSiteUrl } from "@/lib/seo/site-url";
import { mergeSiteSettings } from "@/lib/merge-site-settings";
import { parseSiteSettings } from "@/lib/site-settings";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireStaffApi("site.settings");
  if (auth instanceof NextResponse) return auth;

  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  if (!site) return NextResponse.json({ error: "Site yok" }, { status: 404 });

  const settings = parseSiteSettings(site.settingsJson);
  const distribution = getSiteDistribution(settings);
  const key = ensureIndexNowKey(distribution);

  return NextResponse.json({
    siteUrl: getPublicSiteUrl(),
    sitemapUrl: `${getPublicSiteUrl()}/sitemap.xml`,
    feedUrl: blogFeedUrl(),
    llmsTxtUrl: llmsTxtUrl(),
    productsJsonUrl: aiProductsFeedUrl(),
    indexNowKey: key,
    indexNowKeyFileUrl: indexNowKeyFileUrl(key),
    distribution,
    platforms: DISTRIBUTION_PLATFORMS,
    categoryLabels: DISTRIBUTION_CATEGORY_LABELS,
  });
}

export async function POST(req: Request) {
  const auth = await requireStaffApi("site.settings");
  if (auth instanceof NextResponse) return auth;

  const site = await prisma.storeSite.findUnique({ where: { id: auth.siteId } });
  if (!site) return NextResponse.json({ error: "Site yok" }, { status: 404 });

  const body = (await req.json()) as {
    action?: "run-indexing" | "mark-done" | "mark-skipped";
    platformId?: string;
    notes?: string;
  };

  const settings = parseSiteSettings(site.settingsJson);

  if (body.action === "mark-done" || body.action === "mark-skipped") {
    if (!body.platformId) {
      return NextResponse.json({ error: "platformId gerekli" }, { status: 400 });
    }
    const next = patchDistributionChecklistItem(settings, body.platformId, {
      status: body.action === "mark-done" ? "done" : "skipped",
      doneAt: new Date().toISOString(),
      notes: body.notes?.trim() || undefined,
    });
    await prisma.storeSite.update({
      where: { id: auth.siteId },
      data: { settingsJson: JSON.stringify(next) },
    });
    return NextResponse.json({ ok: true, distribution: getSiteDistribution(next) });
  }

  const result = await runDistributionIndexPass(auth.siteId, settings);
  const next = mergeSiteSettings(settings, {
    seo: {
      ...settings.seo,
      distribution: result.distribution,
    },
  });

  await prisma.storeSite.update({
    where: { id: auth.siteId },
    data: { settingsJson: JSON.stringify(next) },
  });

  revalidatePath("/sitemap.xml");
  revalidatePath("/blogs/news/feed.xml");
  revalidatePath("/indexnow-key.txt");
  revalidatePath("/llms.txt");
  revalidatePath("/feeds/products.json");

  return NextResponse.json({
    ok: result.ok,
    result: {
      indexNowKey: result.indexNowKey,
      keyFileUrl: result.keyFileUrl,
      sitemapUrl: result.sitemapUrl,
      feedUrl: result.feedUrl,
      sitemapPing: result.sitemapPing,
      indexNow: result.indexNow,
      errors: result.errors,
    },
    distribution: result.distribution,
  });
}
