import { config } from "dotenv";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(".env") });

const prisma = new PrismaClient();

const mediaId = "cmpsp27p90001l4042bbksvhu";
const row = await prisma.storeMedia.findUnique({ where: { id: mediaId } });
console.log("media row", row);

const sites = await prisma.storeSite.findMany({ select: { id: true, slug: true, name: true } });
for (const s of sites) {
  const settings = JSON.parse((await prisma.storeSite.findUnique({ where: { id: s.id } }))?.settingsJson || "{}");
  console.log(s.slug, settings.branding?.logoUrl?.slice(0, 80));
}

await prisma.$disconnect();
