/** Tek seferlik: DB themeId king-noor → techizmet-shop */
import { config } from "dotenv";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

async function main() {
  const r = await prisma.storeSite.updateMany({
    where: { themeId: "king-noor" },
    data: { themeId: "techizmet-shop" },
  });
  console.log(`Güncellenen site: ${r.count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
