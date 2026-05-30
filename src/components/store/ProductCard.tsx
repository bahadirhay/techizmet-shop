"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FavoriteButton } from "@/components/store/FavoriteButton";
import { ProductBadges } from "@/components/store/ProductBadges";
import { ProductPrice } from "@/components/store/ProductPrice";
import { useCart } from "@/components/cart/CartContext";
import type { CustomerGroupPricing } from "@/lib/pricing/group-catalog";
import {
  pickDefaultVariant,
  variantCatalogPrices,
  type VariantRow,
} from "@/lib/product-variants";

export type ProductCardProps = {
  productId: string;
  slug: string;
  title: string;
  imageUrl: string | null;
  badgesJson: string | null;
  stockQty: number;
  lowStockThreshold: number;
  variantOptionName: string | null;
  variants: VariantRow[];
  /** Varyantsız ürün fiyatları */
  priceMinor: number;
  compareAtMinor: number | null;
  memberPricing: CustomerGroupPricing | null;
};

export function ProductCard({
  productId,
  slug,
  title,
  imageUrl,
  badgesJson,
  stockQty,
  lowStockThreshold,
  variantOptionName,
  variants,
  priceMinor,
  compareAtMinor,
  memberPricing,
}: ProductCardProps) {
  const { addItem } = useCart();
  const defaultV = useMemo(() => pickDefaultVariant(variants), [variants]);
  const [selectedId, setSelectedId] = useState<string | undefined>(defaultV?.id);
  const selected = variants.find((v) => v.id === selectedId) ?? defaultV;

  const pricing = useMemo(() => {
    if (selected) {
      const p = variantCatalogPrices(selected, memberPricing);
      const memberBadge =
        memberPricing && memberPricing.percent > 0
          ? `${memberPricing.groupName} %${memberPricing.percent}`
          : null;
      return {
        priceMinor: p.unitMinor,
        compareMinor: p.compareAtMinor,
        memberBadge,
        maxQty: selected.stockQty,
        inStock: selected.stockQty > 0,
        fromPrice: false,
      };
    }
    const memberBadge =
      memberPricing && memberPricing.percent > 0
        ? `${memberPricing.groupName} %${memberPricing.percent}`
        : null;
    const fromPrice = variants.length > 1;
    let minUnit = priceMinor;
    let compare = compareAtMinor;
    if (variants.length) {
      let min = Infinity;
      for (const v of variants) {
        const p = variantCatalogPrices(v, memberPricing);
        if (p.unitMinor < min) {
          min = p.unitMinor;
          compare = p.compareAtMinor;
        }
      }
      if (min !== Infinity) minUnit = min;
    }
    return {
      priceMinor: minUnit,
      compareMinor: compare,
      memberBadge,
      maxQty: stockQty,
      inStock: stockQty > 0,
      fromPrice,
    };
  }, [selected, variants, priceMinor, compareAtMinor, memberPricing, stockQty]);

  const badgeCompare = selected?.compareAtMinor ?? compareAtMinor;
  const badgePrice = selected?.priceMinor ?? priceMinor;

  async function quickAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!pricing.inStock) return;
    await addItem(productId, 1, selected?.id);
  }

  return (
    <div className="kn-product-card-wrap">
      <FavoriteButton productId={productId} className="kn-product-card__fav" />
      <div className="kn-product-card">
        <Link href={`/products/${slug}`} className="kn-product-card__media">
          <ProductBadges
            className="kn-product-card__badges"
            badgesJson={badgesJson}
            compareAtMinor={badgeCompare}
            priceMinor={badgePrice}
            stockQty={selected?.stockQty ?? stockQty}
            lowStockThreshold={lowStockThreshold}
          />
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="kn-product-card__img" />
          ) : (
            <div className="kn-product-card__img kn-product-card__img--placeholder" />
          )}
        </Link>
        <div className="kn-product-card__body">
          <Link href={`/products/${slug}`}>
            <h3 className="kn-product-card__title">{title}</h3>
          </Link>
          {variants.length > 0 && variantOptionName ? (
            <div className="kn-variant-picker">
              <span className="kn-variant-picker__label">{variantOptionName}</span>
              <div className="kn-variant-picker__pills" role="listbox">
                {variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    role="option"
                    aria-selected={v.id === selected?.id}
                    className={`kn-variant-pill ${v.id === selected?.id ? "kn-variant-pill--active" : ""}`}
                    onClick={() => setSelectedId(v.id)}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <ProductPrice
            priceMinor={pricing.priceMinor}
            compareMinor={pricing.compareMinor}
            memberBadge={pricing.memberBadge}
            fromPrice={pricing.fromPrice}
          />
          <button
            type="button"
            className="kn-product-card__bag"
            aria-label="Sepete ekle"
            disabled={!pricing.inStock}
            onClick={quickAdd}
          >
            🛍
          </button>
        </div>
      </div>
    </div>
  );
}
