import { formatTry } from "@/lib/format";

export function ProductPrice({
  priceMinor,
  compareMinor,
  memberBadge,
  fromPrice,
  className = "",
}: {
  priceMinor: number;
  compareMinor?: number | null;
  memberBadge?: string | null;
  /** Birden fazla varyantta en düşük fiyat */
  fromPrice?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      {memberBadge ? (
        <span className="kn-member-price-badge">{memberBadge}</span>
      ) : null}
      <p className="kn-product-card__price">
        {fromPrice ? <span className="kn-price-from">Başlayan </span> : null}
        {formatTry(priceMinor)}
        {compareMinor && compareMinor > priceMinor ? (
          <span className="kn-product-card__compare">{formatTry(compareMinor)}</span>
        ) : null}
      </p>
    </div>
  );
}
