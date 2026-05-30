import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaffApi } from "@/lib/staff-auth";

export async function GET() {
  const auth = await requireStaffApi("store.products");
  if (auth instanceof NextResponse) return auth;

  const batches = await prisma.storePriceChangeBatch.findMany({
    where: { siteId: auth.siteId },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      label: true,
      productCount: true,
      lineCount: true,
      revertedAt: true,
      createdAt: true,
      filterJson: true,
      adjustmentJson: true,
    },
  });

  return NextResponse.json({ batches });
}
