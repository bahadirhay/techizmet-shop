import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const demo = await prisma.storeSite.findUnique({ where: { slug: "demo" } });
const paw = await prisma.storeSite.findUnique({ where: { slug: "anatolianpaw" } });

for (const site of [demo, paw].filter(Boolean)) {
  const cats = await prisma.storeCategory.count({ where: { siteId: site.id } });
  const nav = await prisma.navMenuItem.findMany({
    where: { siteId: site.id, menuSlug: "header" },
    orderBy: [{ sortOrder: "asc" }],
    select: { id: true, labelTr: true, href: true, parentId: true, linkType: true, linkTarget: true },
  });
  console.log(`\n=== ${site.slug} categories=${cats} nav=${nav.length} ===`);
  const roots = nav.filter((n) => !n.parentId);
  for (const r of roots) {
    const kids = nav.filter((n) => n.parentId === r.id);
    console.log(`- ${r.labelTr} (${r.href}) children=${kids.length}`);
    for (const k of kids.slice(0, 4)) {
      const grand = nav.filter((n) => n.parentId === k.id);
      console.log(`    * ${k.labelTr} (${k.href}) sub=${grand.length}`);
    }
  }
}

await prisma.$disconnect();
