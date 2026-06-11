import type { LegalSellerProfile } from "@/lib/legal/seller-profile";
import {
  buildDistanceSalesAgreementHtml,
  type DistanceSalesBuyerContext,
} from "@/lib/legal/distance-sales-agreement";

export function DistanceSalesAgreementView({
  seller,
  buyer,
  cartSummaryHtml,
}: {
  seller: LegalSellerProfile;
  buyer?: DistanceSalesBuyerContext;
  cartSummaryHtml?: string;
}) {
  const html = buildDistanceSalesAgreementHtml(seller, buyer, cartSummaryHtml);
  return (
    <div
      className="kn-distance-sales-page"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
