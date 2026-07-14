/**
 * POST /api/admin/orders/bulk-invoice
 * Kargoya verilmiş / teslim edilmiş ama faturasız siparişlerin tamamını faturalar.
 * Arka planda sırayla işler, sonuç özetini döner.
 */
import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/staff-auth";
import { issueOrderInvoice } from "@/lib/efatura/order-invoice";
import { closeGibSessionForSite } from "@/lib/efatura/gib-session";
import { efaturaReady, getEfaturaConfig } from "@/lib/efatura/settings";
import { orderInvoicePendingWhere } from "@/lib/admin/order-invoice-workflow";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const auth = await requireStaffApi("store.orders");
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json().catch(() => ({}))) as {
    sign?: boolean;
    sendToMarketplace?: boolean;
    orderIds?: string[]; // isteğe bağlı — boşsa tüm bekleyenler
  };

  const config = await getEfaturaConfig(auth.siteId);
  if (!efaturaReady(config)) {
    return NextResponse.json(
      { error: "e-Arşiv ayarları eksik. /admin/settings/efatura sayfasını ziyaret edin." },
      { status: 400 },
    );
  }

  // Hangi siparişler işlenecek?
  const where = body.orderIds?.length
    ? { id: { in: body.orderIds }, siteId: auth.siteId }
    : { siteId: auth.siteId, ...orderInvoicePendingWhere() };

  const orders = await prisma.storeOrder.findMany({
    where,
    select: { id: true, orderNumber: true },
    orderBy: { createdAt: "asc" },
    take: 200, // güvenlik limiti
  });

  if (orders.length === 0) {
    return NextResponse.json({ processed: 0, succeeded: 0, failed: 0, results: [], message: "Faturası bekleyen sipariş bulunamadı." });
  }

  const results: { orderId: string; orderNumber: string; ok: boolean; message: string }[] = [];
  let succeeded = 0;
  let failed = 0;

  try {
    for (const o of orders) {
      const result = await issueOrderInvoice(auth.siteId, o.id, {
        sign: body.sign,
        sendToMarketplace: body.sendToMarketplace,
      });
      results.push({ orderId: o.id, orderNumber: o.orderNumber, ok: result.ok, message: result.message });
      if (result.ok) succeeded++;
      else failed++;
    }
  } finally {
    // Tüm siparişler tek oturumu paylaşır; döngü bitince oturumu bir kez kapat.
    await closeGibSessionForSite(auth.siteId);
  }

  return NextResponse.json({
    processed: orders.length,
    succeeded,
    failed,
    results,
    message: `${succeeded} fatura kesildi${failed > 0 ? `, ${failed} başarısız` : ""}.`,
  });
}
