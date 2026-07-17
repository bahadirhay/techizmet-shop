export type BoxQrCampaignSettings = {
  enabled?: boolean;
  /** Varsayılan 15 */
  discountPercent?: number;
  /** Kayıttan itibaren geçerlilik (gün) — varsayılan 30 */
  validityDays?: number;
  /** Yalnızca ilk siparişte — varsayılan true */
  firstOrderOnly?: boolean;
  /** Minimum sepet (TL) — opsiyonel */
  minCartTry?: number;
  headlineTr?: string;
  subheadTr?: string;
  bodyTr?: string;
  ctaTr?: string;
  successTr?: string;
  legalTr?: string;
};

export const BOX_QR_SOURCE = "box_qr" as const;

export const DEFAULT_BOX_QR: Required<
  Pick<
    BoxQrCampaignSettings,
    | "enabled"
    | "discountPercent"
    | "validityDays"
    | "firstOrderOnly"
    | "headlineTr"
    | "subheadTr"
    | "bodyTr"
    | "ctaTr"
    | "successTr"
    | "legalTr"
  >
> & { minCartTry: number } = {
  enabled: true,
  discountPercent: 15,
  validityDays: 30,
  firstOrderOnly: true,
  minCartTry: 0,
  headlineTr: "Paketin içinden geldin.",
  subheadTr: "Hoş geldin ödülün hazır.",
  bodyTr:
    "Anatolian Paw ailesine katıl; bir sonraki siparişinde geçerli kişisel indirimin hesabına yüklensin. Süre dolmadan kullan — köpeğin hak ediyor, sen de.",
  ctaTr: "Üye ol, %15 kazan",
  successTr: "İndirimin hesabında. Sepete eklediğin ürünlerde otomatik uygulanır.",
  legalTr:
    "Tek seferlik kişisel kupon. Başkasına devredilemez. İlk siparişte geçerlidir. Süre kayıt tarihinden itibaren başlar.",
};

export type BoxQrPublicConfig = {
  enabled: boolean;
  discountPercent: number;
  validityDays: number;
  firstOrderOnly: boolean;
  minCartTry: number;
  headline: string;
  subhead: string;
  body: string;
  cta: string;
  success: string;
  legal: string;
};
