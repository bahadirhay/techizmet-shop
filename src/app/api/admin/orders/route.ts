import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const auth = await requireStaffApi("store.orders");
  if (auth instanceof NextResponse) return auth;
  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  const orders = await prisma.storeOrder.findMany({
    where: {
      siteId: auth.siteId,
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { carrier: true, _count: { select: { lines: true } } },
  });
  return NextResponse.json({ orders });
}
