import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

/** Ürün grid bloğu — koleksiyon seçici */
export async function GET() {
  const auth = await requireStaffApi("store.collections");
  if (auth instanceof NextResponse) return auth;

  const collections = await prisma.storeCollection.findMany({
    where: { siteId: auth.siteId },
    orderBy: { title: "asc" },
    select: { slug: true, title: true },
  });

  return NextResponse.json({ collections });
}
