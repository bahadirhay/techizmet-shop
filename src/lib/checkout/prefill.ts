import { prisma } from "@/lib/prisma";
import { getCustomerSession } from "@/lib/customer-session";

export type CheckoutAddress = {
  id: string;
  label: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  city: string;
  district: string;
  line1: string;
  postalCode: string | null;
  isDefault: boolean;
};

export type CheckoutPrefill = {
  loggedIn: boolean;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  taxId: string;
  taxOffice: string;
  addresses: CheckoutAddress[];
};

export async function getCheckoutPrefill(siteId: string): Promise<CheckoutPrefill | null> {
  const session = await getCustomerSession();
  if (!session.isLoggedIn || !session.customerId || session.siteId !== siteId) return null;

  const customer = await prisma.storeCustomer.findFirst({
    where: { id: session.customerId, siteId },
    include: {
      addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] },
    },
  });
  if (!customer) return null;

  return {
    loggedIn: true,
    email: customer.email ?? session.email ?? "",
    phone: customer.phone ?? "",
    firstName: customer.firstName ?? "",
    lastName: customer.lastName ?? "",
    taxId: customer.taxId ?? "",
    taxOffice: customer.taxOffice ?? "",
    addresses: customer.addresses.map((a) => ({
      id: a.id,
      label: a.label,
      firstName: a.firstName,
      lastName: a.lastName,
      phone: a.phone,
      city: a.city,
      district: a.district,
      line1: a.line1,
      postalCode: a.postalCode,
      isDefault: a.isDefault,
    })),
  };
}
