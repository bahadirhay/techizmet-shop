export type CartLineInput = {
  productId: string;
  variantId?: string | null;
  qty: number;
};

export type CartSessionData = {
  items: CartLineInput[];
  couponCode?: string | null;
};

export type CartLineView = {
  productId: string;
  variantId: string | null;
  variantLabel: string | null;
  slug: string;
  title: string;
  imageUrl: string | null;
  sku: string | null;
  /** Katalog satış fiyatı (indirim öncesi) */
  listPriceMinor: number;
  unitMinor: number;
  compareAtMinor: number | null;
  qty: number;
  lineMinor: number;
  /** Kampanya indirimi (satır payı) */
  discountMinor: number;
  /** lineMinor - discountMinor */
  lineTotalMinor: number;
  maxQty: number;
  inStock: boolean;
  /** Ürün KDV oranı (%) */
  vatRate: number;
};

export type CartView = {
  items: CartLineView[];
  itemCount: number;
  subtotalMinor: number;
  discountMinor: number;
  shippingMinor: number;
  totalMinor: number;
  couponCode: string | null;
  couponLabel: string | null;
  /** Uygulanan kampanya id (kupon veya otomatik) */
  campaignId: string | null;
  freeShipping: boolean;
  /** Mağaza eşiği (kuruş); 0 = tanımsız */
  freeShippingThresholdMinor: number;
  /** Eşiğe kalan tutar (kuruş); 0 = eşik aşıldı veya kapalı */
  freeShippingRemainingMinor: number;
  memberDiscountPercent: number;
  memberGroupName: string | null;
  errors: string[];
};

export type ShippingOption = {
  carrierId: string;
  carrierName: string;
  rateId: string;
  rateName: string;
  priceMinor: number;
};

export type CheckoutAddress = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  district: string;
  line1: string;
  postalCode?: string;
};
