/** Trendyol partner paneli ödeme günü kalemleri — client/server paylaşılabilir */

export const TRENDYOL_PAYOUT_LINE_DEFS = [
  {
    key: "sales",
    label: "Satış Tutarı",
    description:
      "İlgili ödeme gününe dahil olan siparişlerinizden elde ettiğiniz toplam hakediş tutarıdır.",
  },
  {
    key: "cargo",
    label: "Kargo Kesintisi",
    description: "İlgili ödeme günü için yansıtılan toplam kargo bedelidir.",
  },
  {
    key: "commission",
    label: "Komisyon Kesintisi",
    description:
      "İlgili ödeme gününe dahil olan siparişlerinizden kesilen komisyon tutarıdır.",
  },
  {
    key: "platformFee",
    label: "Platform Hizmet Bedeli",
    description: "Platform üzerindeki işlemleriniz için alınan hizmet bedelidir.",
  },
  {
    key: "stoppage",
    label: "E-ticaret Stopajı",
    description:
      "İlgili ödeme gününe ilişkin 7524 sayılı kanun kapsamında yapılan Gelir/Kurumlar Vergisi stopajıdır.",
  },
  {
    key: "other",
    label: "Diğer",
    description:
      "İlgili ödeme gününe dahil olan virman, havale gibi tutarları ifade etmektedir.",
  },
  {
    key: "penalty",
    label: "Ceza Kesintisi",
    description: "İlgili ödeme gününe dahil olan ceza kesintisidir.",
  },
  {
    key: "microExportReturn",
    label: "Yurtdışı Operasyon İade Bedeli",
    description:
      "İlgili ödeme gününe dahil olan iadeye dönmüş mikro ihracat siparişleri için alınan operasyon bedelidir.",
  },
  {
    key: "advertising",
    label: "Reklam Harcaması",
    description: "İlgili ödeme gününe dahil olan reklam harcamasıdır.",
  },
] as const;

export type TrendyolPayoutLineKey = (typeof TRENDYOL_PAYOUT_LINE_DEFS)[number]["key"];
