import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const sites = await p.storeSite.findMany({ select: { slug: true, id: true, name: true } });
for (const s of sites) {
  const blogs = await p.storeBlogPost.findMany({
    where: { siteId: s.id, published: true },
    select: { slug: true, titleTr: true, featuredOnHome: true },
    take: 8,
  });
  console.log("\n", s.slug, s.name, "blogs:", blogs.length);
  blogs.forEach((b) => console.log(" -", b.slug, b.featuredOnHome ? "*" : ""));
}
await p.$disconnect();
