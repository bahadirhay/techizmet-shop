/** Tek seferlik: DB'deki /theme/king-noor yollarını techizmet-shop olarak günceller */
import { config } from "dotenv";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();
const FROM = "/theme/king-noor";
const TO = "/theme/techizmet-shop";

function replacePaths(value) {
  if (typeof value !== "string" || !value.includes(FROM)) return value;
  return value.replaceAll(FROM, TO);
}

async function patchRows(model, field) {
  const rows = await prisma[model].findMany({
    where: { [field]: { contains: FROM } },
    select: { id: true, [field]: true },
  });
  for (const row of rows) {
    await prisma[model].update({
      where: { id: row.id },
      data: { [field]: replacePaths(row[field]) },
    });
  }
  return rows.length;
}

async function main() {
  const counts = {};
  const jobs = [
    ["storeProduct", "imageUrl"],
    ["storeProduct", "descriptionHtml"],
    ["storeProduct", "keyFeaturesHtml"],
    ["storeProduct", "howToUseHtml"],
    ["storeProduct", "exploreLooksJson"],
    ["storeProductImage", "url"],
    ["storeBlogPost", "imageUrl"],
    ["storeBlogPost", "bodyTr"],
    ["storeBlogPost", "bodyEn"],
    ["storeCollection", "imageUrl"],
    ["storeCategory", "imageUrl"],
    ["storeBrand", "logoUrl"],
    ["storeMedia", "url"],
    ["storeSite", "settingsJson"],
    ["storeSite", "themeTokensJson"],
    ["storeSite", "headerBlocks"],
    ["storeSite", "footerBlocks"],
    ["shopPage", "blocks"],
    ["shopPage", "blocksMobile"],
  ];

  for (const [model, field] of jobs) {
    const n = await patchRows(model, field);
    if (n) counts[`${model}.${field}`] = n;
  }

  console.log("Güncellenen kayıtlar:", counts);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log(`Toplam: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
