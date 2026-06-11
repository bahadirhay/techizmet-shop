/**
 * Belirli bir ürün için _mirror-prebuilt HTML dosyasını yeniden oluşturur.
 * Kullanım: npx tsx scripts/rebuild-product-prebuilt.ts <productSlug>
 */
import "dotenv/config";
import { buildMirrorHtmlCore } from "../src/lib/mirror-html-processor";
import { prisma } from "../src/lib/prisma";
import { writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";

async function main() {
  const productSlug = process.argv[2]?.trim();
  if (!productSlug) {
    console.error("Kullanım: npx tsx scripts/rebuild-product-prebuilt.ts <productSlug>");
    process.exit(1);
  }

  const site = await prisma.storeSite.findFirst();
  if (!site) {
    console.error("Site bulunamadı");
    process.exit(1);
  }
  console.log("Site:", site.id, site.name);

  const locales = ["tr", "en"] as const;
  for (const locale of locales) {
    const templateBase = "spectrum-sunscreen-spf-50";
    const normalized = `theme/techizmet-shop/mirror/products/${templateBase}${locale === "tr" ? "-tr" : ""}.html`;
    const outRel = `theme/techizmet-shop/mirror/products/${productSlug}${locale === "tr" ? "-tr" : ""}.html`;
    const outAbs = join(process.cwd(), "public/_mirror-prebuilt", outRel);

    console.log(`Building [${locale}]: ${outRel}`);
    try {
      const html = await buildMirrorHtmlCore({
        normalized,
        locale,
        siteId: site.id,
        siteName: site.name,
        productSlug,
      });
      await mkdir(dirname(outAbs), { recursive: true });
      await writeFile(outAbs, html, "utf8");
      console.log(`  OK: ${outAbs} (${html.length} bytes)`);

      const hidden = (html.match(/data-kn-pdp-hidden="1"/g) || []).length;
      const hasCritical = html.includes("kn-pdp-bottom-critical");
      console.log(`  Gizli bölüm sayısı: ${hidden}, kritik CSS: ${hasCritical}`);
    } catch (e: unknown) {
      const err = e as Error;
      console.error(`  HATA: ${err.message}`);
      console.error(err.stack?.split("\n").slice(0, 8).join("\n"));
    }
  }

  await prisma.$disconnect();
  console.log("Tamamlandı.");
}

main();
