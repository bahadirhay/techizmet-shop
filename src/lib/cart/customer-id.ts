import { getCustomerSession } from "@/lib/customer-session";
import { getDefaultSite } from "@/lib/site";

/** Sepet/checkout için giriş yapmış müşteri id */
export async function getCartCustomerId(): Promise<string | null> {
  const site = await getDefaultSite();
  const session = await getCustomerSession();
  if (!session.isLoggedIn || !session.customerId || session.siteId !== site.id) return null;
  return session.customerId;
}
