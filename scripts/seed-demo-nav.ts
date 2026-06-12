/**
 * Demo mağaza vitrin menüsünü King Noor şablonu + kategori mega menü ile günceller.
 * Kullanım: npx tsx scripts/seed-demo-nav.ts
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { seedVitrinHeaderMenu } from "../src/lib/nav-menu-seed";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

const prisma = new PrismaClient();

async function main() {
  const site = await prisma.storeSite.findUnique({ where: { slug: "demo" } });
  if (!site) {
    console.error("demo sitesi bulunamadı");
    process.exit(1);
  }
  const result = await seedVitrinHeaderMenu(site.id, true);
  console.log("[seed-demo-nav]", result);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
