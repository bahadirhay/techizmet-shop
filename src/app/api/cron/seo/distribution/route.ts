import { NextResponse } from "next/server";
import { recordCronRun } from "@/lib/cron-health";
import { verifyCronRequest } from "@/lib/cron-auth";
import { mergeSiteSettings } from "@/lib/merge-site-settings";
import { revalidateSearchDiscoveryPaths, runDistributionIndexPass } from "@/lib/seo/distribution-runner";
import { getSiteSettings } from "@/lib/site-settings";
import { getDefaultSite } from "@/lib/site";
import { prisma } from "@/lib/prisma";

/** Tam site indeksleme — Vercel cron veya Authorization: Bearer CRON_SECRET */
export async function GET(req: Request) {
  const auth = verifyCronRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const site = await getDefaultSite();
  const started = Date.now();

  try {
    const settings = await getSiteSettings(site.id);
    const result = await runDistributionIndexPass(site.id, settings);

    const next = mergeSiteSettings(settings, {
      seo: {
        ...settings.seo,
        distribution: result.distribution,
      },
    });

    await prisma.storeSite.update({
      where: { id: site.id },
      data: { settingsJson: JSON.stringify(next) },
    });

    revalidateSearchDiscoveryPaths();

    await recordCronRun(site.id, "seoDistribution", {
      ok: result.ok,
      durationMs: Date.now() - started,
      summary: {
        indexNowSubmitted: result.indexNow?.submitted ?? 0,
        indexNowBatches: result.indexNow?.batches ?? 0,
        discoveryFeeds: result.discoveryFeeds?.length ?? 0,
        bingPing: result.sitemapPing?.bing?.ok ?? false,
        yandexPing: result.sitemapPing?.yandex?.ok ?? false,
        errors: result.errors.length,
      },
      error: result.ok ? undefined : result.errors.join(" · ") || "İndeksleme başarısız",
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, result }, { status: 500 });
    }

    return NextResponse.json({ ok: true, result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Cron hatası";
    await recordCronRun(site.id, "seoDistribution", {
      ok: false,
      durationMs: Date.now() - started,
      error: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
