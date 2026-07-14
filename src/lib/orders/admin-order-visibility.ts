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
 * siparişleri hariç. Sayaç ve liste tutarlı olsun diye tek yerden yönetilir —
 * "?status=pending" bağlantısı bu filtreyi gösterir.
 */
export const ordersAwaitingActionFilter = {
  status: { in: ["pending", "confirmed"] },
  ...excludeUnpaidCardOrdersFilter,
};
