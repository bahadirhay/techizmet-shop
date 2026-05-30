import { config } from "dotenv";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env") });
const prisma = new PrismaClient();
const site = await prisma.storeSite.findUnique({
  where: { slug: "demo" },
  select: { settingsJson: true },
});
const branding = JSON.parse(site?.settingsJson || "{}").branding ?? {};
console.log(JSON.stringify(branding, null, 2));
await prisma.$disconnect();
