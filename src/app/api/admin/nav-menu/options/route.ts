import { NextResponse } from "next/server";
import { NAV_PAGE_OPTIONS } from "@/lib/nav-menu-link";
import { prisma } from "@/lib/prisma";
import { requireStaffApi } from "@/lib/staff-auth";

export async function GET() {
  const auth = await requireStaffApi("site.theme");
  if (auth instanceof NextResponse) return auth;

  const [categories, collections, products] = await Promise.all([
    prisma.storeCategory.findMany({
      where: { siteId: auth.siteId, active: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: { id: true, slug: true, title: true, parentId: true },
    }),
    prisma.storeCollection.findMany({
      where: { siteId: auth.siteId, published: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: { slug: true, title: true },
    }),
    prisma.storeProduct.findMany({
      where: { siteId: auth.siteId, published: true },
      orderBy: [{ title: "asc" }],
      select: { slug: true, title: true },
      take: 500,
    }),
  ]);

  return NextResponse.json({
    pages: NAV_PAGE_OPTIONS,
    categories,
    collections,
    products,
  });
}
