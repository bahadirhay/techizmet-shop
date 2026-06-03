import { prisma } from "@/lib/prisma";

export type SaveCheckoutAddressInput = {
  customerId: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  city: string;
  district: string;
  line1: string;
  postalCode?: string;
  isDefault?: boolean;
};

export async function saveCheckoutAddressToCustomer(params: SaveCheckoutAddressInput) {
  const { customerId, isDefault, ...data } = params;
  if (!data.city || !data.district || !data.line1) {
    return { ok: false as const, error: "Adres bilgileri eksik" };
  }

  const existing = await prisma.customerAddress.count({ where: { customerId } });
  const makeDefault = isDefault ?? existing === 0;

  if (makeDefault) {
    await prisma.customerAddress.updateMany({
      where: { customerId },
      data: { isDefault: false },
    });
  }

  const address = await prisma.customerAddress.create({
    data: {
      customerId,
      label: null,
      firstName: data.firstName?.trim() || null,
      lastName: data.lastName?.trim() || null,
      phone: data.phone?.trim() || null,
      city: data.city,
      district: data.district,
      line1: data.line1,
      postalCode: data.postalCode?.trim() || null,
      isDefault: makeDefault,
    },
  });

  return { ok: true as const, address };
}
