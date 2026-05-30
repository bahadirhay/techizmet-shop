/** Müşterinin iptal / iade talep edebileceği durumlar */

export const CANCELLABLE_STATUSES = ["pending", "confirmed"] as const;
export const REFUND_REQUEST_STATUSES = ["delivered", "shipped"] as const;

export function canRequestCancel(status: string) {
  return (CANCELLABLE_STATUSES as readonly string[]).includes(status);
}

export function canRequestRefund(status: string) {
  return (REFUND_REQUEST_STATUSES as readonly string[]).includes(status);
}

export type OrderRequestType = "cancel" | "refund";

export function validateOrderRequest(
  status: string,
  type: OrderRequestType,
): { ok: true; nextStatus: string } | { ok: false; error: string } {
  if (type === "cancel") {
    if (!canRequestCancel(status)) {
      return { ok: false, error: "Bu sipariş artık iptal edilemez (kargoya verilmiş olabilir)." };
    }
    return { ok: true, nextStatus: "cancelled" };
  }
  if (type === "refund") {
    if (status === "refund_requested") {
      return { ok: false, error: "İade talebi zaten oluşturulmuş." };
    }
    if (!canRequestRefund(status)) {
      return {
        ok: false,
        error: "İade talebi yalnızca kargoya verilmiş veya teslim edilmiş siparişler için geçerlidir.",
      };
    }
    return { ok: true, nextStatus: "refund_requested" };
  }
  return { ok: false, error: "Geçersiz talep" };
}
