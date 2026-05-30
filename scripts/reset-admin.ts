import { config } from "dotenv";
import { resolve } from "node:path";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { allStaffPermissions } from "../src/lib/staff-permissions";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });

async function main() {
  const plain = process.env.ADMIN_PASSWORD?.trim();
  if (!plain || plain.length < 6) throw new Error("ADMIN_PASSWORD en az 6 karakter");
  const prisma = new PrismaClient();
  try {
    const slug = process.env.STORE_SITE_SLUG?.trim() || "demo";
    const site = await prisma.storeSite.findUnique({ where: { slug } });
    if (!site) throw new Error(`Mağaza yok (slug=${slug}). Önce: npm run store:provision`);
    const role = await prisma.shopStaffRole.upsert({
      where: { siteId_slug: { siteId: site.id, slug: "admin" } },
      create: {
        siteId: site.id,
        slug: "admin",
        label: "Yönetici",
        permissionsJson: JSON.stringify(allStaffPermissions()),
      },
      update: { permissionsJson: JSON.stringify(allStaffPermissions()) },
    });
    const hash = await bcrypt.hash(plain, 12);
    await prisma.shopStaffUser.upsert({
      where: { siteId_username: { siteId: site.id, username: "admin" } },
      create: {
        siteId: site.id,
        username: "admin",
        passwordHash: hash,
        active: true,
        roleAssignments: { create: [{ roleId: role.id }] },
      },
      update: {
        passwordHash: hash,
        active: true,
        roleAssignments: { deleteMany: {}, create: [{ roleId: role.id }] },
      },
    });
    console.log("[reset-admin] admin şifresi = ADMIN_PASSWORD");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
