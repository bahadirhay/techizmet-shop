import { NextResponse } from "next/server";
import { buildProductsWorkbook, productToExcelRow } from "@/lib/admin/product-excel";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;

  const template = new URL(req.url).searchParams.get("template") === "1";

  const products = template
    ? []
    : await prisma.storeProduct.findMany({
        where: { siteId: auth.siteId },
        orderBy: { title: "asc" },
        include: {
          category: true,
          categoryLinks: {
            orderBy: { sortOrder: "asc" },
            include: { category: { select: { slug: true } } },
          },
          brand: true,
          collection: true,
        },
      });

  const rows = products.map(productToExcelRow);
  const buffer = buildProductsWorkbook(rows);
  const filename = template ? "urun-sablonu.xlsx" : `urunler-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
