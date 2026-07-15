import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { prisma } from "@/lib/prisma";
import { sendInvoiceEmailForOrder } from "@/lib/email/send-invoice-email";

const REASON_MESSAGES: Record<string, string> = {
  order_not_found: "Sipariş bulunamadı.",
  no_email: "Müşteri e-posta adresi yok.",
  no_invoice: "Bu sipariş için henüz fatura linki oluşmamış.",
  not_finalized: "Fatura henüz imzalanmadı.",
  disabled: "E-posta bildirimleri kapalı (Ayarlar → Bildirimler).",
  not_configured: "SMTP / e-posta sağlayıcısı ayarlı değil (Ayarlar → Bildirimler).",
};

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("store.orders");
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;
  const order = await prisma.storeOrder.findFirst({
    where: { id, siteId: auth.siteId },
    select: { id: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Sipariş bulunamadı." }, { status: 404 });
  }

  const result = await sendInvoiceEmailForOrder(id, { force: true });
  if (!result.sent) {
    const message =
      (result.reason && REASON_MESSAGES[result.reason]) ||
      result.detail ||
      "Fatura e-postası gönderilemedi.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, message: "Fatura müşteriye e-posta ile gönderildi." });
}
