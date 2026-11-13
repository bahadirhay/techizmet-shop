import Link from "next/link";
import { ProductBadges } from "@/components/store/ProductBadges";
import { ProductPrice } from "@/components/store/ProductPrice";
import { toDisplayPrice } from "@/lib/store/customer-pricing";
import type { CustomerGroupPricing } from "@/lib/pricing/group-catalog";
import {
  PRODUCT_CARD_IMAGE_SIZES,
  PRODUCT_CARD_IMAGE_WIDTHS,
  isStoreMediaPath,
  storeImageSized,
  storeImageSrcSet,
} from "@/lib/store-image-srcset";

/** Sunucu bileşeni — vitrin grid (Prisma / client yok) */
export function ProductCardServer({
  slug,
  title,
  imageUrl,
  badgesJson,
  stockQty,
  lowStockThreshold,
  priceMinor,
  compareAtMinor,
  memberPricing,
  eagerImage = false,
}: {
  slug: string;
  title: string;
  imageUrl: string | null;
  badgesJson: string | null;
  stockQty: number;
  lowStockThreshold: number;
  priceMinor: number;
  compareAtMinor: number | null;
  memberPricing: CustomerGroupPricing | null;
  /** İlk ekranda görünen kartlar — lazy yükleme uygulanmaz */
  eagerImage?: boolean;
}) {
  const display = toDisplayPrice(priceMinor, compareAtMinor, memberPricing);
  const resizable = isStoreMediaPath(imageUrl);

  return (
    <div className="kn-product-card-wrap">
      <Link href={`/products/${slug}`} className="kn-product-card" prefetch>
        <div className="kn-product-card__media">
          <ProductBadges
            className="kn-product-card__badges"
            badgesJson={badgesJson}
            compareAtMinor={compareAtMinor}
            priceMinor={priceMinor}
            stockQty={stockQty}
            lowStockThreshold={lowStockThreshold}
          />
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resizable ? storeImageSized(imageUrl, 600) : imageUrl}
              srcSet={storeImageSrcSet(imageUrl, PRODUCT_CARD_IMAGE_WIDTHS)}
              sizes={resizable ? PRODUCT_CARD_IMAGE_SIZES : undefined}
              alt={title}
              className="kn-product-card__img"
              loading={eagerImage ? undefined : "lazy"}
              decoding="async"
            />
          ) : (
            <div className="kn-product-card__img kn-product-card__img--placeholder" />
          )}
        </div>
        <div className="kn-product-card__body">
          <h3 className="kn-product-card__title">{title}</h3>
          <ProductPrice
            priceMinor={display.priceMinor}
            compareMinor={display.compareMinor}
            memberBadge={display.memberBadge}
          />
        </div>
      </Link>
    </div>
  );
}
