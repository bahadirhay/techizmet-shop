import { ORDER_INVOICE_COMPLETE_STATUSES } from "@/lib/admin/order-invoice-workflow";

import type { Prisma } from "@prisma/client";
import { REVENUE_EXCLUDED_STATUSES } from "@/lib/admin/marketplace-platforms";

/** Ödenmemiş kart siparişleri admin listelerinde görünmez (eski akış kalıntıları) */
export const excludeUnpaidCardOrdersFilter = {
  NOT: {
    paymentMethod: "card",
    paymentStatus: { in: ["unpaid", "failed"] },
  },
};

/**
 * Ciro / kâr-zarar raporlarına dahil edilmeyen siparişler.
 * İptal/iade + ödeme tamamlanmamış kart siparişleri + yarım kalan checkout.
 */
export const profitabilityOrdersBaseFilter = {
  status: { notIn: [...REVENUE_EXCLUDED_STATUSES, "awaiting_payment"] as string[] },
  ...excludeUnpaidCardOrdersFilter,
};

export function profitabilityOrdersWhere(siteId: string, from: Date): Prisma.StoreOrderWhereInput {
  return {
    siteId,
    createdAt: { gte: from },
    ...profitabilityOrdersBaseFilter,
  };
}

/**
 * "Onay / işlem bekleyen" siparişler: yeni gelmiş (pending) veya ödemesi alınıp
 * onaylanmış (confirmed) ama henüz kargoya verilmemiş siparişler. Ödenmemiş kart
 * siparişleri hariç. Faturası kesilmiş (imzalı/pazaryeri/elle = "hazır") siparişler
 * de işlem beklemiyor kabul edilir ve listeden/sayaçtan düşer.
 * Sayaç ve liste tutarlı olsun diye tek yerden yönetilir — "?status=pending" bunu gösterir.
 */
export const ordersAwaitingActionFilter = {
  status: { in: ["pending", "confirmed"] },
  ...excludeUnpaidCardOrdersFilter,
  OR: [
    { invoiceStatus: null },
    { invoiceStatus: { notIn: [...ORDER_INVOICE_COMPLETE_STATUSES] } },
  ],
};
