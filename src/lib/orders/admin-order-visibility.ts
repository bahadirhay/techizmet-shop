/** Ödenmemiş kart siparişleri admin listelerinde görünmez (eski akış kalıntıları) */
export const excludeUnpaidCardOrdersFilter = {
  NOT: {
    paymentMethod: "card",
    paymentStatus: { in: ["unpaid", "failed"] },
  },
};
