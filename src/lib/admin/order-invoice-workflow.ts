import type { Prisma } from "@prisma/client";

/** Kesilmiş sayılan fatura durumları — "manual" = GİB portalından elle kesilip müşteriye gönderildi */
export const ORDER_INVOICE_COMPLETE_STATUSES = ["signed", "marketplace_sent", "manual"] as const;

export function isOrderInvoiceComplete(invoiceStatus: string | null | undefined): boolean {
  if (!invoiceStatus || invoiceStatus === "none") return false;
  return (ORDER_INVOICE_COMPLETE_STATUSES as readonly string[]).includes(invoiceStatus);
}

/** Kargoya verilmiş / teslim ama faturası kesilmemiş */
export function orderInvoicePendingWhere(): Prisma.StoreOrderWhereInput {
  return {
    status: { in: ["shipped", "delivered"] },
    OR: [
      { invoiceStatus: null },
      { invoiceStatus: "none" },
      { invoiceStatus: "draft" },
    ],
  };
}

export function shouldFocusInvoiceAfterSave(params: {
  status: string;
  trackingNumber: string;
  previousStatus: string;
  previousTracking: string;
  invoiceComplete: boolean;
}): boolean {
  if (params.invoiceComplete) return false;
  if (params.status !== "shipped") return false;
  const tracking = params.trackingNumber.trim();
  if (!tracking) return false;
  const becameShipped = params.previousStatus !== "shipped";
  const trackingAdded =
    params.previousStatus === "shipped" &&
    !params.previousTracking.trim() &&
    Boolean(tracking);
  return becameShipped || trackingAdded;
}
