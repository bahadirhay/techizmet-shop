/**
 * İlk dağıtım / yeniden indeksleme — yerel veya CI'dan çalıştırın.
 * Örnek: npx tsx scripts/run-distribution-index.ts
 */
import { runDistributionIndexPass } from "../src/lib/seo/distribution-runner";
import { mergeSiteSettings } from "../src/lib/merge-site-settings";
import { parseSiteSettings } from "../src/lib/site-settings";
import { getDefaultSite } from "../src/lib/site";
import { prisma } from "../src/lib/prisma";

async function main() {
  const site = await getDefaultSite();
  const row = await prisma.storeSite.findUnique({ where: { id: site.id } });
  if (!row) throw new Error("Site bulunamadı");

  const settings = parseSiteSettings(row.settingsJson);
  const result = await runDistributionIndexPass(site.id, settings);
  const next = mergeSiteSettings(settings, {
    seo: { ...settings.seo, distribution: result.distribution },
  });

  await prisma.storeSite.update({
    where: { id: site.id },
    data: { settingsJson: JSON.stringify(next) },
  });

  console.log("[distribution]", {
    ok: result.ok,
    sitemap: result.sitemapUrl,
    feed: result.feedUrl,
    keyFile: result.keyFileUrl,
    indexNowSubmitted: result.indexNow?.submitted,
    bingPing: result.sitemapPing?.bing?.ok,
    errors: result.errors,
  });

  if (!result.ok) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
