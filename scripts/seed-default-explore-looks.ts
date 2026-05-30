/**
 * Mağaza varsayılan EXPLORE bloğunu settingsJson'a yazar.
 * npx tsx scripts/seed-default-explore-looks.ts
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { loadMirrorProductExploreLooks } from "../src/lib/mirror-product-explore-server";
import { parseSiteSettings } from "../src/lib/site-settings";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

const prisma = new PrismaClient();

async function main() {
  const site = await prisma.storeSite.findFirst({ where: { slug: "demo" } });
  if (!site) throw new Error("demo site yok");

  const looks = loadMirrorProductExploreLooks("creamy-foundation-for-all-skin-types");
  const settings = parseSiteSettings(site.settingsJson);
  settings.theme = settings.theme ?? {};
  settings.theme.defaultProductExploreLooks = looks;

  await prisma.storeSite.update({
    where: { id: site.id },
    data: { settingsJson: JSON.stringify(settings) },
  });

  console.log(`[seed-default-explore] ${looks.length} kart site ayarlarına yazıldı`);
  looks.forEach((l, i) => {
    console.log(`  ${i + 1}. ${l.imageUrl} → ${l.productSlugs.length} ürün`);
  });
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
