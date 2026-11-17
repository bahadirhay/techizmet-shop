import { NextResponse } from "next/server";
import { logMarketplaceAction, sendMarketplaceInvoice } from "@/lib/marketplace/actions";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";

const MAX_PDF_BYTES = 15 * 1024 * 1024;

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireStaffApi("store.orders");
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;

  const contentType = req.headers.get("content-type") ?? "";
  let invoiceLink = "";
  let invoiceNumber: string | undefined;
  let pdf: Buffer | undefined;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    if (!form) {
      return NextResponse.json({ error: "Geçersiz form" }, { status: 400 });
    }
    invoiceLink = String(form.get("invoiceLink") ?? "").trim();
    invoiceNumber = String(form.get("invoiceNumber") ?? "").trim() || undefined;
    const file = form.get("file");
    if (file instanceof File) {
      const isPdf =
        file.type === "application/pdf" || file.name.trim().toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        return NextResponse.json({ error: "Yalnızca PDF dosyası yüklenebilir" }, { status: 400 });
      }
      if (file.size > MAX_PDF_BYTES) {
        return NextResponse.json({ error: "PDF çok büyük (en fazla 15 MB)" }, { status: 400 });
      }
      pdf = Buffer.from(await file.arrayBuffer());
    }
  } else {
    const body = (await req.json().catch(() => null)) as
      | { invoiceLink?: string; invoiceNumber?: string }
      | null;
    invoiceLink = body?.invoiceLink?.trim() ?? "";
    invoiceNumber = body?.invoiceNumber?.trim() || undefined;
  }

  const order = await prisma.storeOrder.findFirst({
    where: { id, siteId: auth.siteId },
    select: {
      marketplacePlatform: true,
      invoiceLink: true,
      invoiceNumber: true,
    },
  });
  if (!order) {
    return NextResponse.json({ error: "Sipariş bulunamadı" }, { status: 404 });
  }

  if (!invoiceLink) invoiceLink = order.invoiceLink?.trim() ?? "";
  if (!invoiceNumber) invoiceNumber = order.invoiceNumber?.trim() || undefined;

  // Amazon PDF yükler; Trendyol HTML link ister.
  if (order.marketplacePlatform !== "amazon_tr" && !invoiceLink) {
    return NextResponse.json({ error: "Fatura linki gerekli" }, { status: 400 });
  }
  if (order.marketplacePlatform === "amazon_tr" && !invoiceLink) {
    invoiceLink = order.invoiceLink?.trim() || `amazon-invoice:${id}`;
  }

  // İmzasız/taslak fatura numarası gönderilirse pazaryeri "Fatura numarası hatalıdır" der.
  const num = invoiceNumber?.trim();
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
    invoiceLink,
    invoiceNumber,
    pdf,
  });

  if (order.marketplacePlatform) {
    await logMarketplaceAction(auth.siteId, order.marketplacePlatform, "send_invoice", result);
  }

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json({ result });
}
