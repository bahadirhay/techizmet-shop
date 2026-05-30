"use client";

import { useMemo, useState } from "react";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { FavoriteButton } from "@/components/store/FavoriteButton";
import { ProductBadges } from "@/components/store/ProductBadges";
import { ProductPrice } from "@/components/store/ProductPrice";
import type { CustomerGroupPricing } from "@/lib/pricing/group-catalog";
import {
  pickDefaultVariant,
  variantCatalogPrices,
  type VariantRow,
} from "@/lib/product-variants";

export function ProductPurchasePanel({
  productId,
  badgesJson,
  stockQty,
  lowStockThreshold,
  variantOptionName,
  variants,
  priceMinor,
  compareAtMinor,
  memberPricing,
}: {
  productId: string;
  badgesJson: string | null;
  stockQty: number;
  lowStockThreshold: number;
  variantOptionName: string | null;
  variants: VariantRow[];
  priceMinor: number;
  compareAtMinor: number | null;
  memberPricing: CustomerGroupPricing | null;
}) {
  const defaultV = useMemo(() => pickDefaultVariant(variants), [variants]);
  const [selectedId, setSelectedId] = useState<string | undefined>(defaultV?.id);
  const selected = variants.find((v) => v.id === selectedId) ?? defaultV;

  const display = useMemo(() => {
    if (selected) {
      const p = variantCatalogPrices(selected, memberPricing);
      return {
        priceMinor: p.unitMinor,
        compareMinor: p.compareAtMinor,
        memberBadge:
          memberPricing && memberPricing.percent > 0
            ? `${memberPricing.groupName} — %${memberPricing.percent} üye indirimi`
            : null,
        maxQty: selected.stockQty,
        inStock: selected.stockQty > 0,
        badgeCompare: selected.compareAtMinor,
        badgePrice: selected.priceMinor,
        badgeStock: selected.stockQty,
      };
    }
    const p = variantCatalogPrices(
      { priceMinor, compareAtMinor },
      memberPricing,
    );
    return {
      priceMinor: p.unitMinor,
      compareMinor: p.compareAtMinor,
      memberBadge:
        memberPricing && memberPricing.percent > 0
          ? `${memberPricing.groupName} — %${memberPricing.percent} üye indirimi`
          : null,
      maxQty: stockQty,
      inStock: stockQty > 0,
      badgeCompare: compareAtMinor,
      badgePrice: priceMinor,
      badgeStock: stockQty,
    };
  }, [selected, variants, priceMinor, compareAtMinor, memberPricing, stockQty]);

  return (
    <>
      <ProductBadges
        badgesJson={badgesJson}
        compareAtMinor={display.badgeCompare}
        priceMinor={display.badgePrice}
        stockQty={display.badgeStock}
        lowStockThreshold={lowStockThreshold}
      />
      <ProductPrice
        className="kn-pdp__price"
        priceMinor={display.priceMinor}
        compareMinor={display.compareMinor}
        memberBadge={display.memberBadge}
      />
      {variants.length > 0 && variantOptionName ? (
        <div className="kn-variant-picker kn-variant-picker--pdp">
          <span className="kn-variant-picker__label">{variantOptionName}</span>
          <div className="kn-variant-picker__pills">
            {variants.map((v) => (
              <button
                key={v.id}
                type="button"
                className={`kn-variant-pill ${v.id === selected?.id ? "kn-variant-pill--active" : ""}`}
                onClick={() => setSelectedId(v.id)}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <p className="text-sm text-[var(--kn-muted)]">
        Stok: {display.inStock ? `${display.maxQty} adet` : "Tükendi"}
      </p>
      <div className="kn-pdp__actions">
        <AddToCartButton
          productId={productId}
          variantId={selected?.id}
          disabled={!display.inStock}
          maxQty={display.maxQty}
        />
        <FavoriteButton productId={productId} showLabel className="kn-pdp__fav" />
      </div>
    </>
  );
}
