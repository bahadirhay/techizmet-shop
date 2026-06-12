import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import { PRODUCT_KIND_BUNDLE } from "@/lib/product-bundle";

export async function GET(req: Request) {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const excludeId = url.searchParams.get("excludeId")?.trim() ?? "";

  const products = await prisma.storeProduct.findMany({
    where: {
      siteId: auth.siteId,
      kind: { not: PRODUCT_KIND_BUNDLE },
      ...(excludeId ? { id: { not: excludeId } } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { slug: { contains: q, mode: "insensitive" } },
              { sku: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { title: "asc" },
    take: 40,
    select: {
      id: true,
      title: true,
      slug: true,
      sku: true,
      stockQty: true,
      imageUrl: true,
      variants: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, label: true, stockQty: true, isDefault: true },
      },
    },
  });

  return NextResponse.json({ products });
}
