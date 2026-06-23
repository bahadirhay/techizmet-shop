import type { PublicOrderView } from "@/lib/orders/public-order";

export function formatBotOrderReply(order: PublicOrderView): string {
  const date = new Date(order.createdAt).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const lines = [
    `Sipariş ${order.orderNumber} — ${date}`,
    `Durum: ${order.statusLabel}`,
    `Ödeme: ${order.paymentStatusLabel} (${order.paymentMethodLabel})`,
  ];

  if (order.trackingNumber) {
    const carrier = order.carrierName ? ` (${order.carrierName})` : "";
    lines.push(`Kargo takip no: ${order.trackingNumber}${carrier}`);
  } else if (order.status === "shipped" || order.status === "delivered") {
    lines.push("Kargo takip numarası henüz eklenmemiş.");
  }

  lines.push(`Toplam: ${order.totalFormatted}`);

  if (order.status === "pending" || order.status === "processing") {
    lines.push("Siparişiniz hazırlanıyor. Kısa süre içinde kargoya verilecektir.");
  } else if (order.status === "shipped") {
    lines.push("Siparişiniz kargoya verildi.");
  } else if (order.status === "delivered") {
    lines.push("Siparişiniz teslim edildi.");
  } else if (order.status === "cancelled") {
    lines.push("Bu sipariş iptal edilmiş.");
  }

  return lines.join("\n");
}
