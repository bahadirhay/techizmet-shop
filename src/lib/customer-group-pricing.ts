import { prisma } from "@/lib/prisma";
import {
  applyCatalogPrice,
  priceAfterGroupDiscount,
  type CustomerGroupPricing,
} from "@/lib/pricing/group-catalog";

export type { CustomerGroupPricing };
export { applyCatalogPrice, priceAfterGroupDiscount };

export async function getCustomerGroupPricing(
  customerId: string | null | undefined,
  siteId: string,
): Promise<CustomerGroupPricing | null> {
  if (!customerId) return null;

  const customer = await prisma.storeCustomer.findFirst({
    where: { id: customerId, siteId },
    include: { customerGroup: true },
  });
  if (!customer?.customerGroup?.active) return null;
  const percent = customer.customerGroup.discountPercent;
  if (percent <= 0) return null;

  return {
    percent,
    groupId: customer.customerGroup.id,
    groupName: customer.customerGroup.name,
  };
}
