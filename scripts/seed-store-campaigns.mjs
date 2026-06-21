/**
 * Varsayılan otomatik kampanyalar — site başına idempotent upsert (kampanya adı ile).
 * Kullanım: node scripts/seed-store-campaigns.mjs
 * veya: SITE_SLUG=anatolianpaw node scripts/seed-store-campaigns.mjs
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });
config({ path: resolve(process.cwd(), ".env.anatolianpaw"), override: true });

const prisma = new PrismaClient();

const CAMPAIGNS = [
  {
    name: "2. Ürüne %50 İndirim",
    type: "second_item_percent_off",
    percentOff: 50,
    autoApply: true,
    firstOrderOnly: false,
    description: "preset:second_item",
  },
  {
    name: "999 TL Üzeri %15 İndirim",
    type: "percent_off",
    percentOff: 15,
    minCartMinor: 99900,
    autoApply: true,
    firstOrderOnly: false,
    description: "preset:tier1",
  },
  {
    name: "1.499 TL Üzeri %20 İndirim",
    type: "percent_off",
    percentOff: 20,
    minCartMinor: 149900,
    autoApply: true,
    firstOrderOnly: false,
    description: "preset:tier2",
  },
  {
    name: "İlk Alışveriş %10",
    type: "percent_off",
    percentOff: 10,
    autoApply: true,
    firstOrderOnly: true,
    description: "preset:first_order",
  },
];

async function main() {
  const slug = process.env.SITE_SLUG?.trim() || process.env.STORE_SLUG?.trim() || "anatolianpaw";
  const site =
    (await prisma.storeSite.findFirst({ where: { slug } })) ??
    (await prisma.storeSite.findFirst({ orderBy: { createdAt: "asc" } }));
  if (!site) {
    console.error("[seed:campaigns] Site bulunamadı");
    process.exit(1);
  }

  for (const row of CAMPAIGNS) {
    const existing =
      (row.description
        ? await prisma.storeCampaign.findFirst({
            where: { siteId: site.id, description: row.description },
          })
        : null) ??
      (await prisma.storeCampaign.findFirst({
        where: { siteId: site.id, name: row.name },
      }));
    const data = {
      siteId: site.id,
      name: row.name,
      code: null,
      type: row.type,
      percentOff: row.percentOff ?? null,
      amountOffMinor: null,
      buyQuantity: null,
      payQuantity: null,
      scopeJson: null,
      autoApply: row.autoApply,
      firstOrderOnly: row.firstOrderOnly ?? false,
      minCartMinor: row.minCartMinor ?? null,
      freeShipping: false,
      active: true,
      description: row.description ?? null,
    };

    if (existing) {
      await prisma.storeCampaign.update({ where: { id: existing.id }, data });
      console.log(`[seed:campaigns] güncellendi: ${row.name}`);
    } else {
      await prisma.storeCampaign.create({ data });
      console.log(`[seed:campaigns] oluşturuldu: ${row.name}`);
    }
  }

  console.log(`[seed:campaigns] tamam — ${site.name} (${site.slug})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
