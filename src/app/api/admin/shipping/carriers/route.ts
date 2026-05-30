import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireStaffApi("store.shipping");
  if (auth instanceof NextResponse) return auth;
  const carriers = await prisma.shippingCarrier.findMany({
    where: { siteId: auth.siteId },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { rates: true } } },
  });
  return NextResponse.json({ carriers });
}

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.shipping");
  if (auth instanceof NextResponse) return auth;
  const body = (await req.json()) as Record<string, unknown>;
  const code = String(body.code ?? "").trim().toLowerCase();
  const name = String(body.name ?? "").trim();
  if (!code || !name) {
    return NextResponse.json({ error: "Kod ve ad gerekli" }, { status: 400 });
  }

  const config =
    body.config && typeof body.config === "object" ? JSON.stringify(body.config) : null;

  const carrier = await prisma.shippingCarrier.create({
    data: {
      siteId: auth.siteId,
      code,
      name,
      active: body.active !== false,
      trackingUrlTemplate: String(body.trackingUrlTemplate ?? "").trim() || null,
      customerServicePhone: String(body.customerServicePhone ?? "").trim() || null,
      notes: String(body.notes ?? "").trim() || null,
      configJson: config,
      sortOrder: parseInt(String(body.sortOrder ?? "0"), 10) || 0,
    },
  });
  return NextResponse.json({ carrier });
}
