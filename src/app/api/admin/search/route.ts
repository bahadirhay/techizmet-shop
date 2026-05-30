import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const auth = await requireStaffApi();
  if (auth instanceof NextResponse) return auth;

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const contains = { contains: q, mode: "insensitive" as const };

  const [products, orders, customers] = await Promise.all([
    prisma.storeProduct.findMany({
      where: {
        siteId: auth.siteId,
        OR: [{ title: contains }, { sku: contains }, { slug: contains }, { barcode: contains }],
      },
      take: 6,
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, sku: true, slug: true },
    }),
    prisma.storeOrder.findMany({
      where: {
        siteId: auth.siteId,
        OR: [
          { orderNumber: contains },
          { customerEmail: contains },
          { customerName: contains },
          { customerPhone: contains },
        ],
      },
      take: 6,
      orderBy: { createdAt: "desc" },
      select: { id: true, orderNumber: true, customerName: true, customerEmail: true },
    }),
    prisma.storeCustomer.findMany({
      where: {
        siteId: auth.siteId,
        OR: [
          { email: contains },
          { phone: contains },
          { firstName: contains },
          { lastName: contains },
        ],
      },
      take: 4,
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, firstName: true, lastName: true },
    }),
  ]);

  const results = [
    ...products.map((p) => ({
      type: "product" as const,
      id: p.id,
      title: p.title,
      subtitle: p.sku ? `SKU ${p.sku}` : `/${p.slug}`,
      href: `/admin/products/${p.id}/edit`,
    })),
    ...orders.map((o) => ({
      type: "order" as const,
      id: o.id,
      title: o.orderNumber,
      subtitle: o.customerName ?? o.customerEmail ?? "Misafir",
      href: `/admin/orders/${o.id}`,
    })),
    ...customers.map((c) => {
      const name = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
      return {
        type: "customer" as const,
        id: c.id,
        title: name || c.email || "Müşteri",
        subtitle: c.email ?? "",
        href: `/admin/customers`,
      };
    }),
  ];

  return NextResponse.json({ results: results.slice(0, 12) });
}
