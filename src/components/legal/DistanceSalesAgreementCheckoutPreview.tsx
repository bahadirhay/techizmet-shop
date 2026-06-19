"use client";

import { useMemo } from "react";
import type { CartView } from "@/lib/cart/types";
import { formatPrice } from "@/lib/currency/format-price";
import type { ShopLocale } from "@/lib/i18n/locale";
import {
  buildDistanceSalesAgreementHtml,
  buildDistanceSalesBuyerContextFromCheckout,
  buildDistanceSalesCartSummary,
} from "@/lib/legal/distance-sales-agreement";
import type { LegalSellerProfile } from "@/lib/legal/seller-profile";
import { sanitizePublicHtml } from "@/lib/html-sanitize";

export function DistanceSalesAgreementCheckoutPreview({
  seller,
  form,
  cart,
  shippingLabel,
  locale,
  usdRate,
}: {
  seller: LegalSellerProfile;
  form: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    city: string;
    district: string;
    neighborhood: string;
    line1: string;
    postalCode: string;
    taxId?: string;
    taxOffice?: string;
    billingSameAsShipping?: boolean;
    billingFirstName?: string;
    billingLastName?: string;
    billingCity?: string;
    billingDistrict?: string;
    billingNeighborhood?: string;
    billingLine1?: string;
    billingPostalCode?: string;
    paymentMethod: string;
  };
  cart: CartView;
  shippingLabel?: string;
  locale?: ShopLocale;
  usdRate?: number | null;
}) {
  const fmt = (minor: number) => formatPrice(minor, locale ?? "tr", usdRate);

  const html = useMemo(() => {
    const buyer = buildDistanceSalesBuyerContextFromCheckout({
      ...form,
      shippingLabel,
    });
    const cartSummary = buildDistanceSalesCartSummary(cart, fmt);
    return buildDistanceSalesAgreementHtml(seller, buyer, cartSummary);
  }, [seller, form, cart, shippingLabel, locale, usdRate]);

  return (
    <details className="kn-distance-sales-checkout" open>
      <summary>Mesafeli satış sözleşmesi ve ön bilgilendirme formu</summary>
      <div
        className="kn-distance-sales-checkout__body"
        dangerouslySetInnerHTML={{ __html: sanitizePublicHtml(html) }}
      />
    </details>
  );
}
