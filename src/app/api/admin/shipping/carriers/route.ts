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
  try {
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
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/Unique constraint|unique constraint|P2002/i.test(msg)) {
      return NextResponse.json(
        {
          error:
            "Bu kargo kodu zaten kayıtlı. Kargo listesinden mevcut HepsiJet kaydını düzenleyin (yeniden oluşturmayın).",
        },
        { status: 409 },
      );
    }
    console.error("[shipping/carriers POST]", e);
    return NextResponse.json({ error: msg.slice(0, 240) || "Kayıt başarısız" }, { status: 500 });
  }
}
