/**
 * Gerçek vitrin ana sayfasını (mirror HTML) admin CMS bloklarına aktarır.
 * npx tsx scripts/sync-mirror-home-page.ts
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  importMirrorHomeToShopPage,
  markMirrorHomeImported,
  MIRROR_HOME_IMPORT_VERSION,
} from "../src/lib/import-mirror-home-page";
import { loadMirrorHomeBlocks } from "../src/lib/mirror-home-blocks";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

const prisma = new PrismaClient();

async function main() {
  const site = await prisma.storeSite.findFirst({ where: { slug: "demo" } });
  if (!site) throw new Error("demo site yok");

  const home = await prisma.shopPage.findUnique({
    where: { siteId_slug: { siteId: site.id, slug: "home" } },
  });
  if (!home) throw new Error("home sayfası yok");

  const preview = loadMirrorHomeBlocks();
  console.log(`[sync-mirror-home] ${preview.length} blok: ${preview.map((b) => b.type).join(", ")}`);

  await importMirrorHomeToShopPage(site.id, home.id);
  await markMirrorHomeImported(site.id, true);

  console.log(
    `[sync-mirror-home] shopPage home blokları güncellendi (v${MIRROR_HOME_IMPORT_VERSION}). Ana sayfa vitrin için /admin/home kullanın.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
