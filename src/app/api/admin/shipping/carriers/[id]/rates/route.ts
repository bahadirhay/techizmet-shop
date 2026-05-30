import { NextResponse } from "next/server";
import { tryToMinor } from "@/lib/admin/money";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.shipping");
  if (auth instanceof NextResponse) return auth;
  const { id: carrierId } = await ctx.params;
  const carrier = await prisma.shippingCarrier.findFirst({
    where: { id: carrierId, siteId: auth.siteId },
  });
  if (!carrier) return NextResponse.json({ error: "Kargo firması bulunamadı" }, { status: 404 });

  const body = (await req.json()) as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Tarife adı gerekli" }, { status: 400 });

  const rate = await prisma.shippingRate.create({
    data: {
      carrierId,
      name,
      priceMinor: tryToMinor(body.price as string),
      freeOverMinor: body.freeOver ? tryToMinor(body.freeOver as string) : null,
      minDesi: body.minDesi ? parseFloat(String(body.minDesi)) : null,
      maxDesi: body.maxDesi ? parseFloat(String(body.maxDesi)) : null,
      regionsJson:
        body.regions && typeof body.regions === "object" ? JSON.stringify(body.regions) : null,
      active: body.active !== false,
      sortOrder: parseInt(String(body.sortOrder ?? "0"), 10) || 0,
    },
  });
  return NextResponse.json({ rate });
}
