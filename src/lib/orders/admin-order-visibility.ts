import { ORDER_INVOICE_COMPLETE_STATUSES } from "@/lib/admin/order-invoice-workflow";

/** Ödenmemiş kart siparişleri admin listelerinde görünmez (eski akış kalıntıları) */
export const excludeUnpaidCardOrdersFilter = {
  NOT: {
    paymentMethod: "card",
    paymentStatus: { in: ["unpaid", "failed"] },
  },
};

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
