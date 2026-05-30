import { getCustomerGroupPricing, type CustomerGroupPricing } from "@/lib/customer-group-pricing";
import { getCustomerSession } from "@/lib/customer-session";
import { prisma } from "@/lib/prisma";
import { getDefaultSite } from "@/lib/site";

export async function getLoggedInCustomerPricing(
  siteId?: string,
): Promise<CustomerGroupPricing | null> {
  const site = siteId
    ? await prisma.storeSite.findUnique({ where: { id: siteId } })
    : await getDefaultSite();
  if (!site) return null;
  const session = await getCustomerSession();
  if (!session.isLoggedIn || !session.customerId || session.siteId !== site.id) return null;
  return getCustomerGroupPricing(session.customerId, site.id);
}

export type DisplayPrice = {
  priceMinor: number;
  compareMinor: number | null;
  memberBadge: string | null;
};

export function toDisplayPrice(
  catalogPriceMinor: number,
  catalogCompareMinor: number | null,
  pricing: CustomerGroupPricing | null,
): DisplayPrice {
  if (!pricing) {
    return {
      priceMinor: catalogPriceMinor,
      compareMinor:
        catalogCompareMinor && catalogCompareMinor > catalogPriceMinor ? catalogCompareMinor : null,
      memberBadge: null,
    };
  }
  const unit = Math.round((catalogPriceMinor * (100 - pricing.percent)) / 100);
  return {
    priceMinor: unit,
    compareMinor: catalogPriceMinor,
    memberBadge: `${pricing.groupName} −%${pricing.percent}`,
  };
}
