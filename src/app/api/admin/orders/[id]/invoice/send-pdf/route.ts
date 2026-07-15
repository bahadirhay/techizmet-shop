import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import { sendInvoicePdfToCustomer } from "@/lib/email/send-invoice-email";

const MAX_PDF_BYTES = 15 * 1024 * 1024; // 15 MB

const REASON_MESSAGES: Record<string, string> = {
  order_not_found: "Sipariş bulunamadı.",
  no_email: "Alıcı e-posta adresi yok. Müşteri e-postası ekleyin veya alanı doldurun.",
  no_file: "PDF dosyası boş.",
  not_configured: "SMTP / e-posta sağlayıcısı ayarlı değil (Ayarlar → Bildirimler).",
};

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.orders");
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;
  const order = await prisma.storeOrder.findFirst({
    where: { id, siteId: auth.siteId },
    select: { id: true, invoiceStatus: true, invoiceIssuedAt: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Sipariş bulunamadı." }, { status: 404 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const toEmail = String(form?.get("email") ?? "").trim() || undefined;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "PDF dosyası gerekli." }, { status: 400 });
  }
  const isPdf =
    file.type === "application/pdf" || file.name.trim().toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    return NextResponse.json({ error: "Yalnızca PDF dosyası gönderilebilir." }, { status: 400 });
  }
  if (file.size > MAX_PDF_BYTES) {
    return NextResponse.json({ error: "PDF çok büyük (en fazla 15 MB)." }, { status: 400 });
  }

  const pdf = Buffer.from(await file.arrayBuffer());
  const result = await sendInvoicePdfToCustomer(id, {
    pdf,
    filename: file.name || `fatura-${id}.pdf`,
    toEmail,
  });

  if (!result.sent) {
    const message =
      (result.reason && REASON_MESSAGES[result.reason]) ||
      result.detail ||
      "Fatura e-postası gönderilemedi.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Elle (GİB portalından) kesilen fatura müşteriye gönderildi → siparişi
  // "fatura kesildi" (manual) say. İmzalı/pazaryeri durumunu geri alma.
  const alreadyIssued =
    order.invoiceStatus === "signed" || order.invoiceStatus === "marketplace_sent";
  if (!alreadyIssued) {
    await prisma.storeOrder.update({
      where: { id: order.id },
      data: {
        invoiceStatus: "manual",
        invoiceIssuedAt: order.invoiceIssuedAt ?? new Date(),
      },
    });
  }

  return NextResponse.json({ ok: true, message: "Fatura PDF müşteriye e-posta ile gönderildi." });
}
