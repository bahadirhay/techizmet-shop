/** Kartlı ödeme kuralları — istemci + sunucu (saf fonksiyonlar) */

const FULFILLMENT_STATUSES = new Set(["confirmed", "preparing", "shipped", "delivered"]);

export function isCardOrderAwaitingPayment(order: {
  paymentMethod: string | null;
  paymentStatus: string;
}): boolean {
  return order.paymentMethod === "card" && order.paymentStatus !== "paid";
}

export function isOrderReadyToFulfill(order: {
  status: string;
  paymentMethod: string | null;
  paymentStatus: string;
}): boolean {
  if (order.status === "awaiting_payment" || order.status === "cancelled") return false;
  if (isCardOrderAwaitingPayment(order)) return false;
  return ["pending", "confirmed", "preparing"].includes(order.status);
}

export function canTransitionOrderStatus(
  order: { paymentMethod: string | null; paymentStatus: string },
  nextStatus: string,
): { ok: true } | { ok: false; error: string } {
  if (!FULFILLMENT_STATUSES.has(nextStatus)) return { ok: true };
  if (isCardOrderAwaitingPayment(order)) {
    return {
      ok: false,
      error: "Kartlı sipariş ödenmeden onaylanamaz, hazırlanamaz veya kargoya verilemez.",
    };
  }
  return { ok: true };
}
