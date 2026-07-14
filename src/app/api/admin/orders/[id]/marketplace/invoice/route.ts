import { NextResponse } from "next/server";
import { logMarketplaceAction, sendMarketplaceInvoice } from "@/lib/marketplace/actions";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireStaffApi("store.orders");
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;
  const body = (await req.json()) as { invoiceLink?: string; invoiceNumber?: string };
  if (!body.invoiceLink?.trim()) {
    return NextResponse.json({ error: "Fatura linki (PDF URL) gerekli" }, { status: 400 });
  }

  // İmzasız/taslak fatura numarası gönderilirse pazaryeri "Fatura numarası hatalıdır" der.
  // Önce imzalı gerçek numara olduğundan emin ol.
  const num = body.invoiceNumber?.trim();
  if (!num || num.toUpperCase().startsWith("DRAFT")) {
    return NextResponse.json(
      {
        error:
          "Fatura henüz imzalanmadı (geçerli fatura numarası yok). Önce GİB e-Arşiv portalından taslağı SMS ile onaylayın, ardından fatura ekranından \"GİB'den onayı kontrol et ve gönder\" deyin.",
      },
      { status: 400 },
    );
  }

  const result = await sendMarketplaceInvoice(auth.siteId, id, {
    invoiceLink: body.invoiceLink,
    invoiceNumber: body.invoiceNumber,
  });

  const order = await prisma.storeOrder.findFirst({ where: { id, siteId: auth.siteId } });
  if (order?.marketplacePlatform) {
    await logMarketplaceAction(auth.siteId, order.marketplacePlatform, "send_invoice", result);
  }

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json({ result });
}
