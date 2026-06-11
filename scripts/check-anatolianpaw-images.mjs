import { config } from "dotenv";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(".env") });
config({ path: resolve(".env.local"), override: true });

const prisma = new PrismaClient();
const root = process.cwd();

try {
  const slug = process.env.STORE_SITE_SLUG || "anatolianpaw";
  const site = await prisma.storeSite.findUnique({ where: { slug } });
  if (!site) throw new Error(`site not found: ${slug}`);

  const settings = JSON.parse(site.settingsJson || "{}");
  console.log("STORE_SITE_SLUG:", slug);
  console.log("siteId:", site.id);
  console.log("branding:", settings.branding);
  const items = settings.theme?.mirrorPages?.home?.sections?.media_grid_bGXVTf?.mediaGridItems;
  console.log("hero items:", items?.map((i) => ({ id: i.itemId, url: i.imageUrl })));

  const urls = new Set();
  for (const u of [
    settings.branding?.logoUrl,
    settings.branding?.logoUrlLight,
    settings.branding?.faviconUrl,
    settings.seo?.ogImageUrl,
    ...(items?.map((i) => i.imageUrl) ?? []),
  ]) {
    if (u) urls.add(u);
  }

  const products = await prisma.storeProduct.findMany({
    where: { siteId: site.id },
    select: { title: true, imageUrl: true },
  });
  for (const p of products) if (p.imageUrl) urls.add(p.imageUrl);
  console.log("products:", products);

  const allSites = await prisma.storeSite.findMany({ select: { slug: true, settingsJson: true } });
  console.log("\nAll sites branding.logoUrl:");
  for (const s of allSites) {
    const b = JSON.parse(s.settingsJson || "{}").branding;
    console.log(" ", s.slug, b?.logoUrl ?? "(yok)");
  }

  console.log("\nFile check:");
  for (const url of urls) {
    const rel = url.replace(/^\//, "");
    const abs = join(root, "public", rel);
    console.log(existsSync(abs) ? "OK" : "MISSING", url, "->", abs);
  }
} finally {
  await prisma.$disconnect();
}
