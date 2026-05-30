import {
  badgePreset,
  resolveDisplayBadges,
  parseProductBadges,
  type ProductBadgeId,
} from "@/lib/product-badges";
import { formatPercentOffBadge, percentOffFromPrices } from "@/lib/product-discount";

export function ProductBadges({
  badgesJson,
  compareAtMinor,
  priceMinor,
  stockQty,
  lowStockThreshold,
  className = "",
}: {
  badgesJson?: string | null;
  compareAtMinor?: number | null;
  priceMinor?: number;
  stockQty?: number;
  lowStockThreshold?: number;
  className?: string;
}) {
  const pct =
    priceMinor != null ? percentOffFromPrices(compareAtMinor, priceMinor) : null;
  const ids = resolveDisplayBadges(parseProductBadges(badgesJson), {
    compareAtMinor,
    priceMinor,
    stockQty,
    lowStockThreshold,
  });
  if (ids.length === 0 && pct == null) return null;

  return (
    <div className={`kn-product-badges ${className}`.trim()}>
      {pct != null ? (
        <span className="kn-product-badge kn-product-badge--pct">{formatPercentOffBadge(pct)}</span>
      ) : null}
      {ids.map((id) => {
        const p = badgePreset(id);
        if (!p) return null;
        return (
          <span
            key={id}
            className="kn-product-badge"
            style={{ color: p.color, backgroundColor: p.bg }}
          >
            {p.label}
          </span>
        );
      })}
    </div>
  );
}
